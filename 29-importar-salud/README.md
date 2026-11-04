# 29 · Importar salud

## Qué es
Una página para **dejar de apuntar a mano** pasos, sueño y entrenos. Junta tres fuentes y las reparte a tus apps:

| Fuente | Qué trae | Adónde va |
|---|---|---|
| **Atajo del iPhone** (idea A) | Pasos de hoy + hora de acostarte y levantarte | Paso (pasos) · Panel (sueño) |
| **`export.xml` de Apple Health** (idea C) | Todo el historial: pasos, **sueño** (Watch, Bevel…) y **entrenos** | Paso (pasos y sesiones) · Panel (sueño) |
| **`activities.csv` de Strava** | Tus actividades de Strava | Paso (sesiones) |

Vista previa por día antes de guardar, con casillas para elegir qué entrenos cuentan como sesión.

## Cómo usarlo
- Abre `index.html` (o desde el Panel → «Importar salud»). Para el Atajo: [ATAJO-IPHONE.md](ATAJO-IPHONE.md).
- **Uso diario:** el Atajo corre solo a las 22:30 → abres esta página → «Pegar del Atajo» → «Importar».
- **De vez en cuando:** `export.xml` de Salud para rellenar el historial y los entrenos; o el CSV de Strava si alguna actividad no pasó a Salud.

Tests (desde `29-importar-salud/`):
```bash
node --test tests/*.test.js                      # 5 tests (Salud troceado de varias formas, Strava, Atajo, duplicados)
NODE_PATH=$(npm root -g) node tests/smoke.js     # importación completa en Chromium
```

## Qué está hecho
- ✅ Lector de `export.xml` por trozos (varios GB): pasos, sueño por noche y entrenos con su distancia.
- ✅ Lector del `activities.csv` de Strava (comillas, saltos de línea, fechas UTC → hora local).
- ✅ Texto del Atajo en JSON o `clave=valor`, horas en 24 h o «11:40 p. m.»; también por URL (modo Safari).
- ✅ Importación a Paso y al Panel respetando lo que escribiste a mano, sin duplicar entrenos.

## Qué falta
- Leer el `export.zip` directamente (ahora hay que descomprimirlo).
- Frecuencia cardiaca en reposo y VFC (HRV) desde Salud, para una tarjeta de recuperación junto a la de Bevel.
- Importar la recuperación de Bevel si algún día la exporta.

## Decisiones
- **Salud es el centro.** Strava y Bevel escriben en Salud, así que con Salud basta; el CSV de Strava es el plan B.
- **Cada dato va a su app** (pasos y sesiones → Paso, sueño → Panel) usando la lógica de esas apps (`PasoLogic.mergeSteps`/`addRun`, `PanelLogic.setDay`) sobre una copia recién leída. No toca ninguna otra clave.
- **Pasos:** la fuente mayor de cada día (iPhone y Watch no se suman), como el importador de Paso.
- **Sueño:** la noche cuenta el día en que te levantas; se usan las muestras entre las 18:00 de la víspera y las 15:00 (las siestas de la tarde no cuentan); de cada noche, la fuente con más minutos dormido; «En la cama» solo si no hay muestras de sueño.
- **Entrenos → sesiones:** carrera (rodaje; tirada si ≥ 12 km o ≥ 75 min; trote si < 25 min), natación, bici, cardio y otros entran marcados. **Fuerza sale desmarcada** porque ya la apuntas en Gym Tracker (si no, contaría doble). Caminar y senderismo también salen desmarcados.
- **Duplicados:** mismo día y tipo, y hora de inicio a ±15 min (o, sin hora, minutos ±5 y km ±0,3). Un entreno que ya está en Paso tampoco se repite.
- **Atajo → portapapeles** en vez de abrir una URL: las webs instaladas en la pantalla de inicio de iOS no comparten datos con Safari.
