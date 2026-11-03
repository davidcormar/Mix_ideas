"""Train the conditional VAE on UIUC CST coefficients and evaluate generated airfoils.

Condition c = [Cl at α=4° (panel solver), max thickness]. Generated airfoils are checked for
geometric validity, evaluated with the panel solver (ground truth) and the 06 surrogate (fast).
Outputs: figuras/*.png, resultados.json, modelos/cvae.npz
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "06-tunel-viento-neuronal"))

from aero.geometry import features  # noqa: E402
from aero.panel import solve  # noqa: E402
from alas.cst import evaluate, max_thickness, surfaces_ok, to_contour  # noqa: E402
from alas.vae import CVAE  # noqa: E402

ALPHA = 4.0
TARGETS = [(0.6, 0.09), (0.9, 0.12), (1.2, 0.14), (1.5, 0.12), (0.8, 0.18)]
XS = 0.5 * (1 - np.cos(np.linspace(0, np.pi, 60)))


def shape_vec(A):
    yu, yl = evaluate(A[:8], A[8:], XS)
    return np.concatenate([yu, yl])


def assess(A):
    """Return (valid, cl_panel, tmax)."""
    Au, Al = A[:8], A[8:]
    if not surfaces_ok(Au, Al, min_thickness=0.02):
        return False, np.nan, np.nan
    X, Y = to_contour(Au, Al)
    r = solve(X, Y, ALPHA)
    if not (-1 < r.cl < 3 and abs(r.cl - r.cl_circ) < 0.05 * max(1, abs(r.cl))):
        return False, np.nan, np.nan
    return True, r.cl, max_thickness(Au, Al)


def main(epochs: int = 400, seed: int = 0) -> dict:
    d = np.load(HERE / "datos/uiuc_cst.npz")
    A, C = d["A"], np.column_stack([d["cl4"], d["tmax"]])
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(A))
    nte = int(0.15 * len(A))
    te, tr = idx[:nte], idx[nte:]
    xm, xs = A[tr].mean(0), A[tr].std(0)
    cm, cs = C[tr].mean(0), C[tr].std(0)
    nx = lambda a: (a - xm) / xs  # noqa: E731
    nc = lambda c: (np.atleast_2d(c) - cm) / cs  # noqa: E731

    model = CVAE(x_dim=16, c_dim=2, z_dim=4, hidden=64, beta=0.3, seed=seed)
    t0 = time.perf_counter()
    hist = model.fit(nx(A[tr]), nc(C[tr]), epochs=epochs, batch=64, lr=2e-3)
    train_s = time.perf_counter() - t0

    # reconstruction on test airfoils (geometry error in chord units)
    mu, _ = model.encode(nx(A[te]), nc(C[te]))
    rec = model.decode(mu, nc(C[te])) * xs + xm
    geo_err = np.array([np.abs(shape_vec(a) - shape_vec(b)).max() for a, b in zip(rec, A[te])])

    # conditional generation
    train_shapes = np.array([shape_vec(a) for a in A[tr]])
    gen_rows, gen_examples = [], {}
    for cl_t, t_t in TARGETS:
        samples = model.sample(nc([cl_t, t_t]), n=60, temperature=0.8) * xs + xm
        res = [assess(a) for a in samples]
        ok = [(a, cl, t) for a, (v, cl, t) in zip(samples, res) if v]
        cls = np.array([o[1] for o in ok])
        ts = np.array([o[2] for o in ok])
        nn = [np.abs(train_shapes - shape_vec(o[0])).max(1).min() for o in ok]
        gen_rows.append({"target_cl": cl_t, "target_t": t_t, "valid_pct": 100 * len(ok) / len(samples),
                         "cl_mean": float(cls.mean()), "cl_mae": float(np.abs(cls - cl_t).mean()),
                         "t_mean": float(ts.mean()), "t_mae": float(np.abs(ts - t_t).mean()),
                         "nn_dist_median": float(np.median(nn))})
        gen_examples[(cl_t, t_t)] = ok[:6]

    # surrogate (06) on UIUC airfoils: out-of-distribution check
    sur = None
    try:
        from aero.surrogate import load
        sur = load()
    except Exception as exc:  # noqa: BLE001
        print("surrogate not available:", exc)
    sur_res = {}
    if sur is not None:
        sub = te[:200]
        feats = np.array([np.r_[features(*to_contour(a[:8], a[8:])), ALPHA] for a in A[sub]])
        pred = sur.predict(feats)[:, 0]
        sur_res = {"uiuc_test_mae_cl": float(np.abs(pred - C[sub, 0]).mean()),
                   "uiuc_test_p95_cl": float(np.percentile(np.abs(pred - C[sub, 0]), 95))}

    sub = rng.choice(len(train_shapes), 300, replace=False)
    loo = []
    for k in sub:
        dist = np.abs(train_shapes - train_shapes[k]).max(1)
        dist[k] = np.inf
        loo.append(dist.min())
    out = {"train_nn_dist_median": float(np.median(loo)), "n_train": int(len(tr)), "n_test": int(len(te)), "train_seconds": round(train_s, 1),
           "final_loss": hist[-1].round(4).tolist(),
           "recon_max_err_median": float(np.median(geo_err)), "recon_max_err_p90": float(np.percentile(geo_err, 90)),
           "generation": gen_rows, "surrogate_06_on_uiuc": sur_res}
    (HERE / "resultados.json").write_text(json.dumps(out, indent=2))
    (HERE / "modelos").mkdir(exist_ok=True)
    np.savez_compressed(HERE / "modelos/cvae.npz", *model.params(), xm=xm, xs=xs, cm=cm, cs=cs)

    # ---- figures
    fd = HERE / "figuras"
    fd.mkdir(exist_ok=True)
    fig, ax = plt.subplots(len(TARGETS), 1, figsize=(8, 2.0 * len(TARGETS)), sharex=True)
    for a_, (key, ok) in zip(ax, gen_examples.items()):
        for A_, cl, t in ok:
            X, Y = to_contour(A_[:8], A_[8:])
            a_.plot(X, Y, lw=1, label=f"Cl={cl:.2f} t={t:.3f}")
        a_.set_aspect("equal")
        a_.set_title(f"Objetivo: Cl(4°)={key[0]}, t/c={key[1]}", fontsize=10)
        a_.legend(fontsize=6, loc="upper right", ncol=2)
    ax[-1].set_xlabel("x/c")
    fig.tight_layout()
    fig.savefig(fd / "perfiles_generados.png", dpi=120)

    fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
    ax[0].plot(hist[:, 1], label="reconstrucción")
    ax[0].plot(hist[:, 2], label="KL")
    ax[0].set_yscale("log"); ax[0].set_xlabel("época"); ax[0].legend(); ax[0].set_title("Entrenamiento del CVAE")
    tg = [r["target_cl"] for r in gen_rows]
    ax[1].errorbar(tg, [r["cl_mean"] for r in gen_rows], yerr=[r["cl_mae"] for r in gen_rows], fmt="o")
    ax[1].plot([0.4, 1.7], [0.4, 1.7], "k--")
    ax[1].set_xlabel("Cl pedido"); ax[1].set_ylabel("Cl obtenido (paneles)"); ax[1].set_title("¿Obedece la condición?")
    fig.tight_layout()
    fig.savefig(fd / "entrenamiento_y_condicion.png", dpi=120)

    # latent interpolation between two real airfoils
    i, j = tr[0], tr[1]
    z0, _ = model.encode(nx(A[i])[None], nc(C[i]))
    z1, _ = model.encode(nx(A[j])[None], nc(C[j]))
    fig, ax = plt.subplots(figsize=(8, 3))
    for k, w in enumerate(np.linspace(0, 1, 6)):
        c = (1 - w) * C[i] + w * C[j]
        a = model.decode((1 - w) * z0 + w * z1, nc(c))[0] * xs + xm
        X, Y = to_contour(a[:8], a[8:])
        ax.plot(X, Y + 0.12 * k, color=plt.cm.viridis(w))
    ax.set_aspect("equal"); ax.set_yticks([])
    ax.set_title(f"Interpolación en el espacio latente: {d['names'][i]} → {d['names'][j]}")
    fig.tight_layout()
    fig.savefig(fd / "interpolacion_latente.png", dpi=120)
    print(json.dumps(out, indent=2))
    return out


if __name__ == "__main__":
    main()
