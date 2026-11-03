"""Minimal conditional VAE in pure NumPy (manual backprop + Adam).

Encoder q(z | x, c): [x, c] -> tanh(H) -> tanh(H) -> (mu, logvar)
Decoder p(x | z, c): [z, c] -> tanh(H) -> tanh(H) -> x_hat
Loss = mean_batch( ||x - x_hat||^2 + beta * KL(q || N(0, I)) )
"""
from __future__ import annotations

import numpy as np


class MLP:
    """tanh hidden layers, linear output. Stores activations for backprop."""

    def __init__(self, sizes: list[int], rng: np.random.Generator):
        self.W = [rng.normal(0, np.sqrt(1 / a), (a, b)) for a, b in zip(sizes, sizes[1:])]
        self.b = [np.zeros(b) for b in sizes[1:]]

    def forward(self, x):
        self.acts = [x]
        h = x
        for i, (W, b) in enumerate(zip(self.W, self.b)):
            h = h @ W + b
            if i < len(self.W) - 1:
                h = np.tanh(h)
            self.acts.append(h)
        return h

    def backward(self, grad_out):
        """Returns (grads_W, grads_b, grad_input)."""
        gW, gb = [None] * len(self.W), [None] * len(self.W)
        g = grad_out
        for i in reversed(range(len(self.W))):
            if i < len(self.W) - 1:
                g = g * (1 - self.acts[i + 1] ** 2)
            gW[i] = self.acts[i].T @ g
            gb[i] = g.sum(0)
            g = g @ self.W[i].T
        return gW, gb, g

    def params(self):
        return self.W + self.b


class Adam:
    def __init__(self, params, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8):
        self.p, self.lr, self.b1, self.b2, self.eps = params, lr, b1, b2, eps
        self.m = [np.zeros_like(x) for x in params]
        self.v = [np.zeros_like(x) for x in params]
        self.t = 0

    def step(self, grads):
        self.t += 1
        for p, g, m, v in zip(self.p, grads, self.m, self.v):
            m *= self.b1
            m += (1 - self.b1) * g
            v *= self.b2
            v += (1 - self.b2) * g * g
            mh = m / (1 - self.b1**self.t)
            vh = v / (1 - self.b2**self.t)
            p -= self.lr * mh / (np.sqrt(vh) + self.eps)


class CVAE:
    def __init__(self, x_dim: int, c_dim: int, z_dim: int = 4, hidden: int = 64, beta: float = 0.5, seed: int = 0):
        self.rng = np.random.default_rng(seed)
        self.x_dim, self.c_dim, self.z_dim, self.beta = x_dim, c_dim, z_dim, beta
        self.enc = MLP([x_dim + c_dim, hidden, hidden, 2 * z_dim], self.rng)
        self.dec = MLP([z_dim + c_dim, hidden, hidden, x_dim], self.rng)

    # ---- core
    def loss_and_grads(self, x, c, eps=None):
        B = x.shape[0]
        h = self.enc.forward(np.hstack([x, c]))
        mu, logvar = h[:, : self.z_dim], np.clip(h[:, self.z_dim:], -10, 10)
        if eps is None:
            eps = self.rng.standard_normal(mu.shape)
        std = np.exp(0.5 * logvar)
        z = mu + std * eps
        xh = self.dec.forward(np.hstack([z, c]))
        rec = ((xh - x) ** 2).sum(1).mean()
        kl = (-0.5 * (1 + logvar - mu**2 - np.exp(logvar)).sum(1)).mean()
        loss = rec + self.beta * kl
        # backprop
        g_xh = 2 * (xh - x) / B
        gWd, gbd, g_in_dec = self.dec.backward(g_xh)
        g_z = g_in_dec[:, : self.z_dim]
        g_mu = g_z + self.beta * mu / B
        g_lv = g_z * eps * 0.5 * std + self.beta * 0.5 * (np.exp(logvar) - 1) / B
        gWe, gbe, _ = self.enc.backward(np.hstack([g_mu, g_lv]))
        grads = gWe + gWd + gbe + gbd
        return loss, rec, kl, grads

    def params(self):
        return self.enc.W + self.dec.W + self.enc.b + self.dec.b

    def fit(self, x, c, epochs=300, batch=64, lr=2e-3, verbose=False):
        opt = Adam(self.params(), lr=lr)
        hist = []
        n = len(x)
        for ep in range(epochs):
            idx = self.rng.permutation(n)
            tot = np.zeros(3)
            for s in range(0, n, batch):
                j = idx[s: s + batch]
                loss, rec, kl, g = self.loss_and_grads(x[j], c[j])
                opt.step(g)
                tot += np.array([loss, rec, kl]) * len(j)
            hist.append(tot / n)
            if verbose and ep % 50 == 0:
                print(ep, (tot / n).round(4))
        return np.array(hist)

    # ---- inference
    def encode(self, x, c):
        h = self.enc.forward(np.hstack([x, c]))
        return h[:, : self.z_dim], h[:, self.z_dim:]

    def decode(self, z, c):
        return self.dec.forward(np.hstack([z, c]))

    def sample(self, c, n=None, temperature=1.0):
        c = np.atleast_2d(c)
        if n is not None:
            c = np.repeat(c, n, axis=0)
        z = self.rng.standard_normal((len(c), self.z_dim)) * temperature
        return self.decode(z, c)
