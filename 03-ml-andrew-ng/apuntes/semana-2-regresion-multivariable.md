# Semana 2 · Regresión con múltiples variables

> [!info] Objetivo
> Pasar de 1 característica a $n$, vectorizar con NumPy, escalar características, elegir $\alpha$ y crear características nuevas (polinómicas).

## 1. Modelo vectorizado
$$f_{\vec w,b}(\vec x)=\vec w\cdot\vec x+b=\sum_{j=1}^{n}w_jx_j+b$$
- $x_j^{(i)}$: característica $j$ del ejemplo $i$. $X$ es una matriz $m\times n$.
- En NumPy: `X @ w + b` calcula las $m$ predicciones de golpe (mucho más rápido que un bucle `for`: usa instrucciones SIMD y BLAS).

## 2. Gradiente vectorizado
$$\frac{\partial J}{\partial w_j}=\frac1m\sum_i(f(\vec x^{(i)})-y^{(i)})x_j^{(i)}\;\Rightarrow\;\nabla_w J=\frac1m X^\top(X\vec w+b-\vec y)$$

## 3. Escalado de características (*feature scaling*)
Si una característica va de 0 a 2.000 (m²) y otra de 1 a 5 (habitaciones), las curvas de nivel de $J$ son elipses alargadas y el descenso zigzaguea.

| Método | Fórmula | Rango resultante |
|---|---|---|
| Min-max | $\frac{x-\min}{\max-\min}$ | $[0,1]$ |
| Normalización media | $\frac{x-\mu}{\max-\min}$ | ≈ $[-1,1]$ |
| **Z-score** | $\frac{x-\mu}{\sigma}$ | media 0, desviación 1 |

> [!warning] Importante
> Guarda $\mu$ y $\sigma$ del **entrenamiento** y aplica los mismos a los datos nuevos. Nunca recalcules con los datos de test.

## 4. ¿Converge? Curva de aprendizaje
- Dibuja $J$ frente al número de iteraciones: debe **bajar siempre**.
- Si sube o oscila: $\alpha$ demasiado grande (o un bug: signo del gradiente).
- Prueba $\alpha \in \{0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1\}$ (factor ~3).
- Prueba automática de convergencia: parar si $J$ baja menos de $\varepsilon=10^{-3}$ en una iteración (en la práctica, mejor mirar la curva).

## 5. Ingeniería de características y regresión polinómica
- Crear características con sentido: área = frente × fondo.
- Polinómica: usar $x, x^2, x^3$ como características → el modelo sigue siendo **lineal en los parámetros**. Con potencias el escalado es **imprescindible** ($x^3$ se dispara).
- Ecuación normal $\vec w=(X^\top X)^{-1}X^\top y$: solo para regresión lineal, sin $\alpha$, lenta con $n$ grande (≥10.000). El curso la menciona, no la usa.

## Relacionado
**Sube:** [[ML Specialization - Andrew Ng]]
**Baja:** [[Semana 3 · Clasificación]]
