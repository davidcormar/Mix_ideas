---
name: video-a-notas
description: 'Convierte un vídeo, charla, podcast o clase (transcripción pegada, subtítulos o apuntes rápidos) en una nota de Obsidian con el formato de David: ideas clave, conceptos, timestamps, dudas y enlaces Sube/Baja. Úsala cuando David diga "pasa este vídeo a notas", "resúmeme esta charla para Obsidian", o pegue una transcripción o enlace de YouTube con su transcripción.'
---

# Vídeo → nota de Obsidian

## Entrada
- Transcripción (YouTube: "Mostrar transcripción" → copiar), subtítulos `.srt/.vtt`, o notas rápidas de David.
- Si solo hay enlace y no puedes leer la transcripción, pídela: no inventes contenido del vídeo.

## Procedimiento
1. Detecta tema, autor y duración.
2. Extrae **5-10 ideas clave** (orden del vídeo) con timestamp `[mm:ss]` si la transcripción los tiene.
3. Tabla de **conceptos** (concepto | definición | ejemplo del vídeo).
4. Si es técnico (ML, aerodinámica...): fórmulas en LaTeX `$...$` y un mini-ejercicio para comprobar comprensión.
5. **Qué aplico yo** (2-3 viñetas conectadas con sus proyectos: Fase 0, running, francés...).
6. **Dudas abiertas** para investigar.
7. Formato final con la plantilla `resumen` de la skill `documentos-mi-estilo` (frontmatter `tipo: resumen`, callouts, sección "Relacionado" con **Sube**/**Baja**).

## Reglas
- Fidelidad: distingue lo que dice el vídeo de tus añadidos (marca los añadidos con *(nota de Claude)*).
- Si es una clase de la universidad, el resumen es para estudio personal, nunca para entregar.
