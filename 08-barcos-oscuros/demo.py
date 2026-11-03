"""End-to-end demo on a synthetic Sentinel-1-like scene: detect ships, estimate length, find 'dark' ones."""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from sarpipe.ais import match
from sarpipe.detect import detect_scene, to_db
from sarpipe.synthetic import make_ais, make_scene

HERE = Path(__file__).parent


def evaluate(ships, dets, tol_px=6):
    used, tp, len_err = set(), 0, []
    for s in ships:
        best = None
        for i, d in enumerate(dets):
            dist = np.hypot(d.row - s.row, d.col - s.col)
            if i not in used and dist <= tol_px and (best is None or dist < best[1]):
                best = (i, dist)
        if best:
            used.add(best[0])
            tp += 1
            len_err.append(abs(dets[best[0]].length_m - s.length_m) / s.length_m)
    fp, fn = len(dets) - tp, len(ships) - tp
    prec = tp / max(tp + fp, 1)
    rec = tp / max(tp + fn, 1)
    return {"tp": tp, "fp": fp, "fn": fn, "precision": prec, "recall": rec,
            "f1": 2 * prec * rec / max(prec + rec, 1e-9), "length_rel_err_median": float(np.median(len_err)) if len_err else None}


def main(seed=0):
    img, land, ships = make_scene(seed=seed)
    ais = make_ais(ships, seed=seed)
    dets = detect_scene(img, land, k=6.0)
    pairs, dark, _ = match(dets, ais)
    m = evaluate(ships, dets)
    truth_dark = sum(not s.has_ais for s in ships)
    m.update({"ships": len(ships), "ais_reports": len(ais), "dark_true": truth_dark, "dark_flagged": len(dark)})
    (HERE / "resultados.json").write_text(json.dumps(m, indent=2))
    fig, ax = plt.subplots(1, 2, figsize=(13, 6.5))
    ax[0].imshow(to_db(img), cmap="gray", vmin=-25, vmax=5)
    ax[0].set_title("Escena sintética tipo Sentinel-1 (σ0 dB, VV)")
    ax[1].imshow(to_db(img), cmap="gray", vmin=-25, vmax=5)
    for i, d in enumerate(dets):
        col = "red" if i in dark else "lime"
        ax[1].add_patch(plt.Circle((d.col, d.row), 12, fill=False, color=col, lw=1.5))
    for a in ais:
        ax[1].plot(a[1], a[0], "c+", ms=6)
    ax[1].set_title(f"Detecciones CFAR: verde = con AIS, rojo = OSCURO ({len(dark)}) · + = AIS")
    for a_ in ax:
        a_.axis("off")
    fig.tight_layout(rect=(0, 0, 1, 0.97))
    fig.savefig(HERE / "figuras" / "demo_deteccion.png", dpi=110)
    print(json.dumps(m, indent=2))
    return m


if __name__ == "__main__":
    main()
