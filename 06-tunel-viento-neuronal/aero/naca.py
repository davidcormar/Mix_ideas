"""NACA 4-digit airfoil generator (closed trailing edge, cosine spacing)."""
from __future__ import annotations

import numpy as np


def naca4(m: float, p: float, t: float, n: int = 81) -> tuple[np.ndarray, np.ndarray]:
    """Return (x, y) of a closed contour: TE -> lower surface -> LE -> upper surface -> TE.

    m: max camber (fraction of chord, e.g. 0.02) · p: position of max camber (e.g. 0.4)
    t: max thickness (e.g. 0.12) · n: points per surface (2n-1 total).
    The ordering (clockwise) is what the vortex panel solver expects.
    """
    beta = np.linspace(0, np.pi, n)
    x = 0.5 * (1 - np.cos(beta))
    yt = 5 * t * (0.2969 * np.sqrt(x) - 0.1260 * x - 0.3516 * x**2 + 0.2843 * x**3 - 0.1036 * x**4)
    yc = np.zeros_like(x)
    dyc = np.zeros_like(x)
    if m > 0 and 0 < p < 1:
        f = x < p
        yc[f] = m / p**2 * (2 * p * x[f] - x[f] ** 2)
        yc[~f] = m / (1 - p) ** 2 * ((1 - 2 * p) + 2 * p * x[~f] - x[~f] ** 2)
        dyc[f] = 2 * m / p**2 * (p - x[f])
        dyc[~f] = 2 * m / (1 - p) ** 2 * (p - x[~f])
    th = np.arctan(dyc)
    xu, yu = x - yt * np.sin(th), yc + yt * np.cos(th)
    xl, yl = x + yt * np.sin(th), yc - yt * np.cos(th)
    X = np.concatenate([xl[::-1], xu[1:]])
    Y = np.concatenate([yl[::-1], yu[1:]])
    return X, Y


def naca_name(m: float, p: float, t: float) -> str:
    return f"NACA {round(m * 100)}{round(p * 10)}{round(t * 100):02d}"
