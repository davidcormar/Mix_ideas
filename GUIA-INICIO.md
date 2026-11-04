# Guía de inicio (30-40 minutos, una vez)

Todo lo de este repo está probado en un navegador automático (Chromium), **no en tu iPhone real**. Esta guía es para ponerlo en marcha y, de paso, comprobarlo. Marca cada casilla; si algo falla, apunta **qué pantalla, qué hiciste y qué viste** (con captura) y pídeme el arreglo con eso.

## 1 · Publicarlo (5 min, en el ordenador)
- [ ] En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, rama `claude/amazing-heisenberg-dlbnt1` (o la rama principal si fusionas antes), carpeta `/ (root)` → **Save**.
- [ ] Espera 1-2 min y abre `https://davidcormar.github.io/Mix_ideas/` → debe abrir el **Panel de vida**.
- [ ] Si ves un 404: comprueba que la rama elegida es la que tiene `index.html` en la raíz.

## 2 · Instalar en el iPhone (5 min)
- [ ] Abre la dirección en **Safari** → Compartir → **Añadir a pantalla de inicio** → icono «Vida».
- [ ] Ábrelo desde el icono: sin barra de Safari. **Usa siempre este icono** (sus datos van aparte de Safari).
- [ ] Desde el Panel → «Tus apps», abre una vez cada app (Ritmo, Paso, Hábitos, Gym, Idiomas, Finanzas, Viajes, Mecanografía, Importar salud) para que queden guardadas sin conexión.
- [ ] Prueba: modo avión → abre el icono → debe cargar.
- [ ] En el ordenador (Chrome o Edge): icono **Instalar** en la barra de direcciones.

## 3 · Primer uso (10 min)
- [ ] **Panel → Ajustes:** revisa tus objetivos (sueño 8 h, acostarte 23:30, móvil 60 min, 100 páginas/semana) y la cuenta atrás.
- [ ] **Panel → Metas:** las 6 de tus visiones; borra o cambia las que no quieras.
- [ ] **Ritmo:** crea tus tareas de mañana y tu horario fijo de clases (*Ajustes*). Haz la revisión nocturna esta noche.
- [ ] **Paso:** pon tu altura y objetivo de pasos.
- [ ] Si probaste «Cargar datos de ejemplo» en alguna app: **Quítalos** antes de empezar en serio (en Ritmo, también «Quitar ticks de ejemplo de Hábitos»).

## 4 · Salud sin teclear (10 min)
- [ ] Crea el Atajo siguiendo [`29-importar-salud/ATAJO-IPHONE.md`](29-importar-salud/ATAJO-IPHONE.md). Ejecútalo a mano una vez.
- [ ] Abre **Importar salud** → «Pegar del Atajo» → revisa la vista previa → «Importar». Comprueba los pasos en Paso y el sueño en Panel → Hoy.
- [ ] Automatización diaria a las 22:30 (Atajos → Automatización).
- [ ] Una vez: exporta Salud (`export.xml`) e impórtalo para cargar tu historial. Revisa que un entreno de Strava aparece **una sola vez**.

## 5 · Rutina
| Cuándo | Qué | Dónde |
|---|---|---|
| Mañana (1 min) | Energía y recuperación de Bevel | Panel → Hoy |
| Noche (5 min) | Pegar del Atajo · móvil · diario de 3 líneas · revisión nocturna | Importar salud · Panel → Hoy · Ritmo |
| Domingo (10 min) | Revisión semanal + **descargar la copia de seguridad** | Panel → Semana · Ajustes |
| Primera semana del mes (20 min) | Revisión mensual → 3 objetivos a Hábitos | Panel → Mes |
| Diciembre | Informe anual → Guardar como PDF | Panel → Informe anual |

## 6 · Qué mirar con lupa (lo que no he podido probar)
- [ ] El **Atajo** en tu versión de iOS (nombres de acciones, formato de hora «11:40 p. m.»).
- [ ] **Pegar del portapapeles** dentro de la app instalada (iOS pregunta «Permitir pegar»).
- [ ] Tu **`export.xml` real** (tamaño, si Bevel aparece como fuente de sueño, si los entrenos de Strava traen distancia).
- [ ] Que los números de deporte coinciden en Ritmo, Paso y el Panel.
- [ ] Que tras 1 semana de uso los datos siguen ahí (si no, avísame: sería el borrado de iOS).

## Pendiente (cuando quieras)
- Sincronizar móvil ↔ ordenador con tu servidor de casa (idea 18: mini PC + PocketBase + Tailscale).
- Copia de seguridad: mientras tanto, **la del domingo** es tu única protección. Guárdala en iCloud Drive o Google Drive.
