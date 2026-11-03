"""Ejercicios de código — curso 1 de Andrew Ng (rellena cada función).

Reglas: solo NumPy, sin bucles `for` donde se pueda vectorizar (salvo en el descenso de gradiente).
Comprueba tu progreso con:   python ejercicios/comprobar.py
Soluciones (¡solo después de intentarlo!): ../soluciones/soluciones.py
"""
import numpy as np


# ---------- Semana 1 ----------
def compute_cost(X, y, w, b):
    """E1. Coste de regresión lineal J = 1/(2m) Σ (Xw + b − y)².
    X: (m, n) · y: (m,) · w: (n,) · b: float → float"""
    raise NotImplementedError


def compute_gradient(X, y, w, b):
    """E2. Gradiente de J. Devuelve (dj_dw: (n,), dj_db: float)."""
    raise NotImplementedError


def gradient_descent(X, y, w, b, alpha, iters):
    """E3. Descenso de gradiente con actualización simultánea.
    Devuelve (w, b, historial_de_J: list de longitud iters)."""
    raise NotImplementedError


# ---------- Semana 2 ----------
def zscore_fit(X):
    """E4. Devuelve (mu, sigma) por columna."""
    raise NotImplementedError


def zscore_apply(X, mu, sigma):
    """E5. Normaliza X con mu y sigma YA calculados."""
    raise NotImplementedError


def polynomial_features(x, degree):
    """E6. x: (m,) → matriz (m, degree) con columnas x, x², …, x^degree."""
    raise NotImplementedError


def best_learning_rate(X, y, alphas, iters=100):
    """E7. Devuelve el MAYOR alpha de la lista para el que J no aumenta en ninguna iteración (tolerancia relativa 1e-9)
    (empezando en w=0, b=0). Si ninguno cumple, devuelve None."""
    raise NotImplementedError


# ---------- Semana 3 ----------
def sigmoid(z):
    """E8. Sigmoide numéricamente estable (sin overflow para z = ±1000)."""
    raise NotImplementedError


def logistic_cost(X, y, w, b, lam=0.0):
    """E9. Log loss medio + (lam / 2m) Σ w² (b no se regulariza)."""
    raise NotImplementedError


def logistic_gradient(X, y, w, b, lam=0.0):
    """E10. Gradiente del coste anterior. Devuelve (dj_dw, dj_db)."""
    raise NotImplementedError


def predict_proba_threshold(X, w, b, threshold=0.5):
    """E11. Devuelve un array de 0/1 (int) según sigmoid(Xw+b) >= threshold."""
    raise NotImplementedError
