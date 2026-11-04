# 22 · Escalera hacia el Ironman (idea nueva, de tu *Visión Deporte*)

Todo lo que hace falta para subir tu escalera de **atleta híbrido**: media maratón (otoño 2027) → maratón (2028) → triatlón sprint y olímpico (2029) → 70.3 (2030) → **Ironman (2032)**, sin romper el suelo de 3 sesiones y sin sacrificar la fuerza.

## Qué hay
| Fichero | Contenido |
|---|---|
| [roadmap.md](roadmap.md) | escalera con marcas, **VDOT necesario** en cada escalón, qué empezar antes de necesitarlo, reglas de progresión |
| [aprender-a-nadar.md](aprender-a-nadar.md) | crol desde cero en 12 semanas (400 m) y hasta **750 m en mayo de 2027** (Woxsen) |
| [semana-hibrida.md](semana-hibrida.md) | semana estándar (6), **semana mínima (3)**, reglas de interferencia fuerza-carrera, bloque de Woxsen |
| `plan_media.py` | generador del plan de **media maratón < 1:55** (16 semanas, 4 carreras + 2 de fuerza, descargas, afinado) → Markdown + `.ics` (reutiliza `02-running-tools`) |
| `salida/plan-media.md` / `.ics` | plan de ejemplo para el 17-10-2027 (fecha de ejemplo: cámbiala por la carrera real) |

## Cómo usarlo
```bash
cd 22-escalera-ironman
python plan_media.py --carrera 2027-10-17 --actual 26:47 --objetivo 1:55:00
python -m pytest -q tests     # 4 tests
```
Importa `salida/plan-media.ics` en Google Calendar como el plan del 5K.

## Lo que dicen los números
- Con tu 26:47 (VDOT 35,3) la media predicha hoy es **2:03:19**; la meta 1:55 pide **VDOT 38,3** (+3 en 11 meses: ambicioso pero razonable).
- El maratón < 3:45 de 2028 pide **VDOT 41,0**.
- El plan empieza el **28 de junio de 2027**, ya de vuelta de India.

## Qué está hecho
- ✅ Generador de plan de media con 4 tests (termina en la carrera, empieza después de Woxsen, progresión de tirada hasta 18 km con descargas, **2 sesiones de fuerza todas las semanas**).
- 💡 Hoja de ruta, natación y semana híbrida.

## Qué falta / siguientes pasos
- Elegir la **media de otoño 2027** real y regenerar el plan.
- Plan de maratón 2028 (mismo generador con más semanas y tiradas hasta 30-32 km).
- Cuando nades: registrar sesiones de natación en el gym tracker o en un tracker propio.

## Decisiones
- **4 carreras + 2 de fuerza** en el plan de media: respeta "ser híbrido significa no sacrificar la fuerza".
- Ritmos de calidad con el **VDOT objetivo** y rodajes con el **actual** (como en el plan del 5K).
- Natación con **clases** recomendadas al principio: es la habilidad donde más se nota corregir pronto.

> Información general de entrenamiento, no consejo médico.
