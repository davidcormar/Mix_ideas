"""Build the 7 km Hyde Park + Kensington Gardens running loop as GPX (waypoints densified every ~25 m).

Waypoints are approximate (park paths); check the route on a map before running.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "02-running-tools"))
from runtools.gpx import haversine  # noqa: E402

WAYPOINTS = [
    ("Marble Arch (salida)", 51.51290, -0.15910),
    ("North Carriage Drive", 51.51180, -0.16700),
    ("Lancaster Gate", 51.51120, -0.17520),
    ("Italian Gardens", 51.51000, -0.17560),
    ("Peter Pan / Long Water oeste", 51.50850, -0.17600),
    ("Round Pond norte", 51.50720, -0.18300),
    ("Black Lion Gate (Broad Walk norte)", 51.51080, -0.18800),
    ("Kensington Palace", 51.50550, -0.18780),
    ("Broad Walk sur", 51.50250, -0.18580),
    ("Albert Memorial", 51.50240, -0.17770),
    ("Serpentine Bridge", 51.50530, -0.17320),
    ("Serpentine sur (Lido)", 51.50390, -0.16740),
    ("Rotten Row / Serpentine Rd", 51.50300, -0.16200),
    ("Hyde Park Corner", 51.50280, -0.15280),
    ("Speakers' Corner", 51.51190, -0.15840),
    ("Marble Arch (llegada)", 51.51290, -0.15910),
]


def densify(pts, step_m=25.0):
    out = [pts[0][1:]]
    for (_, la1, lo1), (_, la2, lo2) in zip(pts, pts[1:]):
        d = haversine(la1, lo1, la2, lo2)
        n = max(1, math.ceil(d / step_m))
        for k in range(1, n + 1):
            out.append((la1 + (la2 - la1) * k / n, lo1 + (lo2 - lo1) * k / n))
    return out


def total_km(pts) -> float:
    return sum(haversine(a[0], a[1], b[0], b[1]) for a, b in zip(pts, pts[1:])) / 1000


def to_gpx(pts, name: str) -> str:
    wpts = "\n".join(f'  <wpt lat="{la:.6f}" lon="{lo:.6f}"><name>{n}</name></wpt>' for n, la, lo in WAYPOINTS[:-1])
    trk = "\n".join(f'      <trkpt lat="{la:.6f}" lon="{lo:.6f}"/>' for la, lo in pts)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Mix_ideas 19-londres" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>{name}</name></metadata>
{wpts}
  <trk><name>{name}</name><type>running</type><trkseg>
{trk}
  </trkseg></trk>
</gpx>
"""


if __name__ == "__main__":
    pts = densify(WAYPOINTS)
    km = total_km(pts)
    out = HERE / "ruta-hyde-park-7km.gpx"
    out.write_text(to_gpx(pts, f"Hyde Park + Kensington Gardens ({km:.1f} km)"), encoding="utf-8")
    print(f"{len(pts)} puntos, {km:.2f} km → {out}")
