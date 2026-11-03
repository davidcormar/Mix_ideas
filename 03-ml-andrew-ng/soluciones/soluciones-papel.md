# Soluciones de los ejercicios a mano

## Semana 1
**1.1** $(1,0)$: predicciones $[1,2,3]$, errores $[-1,-0{,}5,-0{,}5]$, $\sum e^2=1{,}5$, $J=1{,}5/6=0{,}25$. $(0{,}75,1)$: predicciones $[1{,}75,2{,}5,3{,}25]$, errores $[-0{,}25,0,-0{,}25]$, $\sum e^2=0{,}125$, $J\approx0{,}0208$ → mejor.

**1.2** Con $(0,0)$: errores $=-y=[-2,-2{,}5,-3{,}5]$. $\partial J/\partial w=\frac13(-2\cdot1-2{,}5\cdot2-3{,}5\cdot3)=-17{,}5/3\approx-5{,}833$; $\partial J/\partial b=-8/3\approx-2{,}667$. Nuevo $w=0{,}5833$, $b=0{,}2667$. $J$ antes $=(4+6{,}25+12{,}25)/6=3{,}75$; después: predicciones $[0{,}85,1{,}433,2{,}017]$, errores $[-1{,}15,-1{,}067,-1{,}483]$, $J\approx(1{,}3225+1{,}138+2{,}2)/6\approx0{,}777$ → baja.

**1.3** Usa el $w$ **nuevo** para el gradiente de $b$: no es actualización simultánea. Suele converger al mismo mínimo (es otro algoritmo válido, tipo coordenada), pero no es el descenso de gradiente del curso y la trayectoria cambia.

**1.4** (a) baja muy despacio, casi recta; (b) baja rápido y se aplana; (c) oscila o crece: el paso "salta" al otro lado del valle a un punto más alto y cada salto amplifica el error.

**1.5** Que el modelo pasa exactamente por todos los puntos (datos perfectamente lineales o muy pocos datos). No siempre es bueno: puede ser sobreajuste o una fuga de datos (*data leakage*).

**1.6** Porque el paso es $\alpha\cdot\nabla J$ y el gradiente tiende a 0 cerca del mínimo.

**1.7** (a) regresión; (b) clasificación; (c) no supervisado (clustering); (d) regresión.

## Semana 2
**2.1** $[1\cdot0{,}5+2\cdot(-1)+2,\;3\cdot0{,}5+4\cdot(-1)+2]=[0{,}5,\;-0{,}5]$.

**2.2** Min-max: $[0, 1/3, 2/3, 1]$. Normalización media ($\mu=25$, rango 30): $[-0{,}5,-1/6,1/6,0{,}5]$. Z-score ($\sigma=\sqrt{125}\approx11{,}18$): $[-1{,}342,-0{,}447,0{,}447,1{,}342]$.

**2.3** $(140-100)/20=2$. Con un único piso, $\sigma=0$ → división por cero; y aunque no lo fuera, las escalas no coincidirían con las del entrenamiento: predicción sin sentido.

**2.4** (1) $\alpha$ demasiado grande → bájala 3× y mira si se suaviza. (2) Bug (signo del gradiente, no simultáneo) → comprueba con $\alpha$ muy pequeña: si aun así sube, es un bug. (Con mini-batch, cierto ruido es normal; en el curso es batch.)

**2.5** $[1,10^3]$, $[1,10^6]$, $[1,10^9]$: las curvas de nivel son extremadamente alargadas, $\alpha$ tiene que ser minúscula para no divergir por $x^3$ y $w_1$ apenas se mueve: no converge en un tiempo razonable.

**2.6** Ejemplos: ritmo de series × km semanales (fitness × volumen), ratio sueño/FC en reposo (recuperación), ritmo de series al cuadrado (relación no lineal tiempo-ritmo). Cualquier propuesta razonada vale.

**2.7** Resuelve el mínimo de forma analítica (no hay iteraciones). Invertir $X^\top X$ ($n\times n$) cuesta $O(n^3)$: con $n=10^5$ es inviable en memoria y tiempo.

## Semana 3
**3.1** $g(0)=0{,}5$; $g(2)=1/(1+e^{-2})\approx0{,}881$; $g(-2)\approx0{,}119=1-0{,}881$ ✔.

**3.2** $z(1,0)=1\to f\approx0{,}73\to1$; $z(0,0)=-1\to0$; $z(1,1)=0\to f=0{,}5\to1$ (umbral ≥0,5). Frontera: recta $x_2=2x_1-1$.

**3.3** $-\ln0{,}9=0{,}105$; $-\ln0{,}5=0{,}693$; $-\ln0{,}1=2{,}303$. Crece hacia ∞ cuando $f\to0$: castiga mucho estar seguro y equivocado.

**3.4** La sigmoide aplana la salida en los extremos: el error cuadrático se satura y forma mesetas y "escalones", lo que da una superficie con zonas planas y mínimos locales. El log deshace la exponencial de la sigmoide y la deja convexa.

**3.5** $x_1^2+x_2^2-1=0$: circunferencia de radio 1 (predice 1 fuera del círculo).

**3.6** Alta varianza (sobreajuste). Acciones de menos a más coste: subir $\lambda$, quitar características, conseguir más datos.

**3.7** $w_j\leftarrow w_j(1-\alpha\lambda/m)-\alpha\cdot\text{grad}$: cada paso multiplica el peso por un factor <1 → "decae". Regularizar $b$ apenas cambia nada en la práctica (es un único parámetro que solo desplaza), por convención no se hace.

**3.8** No: un modelo que siempre dice "sano" ya tiene 99 %. Mira precisión, *recall* (sensibilidad) y F1, o la curva PR.
