# 28 · Panel de vida

## Qué es
La portada de todas tus apps: **tu vida en una pantalla**, por áreas de tus visiones, con semáforo. Además trae lo que faltaba por medir:

| Sección | Qué haces ahí | Qué te devuelve |
|---|---|---|
| **Panel** | Mirar (30 s al día) | Tarjetas de Día (Ritmo), Hábitos, Cuerpo (deporte suelo 3 / estándar 5, pasos, gimnasio), Sueño y energía, Móvil, Francés, Lectura, Dinero, Metas y cuenta atrás (Woxsen, media maratón, prácticas, Ironman), más los accesos a tus 8 apps |
| **Hoy** | Apuntar sueño (me acosté / me levanté), energía 1-5, minutos de móvil y «0 redes antes de las 14:00», **diario de 3 líneas** y el avance de lectura | Horas dormidas, racha de diario, últimos 7 días |
| **Lectura** | Añadir libros (páginas) y cursos (lecciones) | Páginas de la semana frente a tu objetivo, % de cada libro y **cuándo lo acabas** a tu ritmo de las últimas 2 semanas |
| **Metas** | Metas con número («llevo X de Y») o hitos con pasos, con fecha | Barra de progreso + **marca de dónde deberías ir** → «En ritmo» / «Atrasada». Algunas se calculan solas desde tus apps |
| **Semana** | El domingo, 10 min: nota 1-10, 3 victorias, 1 lección, 3 prioridades | Foto automática de la semana de **todas** tus apps con semáforos + tu diario de la semana. Las prioridades salen luego en el Panel |
| **Mes** | Tu «día al mes» (primera semana): nota, 3 logros, qué cambias y **3 objetivos para el mes siguiente** | Foto del mes de todas tus apps con flechas frente al mes anterior; los objetivos pasan a **Hábitos** (los ves en Ritmo y en la hoja de 15) |
| **Informe anual** | Mirar o **imprimir / guardar en PDF** | Resumen del año, tabla mes a mes, metas, libros terminados y tus revisiones mensuales |
| **Ajustes** | Tus objetivos (sueño 8 h, acostarte 23:30, móvil 60 min, 100 páginas/semana, 180 min de cursos) | **Copia de seguridad de las 9 apps en un solo fichero** y restauración |

<img src="captura-escritorio.png" width="640" alt="Panel de vida en escritorio">
<img src="captura-movil.png" width="220" alt="Panel de vida en el móvil">

## Cómo usarlo
- **Doble clic en `index.html`** (o en el `index.html` de la raíz del repo, que redirige aquí). Mejor aún, en GitHub Pages: `https://davidcormar.github.io/Mix_ideas/` → en Safari, Compartir → «Añadir a pantalla de inicio».
- **Primera vez:** el Panel te dice el primer paso (1 minuto en *Hoy*) y ya trae 6 metas sacadas de tus visiones (5K < 26:00, suelo de deporte, horas de francés al B2, media de hábitos, 12 libros, preparar Woxsen; las que tienen fecha fija dejan de salir cuando esa fecha ha pasado). En *Ajustes* puedes «Cargar datos de ejemplo» (ficticios) para verlo lleno: tu Panel se guarda aparte y vuelve tal cual al pulsar «Quitar datos de ejemplo». Tus otras apps no se tocan.
- **Rutina sugerida:**
  - Por la mañana (1 min): *Hoy* → hora de acostarte y levantarte + energía.
  - Por la noche (2 min): minutos de móvil (iPhone: *Ajustes → Tiempo de uso*), diario de 3 líneas y páginas leídas. Encaja justo antes de la revisión nocturna de Ritmo.
  - Domingo (10 min): *Semana* → revisión + **descargar la copia de seguridad**.
- **Lectura entre apps:** el Panel lee tus otras apps solo si comparten origen: GitHub Pages, o Chrome/Edge en local. Firefox con doble clic aísla cada fichero.

Tests (desde `28-panel-vida/`):
```bash
node --test tests/*.test.js                      # 29 tests de lógica
NODE_PATH=$(npm root -g) node tests/smoke.js     # recorrido completo en Chromium + capturas + regresiones (ver abajo)
```

