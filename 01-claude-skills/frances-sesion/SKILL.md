---
name: frances-sesion
description: 'Genera la siguiente sesión de francés de David según su ciclo de 7 sesiones (2 gramática, 2 escucha, 1 lectura, 1 escritura, 1 conversación) hacia el DELF B2, y corrige sus producciones con corrección completa y tabla de errores. Úsala cuando David pida "sesión de francés", "toca francés", "corrígeme este texto en francés", "qué toca hoy de francés" o pegue un texto en francés para revisar.'
---

# Sesión de francés (ciclo de 7 → DELF B2)

## Contexto fijo
- Empezó de cero en octubre de 2026. Objetivo: **DELF B2 en verano de 2027**, control **B1 en marzo de 2027**.
- Nivel actual: **A1-A2** (verbos irregulares clave, *passé récent* con *venir de*, *futur proche*). Actualiza el nivel si David te dice otro.
- Duración: **1 hora de trabajo real** (por defecto) o **30 minutos** si dice que es un día cargado.
- Ciclo de 7 sesiones (orden fijo): `G1 Gramática → E1 Escucha → L Lectura → G2 Gramática → E2 Escucha → W Escritura → C Conversación`.
- Errores típicos a vigilar siempre: palabras en español que se cuelan, acentos (é/è/ê/à/ç), elisión (*j'apprends*, no *je apprends*), concordancia de género, *être/avoir* en *passé composé*.

## Paso 1 — Saber qué toca
1. Si David dice qué sesión fue la última (p. ej. "la última fue E1"), toca la siguiente del ciclo.
2. Si no lo dice, pregúntalo en **una sola línea**; si no responde, empieza por `G1`.
3. Si existe un fichero `progreso-frances.md` en su vault o en el contexto, léelo y úsalo.

## Paso 2 — Generar la sesión
Estructura siempre así (adapta minutos si es de 30'):

| Bloque | 60' | 30' | Contenido |
|---|---|---|---|
| Calentamiento | 5' | 3' | 5 frases para traducir ES→FR con lo de la sesión anterior |
| Núcleo | 35' | 17' | Según el tipo (ver abajo) |
| Producción propia | 15' | 8' | David escribe o dice algo **suyo**, nunca rellenar huecos solamente |
| Cierre | 5' | 2' | 3 tarjetas nuevas para Anki (`frances;español;ejemplo`) + qué toca la próxima vez |

Núcleo por tipo:
- **Gramática (G1/G2):** 1 punto gramatical con explicación breve en español, tabla de formas, 5 ejemplos de la vida de un estudiante de ingeniería/corredor, y 10 ejercicios graduados (5 transformación, 5 producción libre). Progresión sugerida en [referencia/progresion.md](referencia/progresion.md).
- **Escucha (E1/E2):** propone un audio real y gratuito concreto (TV5Monde "Apprendre le français", RFI "Journal en français facile", podcast *InnerFrench* para cuando suba de nivel) con: 3 preguntas antes de escuchar, 6-8 preguntas de comprensión tipo DELF, y un dictado de 3 frases. Si no puedes verificar el enlace exacto, da la ruta de navegación ("TV5Monde > Apprendre > A2 > ...").
- **Lectura (L):** escribe tú un texto auténtico de su nivel (150-250 palabras A2) sobre un tema del DELF, con 8 preguntas (V/F justificando, opción múltiple, vocabulario en contexto).
- **Escritura (W):** consigna tipo DELF (A2: 60-80 palabras; B1: 160-180) con situación, destinatario y objetivo. Pídele que escriba **sin traductor**.
- **Conversación (C):** juego de rol en francés contigo: tú haces de interlocutor, frases cortas, y paras cada 4-5 intercambios para dar feedback.

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
- Mantén el registro del ciclo: termina siempre con `Próxima sesión: <tipo>`.
