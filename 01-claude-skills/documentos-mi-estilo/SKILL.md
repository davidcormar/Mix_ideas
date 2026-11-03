---
name: documentos-mi-estilo
description: 'Crea documentos (informe, resumen, plan, nota de proyecto, nota de área) en el formato de Obsidian de David con método PARA: frontmatter YAML (tipo, area, estado, fecha, tags), callouts de Obsidian y sección final "Relacionado" con Sube/Baja. Úsala cuando David pida "hazme una nota", "documento para Obsidian", "resumen para mi vault", "plan de...", o cualquier documento que vaya a guardar en Obsidian.'
---

# Documentos en el estilo de Obsidian de David

## Reglas de formato (siempre)
1. **Frontmatter YAML** al principio, con exactamente estos campos (en este orden):
   ```yaml
   ---
   tipo: informe | resumen | plan | proyecto | area | recurso | diario
   area: <una de: estudios, ml, deporte, idiomas, finanzas, viajes, carrera, personal>
   estado: borrador | activo | en-pausa | terminado | archivado
   fecha: AAAA-MM-DD
   tags: [tag1, tag2]
   ---
   ```
   - `fecha` = hoy si no se indica. `tags` en minúsculas, sin `#`, con guiones.
2. **Título H1** igual al nombre de la nota.
3. **Callouts** de Obsidian para lo importante:
   - `> [!info]` contexto o resumen al principio (2-3 líneas: qué es y para qué).
   - `> [!todo]` siguientes acciones.
   - `> [!warning]` riesgos o cosas a vigilar.
   - `> [!tip]` ideas o atajos.
   - `> [!question]` dudas abiertas.
4. Enlaces internos con `[[Nombre de nota]]` cuando aludas a otras notas probables (no inventes demasiadas: máximo 5).
5. Tablas y viñetas antes que párrafos largos. Negritas para lo clave.
6. **Sección final obligatoria**:
   ```markdown
   ## Relacionado
   **Sube:** [[<nota padre: área o proyecto>]]
   **Baja:** [[<notas hijas>]], [[...]]
   ```
   - *Sube* = la nota de nivel superior en PARA (p. ej. un proyecto sube a su área).
   - *Baja* = notas más concretas que cuelgan de esta (puede quedar vacío: `**Baja:** —`).

## Plantillas
Usa la plantilla según el tipo:
- Informe → [plantillas/informe.md](plantillas/informe.md)
- Resumen (de un libro, vídeo, artículo, clase) → [plantillas/resumen.md](plantillas/resumen.md)
- Plan (de proyecto, de entrenamiento, de estudio) → [plantillas/plan.md](plantillas/plan.md)
- Proyecto PARA → [plantillas/proyecto.md](plantillas/proyecto.md)

## Procedimiento
1. Identifica el tipo; si dudas entre dos, elige el más sencillo.
2. Rellena la plantilla con el contenido; elimina secciones vacías salvo "Relacionado".
3. Entrega la nota completa en un único bloque de Markdown listo para copiar.
4. Propón el nombre de archivo: `AAAA-MM-DD Título corto.md` para diarios y resúmenes, `Título.md` para el resto.
