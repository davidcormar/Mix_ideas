# 17 · Diseño del sistema con Claude ("agentic OS")

Documento de diseño de cómo organizar tu vida académica, deportiva y personal con Claude: memoria, skills, rutinas (planificación nocturna, revisión semanal), conexión con Obsidian, Google Calendar, Gmail y el móvil, qué automatizar y qué no, y un plan por fases.

## Qué hay
| Fichero | Contenido |
|---|---|
| [diseno.md](diseno.md) | principios, arquitectura, capas de memoria, skills, conexiones, rutinas, qué automatizar, plan en 5 fases, riesgos |
| [plantillas/instrucciones-proyecto.md](plantillas/instrucciones-proyecto.md) | texto listo para las instrucciones del Proyecto en claude.ai |
| [plantillas/TASKS.md](plantillas/TASKS.md) | formato fijo de tareas para que Claude las lea y actualice |

## Cómo empezar (Fase 0, 30 min)
1. claude.ai → *Projects* → nuevo proyecto "Sistema David" → pega `plantillas/instrucciones-proyecto.md`.
2. Instala las skills `organizador-diario`, `frances-sesion`, `revision-deportiva-semanal` y `revision-habitos-semanal` (ver `01-claude-skills/README.md`).
3. Activa el conector de **Google Calendar** en claude.ai (Settings → Connectors).
4. Copia `plantillas/TASKS.md` a tu vault de Obsidian.
5. Esta noche: "organízame mañana".

## Qué está hecho
- 💡 Documento de diseño y plantillas.

## Qué falta / siguientes pasos
- Probar la Fase 0 una semana y ajustar el diseño con lo que no funcione.
- Decidir la vía de conexión con Obsidian (recomiendo Claude Code en la carpeta del vault + git).

## Decisiones
- **Obsidian como fuente de verdad** y no la memoria del chat: es tuyo, offline, versionable y sobrevive a cambios de herramienta.
- **Escritura externa siempre con confirmación** (Calendar, Gmail como borradores): un error en tu nombre cuesta más que el minuto que ahorra.
- **Sin APIs de pago ni cuentas nuevas**: todo con conectores oficiales de claude.ai y exportaciones (GPX, CSV).
