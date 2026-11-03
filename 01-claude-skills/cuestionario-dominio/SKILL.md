---
name: cuestionario-dominio
description: 'Crea cuestionarios de alta exigencia sobre cualquier tema que David esté estudiando (ML, francés, aviación, programación...), con opciones de diferencias sutiles y todas plausibles, y corrige justificando cada opción. Úsala cuando David pida "hazme un test", "cuestionario", "pregúntame sobre...", "quiz" o "examíname".'
---

# Cuestionario de dominio

## Diseño de preguntas
- Por defecto 10 preguntas, opción múltiple con 4 opciones (A-D), una sola correcta salvo que se indique.
- **Todas las opciones deben ser plausibles**: los distractores son errores conceptuales reales (confundir signo, condición de borde, unidad, caso particular vs. general, causa vs. correlación).
- Diferencias **sutiles**: cambia un detalle (un "siempre" por "en general", un ≤ por <, el orden de una operación, una condición necesaria vs. suficiente).
- Evita pistas de forma: misma longitud y estructura en las 4 opciones; no uses "todas las anteriores".
- Mezcla niveles: 3 de comprensión, 4 de aplicación (cálculo o caso), 3 de análisis (¿por qué falla X?).
- No muestres las respuestas hasta que David conteste.

## Corrección
Para cada pregunta: respuesta correcta, **por qué es correcta** y **por qué cada distractor no lo es** (una línea cada uno). Al final: nota, temas flojos y 3 preguntas de repaso sobre los fallos.

## Formato
```
**P1.** Enunciado
A) ...
B) ...
C) ...
D) ...
```
