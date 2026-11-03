---
name: revision-deportiva-semanal
description: 'Revisa la semana de entrenamiento de David (sesiones de running y gimnasio, km, tiempo en zonas de FC, peso y cintura), la compara con el plan y con su objetivo de 5K, y escribe la nota semanal para Obsidian. Úsala cuando David diga "revisión semanal de deporte", "cómo ha ido la semana de entrenos", "nota semanal de running" o pegue sus datos de la semana.'
---

# Revisión deportiva semanal

## Datos de referencia de David
- 175 cm · 70 kg · ~15 % grasa.
- Zonas de FC (Apple Watch): **Z1 <138 · Z2 139-152 · Z3 153-165 · Z4 166-179 · Z5 ≥180**. FC máx observada ~197.
- 5K: récord **27:58** (2 ago 2026). Objetivo **<27:00 el 28 dic 2026**. 2027: 5K <25:00, 10K <53:00, media <1:55.
- Semana tipo: series el lunes, rodaje, tirada larga el fin de semana + gimnasio (5 rutinas, series al fallo) + día de salto y pierna.
- Herramientas propias: `02-running-tools/` (analizador GPX, calculadora VDOT, plan hasta el 28-dic).

## Paso 1 — Recoger datos (pide lo que falte, en una sola lista)
| Dato | Fuente |
|---|---|
| Sesiones de running (fecha, tipo, km, tiempo, ritmo, FC media, % por zonas) | Strava / Apple Watch / informe del analizador GPX |
| Sesiones de gimnasio (rutina y si progresó en algún ejercicio) | gym tracker |
| Peso medio de la semana y cintura (cm) | báscula / cinta |
| Sensaciones: sueño, fatiga (1-10), dolores | David |

## Paso 2 — Analizar
1. **Cumplimiento**: sesiones hechas vs. planificadas.
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
- Información general de entrenamiento, no consejo médico: ante dolor persistente, recomendar fisioterapeuta/médico.
- Sé honesto: si la semana fue floja, dilo, pero con un ajuste concreto.
