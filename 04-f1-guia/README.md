# 04 · Guía para el miniproyecto de F1 (sin hacértelo)

Material de apoyo para tu miniproyecto de **FastF1 + pandas**, a publicar en GitHub el **15 de noviembre**. Es tu prueba de autonomía: aquí hay mapa y brújula, no el camino recorrido. **No hay código del análisis ni respuestas.**

## Qué hay
| Fichero | Para qué |
|---|---|
| [chuleta-fastf1.md](chuleta-fastf1.md) | API esencial: caché, sesiones, vueltas, `pick_*`, telemetría, circuito, gráficas, tabla de problemas típicos |
| [preguntas-analisis.md](preguntas-analisis.md) | 10 preguntas ordenadas por dificultad, con datos necesarios y trampas |
| [plan-2-semanas.md](plan-2-semanas.md) | 12 días (4 → 15 nov) con criterio de "hecho" por día |
| [plantilla-README.md](plantilla-README.md) | README profesional para el repo |
| [checklist-publicar.md](checklist-publicar.md) | Lo que hay que revisar antes de hacerlo público |

## Cómo usarlo
1. Lee la chuleta (20').
2. Elige pregunta (recomendación: una ⭐⭐, la 3, 4 o 5).
3. Sigue el plan día a día; si te atascas, la tabla de problemas típicos de la chuleta.
4. El día 11 copia `plantilla-README.md` a tu repo y rellénala.
5. El día 12, checklist y publicar.

## Qué está hecho
- 💡 Documentación completa (5 ficheros).
- Nombres de la API comprobados instalando `fastf1==3.9.2` (`pick_drivers`, `pick_wo_box`, `pick_track_status`, `get_car_data`, `get_circuit_info`, `plotting.get_driver_color`…).

## Qué falta / siguientes pasos
- Todo lo demás lo haces tú 🙂.
- Después del 15-N, un posible paso 2 con ML (curso de Andrew Ng terminado): predecir el tiempo por vuelta con regresión a partir de `TyreLife`, compuesto y combustible estimado.

## Decisiones
- **Sin fragmentos de análisis**: la chuleta solo enseña la API (cargar y filtrar), nunca cálculos de degradación ni gráficas del proyecto.
- No pude descargar una sesión real desde este entorno (la red bloquea la API de cronometraje de F1: `DataNotLoadedError`), así que los fragmentos se validaron contra la API instalada, no contra datos reales. Pruébalos el día 1.
- El plan empieza el 4 de noviembre (hoy) y deja el último día solo para publicar.

## Fuentes
- FastF1 docs: https://docs.fastf1.dev/ · repo: https://github.com/theOehrly/Fast-F1
- Jolpica (sustituto de Ergast): https://github.com/jolpica/jolpica-f1
- Pirelli, compuestos por GP: https://www.pirelli.com/tyres/en-ww/motorsport/f1
