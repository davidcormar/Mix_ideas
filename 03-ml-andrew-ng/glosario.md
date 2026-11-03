# Glosario ML español ↔ inglés

| Español | English | Definición breve |
|---|---|---|
| aprendizaje supervisado | supervised learning | aprender $x\to y$ a partir de ejemplos etiquetados |
| aprendizaje no supervisado | unsupervised learning | encontrar estructura en datos sin etiquetas |
| regresión | regression | predecir un valor continuo |
| clasificación | classification | predecir una categoría |
| característica / atributo | feature | variable de entrada $x_j$ |
| etiqueta / objetivo | label / target | salida verdadera $y$ |
| ejemplo de entrenamiento | training example | un par $(x^{(i)}, y^{(i)})$ |
| conjunto de entrenamiento | training set | datos con los que se ajustan los parámetros |
| conjunto de validación | validation / dev set | datos para elegir hiperparámetros |
| conjunto de prueba | test set | datos para la evaluación final, intocables |
| parámetro | parameter | $w,b$: se aprenden |
| hiperparámetro | hyperparameter | $\alpha,\lambda$, grado: se eligen |
| peso / sesgo | weight / bias | $w$ / $b$ |
| función de coste | cost function | $J(w,b)$, error medio en el conjunto |
| función de pérdida | loss function | error de un solo ejemplo |
| error cuadrático medio | mean squared error (MSE) | media de errores al cuadrado |
| descenso de gradiente | gradient descent | minimizar moviéndose contra el gradiente |
| tasa de aprendizaje | learning rate | $\alpha$, tamaño del paso |
| convergencia | convergence | cuando $J$ deja de bajar |
| actualización simultánea | simultaneous update | usar valores antiguos para todos los gradientes |
| derivada parcial | partial derivative | $\partial J/\partial w$ |
| función convexa | convex function | un solo mínimo global |
| mínimo local / global | local / global minimum | |
| vectorización | vectorization | operar con arrays en lugar de bucles |
| escalado de características | feature scaling | poner las variables en rangos comparables |
| normalización z-score | z-score normalization / standardization | $(x-\mu)/\sigma$ |
| curva de aprendizaje | learning curve | $J$ frente a iteraciones (o frente a $m$) |
| ingeniería de características | feature engineering | crear variables nuevas útiles |
| regresión polinómica | polynomial regression | usar $x^2, x^3$… como características |
| ecuación normal | normal equation | solución cerrada de la regresión lineal |
| regresión logística | logistic regression | clasificación binaria con sigmoide |
| función sigmoide | sigmoid / logistic function | $g(z)=1/(1+e^{-z})$ |
| frontera de decisión | decision boundary | donde el modelo cambia de clase |
| entropía cruzada / pérdida logarítmica | cross-entropy / log loss | coste de la regresión logística |
| umbral | threshold | valor (0,5) para pasar de probabilidad a clase |
| sobreajuste | overfitting | memoriza el entrenamiento, generaliza mal |
| subajuste | underfitting | modelo demasiado simple |
| sesgo (alto) | (high) bias | error sistemático por modelo simple |
| varianza (alta) | (high) variance | sensibilidad excesiva a los datos de entrenamiento |
| generalización | generalization | rendir bien con datos nuevos |
| regularización | regularization | penalizar pesos grandes |
| parámetro de regularización | regularization parameter | $\lambda$ |
| decaimiento de pesos | weight decay | efecto de L2 en la actualización |
| exactitud | accuracy | % de aciertos |
| precisión | precision | de los que predigo positivos, cuántos lo son |
| exhaustividad / sensibilidad | recall | de los positivos reales, cuántos detecto |
| fuga de datos | data leakage | información del test que se cuela en el entrenamiento |
| época | epoch | una pasada por todos los datos |
| lote / mini-lote | batch / mini-batch | subconjunto usado en cada paso |
| red neuronal | neural network | (curso 2) |
| función de activación | activation function | (curso 2) ReLU, sigmoide… |
