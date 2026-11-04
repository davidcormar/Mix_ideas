# Plan: apps 26-ritmo y 27-paso (a partir de las capturas "APP 03/05" y "APP 04/05")

## Objetivo
Dos apps web estáticas, pulidas al nivel visual de las capturas (sidebar, tarjetas claras, tarjeta oscura de acento, toasts), que funcionen con doble clic y en el móvil (GitHub Pages), y que estén **adaptadas a las visiones de David**, no copias genéricas.

## 26-ritmo · organizador de hábitos y rutinas (hub)
"Lo mejor: ver mis rutinas y mi progreso sin saltar entre varias apps."
- **Hoy**: tira de la semana (Lun-Dom), línea de tiempo del día con bloques (tareas con hora + rutinas), indicador "Ahora", tarjeta oscura "Hábitos de hoy X/10 · % esta semana", lista de hábitos con mini-barras de 7 días y casilla.
- **Tareas** con su orden de prioridad (evento fijo → entrega por fecha y peso → mínimos de deporte y francés → hitos Fase 0 → resto), duración, notas, fecha.
- **Franjas de David**: entrenar mañana o ≥19:00; mejor foco 20-23; peor 15-17 (avisos si colocas mal un bloque).
- **Revisión nocturna** (su skill organizador-diario dentro de la app): tarea a tarea → Hecha / Sigue mañana / Nueva fecha / Archivar; luego propuesta de bloques para mañana.
- **Hábitos** = los 10 de noviembre, compartiendo el almacenamiento de 15-habitos (`habitos.v1`) para no duplicar; rachas; media objetivo 7,5; 3 objetivos del mes.
- **Rutinas Mañana / Noche** (checklists editables).
- **Mínimos**: deporte (suelo 3/semana, estándar 5), francés (suelo 30' con minutos acumulados, leyendo `idiomas.v1` si existe).
- **Progreso**: semana/mes + panel "Mis apps" que lee (solo lectura) gym tracker, idiomas, finanzas y Paso si están en el mismo origen.
- Recordatorios (Notification API + toast), exportar `.ics`, exportar/importar JSON.

## 27-paso · pasos y comidas (sin contar calorías)
- **Pasos**: anillo de % del objetivo, "te faltan N · X km" (zancada a partir de 175 cm), media semanal con barras y % vs. semana anterior; entrada manual e **importación de Apple Health** (`export.xml`, en streaming, sin contar dos veces iPhone + Watch) y CSV.
- **Comidas** 4/día (desayuno, comida, merienda, cena) con **raciones con la mano** (palma, puño, mano, pulgar) en vez de calorías; metas del 16-nutricion: ~5 palmas de proteína, **4-5 puños de verdura (su punto débil)**, 3 L de agua; tipo de día (descanso / gimnasio / series) ajusta hidratos.
- **Historial** tipo heatmap del mes, "objetivo cumplido N de M días", toasts ("Merienda guardada · te quedan 1.580 pasos"), sugerencias de recetas con verdura escondida.
- Actividad semanal (correr / gimnasio) leyendo el gym tracker si está.

## Ejecución con agentes
1. **Organizador** (agente Plan, solo lectura): estudia el repo y las capturas y escribe la especificación exacta (modelo de datos, formatos de almacenamiento de las otras apps, pantallas, criterios de aceptación, tests).
2. **2 ejecutores en paralelo** (uno por app, carpetas separadas, sin tocar git): construyen, testean (Node + Chromium headless) y hacen capturas de escritorio y móvil.
3. **Revisor QA**: comprueba ambas apps contra la especificación, corrige fallos, revisa capturas.
4. Yo: integro (índice, bitácora, PARA-DAVID, ejecutar_tests.sh), tests completos, commit y push.
