# 01 · Skills de Claude para el día a día

12 *Agent Skills* en el formato oficial de Anthropic (carpeta + `SKILL.md` con frontmatter YAML) para que Claude haga, siempre igual y sin repetir instrucciones, las tareas que David repite cada semana.

## Qué hay

| Skill | Se activa cuando… | Tipo |
|---|---|---|
| `frances-sesion` | "toca francés", "corrígeme este texto" | Pedida |
| `escribir-como-yo` | "escríbelo como yo" (⚠️ rellenar con tus textos: `COMO-RELLENARLA.md`) | Pedida |
| `documentos-mi-estilo` | "hazme una nota para Obsidian", "plan de…" (4 plantillas) | Pedida |
| `organizador-diario` | "organízame mañana", "revisa mis tareas" | Pedida |
| `revision-deportiva-semanal` | "revisión semanal de deporte" | Pedida |
| `linkedin-perfil` | "mejora mi LinkedIn" (ES + EN) | Pedida |
| `estudio-ml` | "explícame descenso de gradiente" (tutor socrático) | Pedida |
| `preparar-viaje` | "prepara mi viaje a…" | **Extra** |
| `revisar-gastos` | "revisa mis gastos", "cómo voy con el ahorro" | **Extra** |
| `video-a-notas` | "pasa este vídeo a notas de Obsidian" | **Extra** |
| `revision-habitos-semanal` | "revisa mis hábitos" (10 hábitos, media 7,5) | **Extra** |
| `cuestionario-dominio` | "hazme un test" (opciones sutiles, todas plausibles) | **Extra** |

Más `tools/validar_skills.py`, que valida todas las skills (nombre, descripción, YAML, enlaces rotos) y las empaqueta en `.zip` para subirlas a claude.ai.

## Cómo usarlo

### Validar y empaquetar
```bash
cd 01-claude-skills
pip install -r requirements.txt
python tools/validar_skills.py              # valida todas
python tools/validar_skills.py --zip dist   # crea dist/<skill>.zip para claude.ai
python -m pytest -q tests
```

### Instalar en Claude Code (todas tus sesiones)
Las skills personales viven en `~/.claude/skills/<nombre>/SKILL.md`:
```bash
mkdir -p ~/.claude/skills
cp -r 01-claude-skills/frances-sesion ~/.claude/skills/
```
O todas a la vez (excepto `tools/` y `tests/`):
```bash
for d in 01-claude-skills/*/; do [ -f "$d/SKILL.md" ] && cp -r "$d" ~/.claude/skills/; done
```
Para un solo proyecto: `<proyecto>/.claude/skills/<nombre>/`. Claude Code las detecta solo (no hace falta reiniciar en versiones recientes; si no aparecen, reinicia). Compruébalo preguntando *"¿qué skills tienes disponibles?"* o invocándola con `/frances-sesion`.

### Instalar en claude.ai (web y app)
1. `python tools/validar_skills.py --zip dist`
2. claude.ai → **Settings → Capabilities** (en algunas versiones, *Customize → Skills*) → activa *Code execution* si te lo pide → **Upload skill** → sube `dist/frances-sesion.zip`.
3. Activa el interruptor de la skill. Se cargará sola cuando la petición encaje con la `description`.

> [!tip] Las skills de claude.ai y las de Claude Code **no se sincronizan**: instálalas en los dos sitios si las quieres en ambos.

## Qué está hecho
- ✅ 7 skills pedidas + 5 extra, todas validadas automáticamente.
- ✅ Ficheros de referencia separados (progresión de francés, temario de ML, plantillas de Obsidian) para que el `SKILL.md` sea corto (*progressive disclosure*).
- ✅ Validador + empaquetador con 5 tests.

## Qué falta / siguientes pasos
1. **`escribir-como-yo`**: rellenar `referencia/guia-estilo.md` y `referencia/ejemplos.md` (guía en `COMO-RELLENARLA.md`). Sin eso, la skill no sabe cómo escribes.
2. Probar cada skill con 2-3 peticiones reales y ajustar la `description` si no se activa cuando debería (es lo que decide la activación).
3. `organizador-diario` brilla con los conectores de Google Calendar y Gmail activados en claude.ai.
4. Candidatas para llegar a 15-20: `plan-semanal-dominical`, `preparar-examen` (solo estudio, nunca entregas), `entrevista-tecnica-ml` (simulacro), `lectura-paper` (leer un paper de ML en 3 pasadas), `anki-desde-notas`.

## Decisiones
- **`description` entre comillas simples**: varias descripciones tenían `: ` y el YAML fallaba al parsear (Claude ignoraría la skill). El validador ahora lo detecta.
- **Nombres en español y kebab-case**: el nombre tiene que coincidir con la carpeta y no puede contener "claude" ni "anthropic".
- **Límites UIE incluidos dentro de las skills** (`escribir-como-yo`, `video-a-notas`, `estudio-ml`): para que nunca se usen para generar trabajos de la universidad ni labs calificados de Coursera.
- Las extra se eligieron por frecuencia de uso probable: viajes (Londres, India), dinero (metas de ahorro), aprendizaje (vídeos, tests) y hábitos (tracker de noviembre).

## Fuentes
- Agent Skills — visión general: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
- Buenas prácticas para escribir skills: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices
- Skills en Claude Code: https://code.claude.com/docs/en/skills
- Repositorio de ejemplos oficial: https://github.com/anthropics/skills
- Uso en claude.ai: https://support.claude.com/en/articles/12512180-using-skills-in-claude
