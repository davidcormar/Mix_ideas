# Diseño: mi "agentic OS" con Claude

> [!info] Idea en una frase
> Obsidian es la **memoria** (fuente de verdad), Claude es el **procesador** (planifica, revisa, redacta, enseña) y las **skills** son los **programas** que ejecuta siempre igual. Calendario, correo y móvil son **entradas y salidas**.

## 1. Principios
1. **Una sola fuente de verdad**: tareas, notas y registros viven en Obsidian (Markdown, tuyo, offline). Claude lee y propone; tú confirmas lo importante.
2. **Rutinas cortas y fijas** > automatizaciones complejas. Si una rutina no se usa 3 semanas, se borra.
3. **Humano en el bucle** para todo lo que sale fuera (correos, eventos con otras personas, publicaciones).
4. **Nada de la universidad** pasa por generación de contenido (regla UIE): Claude solo como tutor o para organizar.
5. **Privacidad**: nada de contraseñas, datos médicos o bancarios completos en prompts ni en el repo.

## 2. Arquitectura
```
          ┌───────────── ENTRADAS ─────────────┐
 móvil (voz/notas) · Gmail · Google Calendar · Strava/GPX · CSV banco · campus
                         │
                         ▼
 ┌──────────── CLAUDE (claude.ai + app móvil + Claude Code) ─────────────┐
 │  Proyecto "Sistema David": instrucciones + memoria + archivos clave     │
 │  Skills: organizador-diario · revision-deportiva-semanal · frances-...  │
 │  Conectores: Google Calendar, Gmail, Drive  ·  (Code) MCP filesystem    │
 └───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
 ┌──────────── OBSIDIAN (vault PARA, sincronizado) ───────────────────────┐
 │ 0-Inbox · 1-Proyectos · 2-Áreas · 3-Recursos · 4-Archivo · Diario      │
 │ TASKS.md · progreso-frances.md · semanas/AAAA-Www.md                   │
 └───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
                 SALIDAS: bloques en Calendar · notas · borradores
```

## 3. Componentes
### 3.1 Memoria
| Capa | Dónde | Qué guarda | Quién la actualiza |
|---|---|---|---|
| Perfil estable | Instrucciones del Proyecto en claude.ai | quién eres, metas, zonas de FC, reglas UIE, estilo | tú, 1 vez/mes |
| Memoria de Claude | función de memoria de claude.ai (si la tienes activa) | preferencias que surgen en conversaciones | Claude + tú revisas |
| Estado vivo | Obsidian: `TASKS.md`, `progreso-frances.md`, notas semanales | tareas, en qué sesión de francés vas, métricas | rutinas diarias/semanales |
| Conocimiento | Obsidian `3-Recursos` | apuntes, resúmenes (skill `video-a-notas`) | tú + Claude |
| Código y proyectos | GitHub (`Mix_ideas` y repos propios) | herramientas | tú + Claude Code |

**Regla:** si algo debe recordarse más de una semana, va a Obsidian, no solo a la memoria del chat.

### 3.2 Skills (ver `01-claude-skills/`)
| Rutina | Skill | Frecuencia |
|---|---|---|
| Planificación nocturna | `organizador-diario` | diaria (22:30) |
| Sesión de francés | `frances-sesion` | diaria |
| Revisión deportiva | `revision-deportiva-semanal` | domingo |
| Revisión de hábitos | `revision-habitos-semanal` | domingo |
| Gastos | `revisar-gastos` | mensual (día 1) |
| Estudio ML | `estudio-ml` | según plan |
| Notas | `documentos-mi-estilo`, `video-a-notas` | a demanda |

