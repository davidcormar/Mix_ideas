"""GPX parsing and run analysis (distance, splits, HR zones, drift, intervals)."""
from __future__ import annotations

import math
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

EARTH_R = 6_371_000.0


@dataclass
class Point:
    t: float            # seconds since start
    lat: float
    lon: float
    ele: float | None
    hr: int | None


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in metres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _parse_dt(s: str) -> datetime:
    s = s.strip().replace("Z", "+00:00")
    return datetime.fromisoformat(s)


def parse_gpx(path: str | Path) -> list[Point]:
    """Read trackpoints from a GPX file (Strava/Garmin/Apple). Namespace-agnostic HR."""
    root = ET.parse(path).getroot()
    pts: list[Point] = []
    t0 = None
    for el in root.iter():
        if _local(el.tag) != "trkpt":
            continue
        lat, lon = float(el.attrib["lat"]), float(el.attrib["lon"])
        ele = hr = None
        when = None
        for child in el.iter():
            name = _local(child.tag)
            if name == "ele" and child.text:
                ele = float(child.text)
            elif name == "time" and child.text:
                when = _parse_dt(child.text)
            elif name in ("hr", "heartrate") and child.text:
                hr = int(float(child.text))
        if when is None:
            continue
        if t0 is None:
            t0 = when
        pts.append(Point((when - t0).total_seconds(), lat, lon, ele, hr))
    if len(pts) < 2:
        raise ValueError("GPX has fewer than 2 timed trackpoints")
    return pts


@dataclass
class Analysis:
    distance_m: float
    elapsed_s: float
    moving_s: float
    avg_pace: float | None
    avg_hr: float | None
    max_hr: int | None
    elev_gain: float
    elev_loss: float
    splits: list[dict] = field(default_factory=list)
    blocks: list[dict] = field(default_factory=list)
    zones: dict[str, float] = field(default_factory=dict)
    drift: dict | None = None
    intervals: list[dict] = field(default_factory=list)


def cumulative_distance(pts: list[Point]) -> list[float]:
    d = [0.0]
    for a, b in zip(pts, pts[1:]):
        d.append(d[-1] + haversine(a.lat, a.lon, b.lat, b.lon))
    return d


def _interp_time(dist: list[float], times: list[float], target: float) -> float:
    for i in range(1, len(dist)):
        if dist[i] >= target:
            span = dist[i] - dist[i - 1]
            frac = 0.0 if span == 0 else (target - dist[i - 1]) / span
            return times[i - 1] + frac * (times[i] - times[i - 1])
    return times[-1]


def _mean_hr(pts: list[Point], i0: int, i1: int) -> float | None:
    """Time-weighted mean HR over point indices [i0, i1)."""
    num = den = 0.0
    for i in range(max(i0, 1), min(i1, len(pts))):
        if pts[i].hr is not None:
            dt = pts[i].t - pts[i - 1].t
            num += pts[i].hr * dt
            den += dt
    return num / den if den else None


def km_splits(pts, dist) -> list[dict]:
    times = [p.t for p in pts]
    out, k = [], 1
    prev_t, prev_i = 0.0, 0
    while k * 1000 <= dist[-1]:
        t = _interp_time(dist, times, k * 1000)
        i = next(j for j in range(len(dist)) if dist[j] >= k * 1000)
        out.append({"km": k, "time": t - prev_t, "pace": t - prev_t, "hr": _mean_hr(pts, prev_i, i + 1)})
        prev_t, prev_i, k = t, i, k + 1
    rest = dist[-1] - (k - 1) * 1000
    if rest > 50:
        dt = times[-1] - prev_t
        out.append({"km": round(k - 1 + rest / 1000, 2), "time": dt, "pace": dt / rest * 1000,
                    "hr": _mean_hr(pts, prev_i, len(pts))})
    return out


def time_blocks(pts, dist, block_s: float = 300) -> list[dict]:
    out, start_i, n = [], 0, 1
    for i, p in enumerate(pts):
        if p.t >= n * block_s or i == len(pts) - 1:
            d = dist[i] - dist[start_i]
            dt = p.t - pts[start_i].t
            if dt > 0:
                out.append({"block": n, "start": pts[start_i].t, "dist": d,
                            "pace": dt / d * 1000 if d > 0 else None, "hr": _mean_hr(pts, start_i, i + 1)})
            start_i, n = i, n + 1
    return out


def zone_of(hr: int, zones: dict[str, list[int]]) -> str | None:
    for name, (lo, hi) in zones.items():
        if lo <= hr <= hi:
            return name
    return None


def time_in_zones(pts, zones) -> dict[str, float]:
    res = {z: 0.0 for z in zones}
    for a, b in zip(pts, pts[1:]):
        if b.hr is not None:
            z = zone_of(b.hr, zones)
            if z:
                res[z] += b.t - a.t
    return res


