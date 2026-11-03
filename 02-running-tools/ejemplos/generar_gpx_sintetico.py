"""Generate a synthetic Strava-like GPX: 12' warm-up, 6×400 m @2:06 with 90" jog, 10' cool-down.

Route: laps around a 400 m loop near Riazor (A Coruña). HR follows speed with first-order lag.
"""
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

LAT0, LON0 = 43.3680, -8.4100
R_LOOP = 400 / (2 * math.pi)
M_PER_DEG_LAT = 111_320
M_PER_DEG_LON = 111_320 * math.cos(math.radians(LAT0))


def segments():
    yield 12 * 60, 1000 / 400          # warm-up 6:40/km
    for i in range(6):
        yield 126, 400 / 126            # 400 m in 2:06
        if i < 5:
            yield 90, 1000 / 480        # jog 8:00/km
    yield 10 * 60, 1000 / 410           # cool-down


def main(out: Path) -> None:
    t0 = datetime(2026, 11, 2, 19, 0, tzinfo=timezone.utc)
    t, s, hr = 0, 0.0, 95.0
    pts = []
    for dur, v in segments():
        for _ in range(int(dur)):
            target_hr = 70 + 33 * v + 0.004 * t      # slow upward drift
            hr += (target_hr - hr) / 25              # lag
            s += v
            ang = s / R_LOOP
            lat = LAT0 + R_LOOP * math.sin(ang) / M_PER_DEG_LAT
            lon = LON0 + R_LOOP * (1 - math.cos(ang)) / M_PER_DEG_LON
            ele = 20 + 3 * math.sin(ang)
            t += 1
            if t % 2 == 0:                           # Strava-like 2 s sampling
                pts.append((t0 + timedelta(seconds=t), lat, lon, ele, round(hr)))
    trk = "\n".join(
        f'      <trkpt lat="{la:.7f}" lon="{lo:.7f}"><ele>{e:.1f}</ele><time>{w:%Y-%m-%dT%H:%M:%SZ}</time>'
        f'<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>{h}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>'
        for w, la, lo, e, h in pts)
    gpx = f"""<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="synthetic" version="1.1" xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata><name>Series 6x400 (sintético)</name></metadata>
  <trk><name>Series 6x400 (sintético)</name><type>running</type><trkseg>
{trk}
  </trkseg></trk>
</gpx>
"""
    out.write_text(gpx, encoding="utf-8")
    print(f"{len(pts)} puntos → {out}")


if __name__ == "__main__":
    main(Path(__file__).with_name("series_6x400_sintetico.gpx"))
