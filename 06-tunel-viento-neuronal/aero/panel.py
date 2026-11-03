"""Linear-strength vortex panel method (Kuethe & Chow formulation), inviscid & incompressible.

Input: closed airfoil contour ordered clockwise from the trailing edge along the lower surface
to the leading edge and back along the upper surface (as produced by `naca4`). Chord = 1.
Output: Cl, Cm about c/4 and Cp at each panel control point.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class PanelResult:
    cl: float
    cm: float           # about quarter chord, nose-up positive
    cl_circ: float      # lift from Kutta-Joukowski (consistency check)
    xc: np.ndarray
    yc: np.ndarray
    cp: np.ndarray


def _influence(X: np.ndarray, Y: np.ndarray):
    N = len(X) - 1
    xc, yc = 0.5 * (X[:-1] + X[1:]), 0.5 * (Y[:-1] + Y[1:])
    dx, dy = np.diff(X), np.diff(Y)
    S = np.hypot(dx, dy)
    th = np.arctan2(dy, dx)
    xi = xc[:, None] - X[None, :-1]
    yi = yc[:, None] - Y[None, :-1]
    thi, thj = th[:, None], th[None, :]
    Sj = S[None, :]
    A = -xi * np.cos(thj) - yi * np.sin(thj)
    B = xi**2 + yi**2
    C = np.sin(thi - thj)
    D = np.cos(thi - thj)
    E = xi * np.sin(thj) - yi * np.cos(thj)
    with np.errstate(divide="ignore", invalid="ignore"):
        F = np.log1p(Sj * (Sj + 2 * A) / B)
        G = np.arctan2(E * Sj, B + A * Sj)
    P = xi * np.sin(thi - 2 * thj) + yi * np.cos(thi - 2 * thj)
    Q = xi * np.cos(thi - 2 * thj) - yi * np.sin(thi - 2 * thj)
    Cn2 = D + 0.5 * Q * F / Sj - (A * C + D * E) * G / Sj
    Cn1 = 0.5 * D * F + C * G - Cn2
    Ct2 = C + 0.5 * P * F / Sj + (A * D - C * E) * G / Sj
    Ct1 = 0.5 * C * F - D * G - Ct2
    idx = np.arange(N)
    Cn1[idx, idx], Cn2[idx, idx] = -1.0, 1.0
    Ct1[idx, idx], Ct2[idx, idx] = np.pi / 2, np.pi / 2
    AN = np.zeros((N + 1, N + 1))
    AT = np.zeros((N, N + 1))
    AN[:N, :N] += Cn1
    AN[:N, 1:] += Cn2
    AT[:, :N] += Ct1
    AT[:, 1:] += Ct2
    AN[N, 0] = AN[N, N] = 1.0  # Kutta condition: gamma_TE,lower + gamma_TE,upper = 0
    return AN, AT, xc, yc, S, th


def solve(X: np.ndarray, Y: np.ndarray, alpha_deg: float) -> PanelResult:
    AN, AT, xc, yc, S, th = _influence(X, Y)
    return _solve_with(AN, AT, xc, yc, S, th, np.atleast_1d(alpha_deg))[0]


def solve_many(X: np.ndarray, Y: np.ndarray, alphas_deg) -> list[PanelResult]:
    """Same geometry, several angles: the influence matrix is built and factorised once."""
    AN, AT, xc, yc, S, th = _influence(X, Y)
    return _solve_with(AN, AT, xc, yc, S, th, np.atleast_1d(alphas_deg))


def _solve_with(AN, AT, xc, yc, S, th, alphas_deg) -> list[PanelResult]:
    N = len(S)
    a = np.radians(np.asarray(alphas_deg, dtype=float))
    rhs = np.zeros((N + 1, a.size))
    rhs[:N] = np.sin(th[:, None] - a[None, :])
    gamma = np.linalg.solve(AN, rhs)
    V = np.cos(th[:, None] - a[None, :]) + AT @ gamma
    cp = 1 - V**2
    # outward normal for clockwise contour: (-sin th, cos th)
    nx, ny = -np.sin(th), np.cos(th)
    fx = (-cp * (nx * S)[:, None]).sum(0)
    fy = (-cp * (ny * S)[:, None]).sum(0)
    cl = fy * np.cos(a) - fx * np.sin(a)
    dfx, dfy = -cp * (nx * S)[:, None], -cp * (ny * S)[:, None]
    cm = (-(xc[:, None] - 0.25) * dfy + yc[:, None] * dfx).sum(0)
    circ = (0.5 * (gamma[:-1] + gamma[1:]) * S[:, None]).sum(0)
    # gamma here is normalised by 2*pi*Vinf (Kuethe & Chow): Gamma = 2*pi*sum -> Cl = 2*Gamma
    cl_circ = 4 * np.pi * circ
    return [PanelResult(float(cl[k]), float(cm[k]), float(cl_circ[k]), xc, yc, cp[:, k]) for k in range(a.size)]
