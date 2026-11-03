# Semana 3 · Clasificación, sobreajuste y regularización

> [!info] Objetivo
> Regresión logística (modelo, frontera de decisión, coste logístico, descenso de gradiente), sobreajuste y regularización L2.

## 1. ¿Por qué no regresión lineal para clasificar?
Un solo punto extremo mueve la recta y cambia el umbral 0,5: la frontera se desplaza aunque los datos "obvios" no cambien. Además, la salida no está en $[0,1]$.

## 2. Regresión logística
$$z=\vec w\cdot\vec x+b,\qquad f_{\vec w,b}(\vec x)=g(z)=\frac1{1+e^{-z}}$$
- $f$ se interpreta como $P(y=1\mid\vec x;\vec w,b)$.
- Predice 1 si $f\ge0{,}5 \iff z\ge0$. **Frontera de decisión**: $\vec w\cdot\vec x+b=0$ (lineal; con características polinómicas puede ser un círculo, elipse, etc.).

## 3. Coste logístico (*log loss*)
$$L(f,y)=-y\log f-(1-y)\log(1-f)$$
$$J(\vec w,b)=\frac1m\sum_i L\left(f(\vec x^{(i)}),y^{(i)}\right)$$
- Con el error cuadrático + sigmoide, $J$ **no es convexa** (muchos mínimos locales). Con log loss sí lo es.
- Intuición: si $y=1$ y predices $f\to0$, la pérdida $\to\infty$.

## 4. Gradiente (¡misma forma que en regresión lineal!)
$$\frac{\partial J}{\partial w_j}=\frac1m\sum_i(f(\vec x^{(i)})-y^{(i)})x_j^{(i)}$$
La diferencia está en $f$: aquí es la sigmoide, no la recta.

## 5. Sobreajuste y subajuste
| | Subajuste (*underfit*) | Bien | Sobreajuste (*overfit*) |
|---|---|---|---|
| Sesgo / varianza | **alto sesgo** | equilibrio | **alta varianza** |
| Entrenamiento | error alto | bajo | casi 0 |
| Datos nuevos | error alto | bajo | **alto** |

Remedios para el sobreajuste: (1) más datos, (2) menos características, (3) **regularización**.

## 6. Regularización L2
$$J_{reg}=J+\frac{\lambda}{2m}\sum_{j=1}^{n}w_j^2\qquad(\text{no se regulariza } b)$$
$$w_j\leftarrow w_j\left(1-\alpha\frac{\lambda}{m}\right)-\alpha\frac1m\sum_i(f-y)x_j$$
- El factor $(1-\alpha\lambda/m)$ "encoge" los pesos un poco en cada paso (*weight decay*).
- $\lambda=0$: sin regularizar (riesgo de sobreajuste). $\lambda$ enorme: $w\to0$, el modelo es casi $f=b$ (subajuste).
- Se aplica igual en regresión lineal y logística.

## Relacionado
**Sube:** [[ML Specialization - Andrew Ng]]
**Baja:** —
