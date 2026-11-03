# Ejercicios a mano · Semana 1

**1.1** Datos: $x=[1,2,3]$, $y=[2,2.5,3.5]$. Calcula $J(w,b)$ para $(w,b)=(1,0)$ y para $(w,b)=(0{,}75,1)$. ¿Cuál es mejor?

**1.2** Con los mismos datos y $(w,b)=(0,0)$, calcula $\partial J/\partial w$ y $\partial J/\partial b$ y haz **una** iteración de descenso de gradiente con $\alpha=0{,}1$. Calcula $J$ antes y después: ¿ha bajado?

**1.3** Un compañero escribe:
```python
w = w - alpha * dj_dw(w, b)
b = b - alpha * dj_db(w, b)
```
¿Qué está mal? ¿Converge igualmente en la práctica? ¿Al mismo punto?

**1.4** Dibuja (a mano) $J$ frente a iteraciones para: (a) $\alpha$ demasiado pequeña, (b) correcta, (c) demasiado grande. Explica por qué en (c) puede subir.

**1.5** Si $J(w,b)=0$ en el entrenamiento, ¿qué puedes decir de los datos? ¿Es buena noticia siempre?

**1.6** ¿Por qué, con $\alpha$ fija, los pasos del descenso de gradiente se hacen más pequeños al acercarse al mínimo?

**1.7** Clasifica como regresión, clasificación o no supervisado: (a) predecir la FC media de un rodaje a partir del ritmo y la temperatura; (b) decidir si un entrenamiento es "series" o "rodaje"; (c) agrupar tus 200 actividades de Strava en tipos sin etiquetas; (d) predecir el Cl de un perfil alar.
