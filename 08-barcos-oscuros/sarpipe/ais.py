"""Match SAR detections with AIS positions (optimal assignment with a distance gate)."""
from __future__ import annotations

import numpy as np
from scipy.optimize import linear_sum_assignment


def match(dets, ais, pixel_m=10.0, gate_m=500.0):
    """Return (pairs [(det_idx, ais_idx)], dark_det_idx, unmatched_ais_idx).

    In real data AIS must first be interpolated to the image acquisition time (±minutes) —
    a ship at 15 kn moves ~460 m per minute, so the gate depends on the time gap.
    """
    if not dets or not ais:
        return [], list(range(len(dets))), list(range(len(ais)))
    D = np.array([[d.row, d.col] for d in dets])
    A = np.array([[a[0], a[1]] for a in ais])
    cost = np.hypot(D[:, None, 0] - A[None, :, 0], D[:, None, 1] - A[None, :, 1]) * pixel_m
    big = 1e9
    c = np.where(cost <= gate_m, cost, big)
    ri, ci = linear_sum_assignment(c)
    pairs = [(int(r), int(k)) for r, k in zip(ri, ci) if c[r, k] < big]
    md = {p[0] for p in pairs}
    ma = {p[1] for p in pairs}
    return pairs, [i for i in range(len(dets)) if i not in md], [j for j in range(len(ais)) if j not in ma]
