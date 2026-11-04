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

## Calidad (sección 5) — 01:05 → 01:07
- `PARA-DAVID.md` escrito pronto (por si se acaba el crédito). `ejecutar_tests.sh` + GitHub Actions. Diapositiva con resultados reales en 05.

## 20 · efecto-suelo (idea nueva) — 01:07 → 01:08
- Solver de paneles multicuerpo + método de imágenes, ala invertida, barrido de altura, Cp, surrogate MLP con h/c (error mediano 0,6 %). 8 tests.
- **Problema:** convención de ángulo en el ala invertida (con α "morro arriba" el ala invertida apenas daba carga) → α > 0 = morro abajo para alas invertidas.

## Cierre — 01:08
- 20 carpetas (19 pedidas + 1 nueva), `PARA-DAVID.md`, índice actualizado, todos los tests en verde.
- Paro aquí en lugar de seguir hasta las 8:00 para no pasarme del presupuesto de créditos (no se puede medir el gasto): lo importante ya está hecho y subido.
- Ideas para otra noche: banco de preguntas de entrevista de ML Engineer, alerón de 2 elementos validado contra datos publicados, pasar 06/07 a PyTorch, análisis de una carpeta entera de GPX (evolución de la FC a ritmo fijo).

---

# Segunda ronda (4 nov, mañana): revisión contra tus visiones

