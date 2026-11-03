import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from aero.geometry import N_STATIONS, features, from_camber_thickness, cosine_x, is_valid  # noqa: E402
from aero.naca import naca4, naca_name  # noqa: E402
from aero.panel import solve, solve_many  # noqa: E402


def test_naca_closed_and_ordered():
    X, Y = naca4(0.02, 0.4, 0.12)
    assert X[0] == pytest.approx(1) and X[-1] == pytest.approx(1)
    assert Y[0] == pytest.approx(Y[-1], abs=1e-9)          # closed TE
    i = np.argmin(X)
    assert Y[: i].mean() < Y[i + 1:].mean()                 # lower surface first
    assert naca_name(0.02, 0.4, 0.12) == "NACA 2412"


def test_symmetric_zero_lift():
    X, Y = naca4(0, 0.4, 0.12)
    r = solve(X, Y, 0)
    assert abs(r.cl) < 1e-6 and abs(r.cm) < 1e-6


def test_naca0012_alpha5_matches_reference():
    # Inviscid reference (XFOIL inviscid / Kuethe & Chow): Cl ≈ 0.60
    r = solve(*naca4(0, 0.4, 0.12), 5)
    assert r.cl == pytest.approx(0.60, abs=0.02)


def test_lift_slope_near_thin_airfoil_theory():
    X, Y = naca4(0, 0.4, 0.12)
    r = solve_many(X, Y, [0, 2])
    slope = (r[1].cl - r[0].cl) / np.radians(2)
    # thin airfoil: 2π; thickness raises it by ~ (1 + 0.77 t/c) ≈ 6.86 /rad
    assert 2 * np.pi < slope < 7.2


def test_cambered_zero_lift_and_moment():
    r = solve(*naca4(0.02, 0.4, 0.12), 0)
    assert r.cl == pytest.approx(0.25, abs=0.03)    # α_L0 ≈ -2.1°
    assert r.cm == pytest.approx(-0.053, abs=0.006)  # thin airfoil theory for 2412


def test_pressure_and_circulation_lift_agree():
    r = solve(*naca4(0.04, 0.4, 0.15), 6)
    assert r.cl == pytest.approx(r.cl_circ, rel=0.02)


def test_features_and_validity():
    X, Y = naca4(0.02, 0.4, 0.12)
    f = features(X, Y)
    assert f.shape == (2 * N_STATIONS,)
    assert f[N_STATIONS:].max() == pytest.approx(0.12, abs=0.005)  # max thickness
    assert is_valid(X, Y)
    x = cosine_x(41)
    Xb, Yb = from_camber_thickness(x, 0 * x, -0.01 * np.ones_like(x))  # negative thickness
    assert not is_valid(Xb, Yb)


def test_tiny_dataset_and_surrogate(tmp_path):
    import generar_dataset as gd
    out = tmp_path / "d.npz"
    gd.main(30, 4, 1, out)
    d = np.load(out)
    assert d["X"].shape == (120, 2 * N_STATIONS + 1) and d["y"].shape == (120, 2)
    assert len(np.unique(d["group"])) == 30
