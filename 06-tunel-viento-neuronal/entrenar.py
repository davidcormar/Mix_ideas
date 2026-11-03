"""Train the neural surrogate (Cl, Cm) and compare accuracy and speed against the panel solver.

Split is BY AIRFOIL (GroupShuffleSplit) so test airfoils are never seen during training.
Outputs: modelos/surrogate.joblib, figuras/*.png, resultados.md
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from aero.naca import naca4
from aero.panel import solve
from aero.surrogate import Surrogate

HERE = Path(__file__).parent


def build_model(seed: int = 0):
    mlp = MLPRegressor(hidden_layer_sizes=(128, 128), activation="tanh", alpha=1e-6,
                       learning_rate_init=1e-3, max_iter=2000, tol=1e-7, early_stopping=True,
                       validation_fraction=0.1, n_iter_no_change=50, random_state=seed)
    return make_pipeline(StandardScaler(), mlp)


def main() -> None:
    d = np.load(HERE / "datos/dataset.npz")
    X, y, g = d["X"], d["y"], d["group"]
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=0).split(X, y, g))
    y_mu, y_sd = y[tr].mean(0), y[tr].std(0)

    t0 = time.perf_counter()
    model = build_model().fit(X[tr], (y[tr] - y_mu) / y_sd)
    train_s = time.perf_counter() - t0
    sur = Surrogate(model, y_mu, y_sd)
    pred = sur.predict(X[te])

    ridge = make_pipeline(StandardScaler(), Ridge(1e-3)).fit(X[tr], y[tr])
    pred_lin = ridge.predict(X[te])

    res = {"n_train": int(len(tr)), "n_test": int(len(te)), "train_seconds": round(train_s, 1)}
    for k, name in enumerate(["Cl", "Cm"]):
        res[name] = {
            "MAE_mlp": float(mean_absolute_error(y[te, k], pred[:, k])),
            "R2_mlp": float(r2_score(y[te, k], pred[:, k])),
            "MAE_ridge": float(mean_absolute_error(y[te, k], pred_lin[:, k])),
            "R2_ridge": float(r2_score(y[te, k], pred_lin[:, k])),
            "p95_abs_err_mlp": float(np.percentile(np.abs(y[te, k] - pred[:, k]), 95)),
        }

    # speed: 1000 evaluations
    n = 1000
    Xb = X[te][:n]
    t0 = time.perf_counter()
    sur.predict(Xb)
    t_nn = time.perf_counter() - t0
    Xa, Ya = naca4(0.02, 0.4, 0.12, 81)
    t0 = time.perf_counter()
    for a in np.linspace(-6, 12, 100):
        solve(Xa, Ya, a)
    t_panel = (time.perf_counter() - t0) / 100 * n
    res["speed"] = {"nn_ms_per_1000": t_nn * 1000, "panel_ms_per_1000": t_panel * 1000,
                    "speedup": t_panel / t_nn}

    (HERE / "modelos").mkdir(exist_ok=True)
    joblib.dump(sur, HERE / "modelos/surrogate.joblib")
    (HERE / "resultados.json").write_text(json.dumps(res, indent=2))

    # ---- figures
    fig_dir = HERE / "figuras"
    fig_dir.mkdir(exist_ok=True)
    fig, ax = plt.subplots(1, 2, figsize=(10, 4.2))
    for k, name in enumerate(["Cl", "Cm"]):
        ax[k].scatter(y[te, k], pred[:, k], s=3, alpha=0.4)
        lo, hi = y[te, k].min(), y[te, k].max()
        ax[k].plot([lo, hi], [lo, hi], "k--", lw=1)
        ax[k].set_xlabel(f"{name} panel (verdad)")
        ax[k].set_ylabel(f"{name} red")
        ax[k].set_title(f"{name}: MAE={res[name]['MAE_mlp']:.4f}  R²={res[name]['R2_mlp']:.4f}")
    fig.suptitle("Surrogate vs. método de paneles (perfiles de test no vistos)")
    fig.tight_layout()
    fig.savefig(fig_dir / "paridad.png", dpi=120)

    # polar for unseen NACA 4415 (not necessarily in the training set)
    Xn, Yn = naca4(0.04, 0.4, 0.15, 81)
    from aero.geometry import features
    f = features(Xn, Yn)
    al = np.linspace(-6, 12, 37)
    cl_p = [solve(Xn, Yn, a).cl for a in al]
    cl_n = sur.predict(np.column_stack([np.tile(f, (al.size, 1)), al]))[:, 0]
    fig, ax = plt.subplots(1, 2, figsize=(10, 4))
    ax[0].plot(al, cl_p, "k-", label="paneles")
    ax[0].plot(al, cl_n, "r--", label="red neuronal")
    ax[0].set_xlabel("α (°)"); ax[0].set_ylabel("Cl"); ax[0].legend(); ax[0].set_title("NACA 4415: curva Cl-α")
    r = solve(Xn, Yn, 4)
    ax[1].plot(r.xc, -r.cp, "b"); ax[1].set_xlabel("x/c"); ax[1].set_ylabel("-Cp")
    ax[1].set_title(f"NACA 4415, α=4°: distribución de presiones (Cl={r.cl:.3f})")
    fig.tight_layout()
    fig.savefig(fig_dir / "naca4415.png", dpi=120)

    err = np.abs(y[te, 0] - pred[:, 0])
    fig, ax = plt.subplots(figsize=(5, 3.5))
    ax.hist(err, bins=50)
    ax.set_xlabel("|error Cl|"); ax.set_ylabel("casos"); ax.set_title("Distribución del error en Cl")
    fig.tight_layout()
    fig.savefig(fig_dir / "error_cl.png", dpi=120)
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
