# 25 · Habilidades (idea nueva, de tu nota *Habilidades*)

Tu lista de habilidades convertida en un plan con primeros pasos de 15 minutos, más una **app de mecanografía y atajos** (lo único de la lista que pedía software).

<img src="captura.png" width="420" alt="Mecanografía">

## Qué hay
| Fichero | Contenido |
|---|---|
| [plan-habilidades.md](plan-habilidades.md) | 5 bloques: comunicación y retórica (Aristóteles, Cicerón, discurso de 1 minuto), mente (estoicismo, meditación, bloques de aprendizaje, 10 discos de jazz), herramientas, leer resultados de empresas, **móvil antidopamina** (configuración en 20') + cosas en vez del móvil + ideas de "un día al mes" |
| [mecanografia/index.html](mecanografia/index.html) | entrenador de mecanografía (ES/EN/FR/código), PPM netas, precisión, teclas que más fallas + **25 atajos** con repaso espaciado |

## Cómo usarlo
- Elige **una habilidad al mes** y ponla como uno de tus **3 objetivos del mes** (ya en `15-habitos/`).
- Mecanografía: doble clic en `mecanografia/index.html`, 10' al día.

Tests:
```bash
cd 25-habilidades/mecanografia
node --test tests/*.test.js                      # 4 tests
NODE_PATH=$(npm root -g) node tests/smoke.js     # Chromium headless
```

## Qué está hecho
- ✅ App de mecanografía y atajos con tests. 💡 Plan de habilidades.

## Qué falta / siguientes pasos
- Añadir tus atajos reales (según tu sistema operativo) a `SHORTCUTS` en `mecanografia/logic.js`.
- Integrar los TikTok de tu nota cuando me pegues su contenido (no pude abrirlos).

## Decisiones
- **Una habilidad al mes**, no todas: tu lista es larga y la anti-visión de idiomas ("estudiar a ratos") aplica igual aquí.
- Recursos clásicos **de dominio público** (Aristóteles, Marco Aurelio, Séneca, Epicteto) y apps gratuitas.
- Lo de "alter ego / cómo me veo" lo dejo en tu nota *Físico*, como haces tú en *Visión Deporte*.
