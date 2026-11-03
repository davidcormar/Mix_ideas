# Supervised Machine Learning: Regression and Classification (DeepLearning.AI / Stanford, Coursera)

## Semana 1 — Introducción y regresión lineal
- Aprendizaje supervisado vs. no supervisado; regresión vs. clasificación.
- Modelo f_{w,b}(x) = wx + b; función de coste J(w,b) = (1/2m) Σ (f(x⁽ⁱ⁾) − y⁽ⁱ⁾)².
- Descenso de gradiente: w ← w − α ∂J/∂w; actualización simultánea; tasa de aprendizaje α; convexidad.

## Semana 2 — Regresión con múltiples variables
- Vectorización (NumPy `np.dot`), notación x_j⁽ⁱ⁾.
- Escalado de características: min-max, normalización media, z-score.
- Comprobar convergencia (curva de aprendizaje J vs. iteraciones), elegir α.
- Ingeniería de características y regresión polinómica.

## Semana 3 — Clasificación
- Regresión logística: sigmoide g(z) = 1/(1+e^{−z}); frontera de decisión.
- Coste logístico (log loss) y por qué no se usa el error cuadrático.
- Descenso de gradiente para regresión logística.
- Sobreajuste (*overfitting*) vs. subajuste (*underfitting*); sesgo y varianza.
- Regularización L2: J + (λ/2m) Σ w_j²; efecto de λ.
