"""Inviscid ground effect for 2D airfoils: multi-body vortex panel method + method of images.

The ground (y = 0) is a symmetry plane: solving the airfoil together with its mirror image
(reflected about y = 0) makes y = 0 a streamline. Because the ground stays horizontal, the
angle of attack is applied by ROTATING the geometry (not the free stream).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "06-tunel-viento-neuronal"))
from aero.naca import naca4  # noqa: E402


def _coeffs(xc, yc, thi, X0, Y0, S, thj):
    """Kuethe & Chow linear-vortex influence coefficients (control points × panels)."""
    xi = xc[:, None] - X0[None, :]
    yi = yc[:, None] - Y0[None, :]
    thi, thj, Sj = thi[:, None], thj[None, :], S[None, :]
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
    return Cn1, Cn2, Ct1, Ct2


def solve_bodies(bodies):
    """Solve several closed clockwise contours (TE → lower → LE → upper → TE) in a uniform
    horizontal free stream (V∞ = 1). Returns per-body dict with cl (chord = 1), cp, xc, yc."""
    Xs, Ys, owner, node_col, offs = [], [], [], [], []
    col = 0
    for b, (X, Y) in enumerate(bodies):
        n = len(X) - 1
        offs.append(col)
        Xs.append(X[:-1]); Ys.append(Y[:-1])
        owner += [b] * n
        node_col += list(range(col, col + n))
        col += n + 1
    X0 = np.concatenate(Xs); Y0 = np.concatenate(Ys)
    X1 = np.concatenate([X[1:] for X, _ in bodies]); Y1 = np.concatenate([Y[1:] for _, Y in bodies])
    S = np.hypot(X1 - X0, Y1 - Y0)
    th = np.arctan2(Y1 - Y0, X1 - X0)
    xc, yc = (X0 + X1) / 2, (Y0 + Y1) / 2
    Cn1, Cn2, Ct1, Ct2 = _coeffs(xc, yc, th, X0, Y0, S, th)
    M = len(S)
    idx = np.arange(M)
    Cn1[idx, idx], Cn2[idx, idx] = -1.0, 1.0
    Ct1[idx, idx], Ct2[idx, idx] = np.pi / 2, np.pi / 2
    nc = col
    AN = np.zeros((M + len(bodies), nc))
    AT = np.zeros((M, nc))
    cols = np.array(node_col)
    for j in range(M):
        AN[:M, cols[j]] += Cn1[:, j]
        AN[:M, cols[j] + 1] += Cn2[:, j]
        AT[:, cols[j]] += Ct1[:, j]
        AT[:, cols[j] + 1] += Ct2[:, j]
    rhs = np.zeros(M + len(bodies))
    rhs[:M] = np.sin(th)  # alpha_flow = 0
    for b, (X, _) in enumerate(bodies):  # Kutta condition per body
        AN[M + b, offs[b]] = 1
        AN[M + b, offs[b] + len(X) - 1] = 1
    gamma = np.linalg.lstsq(AN, rhs, rcond=None)[0] if AN.shape[0] != AN.shape[1] else np.linalg.solve(AN, rhs)
    V = np.cos(th) + AT @ gamma
    cp = 1 - V**2
    owner = np.array(owner)
    out = []
    for b in range(len(bodies)):
        m = owner == b
        nx, ny = -np.sin(th[m]), np.cos(th[m])
        fy = (-cp[m] * ny * S[m]).sum()
        fx = (-cp[m] * nx * S[m]).sum()
        out.append({"cl": float(fy), "cd_inviscid": float(fx), "cp": cp[m], "xc": xc[m], "yc": yc[m]})
    return out


def place(X, Y, alpha_deg: float, h_over_c: float | None, invert: bool = False):
    """Rotate the airfoil by alpha (nose up = positive) about c/4 and lift it so that its
    lowest point is at height h above the ground (y = 0). invert=True → upside-down wing (F1);
    then alpha > 0 means NOSE DOWN, i.e. the incidence that produces downforce."""
    X = np.asarray(X, float).copy()
    Y = np.asarray(Y, float).copy()
    if invert:  # mirror vertically and reverse to keep clockwise ordering
        Y = -Y
        X, Y = X[::-1], Y[::-1]
    a = -np.radians(-alpha_deg if invert else alpha_deg)  # nose-up rotation in a left-to-right flow
    x0 = X - 0.25
    Xr = 0.25 + x0 * np.cos(a) - Y * np.sin(a)
    Yr = x0 * np.sin(a) + Y * np.cos(a)
    if h_over_c is not None:
        Yr = Yr - Yr.min() + h_over_c
    return Xr, Yr


def mirror(X, Y):
    """Image about y = 0, reversed to keep clockwise ordering."""
    return X[::-1].copy(), -Y[::-1].copy()


def cl_ground(X, Y, alpha_deg: float, h_over_c: float | None, invert: bool = False) -> float:
    Xp, Yp = place(X, Y, alpha_deg, h_over_c, invert)
    if h_over_c is None:
        return solve_bodies([(Xp, Yp)])[0]["cl"]
    return solve_bodies([(Xp, Yp), mirror(Xp, Yp)])[0]["cl"]


if __name__ == "__main__":
    X, Y = naca4(0.04, 0.4, 0.12, 81)
    for h in [None, 1.0, 0.5, 0.25, 0.15, 0.1, 0.05]:
        print(h, round(cl_ground(X, Y, 4, h, invert=True), 4))