## Revisión — 11:19 → 11:23
Leídas: *Visión Profesional*, *Visión Deporte*, *Visión Idiomas*, *Visión Finanzas* y *Habilidades*. Correcciones:
- **02:** 5K actualizado a **26:47** (3 nov) → plan regenerado hacia **<26:00**; títulos del plan parametrizados (+1 test).
- **01:** `frances-sesion` (no "de cero": comprensión A2+, producción A1-A2, prioridad producción, suelo 30' con minutos acumulados, discurso de 1 minuto), `revision-deportiva-semanal` (híbrido, estándar 5+/suelo 3, escalera Ironman), `revisar-gastos` (tu filosofía), `documentos-mi-estilo` (formato real: `fecha` entre comillas, tus áreas, Sube/Baja/**Puentes**), `escribir-como-yo` (guía provisional), `linkedin-perfil`, `organizador-diario`; nueva `revision-carrera`.
- **09:** ya no "de cero"; aviso de producción; inscripción al DELF de junio desde India (1 mar–11 abr en 2025, 184 €); horas realistas.
- **13:** prueba B1 en marzo e inscripción al DELF desde India; vuelta ≤ 30 de mayo; piscina en Woxsen para aprender a nadar.
- **12:** fin del intercambio 30 de mayo. **14:** 26:47, B2 Cambridge, alemán, híbrido, prácticas desde enero de 2028. **17:** instrucciones del Proyecto actualizadas.
- **15:** **3 objetivos del mes** en la hoja A4 y en la app (+1 test Node, smoke test ampliado).

## 21 · idiomas-plan (de *Visión Idiomas*) — 11:24 → 11:26
- App de horas por idioma con tus reglas (suelo 30' con arrastre, extras no cuentan, ciclo de 7, % de producción, horas previas, proyección vs. fecha), plan de alemán (lo tenías pendiente) y plan de inglés C1 orientado a entrevistas. 8 tests + smoke test.

## 22 · escalera-ironman (de *Visión Deporte*) — 11:27 → 11:28
- Hoja de ruta con VDOT por escalón, plan de natación desde cero (Woxsen), semana híbrida con suelo de 3, generador de plan de media maratón (reutiliza 02) con 4 tests.

## 23 · finanzas-sistema (de *Visión Finanzas* y *Habilidades*) — 11:29 → 11:31
- Simulador mensual de las 4 cuentas con tus principios (fondo, coche al contado 2029, entrada de casa 2036, mitad de cada subida al ahorro), sensibilidad y ahorro extra necesario; calculadora de 13 ratios y guía para leer resultados. 8 tests.
- **Hallazgo:** con supuestos por defecto la entrada de la casa en 2036 no llega (~490 €/mes extra) y hay tensión con aportar a la jubilación cada mes.
- **Problema:** un `.replace(",", ".")` para formatear euros rompía las comas del texto → función `eur()`.

## 24 · carrera-practicas (de *Visión Profesional*) — 11:31 → 11:34
- Mapa de organizaciones reales por sector y en Galicia, calendario hasta las prácticas, checklist de CV, banco de 32 preguntas de entrevista en inglés con respuestas aparte y test de opciones sutiles. Nueva skill `revision-carrera` (en 01).

## 25 · habilidades (de la nota *Habilidades*) — 11:34 → 11:37
- Plan en 5 bloques con primeros pasos y recursos gratuitos/dominio público + app de mecanografía (ES/EN/FR/código) y 25 atajos con repaso espaciado. 4 tests + smoke test.
- **Problema:** un `mkdir` con llaves anidadas creó una carpeta `{mecanografia` → borrada y recreada. Los TikTok de la nota no se pueden abrir: listas propias, avisado.

---

# Tercera ronda (4 nov, mediodía): apps de tus capturas «Ritmo» y «Paso»

## Plan y especificación — 11:39 → 12:01
- Capturas analizadas (APP 03/05 *Ritmo* y APP 04/05 *Paso*) y cruzadas con tus visiones y con lo que ya hay en el repo (15-hábitos, 10-gym, 16-nutrición, 21-idiomas, organizador-diario).
- Plan en [`docs/plan-ritmo-paso.md`](docs/plan-ritmo-paso.md). Un **agente organizador** (solo lectura) escribió la especificación completa en [`docs/spec-ritmo-paso.md`](docs/spec-ritmo-paso.md): modelo de datos, contratos de lectura de las otras apps, protocolo de escritura en `habitos.v1`, regla de deporte compartida, pantallas, criterios de aceptación y tests.
- **Problema:** los enlaces de TikTok no se pueden abrir desde aquí (dominio bloqueado por la red del entorno) → se trabajó con las capturas.

## 26 · ritmo y 27 · paso — 12:01 → 12:43 (2 agentes ejecutores en paralelo)
- Cada ejecutor construyó su app en su carpeta, sin tocar git; yo integré y subí.
- **27-paso:** 35 tests de lógica + smoke test (Apple Health en streaming con un `export.xml` sintético, CSV, raciones con la mano, historial). **Problema:** condición de carrera en el smoke test (comprobaba el texto antes de que se pintara la vista) → espera también al contenido.
- **26-ritmo:** 55 tests + smoke test; dos tests comprueban contra el código real de 15-hábitos (`validate()`) y 21-idiomas (`pending()`).
- **Incidencia menor:** los dos ejecutores ejecutaron una vez `git status` (solo lectura), que el encargo prohibía; no cambió nada.
- Hice un commit intermedio de 26-ritmo mientras el ejecutor seguía puliendo, para no perder trabajo si el contenedor se reciclaba.

## Revisión QA — 12:44 → 13:22
- Un agente revisor comprobó ambas apps contra la especificación y corrigió **12 fallos** (1 alto, 4 medios, 7 bajos). Verificado sin cambios: ida y vuelta de `habitos.v1` con la app 15 en navegador real (nada se pierde), 154 ejecuciones con datos corruptos en todas las claves sin errores, la regla de deporte idéntica en Ritmo y Paso (0 discrepancias en 8.000 semanas), cambios de hora (25-oct, 28-mar), hora de India, semanas desde el lunes y 31-dic → 1-ene.
- **Alto:** el `.ics` de Ritmo siempre usaba hora de Madrid → en India un bloque de las 20:00 se importaría a las 00:30 del día siguiente. Ahora usa la zona del navegador (`Asia/Kolkata` incluida).
- **Medios:** los datos de ejemplo de Ritmo dejaban ticks falsos en la hoja de 15-hábitos sin forma de quitarlos → ahora se registran y hay un botón «Quitar ticks de ejemplo de Hábitos»; contraste por debajo de AA en textos grises de ambas apps → tokens corregidos; el aviso tapaba el botón de revisión nocturna → abajo a la derecha; en el móvil la revisión nocturna solo era accesible desde «⋯» → tarjeta «Cada noche» de 20:00 a 04:00.
- **Bajos:** recordatorios tras medianoche o tras suspender el portátil, clave temporal `ritmo.v1.probe`, descarga del texto dañado, foco tras guardar/borrar en Paso, pasos y agua en días futuros, «hoy» desfasado tras medianoche, anillo de foco en campos de fecha/hora.
- Tests finales: Ritmo **58** (+3), Paso **35**; smoke tests en verde 3 veces seguidas cada uno. **Problema:** un smoke de Ritmo falló una vez mientras el revisor aún ejecutaba los suyos sobre los mismos ficheros; 9 ejecuciones posteriores, todas en verde.
- **Sin arreglar (a propósito):** si 15-hábitos estaba abierta en otra pestaña podía pisar ticks escritos por Ritmo al guardar → **arreglado después en 15** (ver «A2» abajo).

## A2 · 15-hábitos ya no pisa a Ritmo — 13:40
- 15-hábitos cargaba `habitos.v1` una vez y guardaba el objeto entero: con Ritmo abierto a la vez se perdían ticks. Ahora relee antes de cada cambio (casilla u objetivo) y se repinta con el evento `storage`. Verificado en Chromium con dos pestañas: el tick externo se conserva.

---

# Cuarta ronda (4 nov, tarde): Panel de vida (A1 + A2)

## 28 · panel-vida — 13:45 → 15:31 (hecho directamente, sin agentes, para ahorrar presupuesto)
- Pedido: panel de vida + sueño y energía + lectura y aprendizaje + diario + metas + revisión semanal + móvil. **Decisión:** una sola app con 6 secciones en vez de 6 apps, con `index.html` en la raíz que redirige al panel (A1).
- Reutiliza los lectores de Ritmo e Idiomas (`../26-ritmo/logic.js`, `../21-idiomas-plan/logic.js`) para que deporte, hábitos y francés den los mismos números que en esas apps. Solo escribe `panel.v1`.
- Extra barato y útil: **copia de seguridad única de las 9 apps** (exportar y restaurar con confirmación).
- 12 tests de lógica + smoke test (registro diario, lectura, metas, revisión, copia y restauración, 8 rutas a 360 px en claro y oscuro, sin tocar las claves de otras apps).
- **Problemas:** (1) las metas automáticas contaban desde el 1 de enero → una meta nueva nacía «atrasada»; ahora cuentan desde su fecha «Desde». (2) En modo oscuro los botones principales casi no se distinguían → color de acento. (3) El smoke leía la vista antes de que cambiara de ruta → espera explícita.
