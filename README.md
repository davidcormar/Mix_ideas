# Mix_ideas

Laboratorio de ideas de David: una carpeta por idea, numerada por prioridad.
Cada carpeta tiene su propio `README.md` (qué es, cómo usarlo, qué está hecho, qué falta y decisiones).

**Leyenda:** ✅ terminado · 🟡 a medias · 💡 solo documento · ⏳ pendiente

| # | Carpeta | Idea | Estado |
|---|---------|------|--------|
| 01 | [`01-claude-skills/`](01-claude-skills/) | 12 skills de Claude (7 pedidas + 5 extra) + validador | ✅ |
| 02 | [`02-running-tools/`](02-running-tools/) | Analizador GPX (zonas, deriva, series), VDOT y plan 5K → .ics | ✅ |
| 03 | [`03-ml-andrew-ng/`](03-ml-andrew-ng/) | Apuntes, 4 notebooks NumPy, ejercicios con corrector, glosario | ✅ |
| 04 | [`04-f1-guia/`](04-f1-guia/) | Chuleta FastF1, 10 preguntas, plan hasta el 15-N, plantilla README | 💡 |
| 05 | [`05-presentacion-companero/`](05-presentacion-companero/) | 2 one-pagers, comparativa y presentación Marp de 12 diapositivas | 💡 |
| 06 | [`06-tunel-viento-neuronal/`](06-tunel-viento-neuronal/) | Método de paneles propio + red que predice Cl/Cm ×1.600 más rápido | ✅ |
| 07 | [`07-generador-alas/`](07-generador-alas/) | CVAE (NumPy) sobre 2.090 perfiles UIUC con CST: genera perfiles con el Cl pedido | ✅ |
| 08 | [`08-barcos-oscuros/`](08-barcos-oscuros/) | Dossier SAR/xView3/AIS + pipeline CFAR→AIS funcionando sobre escena sintética | ✅ |
| 09 | [`09-frances-delf/`](09-frances-delf/) | Estructura DELF, 12 fichas de gramática, 200 tarjetas Anki, 30 temas, guiones orales | 💡 |
| 10 | [`10-gym-tracker/`](10-gym-tracker/) | App móvil (HTML) con 5 rutinas, gráficas, récords y sobrecarga progresiva | ✅ |
| 11 | [`11-finanzas/`](11-finanzas/) | App (HTML) de gastos, CSV del banco, resumen con gráficas y metas Londres/Woxsen | ✅ |
| 12 | [`12-mapa-viajes/`](12-mapa-viajes/) | Leaflet + OSM: lugares visitados/por visitar, viajes con rutas, km y fotos | ✅ |
| 13 | [`13-india-woxsen/`](13-india-woxsen/) | Checklist hasta el 6-ene, visado, vacunas, dinero, SIM, guía de Hyderabad y presupuesto | 💡 |
| 14 | [`14-portfolio-linkedin/`](14-portfolio-linkedin/) | README de perfil GitHub, portfolio HTML, LinkedIn ES/EN, plantilla de referentes | 💡 |
| 15 | [`15-habitos/`](15-habitos/) | Hoja A4 en PDF por mes + app digital con media, rachas y hábito más flojo | ✅ |
| 16 | [`16-nutricion/`](16-nutricion/) | Raciones con la mano, 20 recetas con verdura escondida, pre/post entreno, lista de la compra | 💡 |
| 17 | [`17-sistema-claude/`](17-sistema-claude/) | Diseño del sistema: memoria, skills, rutinas, conexiones, fases + plantillas | 💡 |
| 18 | [`18-servidor-casa/`](18-servidor-casa/) | Guía mini PC + Ubuntu + Docker + Tailscale + restic, servicios y docker-compose | 💡 |
| 19 | [`19-londres/`](19-londres/) | Itinerario ~300 €, transporte, museos gratis y ruta GPX de 7 km por Hyde Park | ✅ |
| **Extra** | | | |
| 20 | [`20-efecto-suelo/`](20-efecto-suelo/) | Paneles multicuerpo + método de imágenes: alerón de F1 cerca del suelo + surrogate con h/c | ✅ |
| **De tus visiones** | | | |
| 21 | [`21-idiomas-plan/`](21-idiomas-plan/) | App de horas por idioma (suelo de 30' acumulable, proyección al B2, ciclo de 7) + plan de alemán + inglés C1 | ✅ |
| 22 | [`22-escalera-ironman/`](22-escalera-ironman/) | Escalera media → Ironman con VDOT, aprender a nadar, semana híbrida (estándar 5 / suelo 3) y generador de plan de media | ✅ |
| 23 | [`23-finanzas-sistema/`](23-finanzas-sistema/) | Simulador de tus 4 cuentas desde el primer sueldo + guía y calculadora para leer resultados de empresas | ✅ |
| 24 | [`24-carrera-practicas/`](24-carrera-practicas/) | Mapa de empresas (F1, espacio, IA, Galicia), calendario a ene-2028, CV ML y 32 preguntas de entrevista en inglés | 💡 |
| 25 | [`25-habilidades/`](25-habilidades/) | Plan de habilidades (retórica, estoicismo, móvil antidopamina…) + app de mecanografía y atajos | ✅ |
| **Panel de vida** | | | |
| 28 | [`28-panel-vida/`](28-panel-vida/) | **Portada de todo:** tu vida por áreas con semáforo + sueño y energía, móvil, diario de 3 líneas, lectura y cursos, metas con progreso esperado, revisión semanal y copia de seguridad de las 9 apps | ✅ |
| **De tus capturas** | | | |
| 26 | [`26-ritmo/`](26-ritmo/) | Organizador de hábitos y rutinas: bloques del día con tus franjas, revisión nocturna, mínimos de deporte y francés, rutinas, comparte hábitos con 15 | ✅ |
| 27 | [`27-paso/`](27-paso/) | Pasos y comidas sin calorías: anillo de pasos, raciones con la mano (verdura = punto débil), agua, importación de Apple Health/CSV, historial del mes | ✅ |

## Tests

```bash
./ejecutar_tests.sh   # ~60 tests Python + Node de todas las carpetas
```
También se ejecutan en GitHub Actions en cada push (`.github/workflows/tests.yml`).

**Para usarlo todo desde el móvil:** activa GitHub Pages (Settings → Pages → rama principal, carpeta raíz) y abre `https://davidcormar.github.io/Mix_ideas/`: entra directo al Panel de vida (`index.html` de la raíz).

Ver también: [`BITACORA.md`](BITACORA.md) (qué se hizo y cuándo) y [`PARA-DAVID.md`](PARA-DAVID.md) (resumen de la noche).
