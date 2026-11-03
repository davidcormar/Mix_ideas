import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from demo import evaluate  # noqa: E402
from sarpipe.ais import match  # noqa: E402
from sarpipe.detect import Detection, ca_cfar, detect_scene, tiles  # noqa: E402
from sarpipe.synthetic import make_ais, make_scene  # noqa: E402


def test_tiles_cover_scene():
    cov = np.zeros((1000, 900), bool)
    for r0, c0, r1, c1 in tiles(cov.shape, 512, 64):
        cov[r0:r1, c0:c1] = True
    assert cov.all()


def test_cfar_false_alarm_rate_on_pure_clutter():
    rng = np.random.default_rng(0)
    img = 0.02 * rng.gamma(4.4, 1 / 4.4, (400, 400))
    pfa = ca_cfar(img, k=6.0).mean()
    assert pfa < 1e-4


def test_detects_all_ships_across_seeds():
    for seed in range(3):
        img, land, ships = make_scene(seed=seed)
        m = evaluate(ships, detect_scene(img, land, k=6.0))
        assert m["recall"] >= 0.95 and m["precision"] >= 0.9
        assert m["length_rel_err_median"] < 0.35


def test_ais_matching_flags_dark_ships():
    img, land, ships = make_scene(seed=0)
    dets = detect_scene(img, land, k=6.0)
    pairs, dark, unmatched = match(dets, make_ais(ships, seed=0))
    fp = evaluate(ships, dets)["fp"]
    true_dark = sum(not s.has_ais for s in ships)
    # every dark ship is flagged; false alarms (no AIS by definition) add to the flagged list
    assert true_dark <= len(dark) <= true_dark + fp
    assert unmatched == []


def test_match_respects_gate():
    d = [Detection(0, 0, 50, 0, 3)]
    pairs, dark, un = match(d, [(100, 100, 1)], pixel_m=10, gate_m=500)  # ~1.4 km away
    assert pairs == [] and dark == [0] and un == [0]
