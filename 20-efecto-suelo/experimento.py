"""Ground-effect sweep + small surrogate with ride height as input.

Outputs: figuras/barrido_altura.png, figuras/cp_suelo.png, resultados.json
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.model_selection import GroupShuffleSplit
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

import suelo
from aero.geometry import features
from aero.naca import naca4

HERE = Path(__file__).parent


def sweep():
    X, Y = naca4(0.04, 0.4, 0.12, 81)
    hs = np.geomspace(0.05, 2.0, 25)
    fig, ax = plt.subplots(figsize=(6.5, 4.2))
    res = {}
    for a in [0, 2, 4, 6]:
        cl = [-suelo.cl_ground(X, Y, a, h, invert=True) for h in hs]
        cl_inf = -suelo.cl_ground(X, Y, a, None, invert=True)
        ax.plot(hs, cl, "o-", ms=3, label=f"α={a}° (libre: {cl_inf:.2f})")
        res[f"alpha_{a}"] = {"h": hs.round(3).tolist(), "downforce_cl": np.round(cl, 3).tolist(), "free": round(cl_inf, 3)}
    ax.set_xscale("log"); ax.set_xlabel("altura al suelo h/c"); ax.set_ylabel("carga aerodinámica  −Cl")
    ax.set_title("NACA 4412 invertido en efecto suelo (no viscoso)")
    ax.axvspan(0.05, 0.1, color="red", alpha=0.08)
    ax.text(0.052, ax.get_ylim()[1] * 0.9, "zona donde en la realidad\nla carga cae (separación)", fontsize=8, color="darkred")
    ax.legend(fontsize=8); fig.tight_layout(); fig.savefig(HERE / "figuras/barrido_altura.png", dpi=120)

    fig, ax = plt.subplots(figsize=(6.5, 4))
    for h, st in [(None, "k-"), (0.5, "b--"), (0.15, "r-")]:
        Xp, Yp = suelo.place(X, Y, 4, h if h else 1.0, invert=True)
        bodies = [(Xp, Yp)] if h is None else [(Xp, Yp), suelo.mirror(Xp, Yp)]
        r = suelo.solve_bodies(bodies)[0]
        ax.plot(r["xc"], -r["cp"], st, lw=1.2, label="sin suelo" if h is None else f"h/c={h}")
    ax.set_xlabel("x/c"); ax.set_ylabel("−Cp"); ax.legend(); ax.set_title("Distribución de presiones, α=4° (invertido)")
    fig.tight_layout(); fig.savefig(HERE / "figuras/cp_suelo.png", dpi=120)
    return res


def surrogate(n_airfoils=300, per=6, seed=0):
    rng = np.random.default_rng(seed)
    Xs, ys, g = [], [], []
    t0 = time.perf_counter()
    for k in range(n_airfoils):
        m, p, t = rng.uniform(0, 0.06), rng.uniform(0.2, 0.6), rng.uniform(0.08, 0.18)
        X, Y = naca4(m, p, t, 61)
        f = features(X, Y)
        for _ in range(per):
            a, h = rng.uniform(0, 8), float(np.exp(rng.uniform(np.log(0.08), np.log(2.0))))
            Xs.append(np.r_[f, a, np.log(h)]); ys.append(-suelo.cl_ground(X, Y, a, h, invert=True)); g.append(k)
    gen_s = time.perf_counter() - t0
    Xs, ys, g = np.array(Xs), np.array(ys), np.array(g)
    tr, te = next(GroupShuffleSplit(1, test_size=0.2, random_state=0).split(Xs, ys, g))
    model = make_pipeline(StandardScaler(), MLPRegressor(hidden_layer_sizes=(128, 128), activation="tanh", max_iter=3000, tol=1e-7,
                                                         early_stopping=True, n_iter_no_change=60, random_state=0))
    mu, sd = ys[tr].mean(), ys[tr].std()
    model.fit(Xs[tr], (ys[tr] - mu) / sd)
    pred = model.predict(Xs[te]) * sd + mu
    rel = np.abs(pred - ys[te]) / np.abs(ys[te])
    t0 = time.perf_counter(); model.predict(Xs[te]); nn_ms = (time.perf_counter() - t0) * 1000 / len(te)
    return {"cases": len(ys), "generation_s": round(gen_s, 1), "solver_ms_per_case": round(gen_s * 1000 / len(ys), 1),
            "nn_ms_per_case": nn_ms, "mae": float(np.abs(pred - ys[te]).mean()), "median_rel_err": float(np.median(rel)),
            "p95_rel_err": float(np.percentile(rel, 95))}


if __name__ == "__main__":
    out = {"sweep": sweep(), "surrogate": surrogate()}
    (HERE / "resultados.json").write_text(json.dumps(out, indent=1))
    print(json.dumps(out["surrogate"], indent=1))
    print({k: (v["free"], v["downforce_cl"][0]) for k, v in out["sweep"].items()})
