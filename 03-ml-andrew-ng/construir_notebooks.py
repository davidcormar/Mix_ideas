"""Build and execute the course notebooks (so they ship with outputs and plots).

Usage: python construir_notebooks.py   (needs nbformat, nbclient, ipykernel)
"""
from pathlib import Path

import nbformat as nbf
from nbclient import NotebookClient

HERE = Path(__file__).parent / "notebooks"
md, code = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell

SETUP = """import numpy as np
import matplotlib.pyplot as plt
np.random.seed(0)
plt.rcParams["figure.figsize"] = (6, 4)"""

NB = {}

NB["01_regresion_lineal_univariable"] = [
    md("# 01 · Regresión lineal univariable desde cero\n\nSemana 1. Problema: predecir el tiempo de 5K (min) a partir del ritmo medio de las series de 1 km (min/km). Datos **sintéticos** generados con una relación lineal + ruido."),
    code(SETUP),
    md("## 1. Datos"),
    code("""m = 40
x = np.random.uniform(4.8, 6.2, m)            # 1 km rep pace (min/km)
y = 5.3 * x - 1.2 + np.random.normal(0, 0.4, m)  # 5K time (min)
plt.scatter(x, y); plt.xlabel("ritmo series 1 km (min/km)"); plt.ylabel("5K (min)"); plt.title("Datos"); plt.show()"""),
    md("## 2. Modelo y función de coste\n$f_{w,b}(x)=wx+b$, $J(w,b)=\\frac{1}{2m}\\sum (f(x^{(i)})-y^{(i)})^2$"),
    code("""def predict(x, w, b):
    return w * x + b

def compute_cost(x, y, w, b):
    m = x.shape[0]
    err = predict(x, w, b) - y
    return (err ** 2).sum() / (2 * m)

print("J(0,0) =", compute_cost(x, y, 0, 0))
print("J(5,0) =", compute_cost(x, y, 5, 0))"""),
    md("## 3. Gradiente\n$\\partial J/\\partial w = \\frac1m\\sum(f-y)x$, $\\partial J/\\partial b=\\frac1m\\sum(f-y)$"),
    code("""def compute_gradient(x, y, w, b):
    m = x.shape[0]
    err = predict(x, w, b) - y
    return (err * x).sum() / m, err.sum() / m

# numerical check (finite differences) — always worth doing once
eps = 1e-6
dw, db = compute_gradient(x, y, 1.0, 1.0)
dw_num = (compute_cost(x, y, 1 + eps, 1) - compute_cost(x, y, 1 - eps, 1)) / (2 * eps)
print(f"analytic {dw:.6f}  numeric {dw_num:.6f}")"""),
    md("## 4. Descenso de gradiente"),
    code("""def gradient_descent(x, y, w, b, alpha, iters):
    history = []
    for _ in range(iters):
        dw, db = compute_gradient(x, y, w, b)   # both with OLD values
        w, b = w - alpha * dw, b - alpha * db   # simultaneous update
        history.append(compute_cost(x, y, w, b))
    return w, b, history

w, b, hist = gradient_descent(x, y, 0.0, 0.0, alpha=0.02, iters=20000)
print(f"w = {w:.3f}, b = {b:.3f}, J = {hist[-1]:.4f}")
w_ls, b_ls = np.polyfit(x, y, 1)
print(f"least squares (numpy): w = {w_ls:.3f}, b = {b_ls:.3f}")"""),
    md("> Fíjate: tras 20.000 iteraciones **aún no** coincide del todo con la solución exacta. No es un bug: el valle de $J$ es muy alargado porque $x$ no está centrado (ver sección 6). En la semana 2 la normalización lo arregla en ~300 iteraciones."),
    code("""fig, ax = plt.subplots(1, 2, figsize=(11, 4))
ax[0].plot(hist); ax[0].set_yscale("log"); ax[0].set_xlabel("iteración"); ax[0].set_ylabel("J"); ax[0].set_title("Curva de aprendizaje")
xs = np.linspace(4.8, 6.2, 50)
ax[1].scatter(x, y); ax[1].plot(xs, predict(xs, w, b), "r"); ax[1].set_title("Recta ajustada")
plt.show()"""),
    md("## 5. Efecto de la tasa de aprendizaje α\nObserva: con α grande **diverge**. Sin escalar $x$ (valores ~5) el α máximo estable es pequeño y hay que iterar mucho: lo arreglaremos en la semana 2."),
    code("""for alpha in [0.001, 0.02, 0.06]:
    _, _, h = gradient_descent(x, y, 0.0, 0.0, alpha, 200)
    plt.plot(h, label=f"α={alpha}")
plt.yscale("log"); plt.legend(); plt.xlabel("iteración"); plt.ylabel("J"); plt.title("α pequeño, bueno y excesivo"); plt.show()"""),
    md("## 6. Curvas de nivel de J"),
    code("""W, B = np.meshgrid(np.linspace(-5, 15, 200), np.linspace(-40, 40, 200))
J = np.array([[compute_cost(x, y, wi, bi) for wi, bi in zip(rw, rb)] for rw, rb in zip(W, B)])
plt.contour(W, B, J, levels=np.logspace(-1, 3, 15)); plt.plot(w, b, "r*", ms=12)
plt.xlabel("w"); plt.ylabel("b"); plt.title("J(w,b): valle alargado → convergencia lenta"); plt.show()"""),
    md("> **Para pensar:** ¿por qué el valle es tan alargado? Pista: compara la escala de $x$ (≈5) con la de la columna de unos que multiplica a $b$."),
]

