# Semana 1 · Introducción y regresión lineal univariable

> [!info] Objetivo de la semana
> Entender qué es el aprendizaje supervisado, el modelo lineal $f_{w,b}(x)=wx+b$, la función de coste y cómo el descenso de gradiente encuentra $w$ y $b$.

## 1. Tipos de aprendizaje
| | Supervisado | No supervisado |
|---|---|---|
| Datos | pares $(x, y)$ con la "respuesta correcta" | solo $x$ |
| Tareas | **regresión** (y continua: precio) · **clasificación** (y discreta: spam/no spam) | clustering, detección de anomalías, reducción de dimensión |
| Ejemplo tuyo | predecir tu tiempo de 5K a partir de tus ritmos de series | agrupar tus entrenamientos en tipos sin etiquetarlos |

## 2. Notación (la del curso)
| Símbolo | Significado |
|---|---|
| $m$ | número de ejemplos de entrenamiento |
| $x^{(i)}, y^{(i)}$ | ejemplo $i$-ésimo (el superíndice **no** es potencia) |
| $\hat y^{(i)} = f_{w,b}(x^{(i)})$ | predicción |
| $w, b$ | parámetros (peso y sesgo, *weight* y *bias*) |

## 3. Función de coste (error cuadrático medio)
$$J(w,b)=\frac{1}{2m}\sum_{i=1}^{m}\left(f_{w,b}(x^{(i)})-y^{(i)}\right)^2$$
- Mide lo lejos que están las predicciones de la realidad. El $\tfrac12$ solo simplifica la derivada.
- Para regresión lineal, $J$ es **convexa** (forma de cuenco): un único mínimo global.
- Visualización: curvas de nivel (*contour plot*) de $J$ sobre el plano $(w,b)$.

## 4. Descenso de gradiente
Repetir hasta converger (**actualización simultánea**):
$$w \leftarrow w-\alpha\frac{\partial J}{\partial w},\qquad b\leftarrow b-\alpha\frac{\partial J}{\partial b}$$
$$\frac{\partial J}{\partial w}=\frac1m\sum_{i}(f_{w,b}(x^{(i)})-y^{(i)})\,x^{(i)},\qquad \frac{\partial J}{\partial b}=\frac1m\sum_{i}(f_{w,b}(x^{(i)})-y^{(i)})$$

| Si $\alpha$ es… | Qué pasa |
|---|---|
| demasiado pequeña | converge, pero muy despacio |
| adecuada | $J$ baja rápido y se estabiliza |
| demasiado grande | oscila o **diverge** ($J$ crece) |

> [!warning] Error típico
> Actualizar $w$ y usar ese $w$ nuevo para calcular el gradiente de $b$. Hay que calcular **ambos** gradientes con los valores antiguos y luego actualizar.

- "Batch" gradient descent: cada paso usa **todos** los $m$ ejemplos.
- Cerca del mínimo, el gradiente se hace pequeño → los pasos se acortan solos aunque $\alpha$ sea fija.

## 5. Para practicar
- Notebook: `notebooks/01_regresion_lineal_univariable.ipynb`
- Ejercicios: `ejercicios/semana-1.md`

## Relacionado
**Sube:** [[ML Specialization - Andrew Ng]]
**Baja:** [[Semana 2 · Regresión multivariable]]
