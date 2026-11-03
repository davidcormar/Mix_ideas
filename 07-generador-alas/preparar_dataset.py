"""Parse UIUC .dat files → CST coefficients + conditions (Cl at α=4° from the panel solver, t_max).

Output: datos/uiuc_cst.npz (committed, small)
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "06-tunel-viento-neuronal"))

from aero.geometry import is_valid  # noqa: E402
from aero.panel import solve  # noqa: E402
from alas.cst import fit_surface, max_thickness, surfaces_ok, to_contour  # noqa: E402
from alas.io import read_dat  # noqa: E402

ALPHA_REF = 4.0
MAX_RMSE = 1.5e-3


def process(path: Path):
    name, up, lo = read_dat(path)
    if len(up) < 10 or len(lo) < 10:
        raise ValueError("too few points")
    if np.any(np.diff(up[:, 0]) < -1e-6) or np.any(np.diff(lo[:, 0]) < -1e-6):
        raise ValueError("non-monotonic x (flaps, multi-element?)")
    Au, _, ru = fit_surface(up[:, 0], up[:, 1])
    Al, _, rl = fit_surface(lo[:, 0], lo[:, 1])
    if max(ru, rl) > MAX_RMSE:
        raise ValueError(f"CST fit rmse {max(ru, rl):.4f}")
    X, Y = to_contour(Au, Al)
    if not (surfaces_ok(Au, Al, min_thickness=0.02) and is_valid(X, Y)):
        raise ValueError("invalid after CST (crossing or too thin)")
    tmax = max_thickness(Au, Al)
    if tmax > 0.30:
        raise ValueError("too thick")
    r = solve(X, Y, ALPHA_REF)
    if not (-1 < r.cl < 3 and abs(r.cl - r.cl_circ) < 0.05 * max(1, abs(r.cl))):
        raise ValueError("solver ill-conditioned")
    cl = r.cl
    return name, np.concatenate([Au, Al]), cl, tmax


def main() -> None:
    files = sorted((HERE / "datos" / "uiuc_raw").glob("*.dat"))
    names, A, cl, t, rejected = [], [], [], [], {}
    for f in files:
        try:
            n, a, c, tm = process(f)
        except Exception as exc:  # noqa: BLE001
            key = str(exc).split(" ")[0]
            rejected[key] = rejected.get(key, 0) + 1
            continue
        names.append(f.stem)
        A.append(a)
        cl.append(c)
        t.append(tm)
    np.savez_compressed(HERE / "datos" / "uiuc_cst.npz", names=np.array(names), A=np.array(A),
                        cl4=np.array(cl), tmax=np.array(t))
    print(f"{len(names)}/{len(files)} perfiles válidos. Rechazados: {rejected}")
    print(f"Cl(4°): {np.min(cl):.2f}..{np.max(cl):.2f} · t_max: {np.min(t):.3f}..{np.max(t):.3f}")


if __name__ == "__main__":
    main()
