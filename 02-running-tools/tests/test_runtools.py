import sys
from datetime import date
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from runtools import gpx, plan, vdot  # noqa: E402
from runtools.util import fmt_pace, fmt_time, parse_time  # noqa: E402

CFG = yaml.safe_load((ROOT / "config.yaml").read_text())
SAMPLE = ROOT / "ejemplos" / "series_6x400_sintetico.gpx"


def test_haversine_one_degree_lat():
    assert gpx.haversine(0, 0, 1, 0) == pytest.approx(111_195, rel=1e-3)


def test_time_helpers():
    assert parse_time("27:58") == 1678
    assert parse_time("1:55:00") == 6900
    assert fmt_time(1678) == "27:58"
    assert fmt_pace(330) == "5:30/km"


def test_vdot_known_values():
    # Daniels' tables: 5K 20:00 ≈ VDOT 49.8; David 27:58 ≈ 33.5
    assert vdot.vdot(5000, 20 * 60) == pytest.approx(49.8, abs=0.3)
    assert vdot.vdot(5000, 1678) == pytest.approx(33.5, abs=0.3)


def test_prediction_roundtrip():
    v = vdot.vdot(5000, 1678)
    assert vdot.predict_time(v, 5000) == pytest.approx(1678, abs=1)
    assert vdot.predict_time(v, 10000) > 2 * 1678  # slower pace over longer distance


def test_paces_match_davids_real_paces():
    p = vdot.training_paces(vdot.vdot(5000, 1678))
    assert 5 * 60 + 40 <= p["T"][0] <= 6 * 60 + 10   # his threshold 5:55-6:05
    assert 5 * 60 + 15 <= p["I"] <= 5 * 60 + 35      # his 1 km reps 5:25-5:30
    assert p["E"][0] > p["T"][1]


@pytest.fixture(scope="module")
def analysis():
    if not SAMPLE.exists():
        import runpy
        runpy.run_path(str(ROOT / "ejemplos" / "generar_gpx_sintetico.py"), run_name="__main__")
    return gpx.analyze(gpx.parse_gpx(SAMPLE), CFG)


def test_distance_and_time(analysis):
    # 12' @6:40 + 6×400 + 5×90" @8:00 + 10' @6:50 ≈ 6.59 km
    assert analysis.distance_m == pytest.approx(6590, rel=0.02)
    assert analysis.elapsed_s == pytest.approx(42 * 60 + 4, abs=5)


def test_splits_sum_to_total(analysis):
    assert sum(s["time"] for s in analysis.splits) == pytest.approx(analysis.elapsed_s, rel=0.01)


def test_zones_sum(analysis):
    assert sum(analysis.zones.values()) == pytest.approx(analysis.elapsed_s, rel=0.01)


def test_detects_six_reps(analysis):
    reps = analysis.intervals
    assert len(reps) == 6
    for r in reps:
        assert r["pace"] == pytest.approx(315, abs=8)     # 2:06 / 400 m → 5:15/km
        assert r["dist"] == pytest.approx(400, rel=0.08)


def test_drift_present(analysis):
    assert analysis.drift and "decoupling_pct" in analysis.drift


def test_no_hr_gpx(tmp_path):
    f = tmp_path / "nohr.gpx"
    f.write_text('<gpx><trk><trkseg>'
                 '<trkpt lat="43.0" lon="-8.0"><time>2026-01-01T10:00:00Z</time></trkpt>'
                 '<trkpt lat="43.001" lon="-8.0"><time>2026-01-01T10:00:40Z</time></trkpt>'
                 '</trkseg></trk></gpx>')
    a = gpx.analyze(gpx.parse_gpx(f), CFG)
    assert a.zones == {} and a.drift is None
    assert a.distance_m == pytest.approx(111, rel=0.02)


def test_plan_constraints():
    p = plan.build_plan()
    assert p[0].day == date(2026, 11, 9) and p[-1].day == date(2026, 12, 28)
    weeks = {}
    for s in p:
        weeks.setdefault((s.day - plan.START).days // 7, []).append(s)
    for w, ss in weeks.items():
        if w < 7:
            assert 3 <= len(ss) <= 5, (w, len(ss))
            assert any(s.kind == "series" and s.day.weekday() == 0 for s in ss)  # Monday intervals
    # deload weeks have fewer minutes than the surrounding build weeks
    mins = {w: sum(s.minutes for s in ss) for w, ss in weeks.items()}
    assert mins[1] < mins[0] and mins[3] < mins[2]


def test_ics_valid():
    ics = plan.to_ics(plan.build_plan())
    assert ics.startswith("BEGIN:VCALENDAR\r\n") and ics.endswith("END:VCALENDAR\r\n")
    assert ics.count("BEGIN:VEVENT") == ics.count("END:VEVENT") == len(plan.build_plan())


def test_plan_labels_follow_goal():
    p = plan.build_plan(1607, 1560)
    assert p[-1].title == "🎯 5K < 26:00"
    assert "Plan 5K < 26:00" in plan.to_markdown(p, 1607, 1560)
    assert "sub-26:00" in plan.to_ics(p, 1560)
