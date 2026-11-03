# Suite aero: túnel de viento neuronal + generador de alas

> **En una frase:** una red que da en milisegundos lo que un CFD tarda horas (Cl, Cd y campos de presión/velocidad de un perfil alar), y un modelo generativo que usa esa red para **diseñar** perfiles nuevos a partir de lo que pides (Cl, Cd, Reynolds, grosor).

## Problema
- Simular un perfil con CFD (RANS en OpenFOAM) cuesta de minutos a horas por caso. Explorar miles de diseños o hacer optimización es lento y caro.
- XFOIL es rápido pero es 2D, a veces no converge y no modela bien la separación ni el efecto suelo.
- El diseño inverso ("dame un perfil con Cl=1,2 y Cd mínimo") sigue siendo prueba y error con optimizadores clásicos.

## Por qué importa
- Los *surrogates* neuronales de CFD son un área de investigación muy activa (AirfRANS, NeuralFoil, operadores neuronales). Encaja con "convertir ideas difíciles en sistemas reales".
- Ángulo propio y poco explorado: **efecto suelo en alerones delanteros de F1** (perfil a poca altura del suelo: la sustentación negativa cambia mucho con la altura). Dataset propio = contribución original.

## Qué se construye
1. **Generador de datos**: perfiles (NACA + UIUC) × Reynolds × ángulo × (altura al suelo) → OpenFOAM (simpleFoam, k-ω SST) + XFOIL para validar.
2. **Túnel de viento neuronal**: MLP para coeficientes (Cl, Cd, Cm) y U-Net / GNN / operador neuronal para campos completos.
3. **Generador de alas**: VAE (y después difusión) sobre parámetros CST, condicionado a Cl, Cd, Re y grosor mínimo.
4. **Bucle de diseño**: generar candidatos → evaluar con el surrogate (ms) → verificar los mejores con XFOIL/OpenFOAM.
5. Demo web: dibujas o pides un perfil y ves Cl, Cd y el campo de presiones al instante.

## Datos
| Fuente | Qué | Coste |
|---|---|---|
| UIUC Airfoil Database | ~1.600 perfiles reales | gratis |
| AirfRANS | ~1.000 simulaciones RANS de perfiles NACA | gratis |
| XFOIL / NeuralFoil | coeficientes rápidos | gratis |
| **OpenFOAM propio** | efecto suelo (nuestra aportación) | CPU: noches de simulación |

## Stack
Python · NumPy · PyTorch · OpenFOAM · XFOIL · (PyTorch Geometric si GNN) · Streamlit o Gradio para la demo · Git + DVC/W&B para experimentos.

## Riesgos
| Riesgo | Mitigación |
|---|---|
| OpenFOAM tiene curva de aprendizaje fuerte y mallado delicado | empezar con XFOIL y AirfRANS; OpenFOAM solo en el mes 3+ |
| Coste de cómputo del dataset de efecto suelo | malla 2D, pocos cientos de casos bien elegidos, cluster de la uni o noches en casa |
| Diseños generados no físicos (autointersecciones) | parametrización CST + validación geométrica |
| Alcance demasiado grande | hito de 3 meses autocontenido (solo coeficientes + VAE) |

## Hitos
- **3 meses:** dataset XFOIL de ~10.000 casos; MLP para Cl/Cd/Cm con error <5 %; VAE que genera perfiles válidos; demo básica. *(Prototipo ya iniciado en `06-` y `07-` de este repo.)*
- **6 meses:** modelo de campos sobre AirfRANS; 200-500 casos propios OpenFOAM con efecto suelo; generador condicionado; informe/preprint corto y repo público.

## Qué aprende cada uno
- **David:** deep learning aplicado (redes para campos, modelos generativos), MLOps de experimentos, aerodinámica.
- **Compañero:** CFD (OpenFOAM, mallado, validación) o, si prefiere, la parte de producto (demo, visualización) y la evaluación.
- **Ambos:** escribir un trabajo técnico publicable y trabajar con un repo compartido de verdad.
