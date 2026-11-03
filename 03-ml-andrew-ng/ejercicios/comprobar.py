"""Auto-checker for the exercises. Usage:
    python ejercicios/comprobar.py                 # checks ejercicios/ejercicios.py
    python ejercicios/comprobar.py --soluciones    # checks soluciones/soluciones.py
"""
import importlib.util
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def load(solutions: bool):
    path = ROOT / ("soluciones/soluciones.py" if solutions else "ejercicios/ejercicios.py")
    spec = importlib.util.spec_from_file_location("mod", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def data():
    rng = np.random.default_rng(1)
    X = rng.normal(size=(50, 3))
    y = X @ np.array([1.5, -2.0, 0.5]) + 3 + rng.normal(0, 0.1, 50)
    yc = (X[:, 0] - X[:, 1] > 0).astype(float)
    return X, y, yc


def checks(m):
    X, y, yc = data()
    w, b = np.array([0.1, 0.2, 0.3]), 0.5

    def e1():
        assert np.isclose(m.compute_cost(X, y, np.zeros(3), 0.0), (y @ y) / 100)
        assert np.isclose(m.compute_cost(X, X @ w + b, w, b), 0.0)

    def e2():
        dw, db = m.compute_gradient(X, y, w, b)
        eps = 1e-6
        num = [(m.compute_cost(X, y, w + eps * np.eye(3)[j], b) - m.compute_cost(X, y, w - eps * np.eye(3)[j], b)) / (2 * eps) for j in range(3)]
        assert np.allclose(dw, num, atol=1e-5)
        assert np.isclose(db, (m.compute_cost(X, y, w, b + eps) - m.compute_cost(X, y, w, b - eps)) / (2 * eps), atol=1e-5)

    def e3():
        wf, bf, h = m.gradient_descent(X, y, np.zeros(3), 0.0, 0.1, 1000)
        assert len(h) == 1000 and h[-1] < h[0]
        assert np.allclose(wf, [1.5, -2.0, 0.5], atol=0.1) and abs(bf - 3) < 0.1

    def e4_e5():
        Z = np.column_stack([np.arange(10.0), 100 * np.arange(10.0)])
        mu, sd = m.zscore_fit(Z)
        Zn = m.zscore_apply(Z, mu, sd)
        assert np.allclose(Zn.mean(0), 0) and np.allclose(Zn.std(0), 1)
        assert np.allclose(m.zscore_apply(np.array([[4.5, 450.0]]), mu, sd), 0)

    def e6():
        P = m.polynomial_features(np.array([1.0, 2.0, 3.0]), 3)
        assert P.shape == (3, 3) and np.allclose(P[2], [3, 9, 27])

    def e7():
        a = m.best_learning_rate(X, y, [0.001, 0.01, 0.1, 1.0, 3.0])
        assert a == 1.0, a
        assert m.best_learning_rate(X * 100, y, [1.0, 3.0]) is None

    def e8():
        s = m.sigmoid(np.array([-1000.0, 0.0, 1000.0]))
        assert np.all(np.isfinite(s)) and np.allclose(s, [0, 0.5, 1])

    def e9():
        assert np.isclose(m.logistic_cost(X, yc, np.zeros(3), 0.0), np.log(2))
        c0 = m.logistic_cost(X, yc, w, b)
        assert np.isclose(m.logistic_cost(X, yc, w, b, lam=1.0), c0 + (w @ w) / 100)

    def e10():
        for lam in (0.0, 0.7):
            dw, db = m.logistic_gradient(X, yc, w, b, lam)
            eps = 1e-6
            num = [(m.logistic_cost(X, yc, w + eps * np.eye(3)[j], b, lam) - m.logistic_cost(X, yc, w - eps * np.eye(3)[j], b, lam)) / (2 * eps) for j in range(3)]
            assert np.allclose(dw, num, atol=1e-5)

    def e11():
        p = m.predict_proba_threshold(np.array([[1.0], [-1.0], [0.0]]), np.array([2.0]), 0.0)
        assert p.tolist() == [1, 0, 1]
        assert m.predict_proba_threshold(np.array([[0.0]]), np.array([1.0]), 0.0, 0.6).tolist() == [0]

    return {"E1 compute_cost": e1, "E2 compute_gradient": e2, "E3 gradient_descent": e3,
            "E4-E5 zscore": e4_e5, "E6 polynomial_features": e6, "E7 best_learning_rate": e7,
            "E8 sigmoid": e8, "E9 logistic_cost": e9, "E10 logistic_gradient": e10,
            "E11 predict": e11}


def run(solutions=False) -> int:
    m = load(solutions)
    ok = 0
    items = checks(m)
    for name, fn in items.items():
        try:
            fn()
            print(f"✅ {name}")
            ok += 1
        except NotImplementedError:
            print(f"⬜ {name} (sin hacer)")
        except Exception as exc:  # noqa: BLE001
            print(f"❌ {name}: {type(exc).__name__} {exc}")
    print(f"\n{ok}/{len(items)} correctos")
    return ok


if __name__ == "__main__":
    sys.exit(0 if run("--soluciones" in sys.argv) == len(checks(load("--soluciones" in sys.argv))) else 1)