NB["02_regresion_multivariable_normalizacion"] = [
    md("# 02 · Regresión multivariable y normalización\n\nSemana 2. Datos sintéticos de pisos: superficie (m²), habitaciones, antigüedad (años) → precio (miles de €)."),
    code(SETUP),
    code("""m = 200
area = np.random.uniform(40, 160, m)
rooms = np.random.randint(1, 6, m).astype(float)
age = np.random.uniform(0, 60, m)
X = np.column_stack([area, rooms, age])
y = 2.2 * area + 12 * rooms - 0.9 * age + 40 + np.random.normal(0, 15, m)
print(X[:3]); print("rangos:", X.min(0), X.max(0))"""),
    md("## 1. Funciones vectorizadas"),
    code("""def compute_cost(X, y, w, b):
    err = X @ w + b - y
    return (err @ err) / (2 * X.shape[0])

def compute_gradient(X, y, w, b):
    m = X.shape[0]
    err = X @ w + b - y
    return X.T @ err / m, err.mean()

def gradient_descent(X, y, w, b, alpha, iters):
    hist = []
    for _ in range(iters):
        dw, db = compute_gradient(X, y, w, b)
        w, b = w - alpha * dw, b - alpha * db
        hist.append(compute_cost(X, y, w, b))
    return w, b, hist"""),
    md("## 2. Sin normalizar"),
    code("""w0 = np.zeros(3)
for alpha in [1e-4, 3e-4]:
    _, _, h = gradient_descent(X, y, w0, 0.0, alpha, 300)
    print(f"α={alpha}: J final = {h[-1]:.3g}  ({'diverge' if not np.isfinite(h[-1]) or h[-1] > h[0] else 'baja'})")"""),
    md("## 3. Z-score\n$x_j \\leftarrow (x_j-\\mu_j)/\\sigma_j$ — guarda μ y σ para normalizar datos nuevos."),
    code("""def zscore_fit(X):
    return X.mean(axis=0), X.std(axis=0)

def zscore_apply(X, mu, sigma):
    return (X - mu) / sigma

mu, sigma = zscore_fit(X)
Xn = zscore_apply(X, mu, sigma)
wn, bn, hn = gradient_descent(Xn, y, np.zeros(3), 0.0, alpha=0.1, iters=300)
_, _, h_raw = gradient_descent(X, y, np.zeros(3), 0.0, alpha=1e-4, iters=300)
plt.plot(h_raw, label="sin normalizar (α=1e-4)"); plt.plot(hn, label="z-score (α=0.1)")
plt.yscale("log"); plt.legend(); plt.xlabel("iteración"); plt.ylabel("J"); plt.show()
print("w (escala normalizada):", wn.round(2), " b:", round(bn, 2))"""),
    md("## 4. Recuperar los coeficientes en unidades originales y comparar con la ecuación normal"),
    code("""w_orig = wn / sigma
b_orig = bn - (wn * mu / sigma).sum()
Xb = np.column_stack([np.ones(m), X])
theta = np.linalg.lstsq(Xb, y, rcond=None)[0]
print("descenso de gradiente:", w_orig.round(3), round(b_orig, 2))
print("mínimos cuadrados    :", theta[1:].round(3), round(theta[0], 2))
print("valores reales       : [2.2, 12, -0.9] 40")"""),
    md("## 5. Predicción para un piso nuevo (¡normalizando con μ, σ del entrenamiento!)"),
    code("""nuevo = np.array([[90, 3, 20]])
print(f"precio estimado: {(zscore_apply(nuevo, mu, sigma) @ wn + bn)[0]:.1f} k€")"""),
    md("## 6. Regresión polinómica\nCaracterísticas $x, x^2, x^3$: el modelo sigue siendo lineal en los parámetros. Sin escalar, $x^3$ domina."),
    code("""xp = np.linspace(0, 10, 60)
yp = 0.08 * xp**3 - xp**2 + 3 * xp + np.random.normal(0, 1.2, xp.size)
F = np.column_stack([xp, xp**2, xp**3])
mu_p, s_p = zscore_fit(F)
wp, bp, _ = gradient_descent(zscore_apply(F, mu_p, s_p), yp, np.zeros(3), 0.0, 0.1, 5000)
plt.scatter(xp, yp, s=12); plt.plot(xp, zscore_apply(F, mu_p, s_p) @ wp + bp, "r"); plt.title("Ajuste cúbico con descenso de gradiente"); plt.show()"""),
]

