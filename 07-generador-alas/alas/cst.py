"""Kulfan CST (Class-Shape Transformation) parametrisation of airfoil surfaces.

y(x) = C(x) · S(x) + x · dz_te,   C(x) = sqrt(x) (1 - x),   S(x) = Σ_i A_i · B_{i,n}(x)
with Bernstein polynomials B_{i,n}. Linear in A → least-squares fit.
"""
from __future__ import annotations

from math import comb

import numpy as np

ORDER = 7  # 8 coefficients per surface


def basis(x: np.ndarray, n: int = ORDER) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    C = np.sqrt(np.clip(x, 0, 1)) * (1 - x)
    return np.column_stack([C * comb(n, i) * x**i * (1 - x) ** (n - i) for i in range(n + 1)])


def fit_surface(x: np.ndarray, y: np.ndarray, n: int = ORDER) -> tuple[np.ndarray, float, float]:
    """Least squares fit → (A, dz_te, rmse)."""
    dz = float(y[np.argmax(x)])
    target = y - x * dz
    B = basis(x, n)
    A, *_ = np.linalg.lstsq(B, target, rcond=None)
    rmse = float(np.sqrt(np.mean((B @ A - target) ** 2)))
    return A, dz, rmse


def evaluate(Au: np.ndarray, Al: np.ndarray, x: np.ndarray, dz_u: float = 0.0, dz_l: float = 0.0):
    yu = basis(x, len(Au) - 1) @ Au + x * dz_u
    yl = basis(x, len(Al) - 1) @ Al + x * dz_l
    return yu, yl


def to_contour(Au, Al, n: int = 81):
    """Closed contour (TE -> lower -> LE -> upper -> TE) for the panel solver of 06."""
    x = 0.5 * (1 - np.cos(np.linspace(0, np.pi, n)))
    yu, yl = evaluate(Au, Al, x)
    return np.concatenate([x[::-1], x[1:]]), np.concatenate([yl[::-1], yu[1:]])


def surfaces_ok(Au, Al, min_thickness: float = 0.0, n: int = 400) -> bool:
    """Dense check: upper strictly above lower on (0, 1) and max thickness >= min_thickness."""
    x = 0.5 * (1 - np.cos(np.linspace(0, np.pi, n)))[1:-1]
    yu, yl = evaluate(Au, Al, x)
    th = yu - yl
    return bool(np.all(np.isfinite(th)) and np.all(th > 0) and th.max() >= min_thickness)


def max_thickness(Au, Al, n: int = 400) -> float:
    x = 0.5 * (1 - np.cos(np.linspace(0, np.pi, n)))
    yu, yl = evaluate(Au, Al, x)
    return float((yu - yl).max())
