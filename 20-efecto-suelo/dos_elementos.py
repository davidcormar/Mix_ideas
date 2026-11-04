"""Two-element wing (main + flap), upright or inverted, free stream or in ground effect.

Flap: NACA 4412 scaled to `flap_chord`, leading edge placed at the main trailing edge minus
`overlap` (x) and offset by `gap` (y, on the pressure side), deflected `delta` degrees
trailing-edge towards the pressure side. Coefficients are referred to the TOTAL chord.
"""
from __future__ import annotations

import numpy as np

import suelo
from aero.naca import naca4


def _rot(X, Y, ang_rad, cx, cy):
    x, y = X - cx, Y - cy
    return cx + x * np.cos(ang_rad) - y * np.sin(ang_rad), cy + x * np.sin(ang_rad) + y * np.cos(ang_rad)


def build(delta_deg=20.0, flap_chord=0.35, gap=0.02, overlap=0.03, n=81):
    Xm, Ym = naca4(0.04, 0.4, 0.12, n)
    Xf, Yf = naca4(0.04, 0.4, 0.12, n)
    Xf, Yf = Xf * flap_chord, Yf * flap_chord
    Xf, Yf = _rot(Xf, Yf, -np.radians(delta_deg), 0.0, 0.0)          # TE down (upright)
    Xf, Yf = Xf + 1.0 - overlap, Yf - gap
    return [(Xm, Ym), (Xf, Yf)]


def transform(bodies, alpha_deg, h_over_c=None, invert=False):
    """Rotate the whole assembly about (0.25, 0), optionally invert, and set ride height."""
    out = []
    for X, Y in bodies:
        X, Y = np.asarray(X, float).copy(), np.asarray(Y, float).copy()
        if invert:
            X, Y = X[::-1], -Y[::-1]
        a = np.radians(alpha_deg if invert else -alpha_deg)
        out.append(_rot(X, Y, a, 0.25, 0.0))
    if h_over_c is not None:
        ymin = min(Y.min() for _, Y in out)
        out = [(X, Y - ymin + h_over_c) for X, Y in out]
    return out


def total_cl(bodies, h_over_c=None):
    allb = list(bodies)
    if h_over_c is not None:
        allb += [suelo.mirror(X, Y) for X, Y in bodies]
    res = suelo.solve_bodies(allb)[: len(bodies)]
    chord = max(X.max() for X, _ in bodies) - min(X.min() for X, _ in bodies)
    return sum(r["cl"] for r in res) / chord, [r["cl"] for r in res]


if __name__ == "__main__":
    single = suelo.cl_ground(*naca4(0.04, 0.4, 0.12, 81), 4, None, invert=True)
    print(f"ala simple invertida, α=4°, sin suelo: −Cl = {-single:.3f}")
    for d in (0, 10, 20, 30):
        free = total_cl(transform(build(d), 4, None, True))[0]
        g = total_cl(transform(build(d), 4, 0.2, True), 0.2)[0]
        print(f"flap δ={d:2d}°: −Cl libre = {-free:.3f} · −Cl a h/c=0,2 = {-g:.3f}")