NB["03_regresion_logistica"] = [
    md("# 03 · Regresión logística desde cero\n\nSemana 3. Primero un ejemplo 2D sintético (para ver la frontera de decisión) y después el dataset real *Breast Cancer Wisconsin* (incluido en scikit-learn, sin descarga)."),
    code(SETUP),
    code("""def sigmoid(z):
    return 1 / (1 + np.exp(-z))

z = np.linspace(-8, 8, 200)
plt.plot(z, sigmoid(z)); plt.axhline(0.5, ls="--", c="gray"); plt.title("g(z) = 1 / (1 + e^-z)"); plt.show()"""),
    md("## 1. Coste logístico y gradiente"),
    code("""def compute_cost(X, y, w, b):
    f = sigmoid(X @ w + b)
    eps = 1e-12  # avoid log(0)
    return -(y * np.log(f + eps) + (1 - y) * np.log(1 - f + eps)).mean()

def compute_gradient(X, y, w, b):
    err = sigmoid(X @ w + b) - y
    return X.T @ err / X.shape[0], err.mean()

def gradient_descent(X, y, w, b, alpha, iters):
    hist = []
    for _ in range(iters):
        dw, db = compute_gradient(X, y, w, b)
        w, b = w - alpha * dw, b - alpha * db
        hist.append(compute_cost(X, y, w, b))
    return w, b, hist

def predict(X, w, b, thr=0.5):
    return (sigmoid(X @ w + b) >= thr).astype(int)"""),
    md("## 2. Ejemplo 2D: horas de estudio y horas de sueño → aprobar"),
    code("""m = 150
X2 = np.column_stack([np.random.uniform(0, 10, m), np.random.uniform(4, 9, m)])
y2 = (0.9 * X2[:, 0] + 1.2 * X2[:, 1] - 11 + np.random.normal(0, 1, m) > 0).astype(float)
w2, b2, h2 = gradient_descent(X2, y2, np.zeros(2), 0.0, alpha=0.1, iters=5000)
print("w =", w2.round(3), "b =", round(b2, 3), " accuracy =", (predict(X2, w2, b2) == y2).mean())
xs = np.linspace(0, 10, 50)
plt.scatter(*X2[y2 == 1].T, marker="+", label="aprueba"); plt.scatter(*X2[y2 == 0].T, marker="o", facecolors="none", edgecolors="C1", label="suspende")
plt.plot(xs, -(w2[0] * xs + b2) / w2[1], "k", label="frontera w·x+b=0"); plt.ylim(4, 9)
plt.xlabel("horas de estudio"); plt.ylabel("horas de sueño"); plt.legend(); plt.show()"""),
    md("## 3. Dataset real: cáncer de mama (569 casos, 30 características)"),
    code("""from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
data = load_breast_cancer()
Xtr, Xte, ytr, yte = train_test_split(data.data, data.target, test_size=0.25, random_state=0, stratify=data.target)
mu, sd = Xtr.mean(0), Xtr.std(0)
Xtr_n, Xte_n = (Xtr - mu) / sd, (Xte - mu) / sd   # normalize with TRAIN stats only
w, b, h = gradient_descent(Xtr_n, ytr, np.zeros(Xtr.shape[1]), 0.0, alpha=0.1, iters=3000)
print(f"accuracy train {(predict(Xtr_n, w, b) == ytr).mean():.3f} · test {(predict(Xte_n, w, b) == yte).mean():.3f}")
plt.plot(h); plt.xlabel("iteración"); plt.ylabel("J"); plt.title("Log loss (entrenamiento)"); plt.show()"""),
    md("## 4. Comparación con scikit-learn"),
    code("""from sklearn.linear_model import LogisticRegression
sk = LogisticRegression(C=1e6, max_iter=10000).fit(Xtr_n, ytr)  # C huge ≈ no regularization
print(f"sklearn test accuracy {sk.score(Xte_n, yte):.3f}")"""),
]

