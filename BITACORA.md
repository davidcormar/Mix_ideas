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

## 05 · presentacion-companero — 00:31 → 00:33
- One-pagers de Suite aero y Barcos oscuros, comparativa puntuada (38 vs 36) y presentación Marp de 12 diapositivas.
- Sin problemas. Pendiente: meter imágenes de 06/07 cuando existan.

## 06 · tunel-viento-neuronal — 00:33 → 00:38
- Método de paneles de vórtices lineales (validado: NACA 0012 a 5° → Cl 0,599), dataset de 12.000 casos en 7,5 s, MLP con MAE Cl 0,0021 en perfiles no vistos, ×1.600 más rápido. 8 tests OK.
- **Hallazgo:** en flujo no viscoso una regresión lineal ya da R² 0,9993 (teoría del perfil delgado); la red mejora ×6 el error. Documentado honestamente.
- **Problemas:** el primer MLP (ReLU, early stopping agresivo) no superaba a Ridge → tanh + más paciencia. El pickle referenciaba `__main__.Surrogate` → clase movida a `aero/surrogate.py`.

## 07 · generador-alas — 00:38 → 00:42
- 2.090 perfiles UIUC → CST (16 coef.) → CVAE en NumPy (retropropagación manual comprobada con diferencias finitas). Generación condicionada: 100 % válidos, error Cl 0,011-0,026. 6 tests OK.
- **Problemas:** (1) web de UIUC bloqueada (403) → copia de la base en la wheel de `aerosandbox` (PyPI). (2) PyTorch no instalable (índice CPU bloqueado) → VAE en NumPy. (3) perfiles supercríticos daban Cl absurdos (cruces de superficie entre estaciones) → validación densa + chequeo de condicionamiento del solver.
- **Hallazgo:** el surrogate de 06 es ×10 peor fuera de NACA (MAE 0,024 en UIUC).

## 08 · barcos-oscuros — 00:42 → 00:44
- Dossier (física SAR, acceso gratuito a Sentinel-1, xView3, arquitecturas, AIS, ética) + pipeline `sarpipe` (tiles, CA-CFAR, eslora, cruce húngaro con AIS) sobre escena sintética. Recall 100 %, precisión 96 %. 5 tests OK.
- **Problemas:** sin escenas SAR reales descargables sin cuenta → demo sintética. Los barcos largos se partían (guarda CFAR de 4 px) → guarda de 14 px + cierre morfológico.

## 09 · frances-delf — 00:44 → 00:48
- Estructura DELF A2/B1/B2, 12 fichas de gramática (96 ejercicios) con soluciones aparte, 8 mazos CSV para Anki (200 tarjetas), 30 temas graduados, guiones orales, recursos. 3 tests de formato OK.
- Sin problemas. Nota: aviso de que FEI ha renovado formatos; confirmar al inscribirse.

## 10 · gym-tracker — 00:48 → 00:51
- App estática (`index.html` + `logic.js` + `app.js`), 5 rutinas, registro, historial, gráfica canvas, récords, doble progresión, export/import JSON. 6 tests de lógica (Node) + smoke test en Chromium headless con captura.
- **Problema:** el smoke test no veía el botón de datos de ejemplo (pestaña oculta) → navega primero a la pestaña.

## 11 · finanzas — 00:51 → 00:53
- App estática con importación CSV configurable (comillas, BOM, Latin-1, deduplicado), categorías automáticas, resumen mensual con gráficas canvas, metas con ahorro mensual necesario, export/import JSON. 7 tests de lógica + smoke test en Chromium.
- **Problemas:** cálculo de meses con `ceil` daba un ahorro mensual poco realista → meses fraccionarios. Pestañas cortadas en móvil → nav más compacto.

## 12 · mapa-viajes — 00:53 → 00:55
- App Leaflet con lugares, viajes, rutas con km, fotos por enlace, export/import JSON. 5 tests + smoke test.
- **Problema:** unpkg bloqueado desde el contenedor → Leaflet incluido en `vendor/` (descargado del registro npm); así además funciona con doble clic sin CDN. Coordenadas de Woxsen aproximadas (marcadas para revisar).

## 13 · india-woxsen — 00:55 → 00:57
- Checklist con línea temporal, visado, vacunas (información general + fuentes oficiales), seguro, vuelos, dinero/UPI, SIM, equipaje (sábanas y toallas), guía de Hyderabad y presupuesto.
- **Hallazgo importante:** posible conflicto entre entregar el pasaporte para el visado indio y el viaje a Londres (19-22 nov), y la ETA británica obligatoria. Llevado a PARA-DAVID.
- Limitación: no pude verificar en vivo las webs oficiales (red restringida); todo lleva enlace para comprobar.

## 14 · portfolio-linkedin — 00:58 → 00:58
- README de perfil, portfolio de un fichero, borradores de LinkedIn ES/EN, plantilla de 10 referentes (sin inventar personas).

## 15 · habitos — 00:59 → 01:00
- Generador de hojas A4 (matplotlib → PDF/PNG), hojas de nov y dic, app digital con estadísticas. 3 tests Python + 4 Node + smoke test.
- **Problema:** emojis sin glifo en matplotlib → se eliminan en el papel (regex con rangos explícitos).

## 16 · nutricion — 01:00 → 01:01
- Guía de raciones adaptada a corredor + gimnasio, 20 recetas con verdura escondida, pre/post entreno y lista de la compra. Información general con fuentes.

## 17 · sistema-claude — 01:02 → 01:02
- Documento de diseño (arquitectura, memoria en capas, conexiones, rutinas, qué automatizar, 5 fases, riesgos) + plantillas de instrucciones del Proyecto y TASKS.md.

## 18 · servidor-casa — 01:03 → 01:03
- Guía completa (hardware, consumo, SO endurecido, Docker, Tailscale, servicios, copias 3-2-1, plan de 4 fines de semana) + docker-compose validados y script de backup.

## 19 · londres — 01:04 → 01:04
- Guía (pasaporte + ETA, presupuesto, transporte, itinerario de 4 días, museos gratis incluido el RAF Museum) y ruta GPX de 7,1 km generada por script (reutiliza el haversine de 02).
