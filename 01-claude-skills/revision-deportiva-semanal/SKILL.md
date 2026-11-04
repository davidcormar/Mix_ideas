---
name: revision-deportiva-semanal
description: 'Revisa la semana de entrenamiento de David (sesiones de running y gimnasio, km, tiempo en zonas de FC, peso y cintura), la compara con el plan y con su objetivo de 5K, y escribe la nota semanal para Obsidian. Úsala cuando David diga "revisión semanal de deporte", "cómo ha ido la semana de entrenos", "nota semanal de running" o pegue sus datos de la semana.'
---

# Revisión deportiva semanal

## Datos de referencia de David
- 175 cm · 70 kg · ~15 % grasa.
- Zonas de FC (Apple Watch): **Z1 <138 · Z2 139-152 · Z3 153-165 · Z4 166-179 · Z5 ≥180**. FC máx observada ~197.
- **Atleta híbrido:** fuerza **y** resistencia, sin sacrificar ninguna. Sueño: **Ironman**. Escalera: media maratón (otoño 2027) → maratón (2028) → triatlón sprint/olímpico (2029, **aprender a nadar**) → 70.3 (2030) → Ironman (2032).
- **Estándar: 5+ sesiones/semana. Suelo innegociable: 3 sesiones/semana** (aunque sea 15' de trote en el parque). Si una semana baja del suelo, es la alerta n.º 1 de la revisión.
- 5K: **26:47 el 3 nov 2026** (meta de 2026 de <27:00 cumplida; antes 27:58 el 2 ago). Nueva meta: **<26:00 el 28 dic 2026**. 2027: 5K <25:00, 10K <53:00, media <1:55. Maratón <3:45 en 2028.
- Anti-visión: que el deporte pase a ser ocasional, que el trabajo se lo coma, **lesionarse por saltarse la prevención o subir escalones demasiado rápido**.
- Semana tipo: gimnasio de fuerza 3 días + 1 día de saltos (pliometría) y prevención de lesiones + correr ~2-3 días (series el lunes, rodaje, tirada larga el fin de semana). Bici solo estática por ahora; no nada todavía.
- Herramientas propias: `02-running-tools/` (analizador GPX, calculadora VDOT, plan hasta el 28-dic).

## Paso 1 — Recoger datos (pide lo que falte, en una sola lista)
| Dato | Fuente |
|---|---|
| Sesiones de running (fecha, tipo, km, tiempo, ritmo, FC media, % por zonas) | Strava / Apple Watch / informe del analizador GPX |
| Sesiones de gimnasio (rutina y si progresó en algún ejercicio) | gym tracker |
| Peso medio de la semana y cintura (cm) | báscula / cinta |
| Sensaciones: sueño, fatiga (1-10), dolores | David |

## Paso 2 — Analizar
1. **Cumplimiento**: sesiones hechas vs. planificadas, y vs. **estándar (5+) y suelo (3)**. ¿Hubo sesión de prevención?
2. **Volumen**: km totales y variación vs. semana anterior (alerta si sube >10 % sin ser intencionado).
3. **Distribución de intensidad**: % de tiempo en Z1-Z2 vs Z3 vs Z4-Z5. Referencia orientativa 80/20 (≈80 % fácil). Alerta si los rodajes están en Z3 ("zona gris").
4. **Calidad**: ritmos de series vs. objetivo (400 m 2:05-2:08, 1 km 5:25-5:30, umbral 5:55-6:05) y si van mejorando.
5. **Composición corporal**: tendencia de peso y cintura (no reaccionar a una sola semana).
6. **Gimnasio**: interferencia con running (p. ej., pierna fuerte el día antes de series → mal).
7. **Predicción**: si hay un test o series de 1 km, estima el 5K actual (VDOT) y la distancia al objetivo.

## Paso 3 — Nota semanal (formato Obsidian)
```markdown
---
tipo: diario
area: deporte
estado: terminado
fecha: AAAA-MM-DD
tags: [revision-semanal, running]
---
# Semana AAAA-Www

> [!info] Resumen
> X sesiones (Y running, Z gym) · N km · peso P kg · cintura C cm · sensación S/10

## Running
| Día | Sesión | km | Ritmo | FC media | Zona principal | Comentario |
|---|---|---|---|---|---|---|

## Distribución de intensidad
| Z1-Z2 | Z3 | Z4-Z5 |
|---|---|---|

## Gimnasio
- 

## Lo que fue bien
- 
## Lo que ajusto la próxima semana
- 

> [!todo] Semana que viene
> - [ ] 

## Relacionado
**Sube:** [[Deporte]]
**Baja:** —
```

## Reglas
- Una vez al mes, mira la escalera: ¿hay algo que empezar ya para el siguiente escalón (p. ej. clases de natación, bici de carretera)? Material en `22-escalera-ironman/`.
- Información general de entrenamiento, no consejo médico: ante dolor persistente, recomendar fisioterapeuta/médico.
- Sé honesto: si la semana fue floja, dilo, pero con un ajuste concreto.
