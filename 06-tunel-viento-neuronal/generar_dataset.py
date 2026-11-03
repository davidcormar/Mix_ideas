"""Generate the surrogate training set with the vortex panel solver.

Families: NACA 4-digit (70 %) and NACA + smooth random perturbations of camber/thickness (30 %),
so the model sees shapes beyond the NACA family (needed to evaluate generated airfoils in 07).
Output: datos/dataset.npz with X (features + alpha), y (Cl, Cm), group (airfoil id).
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

import numpy as np

from aero.geometry import cosine_x, features, from_camber_thickness, is_valid
from aero.naca import naca4
from aero.panel import solve_many


def naca_camber_thickness(m, p, t, x):
    yt = 5 * t * (0.2969 * np.sqrt(x) - 0.1260 * x - 0.3516 * x**2 + 0.2843 * x**3 - 0.1036 * x**4)
    yc = np.where(x < p, m / p**2 * (2 * p * x - x**2), m / (1 - p) ** 2 * ((1 - 2 * p) + 2 * p * x - x**2))
    return yc, yt


def sample_airfoil(rng: np.random.Generator, perturbed: bool):
    m = rng.uniform(0, 0.06)
    p = rng.uniform(0.2, 0.6)
    t = rng.uniform(0.08, 0.20)
    if not perturbed:
        return naca4(m, p, t, 81)
    x = cosine_x(81)
    yc, yt = naca_camber_thickness(m, p, t, x)
    k = np.arange(1, 4)[:, None]
    yc = yc + (rng.uniform(-0.012, 0.012, (3, 1)) * np.sin(k * np.pi * x)).sum(0)
    yt = yt * (1 + (rng.uniform(-0.25, 0.25, (2, 1)) * np.sin(np.arange(1, 3)[:, None] * np.pi * x)).sum(0))
    return from_camber_thickness(x, yc, yt)


def main(n_airfoils: int, n_alpha: int, seed: int, out: Path) -> None:
    rng = np.random.default_rng(seed)
    Xs, ys, groups = [], [], []
    t0 = time.perf_counter()
    gid = 0
    while gid < n_airfoils:
        X, Y = sample_airfoil(rng, perturbed=rng.random() < 0.3)
        if not is_valid(X, Y, min_thickness=0.05):
            continue
        f = features(X, Y)
        alphas = rng.uniform(-6, 12, n_alpha)
        for a, r in zip(alphas, solve_many(X, Y, alphas)):
            Xs.append(np.concatenate([f, [a]]))
            ys.append([r.cl, r.cm])
            groups.append(gid)
        gid += 1
    dt = time.perf_counter() - t0
    out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(out, X=np.array(Xs), y=np.array(ys), group=np.array(groups), solver_seconds=dt)
    print(f"{len(Xs)} casos ({n_airfoils} perfiles × {n_alpha} ángulos) en {dt:.1f} s → {out}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--perfiles", type=int, default=1500)
    ap.add_argument("--angulos", type=int, default=8)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", type=Path, default=Path("datos/dataset.npz"))
    a = ap.parse_args()
    main(a.perfiles, a.angulos, a.seed, a.out)
