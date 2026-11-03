# 10 preguntas de análisis (de menos a más difícil)

Elige **una** (máximo dos) para el miniproyecto. Mejor una pregunta bien respondida que cinco a medias.
Para cada una: qué datos usar y qué trampas vigilar. **Sin código ni respuesta**: eso es tuyo.

| # | Pregunta | Dificultad | Datos | Trampa principal |
|---|---|---|---|---|
| 1 | ¿Quién fue más **consistente** en carrera (menor dispersión de tiempos por vuelta)? | ⭐ | `laps` de carrera | quitar vueltas de box, SC y la 1.ª vuelta |
| 2 | ¿Cómo evoluciona la **pole** de un circuito a lo largo de 2018-2024? | ⭐ | `results` de Q de varios años | cambios de trazado y de reglamento (2022) |
| 3 | **Ritmo de carrera** real de cada equipo (mediana de vueltas limpias) vs. su posición final | ⭐⭐ | `laps`, `results` | combustible: las vueltas del final son más rápidas |
| 4 | ¿Cuánto se **degradan** los neumáticos blandos, medios y duros en un GP (s/vuelta por vuelta de neumático)? | ⭐⭐ | `Compound`, `TyreLife`, `LapTime` | efecto combustible (~0,03-0,06 s/vuelta) se confunde con la degradación |
| 5 | **Estrategias de paradas**: gráfico de *stints* por piloto y compuesto, ¿qué estrategia ganó? | ⭐⭐ | `Stint`, `Compound`, `PitInTime` | paradas bajo SC "baratas" |
| 6 | Comparar a dos pilotos en **una curva**: frenada, velocidad mínima, salida | ⭐⭐⭐ | `get_car_data().add_distance()`, `get_circuit_info().corners` | alinear por distancia, no por tiempo |
| 7 | **Mapa de pista** coloreado por el piloto más rápido en cada minisector | ⭐⭐⭐ | `get_telemetry()` (X, Y), minisectores por distancia | elegir nº de minisectores; interpolar |
| 8 | ¿Cuánto vale el **DRS** / la estela? Velocidad punta con y sin DRS | ⭐⭐⭐ | `DRS`, `Speed` | códigos de DRS (10, 12, 14 = abierto) |
| 9 | ¿Influye la **temperatura de pista** en el ritmo o en la degradación? | ⭐⭐⭐⭐ | `weather_data` + `laps` | correlación ≠ causalidad; pocos datos por carrera |
| 10 | **Undercut**: ¿cuántas posiciones gana (o pierde) quien para antes que su rival directo? | ⭐⭐⭐⭐ | `laps` (Position, PitInTime) de varias carreras | definir "rival directo" de forma objetiva |

## Cómo elegir
- Para publicar el **15 de noviembre** con tu ritmo: una ⭐⭐ (3, 4 o 5) es lo realista.
- Si te sobra tiempo: añade una ⭐⭐⭐ como "bonus" (la 6 queda muy visual en LinkedIn).
- Pregúntate: ¿la respuesta le interesa a alguien que no seas tú? ¿Cabe en 3 gráficas?
