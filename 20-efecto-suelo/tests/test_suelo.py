import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import suelo  # noqa: E402
from aero.naca import naca4  # noqa: E402
from aero.panel import solve  # noqa: E402

X, Y = naca4(0.04, 0.4, 0.12, 81)


def test_free_stream_matches_single_body_solver():
    assert suelo.cl_ground(X, Y, 4, None) == pytest.approx(solve(X, Y, 4).cl, abs=1e-6)


def test_inverted_wing_gives_downforce():
    assert suelo.cl_ground(X, Y, 4, None, invert=True) == pytest.approx(-solve(X, Y, 4).cl, abs=1e-6)


def test_far_from_ground_recovers_free_stream():
    assert suelo.cl_ground(X, Y, 4, 30) == pytest.approx(solve(X, Y, 4).cl, rel=0.01)


def test_downforce_grows_as_ground_approaches():
    cls = [-suelo.cl_ground(X, Y, 4, h, invert=True) for h in (1.0, 0.5, 0.2, 0.1)]
    assert all(b > a for a, b in zip(cls, cls[1:]))


def test_image_is_antisymmetric():
    Xp, Yp = suelo.place(X, Y, 4, 0.2, True)
    r = suelo.solve_bodies([(Xp, Yp), suelo.mirror(Xp, Yp)])
    assert r[0]["cl"] == pytest.approx(-r[1]["cl"], rel=1e-9)


def test_symmetric_airfoil_is_sucked_to_ground():
    # classic inviscid result: venturi under a symmetric section at 0° → negative lift
    assert suelo.cl_ground(*naca4(0, 0.4, 0.12, 81), 0, 0.2) < 0


def test_mesh_convergence():
    a = suelo.cl_ground(*naca4(0.04, 0.4, 0.12, 81), 4, 0.1, True)
    b = suelo.cl_ground(*naca4(0.04, 0.4, 0.12, 161), 4, 0.1, True)
    assert a == pytest.approx(b, rel=0.005)


def test_place_sets_ride_height():
    Xp, Yp = suelo.place(X, Y, 3, 0.15, True)
    assert Yp.min() == pytest.approx(0.15)
