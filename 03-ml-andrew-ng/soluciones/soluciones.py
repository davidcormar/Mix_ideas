"""SOLUCIONES de ejercicios/ejercicios.py — mira solo después de intentarlo."""
import numpy as np


def compute_cost(X, y, w, b):
    err = X @ w + b - y
    return (err @ err) / (2 * X.shape[0])


def compute_gradient(X, y, w, b):
    err = X @ w + b - y
    return X.T @ err / X.shape[0], err.mean()


def gradient_descent(X, y, w, b, alpha, iters):
    w = np.array(w, dtype=float)
    hist = []
    for _ in range(iters):
        dw, db = compute_gradient(X, y, w, b)
        w, b = w - alpha * dw, b - alpha * db
        hist.append(compute_cost(X, y, w, b))
    return w, b, hist


def zscore_fit(X):
    return X.mean(axis=0), X.std(axis=0)


def zscore_apply(X, mu, sigma):
    return (X - mu) / sigma


def polynomial_features(x, degree):
    return np.column_stack([x ** k for k in range(1, degree + 1)])


def best_learning_rate(X, y, alphas, iters=100):
    best = None
    for a in sorted(alphas):
        with np.errstate(over="ignore", invalid="ignore"):
            _, _, h = gradient_descent(X, y, np.zeros(X.shape[1]), 0.0, a, iters)
        h = [compute_cost(X, y, np.zeros(X.shape[1]), 0.0)] + h
        if all(np.isfinite(h)) and all(h1 <= h0 * (1 + 1e-9) for h0, h1 in zip(h, h[1:])):
            best = a
    return best


def sigmoid(z):
    z = np.asarray(z, dtype=float)
    out = np.empty_like(z)
    pos = z >= 0
    out[pos] = 1 / (1 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1 + ez)
    return out


def logistic_cost(X, y, w, b, lam=0.0):
    m = X.shape[0]
    f = np.clip(sigmoid(X @ w + b), 1e-15, 1 - 1e-15)
    return -(y * np.log(f) + (1 - y) * np.log(1 - f)).mean() + lam / (2 * m) * (w @ w)


def logistic_gradient(X, y, w, b, lam=0.0):
    m = X.shape[0]
    err = sigmoid(X @ w + b) - y
    return X.T @ err / m + lam / m * w, err.mean()


def predict_proba_threshold(X, w, b, threshold=0.5):
    return (sigmoid(X @ w + b) >= threshold).astype(int)