### 3.3 Conexiones
| Sistema | Cómo | Lectura | Escritura | Notas |
|---|---|---|---|---|
| **Google Calendar** | conector oficial en claude.ai | ✅ eventos | ⚠️ solo bloques propios (deep work, entrenos), tras confirmar | nunca invitaciones a terceros sin revisar |
| **Gmail** | conector oficial | ✅ buscar correos con acciones/fechas | ⚠️ solo **borradores**, nunca enviar | tú envías |
| **Google Drive** | conector oficial | ✅ PDFs de horarios, guías | — | |
| **Obsidian** | (a) carpeta del vault sincronizada con Drive y leída con el conector; (b) en el ordenador, **Claude Code** abierto en la carpeta del vault (lee/edita Markdown directamente); (c) servidor MCP de sistema de archivos | ✅ | ✅ con revisión (git en el vault = deshacer fácil) | **recomendado: (b)** + vault en git |
| **Móvil** | app de Claude (voz) + Obsidian móvil | capturas rápidas a `0-Inbox` | — | dictar ideas mientras caminas |
| **Strava / Apple Watch** | exportar GPX → `02-running-tools` | ✅ | — | sin API (evitas cuentas de desarrollador) |
| **Banco** | CSV → `11-finanzas` | ✅ | — | nunca credenciales bancarias |

## 4. Rutinas
### Planificación nocturna (15 min, 22:30)
1. Abrir el Proyecto "Sistema David" → "organízame mañana".
2. Claude revisa `TASKS.md` una a una, mira Calendar y Gmail (conectores), propone bloques (entreno mañana o ≥19:00, deep work 20-23, mecánico 15-17).
3. Tú ajustas → Claude crea los bloques en Calendar (tras tu "ok") y actualiza `TASKS.md`.

### Revisión semanal (domingo, 45 min)
1. Exportar GPX de la semana → `python -m runtools gpx …` → pegar resúmenes.
2. `revision-deportiva-semanal` → nota `semanas/AAAA-Www.md`.
3. `revision-habitos-semanal` con el JSON o foto de la hoja.
4. Revisar Fase 0 (F1 / Andrew Ng) y planificar la semana.

### Captura (cualquier momento)
Móvil → Obsidian `0-Inbox` (o nota de voz a Claude). La rutina nocturna vacía la bandeja.

## 5. Qué automatizar y qué no
| ✅ Automatizar / delegar | ❌ No automatizar |
|---|---|
| Ordenar y proponer el plan del día | **Decidir** prioridades finales |
| Crear bloques propios en el calendario (tras confirmar) | Enviar correos o aceptar invitaciones |
| Resumir correos largos, detectar fechas | Responder a profesores en tu nombre |
| Generar ejercicios y corregir (francés, ML) | **Trabajos, foros, prácticas de la UIE** |
| Análisis de entrenos y gastos | Decisiones médicas o financieras importantes |
| Convertir vídeos/charlas en notas de estudio | Publicar en LinkedIn/GitHub sin revisar |

## 6. Plan por fases
| Fase | Cuándo | Qué | Criterio de hecho |
|---|---|---|---|
| **0 · Base** | semana del 9 nov | Proyecto "Sistema David" en claude.ai con instrucciones (plantilla en `plantillas/`); instalar 4 skills (organizador, francés, deportiva, hábitos); conectar Calendar | 5 noches seguidas usando la planificación |
| **1 · Obsidian** | finales de nov | vault en git; `TASKS.md` con formato fijo; Claude Code abierto en el vault para la revisión semanal | 2 revisiones semanales escritas en el vault |
| **2 · Correo y datos** | diciembre | conector Gmail (solo lectura + borradores); flujo GPX semanal; CSV del banco mensual | 1 mes completo sin tareas perdidas en el correo |
| **3 · India** | enero | adaptar franjas horarias (IST) y rutinas al campus; skill `preparar-viaje` para escapadas | rutina nocturna funcionando en Hyderabad |
| **4 · Afinar** | febrero+ | eliminar lo que no uses; rellenar `escribir-como-yo`; medir tiempo ahorrado | sistema estable ≤ 20 min/día |

## 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| El sistema se vuelve más trabajo que lo que ahorra | límite: ≤ 20 min/día de mantenimiento; revisar en cada fase |
| Dependencia: sin Claude no sé planificar | la rutina es tuya (orden de prioridades fijo); Claude solo acelera |
| Errores al escribir en Calendar/Obsidian | confirmación previa + git en el vault |
| Privacidad | no subir datos sensibles; conectores solo con los permisos necesarios |
