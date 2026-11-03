"""Geometry helpers shared with 07-generador-alas: build contours and extract features."""
from __future__ import annotations

import numpy as np

N_STATIONS = 16
# cosine-spaced stations, excluding LE (0) and TE (1)
STATIONS = 0.5 * (1 - np.cos(np.linspace(0, np.pi, N_STATIONS + 2)[1:-1]))


def cosine_x(n: int = 81) -> np.ndarray:
    return 0.5 * (1 - np.cos(np.linspace(0, np.pi, n)))


def from_camber_thickness(x: np.ndarray, yc: np.ndarray, yt: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Contour (clockwise from TE, lower first) from camber line yc and HALF-thickness yt (vertical offset)."""
    yu, yl = yc + yt, yc - yt
    return np.concatenate([x[::-1], x[1:]]), np.concatenate([yl[::-1], yu[1:]])


def split_surfaces(X: np.ndarray, Y: np.ndarray):
    """Split a clockwise TE->lower->LE->upper->TE contour at the leading edge (min x)."""
    i = int(np.argmin(X))
    xl, yl = X[: i + 1][::-1], Y[: i + 1][::-1]      # LE -> TE
    xu, yu = X[i:], Y[i:]                            # LE -> TE
    return (xu, yu), (xl, yl)


def features(X: np.ndarray, Y: np.ndarray) -> np.ndarray:
    """Camber and thickness at 16 fixed stations → vector of 32 (geometry-agnostic input)."""
    (xu, yu), (xl, yl) = split_surfaces(X, Y)
    ou, ol = np.argsort(xu), np.argsort(xl)
    yu_s = np.interp(STATIONS, xu[ou], yu[ou])
    yl_s = np.interp(STATIONS, xl[ol], yl[ol])
    return np.concatenate([(yu_s + yl_s) / 2, yu_s - yl_s])


def is_valid(X: np.ndarray, Y: np.ndarray, min_thickness: float = 0.0) -> bool:
    """Upper surface above lower everywhere (no self-intersection) and finite values."""
    if not (np.all(np.isfinite(X)) and np.all(np.isfinite(Y))):
        return False
    f = features(X, Y)
    thick = f[N_STATIONS:]
    return bool(np.all(thick > 0) and thick.max() >= min_thickness)
