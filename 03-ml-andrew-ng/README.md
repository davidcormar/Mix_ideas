# 03 · Compañero del curso 1 de Andrew Ng

Material de estudio personal para **Supervised Machine Learning: Regression and Classification** (Machine Learning Specialization, DeepLearning.AI + Stanford, Coursera): apuntes en español, implementaciones desde cero con NumPy en notebooks ya ejecutados, ejercicios **sin solución** con corrector automático y glosario.

> No sustituye a los *labs* del curso ni los resuelve: los ejercicios son propios y distintos, para practicar lo mismo con otros datos.

## Estructura
| Carpeta / fichero | Qué hay |
|---|---|
| `apuntes/` | 3 notas (semanas 1-3) en formato Obsidian, con fórmulas, tablas y errores típicos |
| `notebooks/` | 4 notebooks ejecutados con gráficas: 01 regresión univariable · 02 multivariable + z-score + polinómica · 03 regresión logística (sintético + Breast Cancer) · 04 regularización y elección de λ |
| `ejercicios/` | `ejercicios.py` (11 funciones para rellenar) + `comprobar.py` (corrector) + ejercicios a mano por semana |
| `soluciones/` | ⚠️ soluciones del código y de los ejercicios a mano, aparte |
| `glosario.md` | ~50 términos español ↔ inglés |
| `construir_notebooks.py` | regenera y ejecuta los notebooks |

## Cómo usarlo
```bash
cd 03-ml-andrew-ng
pip install -r requirements.txt
jupyter notebook notebooks/          # o ábrelos en VS Code / Colab
python ejercicios/comprobar.py       # corrector de tus ejercicios (0/10 al principio)
python -m pytest -q tests            # comprueba soluciones y notebooks
python construir_notebooks.py        # regenerar notebooks tras editarlos
```

**Ritmo sugerido** (curso ≈ 3 semanas a 5-6 h/semana):
1. Ver los vídeos de la semana en Coursera.
2. Leer el apunte de la semana (15').
3. Ejercicios a mano (30').
4. Notebook de la semana: ejecútalo celda a celda y **cambia cosas** (α, λ, nº de datos).
5. Ejercicios de código hasta que el corrector los dé por buenos.
6. Labs del curso.

## Qué está hecho
- ✅ Apuntes de las 3 semanas.
- ✅ 4 notebooks ejecutados (comprobación numérica del gradiente, curvas de aprendizaje, efecto de α, curvas de nivel de J, comparación con mínimos cuadrados y scikit-learn, curva de validación de λ).
- ✅ 11 ejercicios de código con corrector + 22 ejercicios a mano; soluciones aparte.
- ✅ Glosario. Tests (3) en verde.

## Qué falta / siguientes pasos
- Una tarjeta Anki por fila del glosario (exportar a CSV).
- Material para los cursos 2 (redes neuronales, TensorFlow) y 3 (no supervisado, recomendadores, RL) cuando llegue.
- Un mini-proyecto propio al acabar el curso: p. ej. predecir tu tiempo de 5K a partir de tus entrenamientos de `02-running-tools` (regresión con datos tuyos reales).

## Decisiones
- **Datos sintéticos** en los notebooks para que se ejecuten sin descargas y sepas los coeficientes reales (así ves si el algoritmo los recupera). Breast Cancer viene dentro de scikit-learn (sin internet).
- **Notebooks generados por script** (`construir_notebooks.py`) para que siempre estén ejecutados y consistentes; puedes editarlos a mano igualmente.
- En el notebook 01 se deja **a propósito** que el descenso de gradiente no converja del todo sin normalizar: es la motivación de la semana 2.
- Ejercicios con corrector basado en propiedades (gradiente numérico, coeficientes conocidos) en lugar de comparar con una solución concreta: acepta cualquier implementación correcta.

## Fuentes
- Curso: https://www.coursera.org/learn/machine-learning
- Notas de CS229 (Stanford): https://cs229.stanford.edu/main_notes.pdf
- Dataset Breast Cancer Wisconsin (UCI): https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic
- NumPy: https://numpy.org/doc/stable/
