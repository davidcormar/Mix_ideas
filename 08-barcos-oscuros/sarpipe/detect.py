"""Classical baseline detector: two-parameter CA-CFAR + connected components + length estimate."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage


@dataclass
class Detection:
    row: float
    col: float
    length_m: float
    peak_db: float
    n_pixels: int


def to_db(x):
    return 10 * np.log10(np.maximum(x, 1e-10))


def tiles(shape, size=512, overlap=64):
    """Yield (r0, c0, r1, c1) windows covering the scene with overlap (real scenes are ~25k×17k px)."""
    H, W = shape
    step = size - overlap
    for r0 in range(0, max(H - overlap, 1), step):
        for c0 in range(0, max(W - overlap, 1), step):
            yield r0, c0, min(r0 + size, H), min(c0 + size, W)


def ca_cfar(img, land=None, guard=14, train=10, k=5.0):
    """Cell-averaging CFAR on intensity: pixel is a target if I > mean + k·std of the training ring.

    The ring excludes a guard window around the cell so the ship itself does not raise the threshold:
    guard must exceed half the longest ship (250 m / 10 m px / 2 ≈ 13 px) or long hulls get split.
    Computed with box filters (O(N) instead of looping over pixels).
    """
    x = img.astype(float).copy()
    if land is not None:
        x[land] = np.median(x[~land])
    outer, inner = 2 * (guard + train) + 1, 2 * guard + 1
    s_o = ndimage.uniform_filter(x, outer) * outer**2
    s_i = ndimage.uniform_filter(x, inner) * inner**2
    q_o = ndimage.uniform_filter(x * x, outer) * outer**2
    q_i = ndimage.uniform_filter(x * x, inner) * inner**2
    n = outer**2 - inner**2
    mu = (s_o - s_i) / n
    var = np.maximum((q_o - q_i) / n - mu**2, 1e-12)
    mask = x > mu + k * np.sqrt(var)
    if land is not None:
        mask &= ~ndimage.binary_dilation(land, iterations=3)
    return mask


def components(mask, img, pixel_m=10.0, min_pixels=2):
    # close small gaps along the hull so one ship = one component
    lab, n = ndimage.label(ndimage.binary_closing(mask, np.ones((3, 3))) | mask, structure=np.ones((3, 3)))
    dets = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        rr, cc = np.nonzero(lab[sl] == i)
        if len(rr) < min_pixels:
            continue
        rr = rr + sl[0].start
        cc = cc + sl[1].start
        w = img[rr, cc]
        r, c = np.average(rr, weights=w), np.average(cc, weights=w)
        # length ≈ extent along the principal axis (PCA of pixel coordinates)
        if len(rr) > 2:
            cov = np.cov(np.vstack([rr, cc]))
            evals, evecs = np.linalg.eigh(cov)
            proj = np.vstack([rr - rr.mean(), cc - cc.mean()]).T @ evecs[:, -1]
            L = (proj.max() - proj.min() + 1) * pixel_m
        else:
            L = len(rr) * pixel_m
        dets.append(Detection(float(r), float(c), float(L), float(to_db(w.max())), len(rr)))
    return dets


def detect_scene(img, land=None, pixel_m=10.0, tile=512, overlap=64, **cfar):
    """Tile → CFAR → components → merge duplicates from overlaps."""
    dets = []
    for r0, c0, r1, c1 in tiles(img.shape, tile, overlap):
        sub_land = None if land is None else land[r0:r1, c0:c1]
        m = ca_cfar(img[r0:r1, c0:c1], sub_land, **cfar)
        for d in components(m, img[r0:r1, c0:c1], pixel_m):
            d.row += r0
            d.col += c0
            dets.append(d)
    merged: list[Detection] = []
    for d in sorted(dets, key=lambda d: -d.n_pixels):
        if all(np.hypot(d.row - m.row, d.col - m.col) > 5 for m in merged):
            merged.append(d)
    return merged
