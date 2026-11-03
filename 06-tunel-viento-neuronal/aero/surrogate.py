"""Surrogate wrapper (lives in the package so pickles load from any script)."""
from __future__ import annotations

from pathlib import Path

import numpy as np

DEFAULT_PATH = Path(__file__).resolve().parents[1] / "modelos" / "surrogate.joblib"


class Surrogate:
    """sklearn pipeline + target de-standardisation. Input: features(32) + alpha(deg). Output: [Cl, Cm]."""

    def __init__(self, model, y_mu, y_sd):
        self.model, self.y_mu, self.y_sd = model, y_mu, y_sd

    def predict(self, X):
        return self.model.predict(np.atleast_2d(X)) * self.y_sd + self.y_mu


def load(path: Path = DEFAULT_PATH) -> Surrogate:
    import joblib
    return joblib.load(path)
