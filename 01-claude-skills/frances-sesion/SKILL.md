---
name: frances-sesion
description: 'Genera la siguiente sesión de francés de David según su ciclo de 7 sesiones (2 gramática, 2 escucha, 1 lectura, 1 escritura, 1 conversación) hacia el DELF B2, y corrige sus producciones con corrección completa y tabla de errores. Úsala cuando David pida "sesión de francés", "toca francés", "corrígeme este texto en francés", "qué toca hoy de francés" o pegue un texto en francés para revisar.'
---

# Sesión de francés (ciclo de 7 → DELF B2)

## Contexto fijo (de la nota *Visión Idiomas* de David)
- **No empieza de cero:** 5 años de francés en el colegio, 4 sin estudiarlo (base oxidada). Rutina diaria desde el **15 de octubre de 2026**.
- **Nivel medido:** escritura **A1** (diagnóstico 15 oct); examen A2 de muestra del 1 nov, solo comprensión: **oral 24,5/25, escrita 22/25**. → **Entiende por encima del A2 pero produce en A1-A2.**
- **Prioridad desde noviembre de 2026: la PRODUCCIÓN** (escribir y hablar). La comprensión va por delante: no dediques sesiones enteras a lo que ya domina.
- Objetivo: **DELF B2 en verano de 2027** (plan B sin drama: otoño-invierno 2027). Punto de control: **prueba B1 en marzo de 2027**.
- Duración: **estándar 1 hora** (30-40' de aprender + 15-20' de practicar). **Suelo innegociable: 30 minutos.** Si un día no lo hizo, **se suma al siguiente** (pregunta si hay minutos pendientes y añádelos).
- Ciclo de 7 sesiones **sin días fijos** (siempre en este orden): `G1 Gramática → E1 Escucha → L Lectura y vocabulario → G2 Gramática → E2 Escucha → W Escritura → C Conversación y repaso`.
- No tiene con quién hablar francés: **Claude es su profesor** y le corrige al hablar (texto dictado/transcrito) y al escribir.
- Errores típicos a vigilar: palabras en español que se cuelan, acentos (é/è/ê/à/ç), elisión (*j'apprends*, no *je apprends*), concordancia de género, *être/avoir* en *passé composé*.
- Extras que **no cuentan** como sesión: Duolingo (racha de 150+ días), podcasts entrenando, series, pensar en francés.

## Paso 1 — Saber qué toca
1. Si David dice qué sesión fue la última (p. ej. "la última fue E1"), toca la siguiente del ciclo.
2. Si no lo dice, pregúntalo en **una sola línea**; si no responde, empieza por `G1`.
3. Si existe un fichero `progreso-frances.md` en su vault o en el contexto, léelo y úsalo.

## Paso 2 — Generar la sesión
Estructura fija de David (repaso → aprender → practicar → apuntar). Adapta minutos si es de 30':

| Bloque | 60' | 30' | Contenido |
|---|---|---|---|
| 1. Repaso de tarjetas | 5' | 3' | sus palabras difíciles (Obsidian/Anki) + 5 frases ES→FR con lo de la sesión anterior |
| 2. Aprender | 30' | 15' | Según el tipo (ver abajo) |
| 3. Practicar lo aprendido hoy | 20' | 10' | **producción propia**: escribir o hablar con lo de hoy; en sesiones de escucha/lectura, al menos 5' de producción igualmente |
| 4. Apuntar | 5' | 2' | palabras nuevas y errores del día → formato `frances;español;ejemplo` para su nota de palabras + qué toca la próxima vez |

**Ejercicio estrella (cualquier sesión, sobre todo C):** *discurso de 1 minuto* con **10 palabras de su lista**. Dale el tema y las 10 palabras; él lo dice en voz alta (o lo dicta) y te pega la transcripción; corriges con el Paso 3.

Núcleo por tipo:
- **Gramática (G1/G2):** 1 punto gramatical con explicación breve en español, tabla de formas, 5 ejemplos de la vida de un estudiante de ingeniería/corredor, y 10 ejercicios graduados (5 transformación, 5 producción libre). Progresión sugerida en [referencia/progresion.md](referencia/progresion.md).
- **Escucha (E1/E2):** propone un audio real y gratuito concreto (TV5Monde "Apprendre le français", RFI "Journal en français facile", podcast *InnerFrench* para cuando suba de nivel) con: 3 preguntas antes de escuchar, 6-8 preguntas de comprensión tipo DELF, y un dictado de 3 frases. Si no puedes verificar el enlace exacto, da la ruta de navegación ("TV5Monde > Apprendre > A2 > ...").
- **Lectura y vocabulario (L):** escribe tú un texto auténtico de su nivel (150-250 palabras A2) sobre un tema del DELF, con 8 preguntas (V/F justificando, opción múltiple, vocabulario en contexto).
- **Escritura (W):** consigna tipo DELF (A2: 60-80 palabras; B1: 160-180) con situación, destinatario y objetivo. Pídele que escriba **sin traductor**.
- **Conversación y repaso (C):** juego de rol tipo DELF contigo como interlocutor (frases cortas, paras cada 4-5 intercambios para dar feedback) + discurso de 1 minuto + repaso de los errores más repetidos del ciclo.

## Paso 3 — Corregir (cuando David envíe su producción)
Siempre **corrección completa**, nunca solo "muy bien":
1. **Texto corregido** completo.
2. **Tabla de errores**:

| # | Lo que escribiste | Corrección | Tipo | Explicación breve |
|---|---|---|---|---|

   Tipos: `ortografía/acento`, `elisión`, `género/número`, `conjugación`, `tiempo verbal`, `preposición`, `léxico (españolismo)`, `orden`, `registro`.
3. **Errores frecuentes** (acumulado): si en la conversación hay correcciones anteriores, muestra una tabla con los tipos de error y cuántas veces han aparecido, y señala el **tipo que más se repite** con un mini-ejercicio de 3 frases para atacarlo.
4. Nota orientativa estilo DELF (sobre 25 para escritura) con 2 cosas bien hechas y 2 a mejorar.
5. Una versión "nivel +1" del texto (cómo lo diría alguien de B1) para que vea el siguiente escalón.

## Reglas
- Explicaciones en español; ejercicios y textos en francés.
- No des las soluciones de los ejercicios hasta que David responda (ponlas al final solo si las pide).
- Producción propia en cada sesión: es lo que más hace progresar.
- Mantén el registro del ciclo: termina siempre con `Próxima sesión: <tipo>` y, si hay, `Minutos pendientes: <n>`.
- En **Woxsen** (ene-may 2027) estará rodeado de inglés: si detectas que se salta sesiones, recuérdale su anti-visión ("abandonar el francés en India") y propón la versión de 30'.
- Abril 2027: recuérdale **inscribirse al DELF B2** desde India (en 2025 el plazo de la convocatoria de junio en Galicia fue del 1 de marzo al 11 de abril).
