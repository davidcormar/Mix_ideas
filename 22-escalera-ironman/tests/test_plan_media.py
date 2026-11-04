import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import plan_media as pm  # noqa: E402

RACE = date(2027, 10, 17)
S = pm.build(RACE, 1607, 6900)


def test_ends_with_race_and_starts_monday_after_woxsen():
    assert S[-1].day == RACE and S[-1].kind == "test"
    assert S[0].day.weekday() == 0 and S[0].day > date(2027, 5, 30)


def test_long_runs_progress_with_deloads_and_cap():
    longs = [s for s in S if s.kind == "tirada"]
    km = [int(s.title.split()[2]) for s in longs]
    assert max(km) == 18 and len(km) == 15
    for w in pm.DELOAD:
        assert km[w] < km[w - 1]


def test_strength_never_dropped():
    weeks = {}
    for s in S:
        weeks.setdefault((s.day - S[0].day).days // 7, []).append(s.kind)
    for w, kinds in weeks.items():
        if w < 15:
            assert kinds.count("fuerza") == 2 and len(kinds) == 6


def test_markdown_and_ics():
    md = pm.to_markdown(S, RACE, 1607, 6900)
    assert "Plan media maratón < 1:55:00" in md and "2:03:19" in md
    ics = pm.to_ics(S, 6900)
    assert ics.count("BEGIN:VEVENT") == len(S)
