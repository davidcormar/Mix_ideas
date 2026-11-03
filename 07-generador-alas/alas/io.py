"""Read Selig / Lednicer .dat airfoil files and normalise them (LE at 0, TE at 1)."""
from __future__ import annotations

from pathlib import Path

import numpy as np


def _floats(line: str):
    try:
        vals = [float(v) for v in line.replace(",", " ").split()]
    except ValueError:
        return None
    return vals if len(vals) == 2 else None


def read_dat(path: str | Path) -> tuple[str, np.ndarray, np.ndarray]:
    """Return (name, upper[x,y] LE->TE, lower[x,y] LE->TE), chord-normalised."""
    lines = Path(path).read_text(encoding="latin-1").splitlines()
    name = lines[0].strip()
    rows = [r for r in (_floats(l) for l in lines[1:]) if r is not None]
    if not rows:
        raise ValueError("no coordinates")
    if rows[0][0] > 1.5 and rows[0][1] > 1.5:  # Lednicer: first row = point counts
        nu, nl = int(rows[0][0]), int(rows[0][1])
        pts = np.array(rows[1:])
        up, lo = pts[:nu], pts[nu: nu + nl]
    else:  # Selig: TE -> upper -> LE -> lower -> TE
        pts = np.array(rows)
        i = int(np.argmin(pts[:, 0]))
        up, lo = pts[: i + 1][::-1], pts[i:]
    up, lo = _normalise(up, lo)
    return name, up, lo


def _normalise(up: np.ndarray, lo: np.ndarray):
    le = up[0] if up[0, 0] <= lo[0, 0] else lo[0]
    te = 0.5 * (up[-1] + lo[-1])
    v = te - le
    chord = np.hypot(*v)
    if chord <= 0:
        raise ValueError("degenerate chord")
    ang = np.arctan2(v[1], v[0])
    R = np.array([[np.cos(-ang), -np.sin(-ang)], [np.sin(-ang), np.cos(-ang)]])

    def tr(p):
        return ((p - le) @ R.T) / chord

    return tr(up), tr(lo)