## Qué está hecho
- ✅ Panel con 10 tarjetas y semáforos, leyendo Ritmo, Hábitos, Gym, Paso, Idiomas y Finanzas (solo lectura).
- ✅ Registro diario: sueño (cruza medianoche), energía, móvil, 0 redes por la mañana, diario de 3 líneas que se guarda solo, avance de lectura.
- ✅ Lectura y cursos con previsión de fin; metas con progreso esperado y cálculo automático; revisión semanal con foto de todas las apps.
- ✅ Copia de seguridad única de las 9 apps (exportar / restaurar con confirmación; una copia inválida no cambia nada).
- ✅ Modo oscuro, móvil desde 360 px sin scroll horizontal, datos dañados con descarga del texto, 29 tests de lógica + smoke test.
- ✅ El smoke test comprueba además que el uso normal solo escribe `panel.v1` (espiando `localStorage.setItem`), el teclado en energía y nota, dos pestañas abiertas, la copia de las 9 apps (las claves desconocidas se ignoran), el aviso de datos dañados y la revisión del lunes a las 00:30 con la hora de la India.
- ✅ Funciona sin conexión e instalable en la pantalla de inicio (ver «Sin conexión (PWA)»).

- ✅ Revisión mensual con envío de objetivos a Hábitos, informe anual imprimible y recuperación/esfuerzo de **Bevel** en *Hoy* (media en la tarjeta de sueño y en el mes).
- ✅ Acceso directo a [Importar salud](../29-importar-salud/) (Atajo del iPhone, `export.xml`, Strava).

- ✅ **Aviso de copia de seguridad** en el Panel si la última tiene más de 7 días (o nunca hiciste una); se recuerda al descargarla.
- ✅ **Meditación** en *Hoy* (minutos y racha), en la semana, el mes y el informe; las sesiones de «Mindfulness» de Salud llegan con Importar salud.
- ✅ **Copiar resumen** en *Semana* y *Mes*: texto en Markdown con los números y tu revisión, listo para pegar en Obsidian o Notas.

## Qué falta / siguientes pasos
- Gráficas de tendencia de varias semanas (sueño y móvil) y correlaciones más finas (p. ej. móvil ↔ sueño).
- Importar el tiempo de pantalla y el sueño directamente de Apple Health (Paso ya sabe leer `export.xml`).
- Restaurar la copia **fusionando** en vez de sustituir app por app.
- Sueño en días de viaje o de cambio de hora: se cuenta la hora de reloj (ver «Decisiones»); no hay forma de apuntar «me acosté en Madrid y me levanté en la India».
- Editar las fechas de la cuenta atrás desde Ajustes (ahora están en `logic.js`, `COUNTDOWNS`).

