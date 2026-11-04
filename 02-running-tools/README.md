# 02 · Herramientas de running

Tres herramientas de línea de comandos (Python, sin dependencias pesadas) para entrenar con datos. Tras tu **26:47 del 3 de noviembre** (objetivo de 2026 cumplido ✅), el plan apunta ahora al **5K < 26:00 el 28 de diciembre de 2026**:

1. **Analizador de GPX** — lee un `.gpx` exportado de Strava y saca distancia, tiempos, ritmos, parciales por km, bloques de 5', tiempo en **tus** zonas de FC, desnivel, deriva cardiaca y **detecta las series** automáticamente.
2. **Calculadora de ritmos (VDOT)** — de una marca saca el VDOT (fórmulas de Daniels-Gilbert), los ritmos E/M/T/I/R y las predicciones de 10K, media y maratón.
3. **Generador de plan** — 9 nov → 28 dic 2026, 3-5 sesiones/semana, con descargas en las semanas del viaje (16-22 nov) y del 30 nov-6 dic. Exporta a Markdown y a `.ics` (Google Calendar).

## Cómo usarlo
```bash
cd 02-running-tools
pip install -r requirements.txt

# 1) Analizar un GPX (ejemplo sintético incluido: 6×400 m)
python -m runtools gpx ejemplos/series_6x400_sintetico.gpx --md salida/informe.md
python -m runtools gpx ~/Descargas/Morning_Run.gpx --md salida/2026-11-09-series.md

# 2) Ritmos y predicciones
python -m runtools ritmos 26:47 --objetivo 26:00
python -m runtools ritmos 58:30 --distancia 10K

# 3) Plan hasta el 28-dic (Markdown + .ics)
python -m runtools plan --actual 26:47 --objetivo 26:00 --out salida   # valores por defecto

# Tests
python -m pytest -q tests
```

**Exportar GPX de Strava:** actividad → `···` → *Exportar GPX*. (El export "original" de Apple Watch vía Strava incluye la FC en `gpxtpx:hr`.)

**Importar el plan en Google Calendar:** calendar.google.com → ⚙️ *Configuración* → *Importar y exportar* → *Importar* → `salida/plan-5k.ics` (mejor en un calendario nuevo "Running" para poder borrarlo entero si cambias el plan).

**Zonas de FC:** edita `config.yaml` (por defecto Z1 <138 · Z2 139-152 · Z3 153-165 · Z4 166-179 · Z5 ≥180).

## Resultado con tu marca actual (26:47, 3 nov 2026)
| Tipo | Ritmo calculado | Con el 27:58 de agosto | Tus ritmos de referencia |
|---|---|---|---|
| E fácil | 6:27 – 7:25 /km | 6:43 – 7:43 | — |
| T umbral | 5:38 – 5:50 /km | 5:52 – 6:05 | 5:55 – 6:05 |
| I intervalos | 5:11 /km (400 m en 2:04) | 5:24 (2:10) | 1 km 5:25-5:30 |
| R repeticiones | 4:56 /km (400 m en 1:59) | 5:10 (2:04) | 400 m 2:05-2:08 |

- VDOT: **33,5 (agosto) → 35,3 (noviembre)**. Nueva meta 26:00 = VDOT **36,6** (+1,3).
- Predicciones con VDOT 35,3: 10K **55:38** · media **2:03:19** · maratón 4:14:20.
- Con el 27:58 el modelo coincidía con tus ritmos de referencia; con el 26:47 todos tus ritmos de entrenamiento suben un escalón. Si tus series siguen saliendo a 5:25-5:30 el km, es señal de que el 26:47 fue un gran día y conviene **confirmar** con un test de 3 km antes de entrenar a los ritmos nuevos.
- Hacia tus metas de 2027 (5K < 25:00 = VDOT 38,3 · 10K < 53:00 ≈ VDOT 37,4 · media < 1:55 ≈ VDOT 38,3): te faltan ~3 puntos de VDOT, un año de trabajo razonable.

## Qué está hecho
- ✅ Paquete `runtools/` (parser GPX sin dependencias, análisis, informe texto/Markdown, VDOT, plan, CLI).
- ✅ GPX sintético de ejemplo (`ejemplos/generar_gpx_sintetico.py`) y su informe en `salida/informe-ejemplo.md`.
- ✅ Plan regenerado con el 26:47 → meta 26:00: `salida/plan-5k.md` y `salida/plan-5k.ics` (28 sesiones).
- ✅ 14 tests (haversine, VDOT frente a las tablas de Daniels, detección de 6 series, zonas, plan, .ics).

## Qué falta / siguientes pasos
1. **Probarlo con tus GPX reales** de Strava (el sintético es limpio; el GPS real tiene ruido en curvas y bajo árboles).
2. Ajustar `series.factor_umbral` si en tus series reales detecta de más o de menos (1,15 = 15 % más rápido que la mediana).
3. Ideas: análisis de carpeta entera (evolución de la FC a ritmo fijo semana a semana = mejora aeróbica), gráfica de ritmo/FC con matplotlib, carga (TRIMP) y relación aguda:crónica.
4. Regenerar el plan si haces un test: `python -m runtools plan --actual <nueva marca> --objetivo <meta>`.
5. Plan de media maratón (otoño 2027): ver `22-escalera-ironman/`.

## Decisiones
- **Parser XML propio** en lugar de `gpxpy`: menos dependencias y lee la FC de cualquier namespace (`gpxtpx:hr`, `ns3:hr`…).
- **Detección de series** con velocidad suavizada (ventana 20 s) > 1,15 × mediana durante ≥ 40 s, y refinado de bordes con ventana de 6 s. En el sintético mide 387 m de 400 (±3 %): los bordes siempre pierden 1-2 s.
- **Deriva cardiaca** como desacoplamiento Pa:FC (velocidad/FC 1.ª mitad vs 2.ª), estándar en entrenamiento aeróbico (<5 % = buena base). Solo tiene sentido en rodajes continuos.
- **Desnivel con histéresis** de 2 m para no sumar ruido del GPS.
- **Ritmos del plan**: rodajes con el VDOT actual (no correr los fáciles demasiado rápido) y calidad con el VDOT objetivo. Los R se calculan como ritmo de milla y M como ritmo de maratón predicho.
- **Horas en el .ics**: 19:00 entre semana y 10:00 el fin de semana (entrenas por la mañana o desde las 19:00). Zona `Europe/Madrid`.
- La tirada del sábado 21/11 en Londres enlaza con la ruta GPX de `19-londres/`.

> Información general de entrenamiento, no consejo médico. Si aparece dolor persistente, fisioterapeuta/médico.

## Fuentes
- Daniels, J. *Daniels' Running Formula* (3.ª ed.), Human Kinetics, 2013 — tablas VDOT e intensidades.
- Daniels & Gilbert (1979), *Oxygen Power* — ecuaciones de VO2 y % sostenible.
- Fórmula de haversine: https://en.wikipedia.org/wiki/Haversine_formula
- Esquema GPX 1.1: https://www.topografix.com/GPX/1/1/ · Garmin TrackPointExtension v1.
- Desacoplamiento Pa:HR (Friel): https://www.trainingpeaks.com/blog/aerobic-endurance-and-decoupling/
- iCalendar RFC 5545: https://www.rfc-editor.org/rfc/rfc5545