NB["04_regularizacion"] = [
    md("# 04 · Sobreajuste y regularización L2\n\nSemana 3. Ajustamos un polinomio de grado 12 a pocos puntos y vemos cómo λ controla el sobreajuste. Evaluamos en un conjunto de validación."),
    code(SETUP),
    code("""def make_data(n):
    x = np.sort(np.random.uniform(-1, 1, n))
    return x, np.sin(3 * x) + np.random.normal(0, 0.15, n)

x_tr, y_tr = make_data(15)
x_va, y_va = make_data(200)
DEG = 12
def poly(x): return np.column_stack([x ** k for k in range(1, DEG + 1)])
Ftr, Fva = poly(x_tr), poly(x_va)
mu, sd = Ftr.mean(0), Ftr.std(0)
Ftr, Fva = (Ftr - mu) / sd, (Fva - mu) / sd"""),
    md("## 1. Coste y gradiente regularizados\n$J_{reg} = J + \\frac{\\lambda}{2m}\\sum_j w_j^2$ (sin regularizar $b$)"),
    code("""def cost_reg(X, y, w, b, lam):
    m = X.shape[0]
    err = X @ w + b - y
    return (err @ err) / (2 * m) + lam / (2 * m) * (w @ w)

def grad_reg(X, y, w, b, lam):
    m = X.shape[0]
    err = X @ w + b - y
    return X.T @ err / m + lam / m * w, err.mean()

def fit(X, y, lam, alpha=0.05, iters=30000):
    w, b = np.zeros(X.shape[1]), 0.0
    for _ in range(iters):
        dw, db = grad_reg(X, y, w, b, lam)
        w, b = w - alpha * dw, b - alpha * db
    return w, b

def mse(X, y, w, b): return ((X @ w + b - y) ** 2).mean()"""),
    md("## 2. Tres valores de λ"),
    code("""xs = np.linspace(-1, 1, 300)
Fs = (poly(xs) - mu) / sd
fig, ax = plt.subplots(1, 3, figsize=(14, 3.6), sharey=True)
for a, lam in zip(ax, [0, 0.1, 10]):
    w, b = fit(Ftr, y_tr, lam)
    a.scatter(x_tr, y_tr); a.plot(xs, Fs @ w + b, "r"); a.plot(xs, np.sin(3 * xs), "g--", alpha=0.5)
    a.set_ylim(-2, 2); a.set_title(f"λ={lam}  train={mse(Ftr, y_tr, w, b):.3f}  val={mse(Fva, y_va, w, b):.3f}")
plt.show()"""),
    md("## 3. Curva de validación: elegir λ"),
    code("""lams = [0, 1e-3, 1e-2, 3e-2, 0.1, 0.3, 1, 3, 10]
tr, va = [], []
for lam in lams:
    w, b = fit(Ftr, y_tr, lam, iters=15000)
    tr.append(mse(Ftr, y_tr, w, b)); va.append(mse(Fva, y_va, w, b))
plt.semilogx([l if l else 1e-4 for l in lams], tr, "o-", label="train")
plt.semilogx([l if l else 1e-4 for l in lams], va, "o-", label="validación")
plt.xlabel("λ (0 dibujado en 1e-4)"); plt.ylabel("MSE"); plt.legend(); plt.show()
print("mejor λ:", lams[int(np.argmin(va))])"""),
    md("> **Para pensar:** ¿por qué el error de entrenamiento **siempre** sube con λ, pero el de validación tiene forma de U?"),
]


def main() -> None:
    HERE.mkdir(exist_ok=True)
    for name, cells in NB.items():
        nb = nbf.v4.new_notebook(cells=cells, metadata={"kernelspec": {"name": "python3", "display_name": "Python 3", "language": "python"}})
        NotebookClient(nb, timeout=600, kernel_name="python3").execute()
        nbf.write(nb, HERE / f"{name}.ipynb")
        print("ok", name)


if __name__ == "__main__":
    main()
