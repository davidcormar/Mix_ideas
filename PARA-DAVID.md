# Para David · resumen de la noche (3 → 4 nov 2026)

Buenos días. Las **19 ideas** tienen su carpeta, más **una nueva (20 · efecto suelo)**, con README (qué es, cómo usarlo, qué falta y decisiones). Todo está subido a la rama **`claude/amazing-heisenberg-dlbnt1`** (no a `main`: era la rama asignada a esta sesión). Para tenerlo en `main`, abre un *pull request* desde esa rama y fusiónalo.

## ⚠️ Lo urgente (esta semana)
1. **Vacunas para India:** pide cita ya en el Centro de Vacunación Internacional (A Coruña). Algunas pautas llevan varias dosis y en diciembre hay lista de espera. → `13-india-woxsen/`
2. **Londres (19-22 nov):** necesitas **pasaporte** y la **ETA británica** (obligatoria para ciudadanos de la UE; solo en la app o la web de gov.uk). → `19-londres/`
3. **Choque de fechas:** si para el visado indio hay que **dejar el pasaporte** en el centro de solicitudes, no lo hagas entre ~12 y 23 de noviembre. Pregunta también a Woxsen si tienes que registrarte en el portal **Study in India** (desde 2025 da un SII-ID para el visado e-Student).
4. Reserva vuelos y albergues de Londres ya si quieres quedarte en ~300 €.

## Lo mejor que ha salido
| | Qué | Por qué merece la pena |
|---|---|---|
| 🛩️ **06 + 07** | Túnel de viento neuronal + generador de alas | Método de paneles propio validado (NACA 0012 a 5° → Cl 0,599), red ×1.600 más rápida (MAE Cl 0,002) y un **VAE condicional escrito en NumPy** que genera perfiles UIUC 100 % válidos con el Cl que pides. Es la base real de tu "Suite aero" |
| 🏎️ **20** (nueva) | Efecto suelo | Solver multicuerpo con método de imágenes: tu alerón de F1 invertido cerca del suelo, con flap, y un surrogate que usa la altura como entrada (error mediano 0,6 %). Muestra claramente por qué hace falta OpenFOAM: el modelo no viscoso no reproduce la caída de carga a alturas muy pequeñas |
| 🏃 **02** | Running tools | Con tu 27:58 sale VDOT 33,5 y ritmos que **coinciden con tus ritmos reales**. Plan hasta el 28-dic exportado a `.ics` para Google Calendar |
| 🤖 **01** | 12 skills de Claude | Listas para instalar, con validador y empaquetador `.zip` para claude.ai |
| 📱 **10, 11, 15** | Gym tracker, finanzas, hábitos | Apps de un fichero, funcionan con doble clic y en el móvil, probadas en Chromium |
| 🛰️ **08** | Barcos oscuros | Dossier + pipeline CFAR → AIS funcionando sobre una escena SAR sintética |

## Qué probar primero (30 minutos)
1. `02-running-tools`: `python -m runtools ritmos 27:58 --objetivo 27:00` e importa `salida/plan-5k.ics` en un calendario nuevo.
2. Abre `10-gym-tracker/index.html` en el móvil (mejor con GitHub Pages; instrucciones en su README) y registra el próximo entrenamiento.
3. Instala `organizador-diario` y `frances-sesion` (`01-claude-skills/README.md`) y úsalas esta noche.
4. Mira `07-generador-alas/figuras/perfiles_generados.png`: es lo más vistoso para tu compañero.

## Decisiones que te tocan a ti
- **Proyecto con tu compañero:** la comparativa sale casi empatada (38 vs 36). Propongo un *spike* de 2 semanas antes de decidir. → `05-presentacion-companero/`
- **Francés:** de cero a B2 en ~9 meses es el límite bajo de horas. El control de marzo es el punto de decisión: B2 en verano, o B1 en verano y B2 en diciembre. → `09-frances-delf/estructura-delf.md`
- **Servidor en casa:** ¿antes o después de India? Recomiendo después. → `18-servidor-casa/`
- **Skill `escribir-como-yo`:** necesita 10-15 textos tuyos para funcionar. → `01-claude-skills/escribir-como-yo/COMO-RELLENARLA.md`
- **Woxsen:** las coordenadas del campus en el mapa (12) son aproximadas; corrígelas arrastrando el marcador.

## Límites de esta noche (para que no te pillen por sorpresa)
- La red del entorno bloqueaba varias webs: UIUC (saqué los perfiles del paquete `aerosandbox` de PyPI), los datos en vivo de F1 (la chuleta de FastF1 está comprobada con la librería instalada, no con datos reales) y webs oficiales (todo lleva enlace para que lo verifiques).
- **No había PyTorch**: los modelos usan scikit-learn y NumPy puro.
- Los datos de salud, visados y precios son **información general**: compruébalos en las fuentes oficiales enlazadas.
- **F1 (04):** solo guía, sin código del análisis, como pediste. Nada de la UIE.

Todos los tests (~60, Python y Node) pasan con `./ejecutar_tests.sh` y se ejecutan en GitHub Actions en cada push.

