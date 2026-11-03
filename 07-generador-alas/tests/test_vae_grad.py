import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from alas.vae import CVAE  # noqa: E402


def test_gradients_match_finite_differences():
    rng = np.random.default_rng(0)
    m = CVAE(x_dim=5, c_dim=2, z_dim=2, hidden=8, beta=0.7, seed=1)
    x, c = rng.normal(size=(6, 5)), rng.normal(size=(6, 2))
    eps = rng.standard_normal((6, 2))
    _, _, _, grads = m.loss_and_grads(x, c, eps)
    params = m.params()
    for p, g in zip(params, grads):
        for _ in range(3):
            idx = tuple(rng.integers(0, s) for s in p.shape)
            old = p[idx]
            p[idx] = old + 1e-6
            lp = m.loss_and_grads(x, c, eps)[0]
            p[idx] = old - 1e-6
            lm = m.loss_and_grads(x, c, eps)[0]
            p[idx] = old
            assert np.isclose(g[idx], (lp - lm) / 2e-6, rtol=1e-4, atol=1e-6)


def test_training_reduces_loss():
    rng = np.random.default_rng(0)
    x = rng.normal(size=(200, 4)) @ rng.normal(size=(4, 4))
    c = x[:, :1]
    m = CVAE(4, 1, z_dim=2, hidden=16, seed=0)
    h = m.fit(x, c, epochs=60, batch=32)
    assert h[-1, 0] < 0.5 * h[0, 0]