## Decisiones
- **Una sola app, no seis.** Sueño, lectura, diario, metas, revisión y móvil son secciones del Panel: menos sitios donde apuntar y una sola copia de seguridad.
- **Escrituras fuera de `panel.v1` (solo dos, y explícitas):** «Restaurar copia» (con confirmación) y, en *Mes*, la casilla «Poner estos 3 objetivos en Hábitos», que escribe solo los objetivos del mes siguiente en `habitos.v1` con el mismo protocolo que Ritmo (`applyHabitMutation` + `setObjective` sobre una copia recién leída; nunca toca ticks). Por su parte, [Importar salud](../29-importar-salud/) escribe el sueño en `panel.v1` con `PanelLogic.setDay`.
- **Bevel:** su recuperación y esfuerzo (0-100 %) se apuntan a mano porque Bevel no los escribe en Salud.
- **Informe anual:** los meses sin ningún dato (antes de empezar a usar las apps) no salen ni cuentan en las medias.
- **Solo escribe `panel.v1` en el uso normal.** Las demás apps se leen con los mismos lectores de Ritmo (`../26-ritmo/logic.js`) e Idiomas (`../21-idiomas-plan/logic.js`), así los números coinciden en todas partes (deporte: `max(hábito, gimnasio + carreras, tareas de Ritmo)` por día, sin contar dos veces). La única excepción es «Restaurar copia», que pide confirmación y dice qué apps sustituye.
- **El Panel no marca hábitos.** Los ticks los pone Ritmo o Hábitos; así hay un único escritor de `habitos.v1` además de la propia app 15.
- **Sueño:** la noche cuenta en el día en que te levantas. Más de 16 h se descarta como error. La hora media de acostarse se calcula desde el mediodía, para que 23:30 y 00:30 queden cerca. Se cuenta la **hora de reloj**: la noche del cambio de hora (25 oct 2026, 31 oct 2027) duermes 1 h más de lo que sale, y la de marzo 1 h menos; en la India no hay cambio de hora. Así el cálculo no depende de la zona horaria del móvil. Objetivo por defecto 8 h (las recomendaciones generales para adultos jóvenes están entre 7 y 9 h; es información general, no consejo médico: si duermes mal de forma continuada, consúltalo con tu médico).
- **Energía y sueño:** si hay al menos 2 noches «largas» y 2 «cortas», el resumen compara tu energía media en ambas (te dirá si te compensa acostarte antes).
- **Móvil:** se apunta a mano en minutos (el iPhone no deja leer Tiempo de uso desde una web). Objetivo 60 min, como tu hábito «Móvil (0 redes <14:00, máx 1 h)».
- **Metas:** «en ritmo» si vas como mucho 10 puntos por detrás de lo esperado con avance lineal entre «Desde» y la fecha límite. Las automáticas cuentan **desde la fecha «Desde» de la meta**, no desde el 1 de enero, para que una meta nueva no nazca atrasada. Las metas iniciales usan fechas fijas (B2: 5 de junio de 2027, la misma que Idiomas; Woxsen: 6 de enero de 2027) y «fin de año» pasa al año siguiente si quedan menos de 4 semanas.
- **Lectura:** si corriges la página hacia atrás (una errata, 300 en vez de 30), las páginas se descuentan de los últimos registros de ese libro, así la semana no se queda con páginas fantasma. Dejar «Voy por» vacío y poner solo minutos no cambia la página. La previsión de fin usa el ritmo de los últimos 14 días, o desde el primer registro si el libro es más nuevo (mínimo 7 días).
- **Semáforos semanales:** una semana a medias se juzga por los días ya terminados (hoy aún cuenta como abierto): el lunes no sale en rojo por llevar 0 sesiones o 0 páginas. Sin libros, la lectura sale en gris, no en rojo.
- **Revisión semanal:** semana ISO de lunes a domingo; se guarda con una foto de los números para poder comparar semanas aunque luego cambien los datos de otras apps. El lunes (también a las 00:30, si se te hizo tarde el domingo), si la de la semana pasada está pendiente, *Semana* abre esa semana y no la nueva de un día. La hora guardada es la local.
- **Datos dañados o raros:** si `panel.v1` no se puede leer, no se guarda nada hasta que elijas en el aviso (descargar el texto tal cual en `.txt`, importar un Panel o empezar de cero). Los datos de otras apps con formatos inesperados solo esconden su tarjeta; nunca rompen el Panel ni se modifican. Los números absurdos de un fichero se recortan a los límites de Ajustes.
- **Copia de seguridad:** cada app debe ser un objeto JSON; lo que no lo sea se ignora. La restauración es «todo o nada»: si el navegador se queda sin espacio a mitad, vuelve a dejar lo que había.
- **Dos pestañas:** cada cambio en una pestaña se relee en la otra (evento `storage`); lo que estés escribiendo en el diario se guarda encima de lo último, sin pisar lo de la otra pestaña.
- **Fechas** siempre locales (nunca `toISOString` para el día); la cuenta atrás de prácticas e Ironman es aproximada.
- Sin frameworks, sin CDN, sin módulos: abre con doble clic.

## Sin conexión (PWA)
Lo genera `herramientas/preparar_pwa.py` (desde la raíz: `python herramientas/preparar_pwa.py`) y lo comprueba `herramientas/test_pwa.js`, que sirve el repo bajo `/Mix_ideas/` como GitHub Pages.

- **Un solo service worker** (`sw.js` en la raíz) para todo el repo, también para las apps anidadas (`15-habitos/app`, `25-habilidades/mecanografia`). Con doble clic (`file://`) no hace nada: los service workers solo funcionan por http(s).
- **Red primero:** con conexión siempre ves la última versión (revalida con el servidor aunque GitHub Pages diga «guárdalo 10 minutos»). Sin conexión, o si la red no responde en 4 s, usa la copia guardada; si no hay copia, sigue esperando a la red en vez de fallar.
- **Cada despliegue** que vuelve a ejecutar `preparar_pwa.py` cambia la versión del `sw.js` (un hash de todos los ficheros): el navegador descarga una copia nueva y completa y borra la vieja. **Vuelve a ejecutarlo tras cambiar cualquier app** antes de subir. Si se te olvida no se rompe nada: la copia se va actualizando al usarla con conexión.
- **Carpetas:** `app/` y `app/index.html` son la misma página sin conexión, y `app` (sin barra final) te lleva a `app/`.
- **iPhone:** Safari → Compartir → «Añadir a pantalla de inicio». Ojo: la app de la pantalla de inicio **guarda sus datos aparte de Safari**. Si ya usabas las apps en Safari, descarga allí la copia completa (*Ajustes*) y restáurala en la app instalada; luego usa siempre la instalada (Safari puede borrar los datos de webs que no visitas en 7 días; la app instalada no). *Ajustes* te lo recuerda cuando abres el Panel instalado.
- Límite conocido: con red muy lenta justo después de un despliegue, una página puede mezclar un fichero nuevo y otro de la versión anterior; recargar lo arregla.