Bitácora detallada (horas, problemas): [`BITACORA.md`](BITACORA.md). Índice: [`README.md`](README.md).

---

## Segunda ronda (4 nov, mañana): revisión con tus visiones

**Corregido en lo que ya había** (detalle en `BITACORA.md`):
- **26:47 🎉** → plan y ritmos regenerados hacia **< 26:00** el 28-dic (02). Tus ritmos de entrenamiento suben un escalón; confirma con un test de 3 km.
- **Francés:** ya no "de cero": comprensión A2+, producción A1-A2, **prioridad producción**, suelo de 30' con minutos acumulados, inscripción al DELF de junio **desde India** (en 2025: 1 mar – 11 abr, 184 €). Skills, banco de francés, India y sistema actualizados.
- Skills alineadas con tus visiones (deporte híbrido, filosofía de gastos, formato real de tus notas con **Sube/Baja/Puentes**, guía de estilo provisional) + nueva skill `revision-carrera`.
- **3 objetivos del mes** en la hoja de hábitos y en la app (15). B2 de Cambridge y alemán en LinkedIn/portfolio (14).

**Nuevo, sacado de tus visiones:**
| # | Qué | Para qué visión |
|---|---|---|
| 21 | App de **horas por idioma** (suelo acumulable, proyección al B2, % de producción) + **plan de alemán** (lo tenías pendiente) + inglés C1 | Idiomas |
| 22 | **Escalera al Ironman** con VDOT por escalón, **aprender a nadar** en Woxsen, semana híbrida (estándar 5 / suelo 3), generador de plan de **media < 1:55** | Deporte |
| 23 | **Simulador de tus 4 cuentas** desde el primer sueldo + calculadora para **leer resultados de empresas** | Finanzas, Habilidades |
| 24 | **Mapa de empresas** (F1, ESA, IA, Galicia), calendario a las prácticas de ene-2028, CV, **32 preguntas de entrevista en inglés** | Profesional |
| 25 | Plan de habilidades (retórica, estoicismo, móvil antidopamina, jazz) + **app de mecanografía y atajos** | Habilidades |

**Dos números que conviene que mires:**
- Francés: a 1 h/día y sin contar el colegio, llegar a ~600 h en junio exige ~165 min/día. Pon tus horas previas en la app (21): con 180 h, ~115 min/día. Tu "muy ambicioso" es literal.
- Casa en 2036 (supuestos editables): la entrada del 30 % no llega sin ~490 €/mes extra, y hay tensión con aportar a la jubilación cada mes (23).

## Tercera ronda (4 nov, mediodía): tus apps «Ritmo» y «Paso»

Construidas a partir de tus capturas, pero **adaptadas a tus visiones** (no son copias genéricas). Se abren con doble clic o, mejor, desde GitHub Pages (`davidcormar.github.io/Mix_ideas/26-ritmo/` y `/27-paso/`), y en el móvil con «Añadir a pantalla de inicio».

| # | App | Lo que hace por ti |
|---|---|---|
| 26 | **Ritmo** | Tu día en bloques con tus franjas (entrenar por la mañana o ≥ 19:00, foco 20-23, evitar 15-17), tareas por prioridad, **revisión nocturna** tarea a tarea (Hecha / Sigue mañana / Nueva fecha / Archivar) con propuesta de bloques para mañana, **mínimos** (deporte suelo 3 / estándar 5, francés 30' acumulables), rutinas Mañana/Noche, recordatorios y `.ics`. Marca tus 10 hábitos **en el mismo almacenamiento que la app 15**, así no apuntas nada dos veces. |
| 27 | **Paso** | Pasos con anillo y «te faltan N · X km», comidas **sin calorías** (palmas, puños, manos, pulgares de tu guía 16), la **verdura marcada como punto débil** con recetas de verdura escondida, agua en vasos, **importación de Apple Health** (sin contar dos veces iPhone + Watch) y CSV, historial del mes. |

**Cómo se hizo:** un agente organizador escribió la especificación (`docs/spec-ritmo-paso.md`), dos agentes ejecutores construyeron las apps en paralelo y un revisor QA las comprobó y corrigió 12 fallos (el más importante: el `.ics` de Ritmo ya respeta la hora de India). Hay 93 tests de lógica y 2 recorridos completos en navegador con capturas.

**Primer uso:** en *Ajustes* de cada app, «Cargar datos de ejemplo» para verla llena. En Ritmo esos ejemplos también marcan ticks en tu hoja de Hábitos (15); cuando acabes de probar, pulsa «Quitar ticks de ejemplo de Hábitos» y luego «Borrar».

**Para que se hablen entre ellas** (Ritmo lee tu gimnasio, idiomas, finanzas y Paso), ábrelas desde GitHub Pages o con Chrome/Edge en local; Firefox aísla cada fichero local. Exporta el JSON de vez en cuando: los datos viven en el navegador.

**Los TikTok** que mandaste no se pueden abrir desde este entorno (el dominio está bloqueado por la red). Si quieres que los use, pega el texto o la descripción, o permite `tiktok.com` en los ajustes de red del entorno.
