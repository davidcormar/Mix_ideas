# Bitácora del turno de noche (3→4 nov 2026)

Horas en hora de Madrid (CET).

## 00 · Arranque — 00:17 → 00:20
- Repositorio vacío (sin commits). Rama de trabajo: `claude/amazing-heisenberg-dlbnt1`.
- Entorno: Python 3.13, numpy, pandas, matplotlib, scikit-learn, pytest. Sin PyTorch al inicio.
- Creados `README.md` (índice) y esta bitácora.

## 01 · claude-skills — 00:18 → 00:22
- 12 skills con `SKILL.md` (7 pedidas + 5 extra: preparar-viaje, revisar-gastos, video-a-notas, revision-habitos-semanal, cuestionario-dominio).
- Validador/empaquetador `tools/validar_skills.py` + 5 tests (pasan).
- **Problema:** las descripciones con `: ` rompían el YAML del frontmatter → se entrecomillaron y el validador ahora lo detecta.

## 02 · running-tools — 00:22 → 00:26
- Paquete `runtools` con CLI: `gpx`, `ritmos`, `plan`. GPX sintético 6×400 m. 13 tests OK.
- Validación: los ritmos VDOT para 27:58 (T 5:52-6:05, I 5:24) coinciden con sus ritmos reales.
- **Problema:** el suavizado recortaba las series (1:54 en vez de 2:06) → refinado de bordes con ventana corta (ahora 2:02, ±3 %).

## 03 · ml-andrew-ng — 00:26 → 00:29
- Apuntes semanas 1-3, 4 notebooks generados y ejecutados por script, 11 ejercicios de código con corrector, 22 a mano, soluciones aparte, glosario. 3 tests OK.
- **Problemas:** escapes LaTeX (`\;`) daban SyntaxWarning en Python → eliminados; el ejercicio "mejor α" fallaba por igualdad en coma flotante tras converger → criterio "no aumenta" con tolerancia.

## 04 · f1-guia — 00:29 → 00:31
- Chuleta, 10 preguntas por dificultad, plan de 12 días, plantilla de README y checklist. Sin código del proyecto (regla).
- **Problema:** la API de cronometraje de F1 no es accesible desde el contenedor → nombres de la API verificados con `fastf1==3.9.2` instalado, no con datos reales.
