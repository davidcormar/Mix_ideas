---
name: documentos-mi-estilo
description: 'Crea documentos (informe, resumen, plan, nota de proyecto, nota de área) en el formato de Obsidian de David con método PARA: frontmatter YAML (tipo, area, estado, fecha, tags), callouts de Obsidian y sección final "Relacionado" con Sube/Baja. Úsala cuando David pida "hazme una nota", "documento para Obsidian", "resumen para mi vault", "plan de...", o cualquier documento que vaya a guardar en Obsidian.'
---

# Documentos en el estilo de Obsidian de David

## Reglas de formato (siempre) — sacadas de sus notas reales de Obsidian
1. **Frontmatter YAML** al principio, con estos campos y en este orden:
   ```yaml
   ---
   tipo: idea | informe | resumen | plan | proyecto | area | recurso | diario
   area: aprendizaje | cuerpo | finanzas | tecnico | <otra que use él>
   estado: activo | borrador | en-pausa | terminado | archivado
   fecha: "AAAA-MM-DD"
   tags: [tag1, tag2]
   ---
   ```
   - `fecha` **entre comillas**. `tags` en minúsculas, sin `#`. Las visiones usan `tipo: idea`.
   - Áreas que ya existen en su vault: `aprendizaje` (idiomas, estudio), `cuerpo` (deporte, físico), `finanzas`, `tecnico` (carrera, ML). Si encaja en una de ellas, úsala antes que inventar otra.
2. **Título H1** igual al nombre de la nota.
3. **Primer bloque: `> [!info] Resumen en 30 segundos`** con 3-5 líneas en negrita lo clave, y una última línea "Es parte de [[…]]".
4. **Callouts** de Obsidian para lo importante: `> [!info]`, `> [!todo]`, `> [!warning]`, `> [!tip]`, `> [!question]`.
5. Enlaces internos `[[Nombre de nota]]` a notas que ya existen (las conocidas: `[[Vision]]`, `[[Vision Profesional]]`, `[[Vision Deporte]]`, `[[Vision Idiomas]]`, `[[Vision Finanzas]]`, `[[Roadmap Profesional]]`, `[[Roadmap Deportivo]]`, `[[Roadmap Financiero]]`, `[[Control Finanzas]]`, `[[Frances]]`, `[[Idiomas]]`, `[[India]]`, `[[Fase 0 - Este curso 2026-27]]`, `[[Decision - Especializacion]]`, `[[Desarrollo Profesional]]`, `[[Listas]]`, `[[Fisico]]`). No inventes más de 3 nuevas.
6. Tablas y viñetas antes que párrafos largos. **Negritas** para lo clave (él las usa mucho). Fechas escritas ("15 de octubre de 2026").
7. **Sección final obligatoria**, como lista:
   ```markdown
   ## Relacionado

   - **Sube:** [[nota padre]]
   - **Baja:** [[hija 1]] · [[hija 2]]
   - **Puentes:** [[nota hermana relacionada]] · [[otra]]
   ```
   - *Sube* = nivel superior (una visión sube a `[[Vision]]`). *Baja* = notas más concretas. *Puentes* = notas del mismo nivel que se tocan. Separador ` · `. Omite *Baja* o *Puentes* si no hay.

## Plantillas
Usa la plantilla según el tipo:
- Informe → [plantillas/informe.md](plantillas/informe.md)
- Resumen (de un libro, vídeo, artículo, clase) → [plantillas/resumen.md](plantillas/resumen.md)
- Plan (de proyecto, de entrenamiento, de estudio) → [plantillas/plan.md](plantillas/plan.md)
- Proyecto PARA → [plantillas/proyecto.md](plantillas/proyecto.md)
- **Visión** de un área (Norte, por qué, punto de partida, estándar y suelo, anti-visión, horizontes, hitos, opciones abiertas) → [plantillas/vision.md](plantillas/vision.md)

## Procedimiento
1. Identifica el tipo; si dudas entre dos, elige el más sencillo.
2. Rellena la plantilla con el contenido; elimina secciones vacías salvo "Relacionado".
3. Entrega la nota completa en un único bloque de Markdown listo para copiar.
4. Propón el nombre de archivo: `AAAA-MM-DD Título corto.md` para diarios y resúmenes, `Título.md` para el resto.
