import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent / "06-tunel-viento-neuronal"))

from aero.naca import naca4  # noqa: E402
from aero.panel import solve  # noqa: E402
from alas.cst import fit_surface, max_thickness, surfaces_ok, to_contour  # noqa: E402
from alas.io import read_dat  # noqa: E402


def _naca_surfaces():
    X, Y = naca4(0.02, 0.4, 0.12, 101)
    i = np.argmin(X)
    return np.column_stack([X[i:], Y[i:]]), np.column_stack([X[: i + 1][::-1], Y[: i + 1][::-1]])


def test_cst_fits_naca_and_preserves_aero():
    up, lo = _naca_surfaces()
    Au, _, ru = fit_surface(*up.T)
    Al, _, rl = fit_surface(*lo.T)
    assert max(ru, rl) < 5e-4
    assert max_thickness(Au, Al) == pytest.approx(0.12, abs=0.003)
    assert solve(*to_contour(Au, Al), 4).cl == pytest.approx(solve(*naca4(0.02, 0.4, 0.12), 4).cl, abs=0.02)


def test_surfaces_ok_detects_crossing():
    up, lo = _naca_surfaces()
    Au, _, _ = fit_surface(*up.T)
    Al, _, _ = fit_surface(*lo.T)
    assert surfaces_ok(Au, Al)
    assert not surfaces_ok(Al, Au)  # swapped -> lower above upper


def test_read_selig_and_lednicer(tmp_path):
    up, lo = _naca_surfaces()
    selig = np.vstack([up[::-1], lo[1:]])
    f = tmp_path / "s.dat"
    f.write_text("NACA 2412\n" + "\n".join(f"{x:.6f} {y:.6f}" for x, y in selig))
    name, u, l_ = read_dat(f)
    assert name == "NACA 2412" and u[:, 1].max() > 0.07 and l_[:, 1].min() < -0.015
    g = tmp_path / "l.dat"
    g.write_text("LED\n%d. %d.\n\n" % (len(up), len(lo)) + "\n".join(f"{x} {y}" for x, y in up) + "\n\n"
                 + "\n".join(f"{x} {y}" for x, y in lo))
    _, u2, l2 = read_dat(g)
    assert np.allclose(u2, u, atol=1e-6) and np.allclose(l2, l_, atol=1e-6)


def test_dataset_file_is_consistent():
    d = np.load(ROOT / "datos" / "uiuc_cst.npz")
    assert d["A"].shape[1] == 16 and len(d["A"]) > 1500
    assert np.all((d["cl4"] > -1) & (d["cl4"] < 3))