def elevation(pts, threshold: float = 2.0) -> tuple[float, float]:
    """Gain/loss with hysteresis to filter GPS noise."""
    eles = [p.ele for p in pts if p.ele is not None]
    if len(eles) < 2:
        return 0.0, 0.0
    gain = loss = 0.0
    ref = eles[0]
    for e in eles[1:]:
        if e - ref >= threshold:
            gain += e - ref
            ref = e
        elif ref - e >= threshold:
            loss += ref - e
            ref = e
    return gain, loss


def cardiac_drift(pts, dist) -> dict | None:
    """Compare first vs second half (by time): HR and HR/speed (Pa:HR decoupling)."""
    if not any(p.hr for p in pts):
        return None
    half = pts[-1].t / 2
    mid = next(i for i, p in enumerate(pts) if p.t >= half)
    res = {}
    for name, (i0, i1) in {"h1": (0, mid), "h2": (mid, len(pts) - 1)}.items():
        dt = pts[i1].t - pts[i0].t
        speed = (dist[i1] - dist[i0]) / dt if dt else 0
        hr = _mean_hr(pts, i0, i1 + 1)
        res[name] = {"hr": hr, "speed": speed, "pace": 1000 / speed if speed else None}
    h1, h2 = res["h1"], res["h2"]
    if h1["hr"] and h2["hr"] and h1["speed"] and h2["speed"]:
        e1 = h1["speed"] / h1["hr"]
        e2 = h2["speed"] / h2["hr"]
        res["hr_diff"] = h2["hr"] - h1["hr"]
        res["decoupling_pct"] = (e1 - e2) / e1 * 100
    return res


def smoothed_speed(pts, dist, window_s: float) -> list[float]:
    """Centered rolling speed (m/s) over ±window/2 seconds."""
    n, out = len(pts), []
    j0 = j1 = 0
    for i in range(n):
        while pts[j0].t < pts[i].t - window_s / 2:
            j0 += 1
        while j1 < n - 1 and pts[j1 + 1].t <= pts[i].t + window_s / 2:
            j1 += 1
        dt = pts[j1].t - pts[j0].t
        out.append((dist[j1] - dist[j0]) / dt if dt > 0 else 0.0)
    return out


def detect_intervals(pts, dist, window_s=20, factor=1.15, min_dur=40) -> list[dict]:
    """Segments whose smoothed speed exceeds factor × median speed for ≥ min_dur seconds."""
    sp = smoothed_speed(pts, dist, window_s)
    moving = sorted(s for s in sp if s > 0.5)
    if not moving:
        return []
    thr = factor * moving[len(moving) // 2]
    fine = smoothed_speed(pts, dist, min(6, window_s))
    reps, start = [], None
    for i, s in enumerate(sp + [0.0]):
        fast = s > thr if i < len(sp) else False
        if fast and start is None:
            start = i
        elif not fast and start is not None:
            end = i - 1
            # refine edges with a short window so smoothing does not shave the rep
            while start > 0 and fine[start - 1] > thr:
                start -= 1
            while end < len(sp) - 1 and fine[end + 1] > thr:
                end += 1
            dur = pts[end].t - pts[start].t
            if dur >= min_dur:
                d = dist[end] - dist[start]
                reps.append({"n": len(reps) + 1, "start": pts[start].t, "time": dur, "dist": d,
                             "pace": dur / d * 1000 if d else None, "hr": _mean_hr(pts, start, end + 1)})
            start = None
    return reps


def analyze(pts: list[Point], cfg: dict) -> Analysis:
    dist = cumulative_distance(pts)
    zones = cfg.get("zonas_fc", {})
    moving = sum(b.t - a.t for a, b, da, db in zip(pts, pts[1:], dist, dist[1:])
                 if b.t > a.t and (db - da) / (b.t - a.t) > 0.5)
    hrs = [p.hr for p in pts if p.hr is not None]
    gain, loss = elevation(pts, cfg.get("umbral_desnivel_m", 2.0))
    s = cfg.get("series", {})
    return Analysis(
        distance_m=dist[-1],
        elapsed_s=pts[-1].t,
        moving_s=moving,
        avg_pace=pts[-1].t / dist[-1] * 1000 if dist[-1] else None,
        avg_hr=_mean_hr(pts, 0, len(pts)),
        max_hr=max(hrs) if hrs else None,
        elev_gain=gain,
        elev_loss=loss,
        splits=km_splits(pts, dist),
        blocks=time_blocks(pts, dist),
        zones=time_in_zones(pts, zones) if hrs else {},
        drift=cardiac_drift(pts, dist),
        intervals=detect_intervals(pts, dist, s.get("ventana_suavizado_s", 20),
                                   s.get("factor_umbral", 1.15), s.get("duracion_minima_s", 40)),
    )
