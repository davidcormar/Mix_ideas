# SPEC: 26-ritmo and 27-paso (two static apps for David)

Date context: today is 2026-11-04 (a Wednesday). Repo: `/home/user/Mix_ideas`.

**Every rule in §0, §2, §3 and §4 applies to both executors.** Then the Ritmo executor follows §5 and the Paso executor follows §6. Both read §7.

---

## 0. Ground rules (both executors, follow literally)

- **Where you may write.** Only inside your own folder (`/home/user/Mix_ideas/26-ritmo/` or `/home/user/Mix_ideas/27-paso/`).
  - Do not run git.
  - Do not edit other folders or root files (root README, `ejecutar_tests.sh`, BITACORA). The organizer does that afterwards.
- **Runtime files.** Exactly 4: `index.html`, `styles.css`, `logic.js`, `app.js`.
  - Load them with plain `<script src="logic.js"></script><script src="app.js"></script>` at the end of `<body>`.
  - **Never use `type="module"`.** ES modules fail on `file://` in Chromium.
  - No CDN, no web fonts, no external images.
  - Favicon is an inline `data:image/svg+xml` URI, so `file://` makes no 404 request.
- **logic.js is pure** (no DOM, no localStorage). It uses the same UMD wrapper as `15-habitos/app/logic.js:2,56-59`:
  `(function (root) { …; if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RitmoLogic = api; })(typeof window !== "undefined" ? window : globalThis);`
  - The global is `RitmoLogic` for Ritmo and `PasoLogic` for Paso.
- **No hidden clock in logic.js.** Every function takes `today` (ISO `YYYY-MM-DD`) or `now` explicitly. The only exceptions are the helpers `todayISO(now = new Date())` and `nowHM(now = new Date())`, which use local getters (`getFullYear/getMonth/getDate/getHours/getMinutes`) and **never** `toISOString()`.
- **Language.** UI text is in Spanish. Code, identifiers and comments are in English.
- **Escaping.** Every piece of user text is passed through `esc()` before any `innerHTML`.
- **Each app is self-contained.** Copy shared utilities into each logic.js; do not import across folders at runtime.
- **Commands.** Run these from the app folder:
  ```bash
  node --test tests/*.test.js
  NODE_PATH=$(npm root -g) node tests/smoke.js
  ```
  - Environment: Node 22.23. Playwright 1.63 is installed globally, with browsers at `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.

---

## 1. Design rationale (tied to David's visions)

**Ritmo is the daily hub.** It turns his `organizador-diario` skill (`01-claude-skills/organizador-diario/SKILL.md`) into a tool:
- **Fixed priority order:** evento → entrega (peso × urgencia) → mínimos de deporte y francés → Fase 0 → resto.
- **Energy slots:**
  - Training only in the morning (before 09:00) or from 19:00.
  - 20:00–23:00 is best focus, for deep work.
  - 15:00–17:00 is worst focus, for mechanical tasks.
- **Nightly review** goes task by task, then proposes blocks for tomorrow.
- **Non-negotiable floors are first-class numbers:**
  - Sport: floor 3, standard 5 per week.
  - French: floor 30'/day with carry-over, using exactly the `21-idiomas-plan` semantics.
- **Habits.** Ritmo shares the **same `habitos.v1` data as 15-habitos** (10 habits, goal 7.5/day, 3 monthly objectives). David then sees routines and progress in one place, which is his "lo mejor" from the screenshot.
- **Other apps are read-only.** Gym, idiomas, finanzas and Paso are shown in "Mis apps" and never written.

**Paso replaces calories with hand portions** (`16-nutricion/guia-raciones.md`): palma, puño, mano ahuecada, pulgar.
- It tracks his real targets: ~5 palms of protein, 3 L of water and 10.000 steps.
- Vegetables are flagged as the **weak point**. The target follows the guide's ramp (2 → 3 → 4 puños, every 2 weeks).
- It suggests hidden-vegetable recipes from `16-nutricion/recetas.md`.
- It gives a visual month history.
- Steps can be typed in daily, or bulk-imported from Apple Health or CSV, so he never has to log twice.

**Visual language from the screenshots:**
- Light grey canvas with white rounded cards.
- One dark "hero" card per screen.
- Left sidebar with a square logo, plus a Día/Semana/Mes segmented control.
- Small toasts in the corners.
- Monochrome heat map.
- Both apps share one token set (§2), so they read as one family.

---

## 2. Shared design system (identical in both `styles.css`, except `--accent*`)

### 2.1 Tokens

```css
:root {
  color-scheme: light dark;
  --bg:#EEEEEB; --sidebar:#E6E6E2; --surface:#FFFFFF; --surface-2:#F5F5F2;
  --ink:#1B1C1A; --ink-2:#5C5F5A; --ink-3:#8A8D87; --line:#E1E1DC;
  --dark:#1E2320; --on-dark:#F3F4F1; --on-dark-2:#A7ADA6; --dark-chip:#2E3530;
  --accent:#3E7B58; --accent-soft:#E3EEE6;          /* Ritmo. Paso: --accent:#3D6FA8; --accent-soft:#E3EBF5 */
  --ok:#2F7D4F; --warn:#A86200; --bad:#B83A26;
  --band-best:rgba(62,123,88,.08); --band-low:rgba(27,28,26,.05);
  --heat-0:#E4E4DF; --heat-1:#C9CAC4; --heat-2:#9B9E97; --heat-3:#5E625C; --heat-4:#1E2320; --heat-none:#D5D5CF;
  --shadow:0 1px 2px rgba(0,0,0,.04),0 6px 20px rgba(0,0,0,.05);
  --r-xl:20px; --r-lg:16px; --r-md:12px; --r-sm:8px; --r-pill:999px;
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px; --s-6:32px;
  --font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --fs-xs:12px; --fs-sm:13px; --fs-md:15px; --fs-lg:17px; --fs-xl:22px; --fs-2xl:28px; --fs-kpi:44px;
  --sidebar-w:224px; --tabbar-h:64px;
}
@media (prefers-color-scheme: dark) { :root {
  --bg:#111311; --sidebar:#161916; --surface:#1C1F1C; --surface-2:#242824;
  --ink:#ECEEEA; --ink-2:#A5AAA3; --ink-3:#7D827B; --line:#2D322D;
  --dark:#2A332D; --on-dark:#F3F4F1; --on-dark-2:#B5BCB4; --dark-chip:#37413A;
  --accent:#6FBF8E; --accent-soft:#22332A;          /* Paso: #7FA9DB / #1F2A38 */
  --ok:#5CC08A; --warn:#E0A045; --bad:#EF7A66;
  --band-best:rgba(111,191,142,.10); --band-low:rgba(255,255,255,.04);
  --heat-0:#262A26; --heat-1:#3B413B; --heat-2:#5F665F; --heat-3:#9AA39A; --heat-4:#E6EAE5; --heat-none:#2D322D;
  --shadow:none; } }
@media (prefers-reduced-motion: reduce) { * { transition:none!important; animation:none!important; } }
```

### 2.2 Components

- **Typography.**
  - Body: 15px, line-height 1.45.
  - All numbers use `font-variant-numeric: tabular-nums`.
  - Page title is 28px: weekday at 700, the rest at 400 ("**Miércoles,** 4 de noviembre").
  - The caption above the title is 13px, colour `--ink-3`.
  - KPI numbers are 44px/700; the denominator (e.g. "/ 10") is in `--ink-3`.
- **Cards.**
  - Background `--surface`, radius `--r-lg`, padding 16px (20px when width ≥ 1024).
  - Light mode: `--shadow`. Dark mode: 1px `--line` border.
  - **Hero card:** background `--dark`, text `--on-dark`, chips use `--dark-chip`.
- **Buttons.**
  - Primary: background `--dark`, text `--on-dark`, pill radius, 36px high (44px on phone), weight 600.
  - Secondary: `--surface` with a 1px `--line` border.
  - Icon buttons: 40×40.
- **Segmented control.**
  - Container: `--surface-2`, pill, padding 3px.
  - Active segment: `--surface`, shadow, weight 600.
  - Each segment is a `<button aria-pressed>`.
- **Check circle.**
  - 24px circle with a 1.5px `--ink-3` border.
  - Checked: background `--dark` (light mode) or `--accent` (dark mode), with a white SVG tick.
  - It is a `<button aria-pressed="true|false" aria-label="Marcar …">`, with at least a 40px hit area.
- **Chip.** 12px/600, pill, background `--surface-2` (or `--dark-chip` inside the hero card).
- **Logo.** 28px square, `--r-sm`, background `--dark`, white letter "R" or "P" (600), with the app name beside it.
- **Toast.**
  - Card 320px wide, `--r-md`, shadow.
  - Content: logo square, caption "Ritmo · 21:00" (12px, `--ink-3`), title (600), body line.
  - Container `#toasts` has `role="status" aria-live="polite"`.
  - At most 3 stacked. Each lasts 4 s, or 8 s if it has an action button. It can be dismissed with ✕ or Esc.
  - Position: Ritmo bottom-left 24px, Paso bottom-right 24px.
  - On phone: centred, bottom = `calc(var(--tabbar-h) + 12px + env(safe-area-inset-bottom))`.
- **Dialogs.**
  - Native `<dialog>` opened with `showModal()`, `aria-labelledby` on its heading; Esc closes.
  - Width 560px on desktop; full-screen sheet below 900px.
- **Focus and contrast.**
  - `:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }`
  - Colour is never the only signal: always add a tick, text or percentage.
  - Contrast meets AA (the tokens above already satisfy this).
- **Icons.** Inline SVG stroke icons (1.75px) or emoji. No icon fonts.

### 2.3 Layout and breakpoints

- **Width ≥ 900px.**
  - Fixed left sidebar (`--sidebar-w`, background `--sidebar`), containing: logo + name, the nav (`<nav aria-label="Secciones">` with `<a href="#/…" aria-current="page">`), and the app-specific bottom area.
  - Content: max-width 1200px, padding 24px, grid gap 16px.
- **Width < 900px.**
  - Sidebar hidden. A fixed bottom tab bar (`--tabbar-h` plus the safe-area inset) holds 5 items (icon + 11px label).
  - Content padding 12px, `padding-bottom: calc(var(--tabbar-h) + 24px)`.
  - Single column. The header title drops to 22px and the segmented control moves to its own full-width row.
- **No horizontal scroll at 360px**, on every route.
  - Week strips use `grid-template-columns: repeat(7, 1fr)` with gap 4px.
  - Any table is wrapped in `overflow-x:auto` inside its card, never the page.
- `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<meta name="color-scheme" content="light dark">`, and `<html lang="es">`.

---

## 3. Shared conventions (both apps)

- **Dates** are ISO strings `YYYY-MM-DD` in **local** time.
  - All arithmetic is UTC-based, as in `21-idiomas-plan/logic.js:18-22`: `addDays(iso, n)` goes through `Date.UTC`, and `daysBetween(a, b)` is rounded. This makes it DST-safe.
  - Weeks run Monday to Sunday. `dow(iso)` returns 1 (Monday) to 7 (Sunday).
  - `weekStart(iso)` returns the Monday. `weekDays(iso)` returns the 7 dates.
  - `monthGrid(ym)` returns `{offset, days}`, where `offset` is the number of empty leading cells in a Monday-first grid.
- **Times** are `"HH:MM"` strings.
  - `parseHM` gives minutes since midnight; `fmtHM` formats them back; `ceil15(min)` rounds up to the next multiple of 15.
  - `toEpoch(iso, hm)` returns `new Date(y, m-1, d, hh, mm).getTime()` (local, DST-correct). It is only for reminders and the "Ahora" marker.
- **Spanish formatting** (write it yourself; do not use `toLocaleString`, because the es-ES locale does not group 4-digit numbers):
  - `fmtInt(8420)` → "8.420" (dot every 3 digits, always).
  - `fmtDec(1.1475, 1)` → "1,1".
  - `fmtDur(95)` → "1 h 35 min"; `fmtDur(60)` → "1 h"; `fmtDur(45)` → "45 min".
  - Day names: lunes…domingo. Short: Lun Mar Mié Jue Vie Sáb Dom. Letters: L M X J V S D.
  - Month names: enero…diciembre.
  - `titleParts(iso)` → `{weekday:"Miércoles", rest:"4 de noviembre"}`.
- **Storage wrapper** (app.js):
  - `store.get(key)` returns a string or `null` and never throws.
  - `store.set(key, str)` returns a boolean.
  - If a write fails, show one toast: "No se pudo guardar en este navegador: exporta tus datos". After that, keep working in memory.
- **Multiple tabs.** Listen for `window.addEventListener("storage", …)`. When the own key or any foreign key changes, re-read it and re-render the current view (but not an open dialog).
- **Routing.**
  - Hash routes such as `#/hoy`, `#/hoy?d=2026-11-03`, etc. The default is `#/hoy`.
  - Re-render on `hashchange`.
  - `document.title` = "Ritmo · Hoy" (or the equivalent).
- **Timers.**
  - A 20 s interval updates only live elements (the "Ahora" marker, labels, reminders). It must not do a full re-render, so keyboard focus is preserved.
  - If the local date changed since the last tick, do a full re-render.
- **Export/import JSON.**
  - Export is a download `<app>-YYYY-MM-DD.json` of a bundle `{app, version:1, exportedAt, …}`.
  - Import accepts either the bundle or the raw own object.
  - Validate before replacing anything. Ask `confirm("¿Sustituir los datos actuales…?")`.
  - On error, show the toast "Archivo no válido: <motivo>" and change nothing.
- **Demo button.**
  - "Cargar datos de ejemplo" asks for confirmation, then generates data relative to today.
  - Generation is deterministic: a seeded PRNG (`mulberry32(42)`) lives in logic.js.
- **ID generation.** `"t_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6)` (prefix by entity). In logic.js the ID generator is injectable for tests.
- **Tests.**
  - The first line of **every** `*.test.js` is `process.env.TZ = "Europe/Madrid";`. Each test file runs in its own process.
  - Use `node:test` and `node:assert`.
  - Tests never depend on the real date.
- **Smoke tests.**
  - `const { chromium } = require("playwright")`, then `chromium.launch()`.
  - Context: `{ viewport:{width:1280,height:800}, locale:"es-ES", timezoneId:"Europe/Madrid" }`.
  - Call `await page.clock.install({ time: new Date("2026-11-04T18:40:00+01:00") })` **before** `goto`. Paso uses 18:20.
  - Collect `pageerror` and console errors (ignore messages containing "favicon"). Both must be empty at the end.
  - Accept dialogs with `page.on("dialog", d => d.accept())`.
  - Downloads: `page.waitForEvent("download")` and read the content with `fs.readFileSync(await dl.path())`.
  - Screenshots go in the app folder: `captura-escritorio.png` at 1280×800, then `page.setViewportSize({width:390,height:844})` and `captura-movil.png`.
  - Also check every route at 360×740: `document.documentElement.scrollWidth <= window.innerWidth`.
  - Run once more with `page.emulateMedia({colorScheme:"dark"})` and check there are no errors.
  - Exit code is 1 on any failure. Print "smoke OK …" on success.

---

## 4. Foreign localStorage contracts (exact shapes, from the code)

| Key | Exact shape | Source | Ritmo | Paso |
|---|---|---|---|---|
| `habitos.v1` | `{ habits: string[] , months: { "YYYY-MM": { "<habitIndex>": number[] /* day-of-month, sorted unique */ } }, objectives?: { "YYYY-MM": [{text:string, done:boolean}×3] } }` | `15-habitos/app/logic.js:1,16-23,44-49,51-54`; `15-habitos/app/index.html:49,52-53,59,62,94` | **read + restricted write** (§5.2) | read-only (Deporte ticks) |
| `idiomas.v1` | `{ log: [{date:"YYYY-MM-DD", lang:"fr"\|"de"\|"en", minutes:number, type:"gramatica"\|"escucha"\|"lectura"\|"escritura"\|"conversacion"\|"inmersion"\|"extra", t?:number}], base?: {fr?:number,…} }` | `21-idiomas-plan/index.html:53,55,70`; `logic.js:8-16,24,32-46,71-83,94-98` | read-only | — |
| `gymtracker.v1` | `{ sessions: [{date:"YYYY-MM-DD", routine:"r1".."r5", exercises:[{id, sets:[{weight, reps}]}]}], draft: object\|null }` | `10-gym-tracker/app.js:1,4,10,96`; routine names `logic.js:19-25` | read-only | read-only |
| `finanzas.v1` | `{ txs:[{date, concept, amount, category}], goals:[{id, name, target, deadline, contributions:[{date, amount}]}], csv:{} }` | `11-finanzas/app.js:3,15,119,124`; `goalStatus` `logic.js:103-110` | read-only | — |
| `paso.v1` | §6.2 | 27-paso | read-only | own |
| `ritmo.v1` | §5.2 | 26-ritmo | own | — |

**Quirks to respect:**

- **15-habitos.**
  - It crashes if `habits` is missing: `index.html:62` calls `data.habits.forEach`.
  - It saves its whole in-memory object on every change (`index.html:53`). If it is open in another tab it can overwrite Ritmo's ticks. This is documented in Ritmo's README.
  - Habit keys inside a month are numeric indices, stored as strings in JSON.
- **Gym tracker.** It stores dates from `toISOString()` (UTC, `app.js:20`). Read them as-is.
- **Gym routine names** (copy as a map): `r1` "Tren superior", `r2` "Pecho-espalda", `r3` "Brazo-hombro", `r4` "Espalda-bíceps", `r5` "Pecho-hombro-tríceps". Unknown id → show the id.
- **Default habits** (copy byte-exact from `15-habitos/app/logic.js:3-4`) as `HABITS_DEFAULT`:
  `["📵 Móvil (0 redes <14:00, máx 1 h)","🧠 Deep work","🇫🇷 Francés","🏃 Deporte","🥗 Nutrición + 3 L agua","🌙 Rutina de noche + leer","🤖 ML (plan del día)","⏰ Levantarse a su hora","🇬🇧 Inglés","🧘 Meditar (prueba)"]`
- **Habit detection** by name regex, never by fixed index:
  - sport `/deporte/i`
  - french `/franc[eé]s/i`
  - nutrition `/nutrici/i`
  - night routine `/noche/i`
  - If not found → `null`, and the feature degrades with a "Sin vincular" label.
- **Readers never throw.** Every reader (`readGym/readIdiomas/readFinanzas/readPaso/readHabits`) returns `null` (or `status:"missing"|"invalid"`) for a missing, unparsable or wrongly shaped value.

### Shared rule: sport sessions per day (both apps, identical code)

```
sportByDay(dates, { habits, sportIdx, gymSessions, runs, ritmoDone }) →
  { byDay:{iso:n}, total, sources:{habit,gym,runs,ritmo}:boolean }
n_d = max( habitTick_d ? 1 : 0,  gymCount_d + runsCount_d,  ritmoDoneSport_d )
```

- Paso passes `ritmoDone = null`.
- Why max: the same session recorded in two places counts once. Two real sessions on one day (gym + run) count as 2.

```
floorStatus(total, iso, floor=3, standard=5) → {state, need, daysLeft}
daysLeft = 8 - dow(iso)            // includes iso
need     = max(0, floor - total)
state    = total >= standard ? "estandar"
         : total >= floor    ? "suelo"
         : need >= daysLeft  ? "riesgo"
         :                     "falta"
```

**Shared test vectors (both apps must assert these).**

Week 2026-11-02 to 2026-11-08, with:
- Deporte habit ticks on 2, 3 and 5
- gym sessions on 3 (×1) and 4 (×1)
- runs on 3 and 6
- Ritmo done sport tasks on 5 (×1) and 7 (×2)

Expected `byDay`:

| Day | 02 | 03 | 04 | 05 | 06 | 07 | 08 | Total |
|---|---|---|---|---|---|---|---|---|
| Ritmo | 1 | 2 | 1 | 1 | 1 | 2 | 0 | 8 |
| Paso (no Ritmo tasks) | 1 | 2 | 1 | 1 | 1 | 0 | 0 | 6 |

`floorStatus`:
- (1, "2026-11-05") → "falta" (need 2, daysLeft 4)
- (1, "2026-11-07") → "riesgo"
- (0, "2026-11-08") → "riesgo"
- 3 → "suelo"
- 5 → "estandar"

---

## 5. 26-ritmo · "Mi organizador de hábitos y rutinas"

### 5.1 Files

```
26-ritmo/
  index.html  styles.css  logic.js  app.js  README.md
  captura-escritorio.png  captura-movil.png        (written by smoke.js)
  tests/dates.test.js  habits.test.js  plan.test.js  minimums.test.js  ics.test.js  io.test.js  smoke.js
```

### 5.2 Storage

**Own key `ritmo.v1`:**

```json
{
  "version": 1,
  "settings": {
    "dayStart": "07:00", "dayEnd": "23:30",
    "morningTrainEnd": "09:00", "eveningTrainStart": "19:00", "latestTrainStart": "21:00",
    "bestFocus": ["20:00","23:00"], "lowFocus": ["15:00","17:00"],
    "trainingPreference": "tarde",
    "sportFloor": 3, "sportStandard": 5, "sportDurationMin": 60,
    "frenchFloorMin": 30, "frenchStandardMin": 60, "frenchStart": "2026-10-15",
    "frenchCountFrom": "<first-run ISO>", "frenchPreferredTime": "17:00", "frenchMaxBlockMin": 120,
    "maxFocusMin": 360, "marginMin": 30, "habitGoal": 7.5,
    "habitLinks": { "sport": 3, "french": 2 }, "autoTickHabits": true,
    "reminders": { "enabled": true, "leadMin": 0 },
    "fixedWeekly": [ { "id": "fw_1", "title": "Clases UIE", "days": [1,2,3,4,5], "start": "09:00", "end": "14:30" } ]
  },
  "tasks": [ {
    "id": "t_x", "title": "Práctica de Señales", "category": "entrega",
    "date": "2026-11-05", "time": "20:00", "durationMin": 120,
    "due": "2026-11-07", "weight": 20, "notes": "",
    "status": "open", "createdAt": "ISO", "updatedAt": "ISO",
    "doneAt": null, "doneOn": null, "auto": false
  } ],
  "routines": [
    { "id": "manana", "name": "Mañana", "time": "07:00", "durationMin": 20, "habitIndex": null,
      "items": [ {"id":"m1","text":"Levantarme a mi hora (sin posponer)"}, {"id":"m2","text":"Vaso grande de agua"}, {"id":"m3","text":"Meditar 5' (prueba)"}, {"id":"m4","text":"Mirar los bloques de hoy"}, {"id":"m5","text":"Móvil sin redes hasta las 14:00"} ] },
    { "id": "noche", "name": "Noche", "time": "23:00", "durationMin": 30, "habitIndex": 5,
      "items": [ {"id":"rev","text":"Revisión nocturna en Ritmo"}, {"id":"n2","text":"Preparar mochila y ropa de entreno"}, {"id":"n3","text":"Pantallas fuera"}, {"id":"n4","text":"Leer 20 min"}, {"id":"n5","text":"Despertador lejos de la cama"} ] }
  ],
  "routineLog": { "2026-11-04": { "manana": ["m1","m2"], "noche": [] } },
  "reviews": { "2026-11-03": { "at": "ISO", "done": 3, "tomorrow": 2, "redated": 1, "archived": 1, "kept": 0, "accepted": 5 } }
}
```

**Field rules:**
- `category` ∈ `evento | entrega | deporte | frances | fase0 | resto`.
  - Labels: "Evento fijo", "Entrega", "Deporte", "Francés", "Fase 0 · ML", "Resto".
  - Colours: evento `#6B7280`, entrega `#C2412D`, deporte `#3E7B58`, frances `#3B5BA5`, fase0 `#7A4FA0`, resto `#A07A3B`, rutina `#8A8F87`. Lighten them about 20% in dark mode.
- `status` ∈ `open | done | archived`.
- `date` and `time` may be `null`. `durationMin` is an integer from 5 to 720 (default 60).
- `due` and `weight` (percent of the grade, default 10) apply only to entregas.
- **First run:** default `fixedWeekly` is `[]`. `habitLinks` are auto-detected (§4). `frenchCountFrom` = today.
- **`migrate(any, today)`** fills every missing field with its default, coerces invalid values (bad category → "resto", bad time → null, bad status → "open"), and drops tasks without an id or a title.

**Shared key `habitos.v1`: write protocol (critical, must not corrupt 15-habitos).**

Reading: `readHabits(raw)` returns:
- `{status:"missing", data:null, habits:HABITS_DEFAULT}`,
- `{status:"invalid", error}` (JSON fails, not an object, or `months` is not a plain object), or
- `{status:"ok", data, habits}`, where `habits = data.habits` if it is a non-empty string array, otherwise `HABITS_DEFAULT`.

If the status is invalid:
- show the banner "Los datos de hábitos (habitos.v1) no son válidos. Ábrelos en 15-hábitos o importa una copia.";
- disable every habit toggle and objective edit;
- never write.

Writing always goes through a fresh read-modify-write. Never use a cached copy.

```js
applyHabitMutation(raw /*string|null*/, mutate) {
  let data;
  if (raw === null) data = { habits: HABITS_DEFAULT.slice(), months: {} };
  else {
    try { data = JSON.parse(raw); } catch { return { ok:false, error:"JSON no válido" }; }
    if (!isPlainObject(data) || !isPlainObject(data.months)) return { ok:false, error:"falta 'months'" };
    if (!Array.isArray(data.habits) || !data.habits.length || !data.habits.every(s => typeof s === "string"))
      data.habits = HABITS_DEFAULT.slice();   // repair only: 15-habitos crashes without it
  }
  mutate(data);
  return { ok:true, data, json: JSON.stringify(data) };   // no indentation, same as 15-habitos
}
```

- **The only allowed mutators:**
  - `setTick(data, iso, h, bool)`:
    - requires `0 ≤ h < data.habits.length` and `iso ≤ today`;
    - `months[ym] ||= {}`;
    - `arr = months[ym][h]`, filtered to integers 1..31;
    - add or remove the day number, keep the array sorted and unique;
    - an empty array is kept (same as `toggle` in `15-habitos/app/logic.js:18-23`).
  - `setObjective(data, ym, i, {text?, done?})`: normalise `objectives[ym]` to exactly 3 `{text, done}`, exactly like `logic.js:44-49`.
- **Never:**
  - rename, add, delete or reorder habits;
  - delete months;
  - write any other top-level key.
- Unknown top-level fields, other months and other objectives stay byte-identical after `JSON.parse`.

### 5.3 logic.js API (`RitmoLogic`)

- **Dates and format:** `todayISO, nowHM, addDays, daysBetween, dow, weekStart, weekDays, monthGrid, parseHM, fmtHM, ceil15, toEpoch, titleParts, fmtInt, fmtDec, fmtDur`.
- **Habits:**
  - `HABITS_DEFAULT, readHabits, isTicked(d,iso,h)`. Compare with `Number(x) === day`.
  - `dayScore(d,iso)` — the number of habits ticked.
  - `last7(d,iso,h)` → `bool[7]` for iso−6…iso.
  - `weekPct(d,iso,n)`:
    - days = Monday … iso;
    - pct = Σ ticks / (n × days);
    - returns `Math.round(pct × 100)`;
    - reads two months when the week crosses a month boundary.
  - `streak(d,iso,h)`:
    - start at iso; if iso is not ticked, start at iso−1 (today unticked does not break the streak, same as `15-habitos/app/logic.js:32-35`);
    - count back across months, at most 1000 days.
  - `habitPct(d,iso,h,days)`.
  - `weakest(d,iso,k=3)`: lowest % over the last 7 *complete* days (iso−7 … iso−1); ties go to the lower index.
  - `tipFor(habitName)`: regex → tip.
    - móvil → "Deja el móvil fuera de la habitación y modo concentración hasta las 14:00."
    - deep → "El bloque de 20:00 ya está reservado: empieza por lo más difícil, sin móvil."
    - franc → "Si el día se complica, haz los 30' del suelo justo después de comer."
    - deporte → "Deja la ropa preparada esta noche; 20' de trote también cuentan."
    - nutrici → "Llena la botella de 1 L tres veces y ten verdura congelada a mano."
    - noche → "Alarma a las 22:45: pantallas fuera y 20' de lectura."
    - ML → "Decide esta noche la primera tarea de ML de mañana (una línea)."
    - levantarse → "Despertador lejos de la cama y sin posponer."
    - ingl → "Un vídeo técnico en inglés en el desayuno."
    - medit → "5' después de levantarte, antes del móvil."
    - fallback → "Hazlo más fácil: reduce el primer paso a 2 minutos."
  - `findHabit(habits, re)`, `applyHabitMutation`, `setTick`, `setObjective`, `objectivesOf(d,ym)` (non-mutating; always returns 3 items).
- **State:** `DEFAULT_SETTINGS, DEFAULT_ROUTINES, CATEGORIES, HYBRID_WEEK, emptyState(today), migrate(any,today), newTask(fields,{nowIso,id})`.
  - `HYBRID_WEEK`, from `22-escalera-ironman/semana-hibrida.md`, indexed by `dow`:
    1. "Series"
    2. "Fuerza: empuje (pecho-hombro-tríceps)"
    3. "Rodaje Z2 35-45'"
    4. "Fuerza: tirón (espalda-bíceps)"
    5. "Pierna + saltos + prevención"
    6. "Natación técnica o descanso activo"
    7. "Tirada larga"
- **Tasks and day:** `priority(task, day)`, `sortTasks`, `dayBlocks`, `overdue`, `slotWarnings`.
  - `priority(task, day)` → `{rank, score}`:
    - rank: evento 1, entrega 2, deporte 3, frances 3, fase0 4, resto 5;
    - score (entregas only) = `weight × urgency`;
    - urgency = no due → 0.1; `daysBetween(day, due) ≤ 0` → 2; otherwise 1/daysToDue.
  - `sortTasks(tasks, day)`: rank ascending → score descending → date ascending (nulls last) → createdAt ascending.
  - `dayBlocks(state, iso)` → `{timed:[Block], untimed:[Task]}`:
    - timed blocks = fixedWeekly entries for `dow(iso)`, plus routines (`kind:"rutina"`), plus tasks with `date===iso` and `time` set and status ≠ archived;
    - sorted by start, then rank.
  - `overdue(state, today)`: open tasks with `date < today`.
  - `slotWarnings(block, settings, others)` → `[{code, text}]`:
    - `train_out_of_window`: a deporte block overlapping [morningTrainEnd, eveningTrainStart). Text: "Entreno fuera de franja: solo antes de las 9:00 o desde las 19:00."
    - `deep_in_low_focus`: an entrega or fase0 block overlapping lowFocus. Text: "Franja de poco foco (15–17 h): mejor tareas mecánicas."
    - `overlap`: any overlap with another timed block. Text: "Se solapa con «X»."
    - `outside_day`: start < dayStart or end > dayEnd. Text: "Fuera de tu jornada."
  - `Block = {key, kind, title, start, end, taskId?, priority?, reason?, done?, notes?}`, with start/end in minutes. Key formats: `task:<id>`, `routine:<id>`, `fixed:<id>`, `new:deporte`, `new:frances`, `margin`.
- **Routines:**
  - `routineProgress(state,rid,iso)` → `{done,total,complete}`.
  - `routineStreak(state,rid,iso)` → `{current,best}`: consecutive complete days; today incomplete does not break it.
  - `toggleRoutineItem(state,rid,itemId,iso)`.
- **Minimums and foreign data:**
  - `readGym, readIdiomas, readFinanzas(raw,today), readPaso(raw,today), sportByDay, floorStatus` (§4).
  - `frenchStatus(src, iso, settings)` → `{source:"idiomas"|"ritmo", owed, todayRequired, doneToday, floor, standard}`:
    - If `idiomas.v1` is valid: minutes by day = log entries with `lang==="fr"` and `type!=="extra"`, start = `"2026-10-15"`. This port must give exactly the same numbers as `pending()` in `21-idiomas-plan/logic.js:34-46`: `p = max(0, p + floor − done)` for each day d from start to iso−1; `todayRequired = max(0, floor + p − doneToday)`.
    - Otherwise: minutes = `durationMin` of done tasks with `category==="frances"`, grouped by `doneOn`; start = `max(frenchStart, frenchCountFrom)`.
    - Before the start date: owed 0, required = floor.
  - `frenchNextType(log)`: port of `nextSession` (`21-idiomas-plan/logic.js:71-83`) for "fr". Labels come from `LABEL` (`logic.js:9`).
- **Review and plan:** `reviewDates(now)`, `reviewQueue`, `applyReviewAction`, `proposeDay`, `acceptProposal`.
  - `reviewDates(now)` → `{reviewDay, tomorrow}`. Before 04:00, reviewDay is yesterday.
  - `reviewQueue(state, reviewDay)`:
    - open tasks with a non-null `date` and `date ≤ reviewDay+1`;
    - sorted date ascending, then `sortTasks`;
    - returns `{items, tableMode: items.length > 15}`.
  - `applyReviewAction(state, id, action, {date, today})`:
    - `done` → status done, doneAt, doneOn = today;
    - `tomorrow` → date = today+1, time = null;
    - `date` → date = chosen date, time = null;
    - `archive` → status archived;
    - `keep` → no change.
    - Always set `updatedAt`.
  - `proposeDay` and `acceptProposal`: §5.4.
- **Reminders, ICS, IO, demo:** `dueReminders`, `icsEscape`, `foldLine`, `toICS`, `blocksToEvents`, `exportBundle`, `parseImport`, `demoState`, `demoHabits` (§5.4).

### 5.4 Algorithms

**A. `proposeDay(state, day, ctx)`**

`ctx = { sportDoneBefore, frenchRequired, frenchNextType, fromHM? }`, where:
- `sportDoneBefore` = `sportByDay` total over the days of `day`'s week that are before `day`;
- `frenchRequired` = `frenchStatus(src, day).todayRequired`.

1. **Free time.**
   - Day window: `[max(dayStart, fromHM ?? dayStart), dayEnd]`.
   - Busy = fixedWeekly for `dow(day)` + routine blocks + every timed task dated `day` (open or done).
   - Free = window minus busy, as a sorted list of intervals.
   - `place(dur, windows)`: for each window in order, and each free interval inside it in chronological order: `s = ceil15(start)`; if `s + dur ≤ end`, assign it, subtract it from free, and return. Otherwise return null.
   - **Capacity check before every placement:** `totalFree − marginMin ≥ dur`. If it fails, the task is not placed.
2. **Window lists.** Write `[a,b]` for an interval; BF = bestFocus, LF = lowFocus.
   - Deep work (entrega, fase0): `BF`, then `[dayStart, LF.start]`, then `[LF.end, BF.start]`, then `[BF.end, dayEnd]`, then `LF` (the last one adds warning `deep_in_low_focus`).
   - Mechanical (resto): `LF`, `[LF.end, BF.start]`, `[dayStart, LF.start]`, `[BF.end, dayEnd]`, `BF`.
   - Sport:
     - with `"tarde"`: `[eveningTrainStart, latestTrainStart + dur]`, then `[dayStart, morningTrainEnd]`;
     - with `"manana"`: the same two windows in reverse order;
     - never anywhere else.
   - French: `[frenchPreferredTime, BF.start]`, `[dayStart, BF.start]`, `[BF.start, dayEnd]`.
3. **Candidates** (status open, untimed):
   - tasks with `date ≤ day`, plus
   - entregas with `date === null` and `due ≤ day + 7`.
   - Untimed eventos are never placed. They are listed with the warning "Evento sin hora: ponle hora".
4. **Processing order.**
   1. **Sport at risk.** If `floorStatus(sportDoneBefore, day).state === "riesgo"`, place sport now, with reason "Suelo en riesgo: N de 3, quedan D días".
   2. **Entregas**, ordered by `sortTasks`.
   3. **Minimums.**
      - Sport, unless it was already placed or `sportDoneBefore ≥ sportStandard`.
      - Then French, if `day ≥` the French start date.
      - French duration: `dur = (totalFree − marginMin ≥ 180) ? max(frenchRequired, frenchStandardMin) : frenchRequired`, then `dur = min(dur, frenchMaxBlockMin)`.
      - If the cap cut French below `frenchRequired`, add the warning "Francés: quedan N' pendientes que no caben en un bloque".
      - **Reuse existing tasks.** If an open deporte or frances task is already dated `day`: if it is timed it is already busy; if untimed, place it (with duration `max(task.durationMin, dur)` for French). Only create `new:*` blocks when no such task exists.
   4. **Fase 0** tasks, in createdAt order.
   5. **Resto**, in createdAt order.
5. **Focus cap.** Track `focusMin` = the minutes of entrega + fase0 + frances, including those already busy. Before placing one of these, if `focusMin + dur > maxFocusMin`, do not place it.
6. **Moved tasks.** A task that is not placed goes to `moved: [{taskId, title, toDate: day+1, reason}]`, in priority order. Set `overflow = moved.length > 0`. Banner text: "El día no cabe: se mueven N tareas (las de menor prioridad)."
7. **Unplaced minimums.**
   - Sport → warning "No hay hueco para entrenar en tu franja (antes de las 9:00 o desde las 19:00)".
   - French → warning "No cabe el francés: hazlo antes que lo de prioridad 4-5".
8. **Margin.**
   - Take the first remaining free interval of at least `marginMin` minutes.
   - It becomes a block `{key:"margin", kind:"margen", title:"Margen 30'"}`.
   - If there is none → warning "Sin margen de 30'".
9. **Titles.**
   - Sport: `"Deporte · " + HYBRID_WEEK[dow(day)]`, duration `sportDurationMin`.
   - French: `"Francés · " + LABEL[frenchNextType]`, or just "Francés".
10. **Result.** `{day, blocks, busy, top3, moved, warnings, overflow, focusMin}`.
    - `top3` = the first 3 placed keys in processing order, excluding the margin.

**Normative test vector.**

Setup:
- Defaults, plus fixedWeekly "Clases" Monday–Friday 09:00–14:30, plus the default routines (busy 07:00–07:20 and 23:00–23:30).
- day = `2026-11-05` (Thursday).
- `ctx = {sportDoneBefore:1, frenchRequired:45, frenchNextType:"escritura"}`.
- Tasks (all open):
  - A: entrega, 120', due 2026-11-07, weight 20, date null;
  - B: fase0, 90', date 2026-11-05;
  - C: resto, 30', date 2026-11-05.

Expected result:

| Block | Time |
|---|---|
| A | 20:00–22:00 |
| `new:deporte` "Deporte · Fuerza: tirón (espalda-bíceps)" | 19:00–20:00 |
| `new:frances` "Francés · Escritura" | 17:00–18:00 (60', because the day is not loaded) |
| B | 07:30–09:00 |
| C | 15:00–15:30 |
| margin | 14:30–15:00 |

- `top3 = ["task:A","new:deporte","new:frances"]`, `moved = []`, `overflow = false`, `focusMin = 270`.

**`acceptProposal(state, proposal, selectedKeys, {nowIso, id})`:**
- `task:*` blocks → set the task's `date = day` and `time = fmtHM(start)`.
- `new:*` blocks → create a task `{category, title, date:day, time, durationMin, auto:true}`, **unless** an open task of that category is already dated `day` (idempotent: accepting twice creates no duplicates).
- Every `moved` entry → `date = toDate`, `time = null`.
- Unselected blocks change nothing.

**B. Nightly review wizard** (`#reviewDialog`, steps 1–4)

The wizard works on a **draft copy** of the state. Nothing is saved until "Guardar y terminar".

- **Step 1 · "Tarea por tarea"** (from `reviewQueue`). One card per task, showing: title, category chip, date (shown as "atrasada" if past), duration, notes, and progress "3 / 8". Buttons:
  - `data-review-action="done"` "Hecha" (key H)
  - `tomorrow` "Mañana" (M)
  - `date` "Nueva fecha" (F, opens an inline date input + "OK")
  - `archive` "Archivar" (A)
  - `keep` "Mantener" (S)
  - "← Atrás" undoes the previous action.
  - If `tableMode` is true (more than 15 tasks), show a table instead: one row per task with a `<select>` defaulting to "Mantener", plus "Aplicar".
  - With 0 tasks: "No hay tareas abiertas para revisar" → go straight to step 2.
- **Step 2 · "¿Algo nuevo?"**
  - Checklist prompt: "Calendario · Correo · Campus/entregas · Notas de Obsidian".
  - A quick-add row: title, category, date (default tomorrow), optional due date/weight for entregas → "Añadir".
  - Below it, "Sin fecha (backlog): N", with an "Añadir a mañana" button per task.
- **Step 3 · "Mañana"** (`proposeDay(draft, tomorrow, ctx)`).
  - Table `#proposalTable` with columns "Hora | Bloque | Tarea | Prioridad". One row per block, each with a checkbox (`tr[data-block="<key>"]`, all checked by default). Busy blocks are shown greyed out and without a checkbox.
  - Then: "Top 3 de mañana", "Lo que se mueve" (with dates), warnings, and "Hábitos en riesgo" (`weakest(…,3)` with `tipFor`).
  - Button `#acceptPlan` "Aceptar plan".
- **Step 4 · "Listo".** A summary of the counts, plus "Guardar y terminar". This:
  - commits the draft;
  - writes `reviews[reviewDay]`;
  - auto-checks the routine item `rev` in "noche" for reviewDay, if it exists;
  - shows the toast "Plan de mañana guardado" with action **"Deshacer"**, which restores the pre-commit snapshot for 8 s.
- "Cancelar" at any step discards the draft.
- The entry button `#btnReview` "🌙 Revisión nocturna" sits in the sidebar bottom and in the Hoy header menu. From 20:00 onwards it is highlighted as primary.
- The Hoy menu also has "Proponer bloques para este día". It runs step 3 alone for the selected date, with `fromHM = ceil15(now)` if that date is today.

**C. Reminders.**
- Every 20 s, call `dueReminders(blocksToday, today, lastTickMs, nowMs, leadMin, sentSet)`. It returns the blocks where `fireAt = toEpoch(today, start) − leadMin·60000` satisfies `lastTickMs < fireAt ≤ nowMs`, excluding done tasks, the margin block, and keys already in `sentSet`.
- On load, `lastTick = now`, so nothing that is already past fires.
- Each reminder triggers:
  - a toast: caption "Ritmo · HH:MM"; title = block title; body = "Tu racha sigue en N días" for routines, otherwise `fmtDur + " · " + label`, plus the first 60 characters of the notes;
  - and, only if `"Notification" in window && Notification.permission === "granted"`, `new Notification(title,{body, tag:key})` inside try/catch.
- `#notifBtn` "Permitir notificaciones" calls `Notification.requestPermission()` on click. It handles rejection and shows the resulting state ("Permitidas / Bloqueadas por el navegador / No disponibles").

**D. ICS export.**
- `blocksToEvents(state, dates, {includeRoutines:false, includeFixed:false})` exports timed, non-archived tasks, plus routines and fixed blocks if the options are checked.
- `toICS(events, {calName, dtstamp})`:
  - CRLF line endings;
  - header: `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//Mix_ideas//Ritmo//ES`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`, `X-WR-CALNAME:…`, `X-WR-TIMEZONE:Europe/Madrid`;
  - then this exact VTIMEZONE:

```
BEGIN:VTIMEZONE
TZID:Europe/Madrid
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
```

- Each VEVENT has:
  - `UID:ritmo-<task|rutina|fijo>-<id>-<YYYYMMDD>@mix-ideas`
  - `DTSTAMP:<dtstamp UTC>`
  - `DTSTART;TZID=Europe/Madrid:YYYYMMDDTHHMMSS`
  - `DTEND`, computed by **wall-clock** addition (if it passes 24:00, roll the date)
  - `SUMMARY`
  - `DESCRIPTION` (label · P#, then notes)
  - `CATEGORIES:<category>`
- `icsEscape` escapes `\`, `;`, `,` and newline (`\n`).
- `foldLine`: lines longer than 75 **octets** (UTF-8) are folded with CRLF + space, never splitting a code point.
- File names: `ritmo-YYYY-MM-DD.ics` (`#icsDay`) and `ritmo-semana-<monday>.ics` (`#icsWeek`).

**E. Auto-ticking habits** (when `autoTickHabits` is on).
- A task in category deporte or frances marked done → `setTick` on the linked habit for `doneOn`.
- A routine becoming complete with `habitIndex` set → `setTick` for that date.
- Then show the toast "También marcado en Hábitos: 🏃 Deporte" (with the actual habit name).
- Unchecking a task or routine **never** unticks the habit.

**F. IO and demo.**
- `exportBundle(state, habitsRaw, nowIso)` → `{app:"ritmo", version:1, exportedAt, ritmo: state, habitos: parsed habitos | null}`.
- `parseImport(text)` → `{ok, ritmo, habitos, warnings, error}`:
  - Accepts the bundle or a raw ritmo object (one that has `tasks` as an array and `settings` as an object).
  - The habitos part is accepted only if `readHabits` says it is "ok"; otherwise it becomes `null` plus the warning "Hábitos ignorados: formato no válido".
  - The ritmo part is passed through `migrate`.
- Import UI: `confirm` before replacing. An extra checkbox, "Importar también hábitos (sobrescribe habitos.v1)", is off by default.
- `demoState(today)` (deterministic). Today's (Wednesday's) layout:

| Time | Task | Category / details |
|---|---|---|
| 07:30 | "Rodaje Z2 40'" | deporte, 45', **done** |
| (fixed) | "Clases UIE" | Monday–Friday 09:00–14:30 |
| 16:00 | "Responder correos de la práctica" | resto, 30', notes "El profesor espera la propuesta del proyecto: lleva 9 días sin respuesta." |
| 17:00 | "Francés · Escritura" | frances, 45' |
| 20:00 | "Práctica de Señales: filtros FIR" | entrega, 120', due today+3, weight 20 |
| 22:15 | "Miniproyecto F1: cargar datos de vueltas" | fase0, 45' |
| — | "Comprar zapatillas de series" | resto, untimed |

  Other demo tasks:
  - overdue (yesterday): "Pedir cita en Vacunación Internacional", resto 15';
  - tomorrow at 19:00: "Fuerza: tirón", deporte 60';
  - today+15 at 08:00: "Vuelo a Londres", evento 120';
  - done sport tasks on Monday and Tuesday of this week;
  - done French tasks on 10 of the last 13 days;
  - `frenchCountFrom` = today−13;
  - routineLog for the last 14 days, with Mañana complete today.
- `demoHabits(today)` gives ~75% ticks over the last 35 days (seeded; per-habit probability lower for Meditar and Nutrición). Today: indices 0, 3, 7 and 8 ticked.
  - **It is written only if `habitos.v1` is missing, or has zero ticks in every month.** Otherwise show the toast "Hay hábitos reales: no se tocan".
- `#wipeBtn` "Borrar datos de Ritmo" removes only `ritmo.v1`.

### 5.5 Screens

**Sidebar** (≥ 900px):
- Logo + "Ritmo".
- Nav (`a[data-nav]`): Hoy · Semana · Mes · Hábitos (badge = habits still unticked today) · Progreso.
- Section "Rutinas": Mañana, Noche (`#/rutina/manana`, `#/rutina/noche`).
- Bottom: `#btnReview` card, then "Ajustes y datos".
- Phone tab bar: Hoy · Semana · Hábitos · Progreso · Ajustes.

**Header** (all planner views):
- Caption "Un bloque cada vez". Title from `titleParts(selected)`.
- If the selected date ≠ today: chip "Volver a hoy".
- Right side: segmented control `button[data-range="dia|semana|mes"]`, synced with the route; `#btnNewTask` "+ Tarea" (dark; the icon "+" with aria-label "Nueva tarea" on phone); a "⋯" menu with: Exportar día (.ics), Exportar semana (.ics), Proponer bloques para este día, Revisión nocturna.
- Global keys (ignored while typing in an input): `n` new task, `r` review, `t` today, `←`/`→` previous/next day.

**Hoy** (`#/hoy[?d=]`). Desktop grid: left column 2fr, right column 1fr. Phone order: week strip → hero → timeline → Sin hora/Atrasadas → Mínimos → Objetivos → habit list.

- **Week strip** `#weekStrip`:
  - ‹ and › buttons, plus 7 `button[data-date]` labelled "Lun" / "3".
  - Selected day = dark pill. Today = accent dot. Small dots = number of tasks that day.
  - Clicking sets `?d=`.
- **Timeline** `#timeline`:
  - Chronological list from `dayBlocks`.
  - Each `.tl-item[data-task-id]` (or `data-key` for routines/fixed) shows:
    - time label "07:30" on the left;
    - a card with category dot + title;
    - a sub-line: "Ahora · 45 min" if `start ≤ now < end` (today only), else `fmtDur · Categoría`;
    - notes in an inset box (`--surface-2`);
    - warning chips from `slotWarnings`;
    - a `.tl-check` circle on the right (tasks only). Done tasks are greyed out with the title struck through.
  - Band markers, inserted in chronological order: "15:00 · Poco foco: tareas mecánicas" and "20:00 · Mejor foco: deep work". Items inside the bands get a tinted left edge (`--band-low`, `--band-best`).
  - `#nowMarker` is a row "Ahora · HH:MM" at the correct position (today only), updated in place every 20 s.
  - Routine items show "Rutina de noche · 2/5". Clicking expands the inline checklist.
  - Clicking a task opens `#taskDialog`.
  - Empty state: "Sin bloques. Pulsa «+ Tarea» o haz la revisión nocturna para planificar." plus a link to the demo.
- **Sin hora / Atrasadas** cards:
  - Untimed tasks of the day, each with "Poner hora".
  - Overdue tasks, each with "Pasar a hoy" (sets date to today) and "Archivar".
- **Hero** `#habitsCard` (dark):
  - Label "Hábitos de hoy" (or "Hábitos del 3 nov"), chip "82 % esta semana" (from `weekPct`).
  - Big `#habitsToday` "4 / 10", a progress bar, and the sub-line "Objetivo 7,5 · media de la semana 7,9".
- **Habit list** `#habitList`:
  - One row per habit: name, 7-segment mini bar (`last7`; filled `--dark` = done, `--heat-0` = not done), and a check `button[data-habit="i"]` for the selected date.
  - The check is disabled for future dates, or when habitos.v1 is invalid.
  - Each click calls `applyHabitMutation` on a fresh `store.get`.
  - Footer link: "Abrir hoja completa en 15-hábitos" → `../15-habitos/app/index.html`.
- **Mínimos** `#minimums`:
  - `#sportCount`: "Deporte esta semana: 2 de 3 (suelo) · 5 estándar". The bar has marks at 3 and 5.
  - Status text by state: estandar "Estándar cumplido 💪" · suelo "Suelo cumplido" · falta "Faltan N para el suelo" · riesgo "⚠ Suelo en riesgo: quedan D días".
  - Sources line: "Fuentes: Hábitos · Gym Tracker · Paso · Ritmo" (only the sources actually present).
  - `#frenchToday`: "Francés hoy: 45' (30 suelo + 15 pendientes) · hecho 0'", a bar, "Fuente: 21-idiomas" or "Fuente: tareas de Ritmo", and the link "Registrar en Idiomas" → `../21-idiomas-plan/index.html`.
- **Objetivos del mes** `#monthObjectives`:
  - 3 rows, each with `input[type=checkbox][data-obj-done=i]` and `input[data-obj-text=i]`. The text saves on `change`.
  - Title "🎯 3 objetivos del mes (N/3)".

**Task dialog** `#taskDialog`:
- Fields: `#tTitle` (required), `#tCategory`, `#tDate`, `#tTime` (optional), `#tDuration` (number, step 5, plus quick chips 15/30/45/60/90/120).
- Entregas only: `#tDue` and `#tWeight` (%).
- `#tNotes`, `#tWarnings` (live `slotWarnings`), and a hint if duration > 120: "Consejo: divide en bloques de 2 h como máximo".
- Buttons: `#tSave` "Guardar", `#tDone` "Marcar hecha", `#tArchive` "Archivar", `#tDelete` "Borrar" (confirm).
- New-task defaults: date = selected date, category resto, 60'.

**Semana** (`#/semana[?d=]`):
- Summary row: Deporte N/3·5; Francés minutes this week vs 210 (floor ×7); habit average of the week vs 7.5; tasks done/total.
- 7 columns on desktop (stacked day cards on phone). Each day shows: header "Lun 2" + chip "8/10" (habit score) + blocks (time + title, category dot, ✓ if done) + footer "4 h 30 min planificadas".
- Clicking a day header → `#/hoy?d=`.
- Buttons: ‹ Semana anterior · Esta semana · Siguiente › · Exportar semana (.ics).

**Mes** (`#/mes[?m=YYYY-MM]`):
- The 3 objectives (editable) + "Media 7,4 · 18 de 30 días ≥ 7,5".
- Monday-first grid with header L M X J V S D. Cells are `button[data-date]` with background = habit heat level:
  - ratio r = score/n; r=0 → 0; <.4 → 1; <.6 → 2; < goal/10 → 3; else 4;
  - future days have no fill.
- Inside a cell: day number, up to 3 category dots + "+N", and "⚑" if an entrega is due that day.
- `aria-label`: "4 de noviembre: 7 de 10 hábitos, 3 tareas, entrega".
- Clicking a cell → Hoy for that date.

**Hábitos** (`#/habitos`):
- Table-like list: habit · 7-day bar · "🔥 racha" (`streak`) · % over 30 days · today check.
- "Hábito más flojo (últimos 7 días)" + its tip.
- 14-day chart of daily score with a dashed line at 7.5.
- Two routine cards (Mañana/Noche) with checklist + streak.

**Rutina** (`#/rutina/<id>`):
- Checklist for today: `input[type=checkbox][data-routine-item="<id>"]`.
- "Racha actual N · mejor M", and the last 14 days as dots.
- Editor: add item, rename inline, delete ✕, move ↑/↓; time and duration inputs; "Marca también el hábito" select (none, or one of the habits).

**Progreso** (`#/progreso`). Hand-drawn SVG charts, each `svg[data-chart][role=img][aria-label="…summary…"]`:
- habit score over 30 days (bars + 7.5 line, with "Media 7,2 · 18/30 días ≥ 7,5");
- sport sessions per week, 8 weeks (lines at 3 and 5);
- French minutes per week, 8 weeks (lines at 210 and 420);
- tasks done per week, 8 weeks.

**"Mis apps"** `#appsPanel`. Each `.app-card[data-app]` has an "Abrir" link. If the key is missing: "Sin datos en este navegador".

| `data-app` | Content | Link |
|---|---|---|
| `gym` | sessions this week + last session (date · routine name) | `../10-gym-tracker/index.html` |
| `idiomas` | French minutes this week, today's requirement, total hours (+ `base.fr`) | `../21-idiomas-plan/index.html` |
| `finanzas` | each goal: name, pct = min(Σcontributions/target, 1), "1.200 € de 3.500 €" | `../11-finanzas/index.html` |
| `paso` | steps today / goal, %, meals N/4 | `../27-paso/index.html` |
| `habitos` | this month's mean vs 7.5 | `../15-habitos/app/index.html` |

Under the panel, the note: "La lectura entre apps funciona cuando comparten origen (p. ej. GitHub Pages). En file:// depende del navegador."

**Ajustes y datos** (`#/ajustes`). Sections:
- **Franjas:** all the times; reject start ≥ end with an inline error and do not save.
- **Mínimos:** sport floor, standard, duration, preference; French floor, standard, preferred time, max block.
- **Planificación:** maxFocusMin, marginMin.
- **Horario fijo semanal:** list editor (title, L–D checkboxes, start, end).
- **Hábitos:** selects for Deporte/Francés links; autoTick toggle.
- **Recordatorios:** enabled; lead time 0/5/10; `#notifBtn`.
- **Datos:** `#exportJson`, `#importFile` (via a "Importar JSON" button), `#icsDay`, `#icsWeek`, `#demoBtn`, `#wipeBtn`.
- A help line listing the keyboard shortcuts.

### 5.6 Edge cases (must be handled)

- **habitos.v1 problems:**
  - missing → defaults shown, created on the first tick;
  - invalid → read-only banner, no writes;
  - `habits` missing → repaired on write;
  - habit count ≠ 10 → all counts are dynamic;
  - day values stored as strings → compared with `Number()`.
- **Month and year boundaries** in week %, streaks, Semana and Mes: 2026-10-26…11-01; 2026-12-28…2027-01-03; February 2027 (28 days).
- **DST:**
  - date maths is string/UTC-based;
  - reminders use `toEpoch`;
  - on 2027-03-28, "02:30" does not exist: `toEpoch` normalises it (do not crash);
  - ICS keeps wall-clock times.
- A task crossing midnight: clipped at 24:00 on the timeline; the ICS end date rolls over.
- Overlapping tasks are both shown, with an `overlap` warning.
- A day with no free time → every candidate is moved, `overflow` is true, and the banner is shown.
- French owed can be huge (it accumulates without limit, as in idiomas) → capped by `frenchMaxBlockMin`, plus a warning.
- Review run after midnight (before 04:00) → targets yesterday/today.
- No open tasks → step 1 is skipped. More than 15 → table mode.
- Proposal accepted twice → no duplicates.
- localStorage unavailable → banner, in-memory state, export still works.
- Notifications absent or denied → toasts only.
- Imports: malformed JSON / wrong shape / huge file → error toast, no change.
- **XSS:** titles like `<img onerror>` must render as text.

### 5.7 Tests (at least 20 in `node --test`, plus smoke)

1. **dates:**
   - `addDays` across 2026-10-25 / 2027-03-28 / month and year ends;
   - `weekStart("2026-11-01")="2026-10-26"`, `weekStart("2027-01-01")="2026-12-28"`;
   - `monthGrid("2026-11").offset=6`, `monthGrid("2027-02")` → offset 0 with 28 days;
   - `fmtInt(8420)="8.420"`, `fmtInt(999)="999"`, `fmtInt(10000)="10.000"`;
   - `fmtDur` cases.
2. **DST epoch:** `toEpoch("2027-03-28","03:00") − toEpoch(…,"01:00") = 1 h`; on 2026-10-25 = 3 h.
3. **applyHabitMutation:**
   - null raw → creates the default with the exact 10 strings;
   - invalid JSON → `ok:false`;
   - unknown top-level fields, other months and objectives are preserved;
   - missing `habits` is repaired.
4. **setTick:** sorted, unique, ints only; untick keeps `[]`; refuses future dates and out-of-range h.
5. **weekPct** across a month boundary (today 2026-11-01, reading both "2026-10" and "2026-11"); 21/30 → 70.
6. **streak:** ticks 2026-10-29…11-01, today 11-02 not ticked → 4.
7. **15-habitos compatibility:** if `fs.existsSync("../../15-habitos/app/logic.js")`, then `require` it and check that its `validate` accepts the output, and that its `stats(...).daily` equals `dayScore` for the same month. Use `test.skip` otherwise.
8. **objectivesOf / setObjective:** always 3 items; other months untouched.
9. **priority / sortTasks:** rank order; entrega weight × urgency; overdue due → urgency 2.
10. **slotWarnings:**
    - deporte at 10:00 → `train_out_of_window`;
    - 08:00 (60') ok; 19:00 ok;
    - 18:30 (60') → warning;
    - fase0 at 15:30 → `deep_in_low_focus`;
    - overlap detected.
11. **proposeDay:** the normative vector from §5.4-A, exactly.
12. **proposeDay invariants** (seeded random task sets, 50 runs):
    - no overlaps with busy blocks or each other;
    - every start is a multiple of 15;
    - sport never overlaps 09:00–19:00;
    - `focusMin ≤ 360`;
    - every candidate is either placed or moved.
13. **Sport risk:** day = Saturday 2026-11-07, `sportDoneBefore=1` → the sport block is placed before the entregas, with a "Suelo en riesgo" reason. With `sportDoneBefore=5` → no sport block.
14. **acceptProposal:** sets times; creates `auto` tasks; idempotent on a second accept; moved tasks get `date+1` (2026-11-30 → 2026-12-01).
15. **Review:** each action's effect; `reviewQueue` tableMode at 16 items; `reviewDates` at 01:30 → reviewDay = yesterday.
16. **frenchStatus (idiomas source):**
    - log `[30 on 10-15, 30 on 10-17]`, today 10-18 → owed 30, required 60;
    - extras do not count;
    - absent idiomas → Ritmo-task source starting from `frenchCountFrom`;
    - `frenchNextType` follows the 7-cycle.
17. **sportByDay / floorStatus:** the §4 vectors.
18. **Routines:** progress, streak (today incomplete does not break it), toggle.
19. **dueReminders:**
    - block at 18:45, window 18:40–18:46, lead 0 → fires;
    - lead 5 → fireAt 18:40 is excluded (exclusive start);
    - done tasks excluded;
    - sent set prevents duplicates.
20. **ICS:**
    - CRLF; VTIMEZONE present;
    - `DTSTART;TZID=Europe/Madrid:20261105T200000` / `DTEND …T220000`;
    - 23:30 + 90' → `DTEND:20261106T010000`;
    - escaping `, ; \ \n`;
    - folding: every physical line ≤ 75 octets, unfolds to the original, never splits "ñ" or "🇫🇷".
21. **parseImport / migrate:**
    - garbage → error;
    - raw object accepted; bundle with invalid habitos → `habitos:null` plus a warning;
    - `migrate({})` → a valid state;
    - bad category/time are coerced.
22. **Foreign readers:** null/garbage → null; valid gym → sessions this week; finanzas pct; paso steps today.

**Smoke (`tests/smoke.js`):**

1. Install the clock at 2026-11-04 18:40 (+01:00). Before the first `goto`, seed foreign keys via `page.addInitScript`, guarded so it runs only once:
   - `gymtracker.v1`: 1 session on 2026-11-03, r5;
   - `idiomas.v1`: 40 min/day from 2026-10-15 to 11-03, except 11-02;
   - `finanzas.v1`: the woxsen goal with a contribution of 1200;
   - `paso.v1`: today steps 8420, 3 meals.
2. Go to `#/ajustes`, click `#demoBtn` → `#/hoy`. Assert:
   - at least 5 `.tl-item`;
   - `#habitsToday` matches `/\d+ \/ 10/`;
   - `#nowMarker` is visible.
3. `#btnNewTask`: title "Prueba recordatorio", category deporte, time 11:00 → `#tWarnings` contains "fuera de franja". Change the time to 18:45 → save.
4. `await page.clock.runFor(6*60*1000)` → `#toasts` contains "Prueba recordatorio".
5. Click `button[data-habit="2"]` → `JSON.parse(localStorage["habitos.v1"])`:
   - `habits.length === 10`;
   - `months["2026-11"]["2"]` includes 4.
6. Open `#btnReview`; click through every `data-review-action` (mixing "done" and "tomorrow"); go to step 3; `#proposalTable tr[data-block]` count ≥ 3; `#acceptPlan`; finish.
   - Assert that a task dated 2026-11-05 has a `time`.
7. Visit `#/semana` (7 day columns), `#/mes` (30 cells, with 6 leading blanks), `#/habitos`, `#/rutina/noche` (toggle an item), `#/progreso`:
   - 4 `svg[data-chart]`;
   - `.app-card[data-app="paso"]` contains "8.420";
   - the gym card shows 1 session.
8. Download `#icsWeek`: it contains `BEGIN:VCALENDAR` and `TZID=Europe/Madrid`.
9. Download `#exportJson`: `app === "ritmo"`.
10. **Compatibility:** open `../../15-habitos/app/index.html` in the same context → no page errors, and `td.c.on` count > 0.
11. Back in Ritmo: desktop screenshot of `#/hoy`; 360px scroll check on every route; the phone screenshot; the dark-mode pass.

### 5.8 Acceptance checklist (Ritmo)

- [ ] Opens with a double click (file://), no console errors, works offline.
- [ ] Hoy matches the reference: sidebar, header with segmented control, week strip, timeline with the "Ahora" marker and notes, dark habits card "X / 10 · % esta semana", habit list with 7-day bars and checks.
- [ ] Training warnings for 9–19 h; 20–23 and 15–17 bands are visible.
- [ ] The review wizard goes task by task, then proposes blocks that match §5.4 (normative vector test passes); it shows Top 3, the moved tasks and habits at risk; Undo works.
- [ ] Habit ticks and objectives written by Ritmo still open and display correctly in 15-habitos; an invalid habitos.v1 is never overwritten.
- [ ] Mínimos show sport N/3·5 (deduplicated across sources) and French with carry-over, identical to 21-idiomas.
- [ ] Semana, Mes, Hábitos, Rutinas, Progreso and Mis apps all work; foreign keys are only read.
- [ ] Reminders appear as toasts (and as Notifications if allowed); `.ics` day/week export imports into Google Calendar.
- [ ] JSON export/import, demo, and wipe (own key only).
- [ ] At least 20 logic tests plus the smoke test pass; both screenshots are saved; no horizontal scroll at 360px; dark mode is correct; keyboard and focus states are fine.
- [ ] README complete (§7.3).

---

## 6. 27-paso · "Mi tracker de pasos y comidas" (no calories)

### 6.1 Files

```
27-paso/ index.html styles.css logic.js app.js README.md captura-escritorio.png captura-movil.png
  tests/steps.test.js nutrition.test.js history.test.js health.test.js io.test.js smoke.js
```

### 6.2 Storage: own key `paso.v1`

```json
{
  "version": 1,
  "settings": {
    "name": "David", "stepGoal": 10000, "heightCm": 175, "strideM": null,
    "proteinTarget": 5,
    "veg": { "mode": "rampa", "fixed": 4, "start": 2, "final": 4, "rampStart": "<first-run ISO>", "weeksPerStep": 2 },
    "waterGoalMl": 3000, "glassMl": 250, "bottleMl": 500,
    "dayMetThreshold": 0.75, "defaultDayType": "descanso",
    "healthSources": { "iPhone de David": true }
  },
  "days": {
    "2026-11-04": {
      "steps": 8420, "stepsSource": "manual", "waterMl": 1500, "dayType": null,
      "meals": [ { "id": "m_x", "slot": "desayuno", "time": "08:10", "desc": "Avena, yogur y fruta",
                   "protein": 1, "veg": 0, "carbs": 1, "fat": 1 } ]
    }
  },
  "runs": [ { "id": "r_x", "date": "2026-11-03", "type": "series", "minutes": 40, "km": 6.2, "notes": "" } ],
  "imports": [ { "at": "ISO", "kind": "health", "days": 812, "sources": ["iPhone de David", "Apple Watch de David"] } ]
}
```

**Value sets:**
- `slot` ∈ `desayuno | comida | merienda | cena | extra`. Main slots are the first 4.
  - Labels: Desayuno, Comida, Merienda, Cena, Extra.
  - Circle colours: `#E9C99A`, `#A9C8A0`, `#D2B48C`, `#9DB4CF`, `#CFCFCB`.
- Portions are numbers from 0 to 10 in steps of 0.5:
  - 🥩 palmas (protein), 🥦 puños (veg), 🍚 manos ahuecadas (carbs), 🥑 pulgares (fat).
- `stepsSource` ∈ `manual | health | csv | demo`.
- `dayType` ∈ `descanso | gimnasio | series`, or `null` (auto).
  - Labels: "Descanso / día normal", "Gimnasio", "Series o tirada larga".
- `runs.type` ∈ `rodaje | series | tirada | trote | natacion | otro`.
  - Labels: "Rodaje Z2", "Series", "Tirada larga", "Trote corto (cuenta para el suelo)", "Natación", "Otro".
- `emptyDay() = {steps:0, stepsSource:null, waterMl:0, dayType:null, meals:[]}`.
- `migrate` fills the defaults. `validateImport` requires `days` to be a plain object with ISO keys, `meals` arrays and `runs` an array.

### 6.3 logic.js API (`PasoLogic`) and algorithms

- **Dates and format:** same set as Ritmo (`todayISO, nowHM, addDays, daysBetween, dow, weekStart, weekDays, monthGrid, parseHM, fmtInt, fmtDec`).
- **Steps:**
  - `strideM(s)` = `s.strideM ?? s.heightCm × 0.415 / 100`. 175 cm → 0.72625 m.
  - `kmFromSteps(n, s)` = `n × strideM / 1000`.
  - `stepsProgress(steps, s)` → `{pct: min(steps/goal,1), pctLabel: round(steps/goal×100), remaining: max(0, goal−steps), kmRemaining, met}`.
  - Labels: "Te faltan 1.580 · 1,1 km", or when met "¡Objetivo cumplido! +N pasos".
  - `stepGoal` is clamped to 1000–50000; `heightCm` to 120–230.
- **`weekStats(data, iso)`** → `{days:[{date, steps, isToday, future}]×7 (Monday–Sunday), avg, prevAvg, changePct}`:
  - `avg` = mean of the days ≤ iso in the week with steps > 0 (0 if there are none);
  - `prevAvg` = the same for the previous week (all 7 days);
  - `changePct = prevAvg ? round((avg−prevAvg)/prevAvg×100) : null` (if null, the chip is hidden).
- **Nutrition:**
  - `vegTargetFor(s, iso)`:
    - `"fija"` → `fixed`;
    - `"rampa"`: before rampStart → start; otherwise `min(final, start + floor(floor(daysBetween(rampStart, iso)/7) / weeksPerStep))`.
  - `targetsFor(s, dayType, iso)` → `{steps, protein: proteinTarget, veg, waterMl, carbs:[lo,hi], fat:[lo,hi]}`:
    - carbs: descanso [3,4], gimnasio [6,7], series [6,9];
    - fat: descanso [3,6], gimnasio [3,4], series [3,4].
    - These come from the per-main-meal table in `16-nutricion/guia-raciones.md` (×3 meals + snack). Carbs and fat are **guidance only**, never scored.
  - `suggestDayType(iso, data, gymSessions)` → `{type, reason}`:
    - a run of type series/tirada on iso → "series" ("tirada/series registrada");
    - a gym session → "gimnasio" ("sesión en Gym Tracker");
    - otherwise null.
  - `effectiveDayType` = `day.dayType ?? suggestion ?? settings.defaultDayType`.
  - `portions(day)` → sums. `mealsCount(day)` = distinct **main** slots present (0–4).
  - `nextSlot(day, hm)`: the first missing main slot whose default time ≤ hm + 90 min (defaults 08:00/14:00/17:30/21:00). If none qualifies, the first missing one. If all 4 are present → "extra".
  - `mealSavedText(slot, remaining, met)` → "Merienda guardada · te quedan 1.580 pasos" / "Desayuno guardado · objetivo de pasos cumplido 🎉". Gender: desayuno/extra masculine, the others feminine.
- **`dayScore(day, s, iso)`** → `{score, met:{steps, protein, veg, water}, registered}`:
  - `registered = steps > 0 || meals.length > 0 || waterMl > 0`;
  - if not registered → score null;
  - otherwise score = met / 4, where the 4 objectives are: steps ≥ goal, protein ≥ target, veg ≥ `vegTargetFor`, water ≥ goal.
  - A day is "cumplido" if score ≥ `dayMetThreshold`.
- **`monthHeat(data, ym, today, s)`** → `{offset, cells:[{date, score, level, future}], metDays, elapsedDays, perObjectivePct:{steps, protein, veg, water}}`:
  - `level = score === null ? "none" : Math.round(score × 4)`;
  - elapsed = days ≤ today. Unregistered elapsed days count in M but not in N.
- **`weekMet(data, today, s)`** → `{met, elapsed}`, over Monday…today.
- **RECIPES** (embed exactly, from `16-nutricion/recetas.md`): `{id, name, minutes, protein, veg, group, hidden}`. Groups: d = desayuno, c = comida, t = tentempié.

  | id | name | min | protein | veg | group | hidden vegetables |
  |---|---|---|---|---|---|---|
  | 1 | Batido verde que no sabe a verde | 3 | 1.5 | 1 | d | espinacas |
  | 2 | Tortitas de avena y calabacín | 15 | 1.5 | 0.5 | d | calabacín rallado |
  | 3 | Revuelto de huevos con espinacas y queso | 8 | 1.5 | 1 | d | espinacas picadas |
  | 4 | Overnight oats de zanahoria | 5 | 1 | 0.5 | d | zanahoria rallada |
  | 5 | Boloñesa "secreta" | 30 | 2 | 2 | c | zanahoria, calabacín y pimiento triturados |
  | 6 | Albóndigas con verdura rallada | 35 | 2 | 1 | c | calabacín y zanahoria |
  | 7 | Pollo al curry con lentejas rojas | 25 | 2 | 1 | c | pimiento y espinacas |
  | 8 | Crema de calabaza y zanahoria con huevo y jamón | 25 | 1.5 | 2 | c | calabaza y zanahoria |
  | 9 | Pizza de base de tortilla | 15 | 2 | 1 | c | pimiento asado triturado, champiñones |
  | 10 | Arroz frito "limpia-nevera" | 15 | 2 | 1.5 | c | guisantes, zanahoria, maíz |
  | 11 | Hamburguesas caseras de pavo y brócoli | 25 | 2 | 1 | c | brócoli muy picado |
  | 12 | Lasaña rápida de calabacín y ricotta | 40 | 2 | 2 | c | calabacín + boloñesa secreta |
  | 13 | Wrap de pollo con hummus | 10 | 1.5 | 1 | c | pimiento asado, lechuga, zanahoria |
  | 14 | Merluza en papillote con verduras | 25 | 1.5 | 1.5 | c | calabacín, cebolla, tomate |
  | 15 | Garbanzos con espinacas y huevo | 15 | 1.5 | 1.5 | c | espinacas |
  | 16 | Mac & cheese con coliflor | 25 | 1.5 | 1 | c | coliflor en la salsa |
  | 17 | Salmón al horno con boniato y brócoli | 30 | 1.5 | 1 | c | brócoli |
  | 18 | Tortilla de patata "con trampa" | 30 | 1.5 | 1 | c | calabacín y pimiento |
  | 19 | Skyr con frutos rojos y semillas | 2 | 1 | 0 | t | — |
  | 20 | Muffins salados de huevo y verduras | 25 | 1 | 0.5 | t | pimiento, espinacas, cebolla |

  Recipe 20's veg value is an estimate (the source omits it); comment that in code.
- **`suggestRecipes(slot, iso, n=3)`**:
  - groups: desayuno → d; merienda → d+t; comida/cena/extra → c;
  - keep veg ≥ 0.5;
  - sort veg desc → minutes asc → id;
  - take the top 6 and return n of them, starting at index `daysBetween("2026-01-01", iso) % 6`, cyclically (deterministic variety).
- **Apple Health streaming parser** `createHealthStepParser()` → `{push(text), finish()}`:
  - `push` loop:
    - `s = buf.indexOf("<Record", i)`;
    - if there is none: `buf = buf.slice(Math.max(i, buf.length − 6))` and return;
    - `e = findTagEnd(buf, s)`: the first `>` outside a quoted attribute, tracking the opening quote char `"` or `'`;
    - if `e < 0`: `buf = buf.slice(s)` and return;
    - if the char at `s+7` is whitespace, handle the tag `buf.slice(s, e+1)`;
    - `i = e+1`.
  - Handling a tag:
    - skip it unless it contains `type="HKQuantityTypeIdentifierStepCount"`;
    - attributes come from `parseTagAttrs` (regex `/(\w+)="([^"]*)"/g`, values passed through `decodeXmlEntities`: `&amp; &lt; &gt; &quot; &apos; &#NN; &#xHH;`);
    - `day = startDate.slice(0,10)` (the local date as written, e.g. "2026-11-03 20:55:12 +0100");
    - `v = Number(value)`. Invalid day or v (non-finite, or v < 0) → `skipped++`.
    - Otherwise `perDay[day][sourceName] += v` and `records++`.
  - Child `<MetadataEntry>` and `</Record>` tags are naturally ignored.
  - `finish()` → `{perDay, records, skipped, sources:{name:{steps, days}}}`.
  - `aggregateHealth(perDay, included /*Set|null*/)` → `{date: Math.round(max over included sources of the per-day sum)}`. Dates with 0 are dropped.
  - **Documented limitation:** "Se suma por día y fuente y se toma la fuente mayor. Si un día llevaste solo el reloj por la mañana y solo el móvil por la tarde, se subestima (Apple Health prioriza por intervalos; aquí no). Los registros que cruzan medianoche cuentan en el día de inicio. Las fechas usan la zona horaria con la que se exportó."
  - **UI reading.**
    - `file.stream().pipeThrough(new TextDecoderStream()).getReader()`: loop `read()`, call `push`, update `#healthProgress` (characters / `file.size`), support cancel.
    - Fallback when `!file.stream`: 4 MB `file.slice().arrayBuffer()` chunks through one `TextDecoder` with `{stream:true}`.
    - When done: `#healthSources` lists checkboxes per source with total steps and days (prechecked from `settings.healthSources`, otherwise all), plus a preview of the last 7 days → `#healthApply` "Importar N días".
    - No step records → "No se encontraron registros de pasos (¿es export.xml de Apple Health?)".
- **`parseStepsCSV(text)`** → `{rows:[{date, steps}], errors:[[line, msg]], duplicates}`:
  - strip the BOM; split on `/\r?\n/`; skip blank lines;
  - separator per line: `;` if present, else tab, else `,`;
  - the first line is a header if it does not start with a digit (e.g. `date,steps` or `fecha,pasos`);
  - date formats: `YYYY-MM-DD`, `YYYY/MM/DD`, `DD/MM/YYYY`, `DD-MM-YYYY`; must be a real calendar date (2027-02-30 → error);
  - steps: remove spaces, `.` and `'`; must match `^\d+$` and be ≤ 200000;
  - more than 2 fields with non-empty extras → error "columnas de más (¿separador de miles con coma?)";
  - duplicate dates → keep the max and count them.
- **`mergeSteps(data, rows, source, {overwriteManual=false})`** → `{data (deep copy), added, updated, skipped}`:
  - an existing manual day with steps > 0 and `!overwriteManual` → skipped;
  - otherwise replace (not add) the steps and set `stepsSource`.
  - Summary toast: "Importados N días (A nuevos, U actualizados, S omitidos por ser manuales)".
- **Foreign data:** `readGym(raw)` → sessions or `[]`. `readHabitsSport(raw)` → `{sportIdx, ticksByDate}` or null. `sportByDay` and `floorStatus` exactly as in §4 (ritmoDone null).
- **`demoData(today)`** (seeded):
  - 45 days back: steps 5.000–13.000; 3–4 meals/day; veg mostly 0–2; water 1,5–3,2 L; 2 runs/week; dayType null.
  - **Today:** steps 8420; meals: desayuno 08:10 "Avena, yogur y fruta" (1/0/1/1), comida 14:00 "Pollo, arroz y verdura" (2/1/2/1), merienda 17:30 "Tostada y café" (0/0/1/1); water 1500.
  - Last week's average is about 8.600, so the chip shows ↑.
  - `veg.rampStart` = today−20.

### 6.4 Screens

**Sidebar:**
- Logo "P" + "Paso".
- Nav: Hoy · Actividad · Comidas · Historial.
- Section "Objetivos" (live, with ✓ when met today): "10.000 pasos", "5 palmas de proteína", "N puños de verdura", "3 L de agua".
- Bottom card `#weekMet`: "Objetivo cumplido · N de M días" (this week).
- Link "Ajustes y datos".
- Phone tab bar: Hoy · Actividad · Comidas · Historial · Ajustes.

**Header:**
- Caption "Así va tu día", title "¡Hola, **David**!". For another date: the date title plus "Volver a hoy".
- Segmented control `button[data-range="hoy|semana|mes"]` → `#/hoy`, `#/actividad`, `#/historial`.
- `#bellBtn` 🔔 opens `#pendingPopover`, listing what is pending today, e.g. "Te faltan 1.580 pasos · 2 puños de verdura · 1,5 L de agua", or "Todo cumplido hoy ✓".

**Hoy** (`#/hoy[?d=]`). Desktop grid row 1: steps · dark week · meals. Row 2: portions + water (2 columns) and veg ideas. Row 3: month heat strip. Phone: stacked in the same order.

- **`#stepsCard`:**
  - "Pasos hoy", big `#stepsValue` "8.420".
  - SVG ring (120px, stroke 12, track `--heat-0`, progress `--ink`), with `#stepsPct` "84 %" in the centre.
  - `#stepsLeft` "Te faltan 1.580 · 1,1 km".
  - Input `#stepsInput` (number) + `#stepsSave` "Guardar" (sets the absolute value, source manual), plus `button[data-add-steps="500|1000"]`.
  - Empty state: "Sin pasos registrados · añádelos o impórtalos".
- **`#weekCard`** (dark):
  - "Media semanal", `#weekAvg` "9.150", `#weekChange` chip "↑ 6 %" or "↓ 4 %".
  - 7 bars L…D: today's bar is `--on-dark`, the others `--on-dark-2`, future days outlined; dashed goal line.
  - `role="img"` with an aria-label listing each day's steps.
- **`#mealsCard`:**
  - "Comidas", `#mealsCount` "3 / 4".
  - Rows: slot circle, slot name (bold), description (muted, ellipsis), time on the right, mini portions "🥩1 🥦0 🍚1 🥑1".
  - `#addMeal` "+ Añadir <nextSlot>". Clicking a row edits that meal.
- **`#portionsCard` "Raciones de hoy · método de la mano":**
  - `#dayType` segmented `button[data-daytype]`, with the hint "Sugerido: Gimnasio (sesión en Gym Tracker)".
  - 4 rows with bars:
    - Proteína 3/5 palmas;
    - **Verdura** 1/2 puños, with the badge "Punto débil" and the sub-line "Meta final 4-5 puños · sube cada 2 semanas";
    - Hidratos "3 manos · guía de hoy 6–7" (the bar marks the range);
    - Grasa "2 pulgares · guía 3–4".
  - Water `#water`:
    - "Agua 1,5 / 3 L", 12 glass segments of 250 ml;
    - `button[data-water="250"]` "+ vaso", `[data-water="500"]` "+ botella", `[data-water="-250"]` "−" (clamped ≥ 0);
    - a read-only line: "🥗 Nutrición en Hábitos: marcado / sin marcar · Abrir Ritmo" (from `habitos.v1` via `/nutrici/i`; hidden if the key is missing).
- **`#vegIdeas`** (only while veg < target):
  - "Te faltan N puños de verdura · ideas con verdura escondida para la <nextSlot>".
  - 3 cards from `suggestRecipes`: "5 · Boloñesa secreta · ⏱ 30' · 🥩 2 · 🥦 2 · escondida: zanahoria, calabacín y pimiento triturados".
  - A "Usar" button prefills the meal dialog.
- **Heat strip:** the current month (same cells as Historial, compact), legend "Menos ▢▢▢▢▢ Más", and "Objetivo cumplido N de M días".

**Meal dialog** `#mealDialog`:
- `#mSlot` (default `nextSlot`), `#mTime` (default now), `#mDesc`.
- `#mRecipe` select: "Usar receta…" fills the description, protein and veg.
- 4 steppers `button[data-step="protein|veg|carbs|fat"][data-dir="-1|1"]` with `output#mProtein/#mVeg/#mCarbs/#mFat` (±0.5, 0–10), each with a help text: "1 palma ≈ pechuga, 3 huevos, 200 g de skyr", and so on.
- `#mSave` → toast `mealSavedText`. `#mDelete` (confirm, when editing).

**Actividad** (`#/actividad[?d=]`):
- Week selector.
- `#weekChart`: SVG bars Monday–Sunday with a goal line; total km and average.
- 8-week chart of average steps.
- `#sportWeek`: "Sesiones esta semana: N · suelo 3 · estándar 5" with the state text from `floorStatus`, and a per-day list, e.g. "Mar 3 · Gimnasio · 5 · Pecho-hombro-tríceps", "Mar 3 · Series 40' · 6,2 km", "Jue 5 · Hábito Deporte ✓".
- `#runForm` (`#rDate #rType #rMinutes #rKm #rNotes #rSave`) and a runs list with delete.
- **Import panel:**
  - "Apple Health": `#healthFile` (accept `.xml,text/xml`), help text "En el iPhone: Salud → tu foto → Exportar todos los datos de salud → descomprime export.zip y elige apple_health_export/export.xml", progress, Cancel, `#healthSources`, `#overwriteManual` checkbox (off), `#healthApply`.
  - "CSV (fecha,pasos)": `#csvFile`.
  - `#importSummary` shows the result.
  - Manual steps for any date: date + number.

**Comidas** (`#/comidas[?d=]`):
- Day navigation; meals list with edit/delete; the day's portions summary.
- "Últimos 7 días" table: rows = days; columns = 🥩 🥦 🍚 🥑 💧; cells marked ✓/✗ against the targets (inside `overflow-x:auto`).
- Recipes list (all 20) with filter chips: "Desayunos y batidos", "Comidas y cenas", "Tentempiés", "Más verdura (≥ 1,5)".

**Historial** (`#/historial[?m=]`):
- Month navigation; Monday-first grid with header L M X J V S D.
- Cells are `button.heat-cell[data-date]`, background `--heat-<level>`; "none" = outline `--heat-none`; future = faint and disabled.
- `aria-label`: "4 de noviembre: 3 de 4 objetivos (pasos ✗, proteína ✓, verdura ✗, agua ✓)".
- `#metCount`: "Objetivo cumplido N de M días".
- Per-objective % of the month, with verdura highlighted.
- Clicking a day → `#/hoy?d=`.

**Ajustes y datos:**
- Name, step goal, height, stride override (shows the computed "Zancada: 0,73 m").
- Protein target; veg mode, fixed value, ramp start/final/rampStart/weeks.
- Water goal, glass and bottle sizes; threshold.
- `#exportJson` (`{app:"paso", version:1, exportedAt, data}`), `#importFile`, `#demoBtn`, `#wipeBtn` (removes only `paso.v1`).

### 6.5 Edge cases

- Steps 0 or unknown; steps over the goal; invalid settings are clamped.
- Veg ramp before its start, and at its cap.
- Meals: duplicate main slots allowed (counted once); the 4 main slots are filled → `nextSlot` = extra.
- Water can never go below 0.
- Month grids for 28/30/31 days with every possible offset; future days; days not registered.
- Health:
  - a tag split across chunks at any byte;
  - `<MetadataEntry>` children;
  - `>` inside a quoted attribute;
  - entities in `sourceName`;
  - non-numeric value;
  - mixed `+0100`/`+0200` offsets;
  - an empty or non-Health XML;
  - a multi-GB file (no full-file buffering);
  - cancel mid-read.
- CSV: BOM, CRLF, `;`, header present or absent, invalid dates, negative/huge/thousand-separated numbers, duplicates.
- Import never changes data on error.
- XSS in descriptions and run notes.

### 6.6 Tests (at least 18 in `node --test`, plus smoke)

1. `fmtInt` / `fmtDec` cases (8420 → "8.420"; 1,1475 → "1,1").
2. Stride and km: 175 cm → 0.72625; 1580 steps → "1,1 km"; override respected.
3. `stepsProgress`: pct is clamped, `pctLabel` 84, met with surplus.
4. `weekStats`:
   - week 2026-11-02 with Mon 9000, Tue 10000, Wed (today) 8420 → avg 9140;
   - previous week all at 8600 → changePct 6;
   - previous week empty → null;
   - the week of 2026-10-26 (after the DST change) works.
5. `vegTargetFor` with rampStart 2026-11-04 (2/4, 2 weeks per step):
   - 11-04 → 2; 11-17 → 2; 11-18 → 3; 12-01 → 3; 12-02 → 4; 2027-03-01 → 4; 11-01 → 2;
   - "fija" mode → fixed.
6. `targetsFor` ranges per dayType; `suggestDayType` (series run → series; gym → gimnasio; none → null).
7. `dayScore`: unregistered → null; 4/4; 3/4 meets the 0.75 threshold; missing steps count as not met.
8. `monthHeat`:
   - "2026-11" offset 6 / 30 cells; "2027-02" offset 0 / 28 cells;
   - future flagged; `level = round(score×4)`;
   - metDays/elapsedDays; `perObjectivePct`.
9. `nextSlot` / `mealsCount` / `mealSavedText` (gender, remaining, goal met).
10. `suggestRecipes`:
    - "comida" → 3 distinct recipes of group c, all veg ≥ 1;
    - "merienda" never includes recipe 19;
    - deterministic for a given date.
11. Health parser: a sample with iPhone + Watch over 2 days (including `+0200`/`+0100` dates around 2026-10-25), a `MetadataEntry` child, a HeartRate record ignored, and an invalid value skipped → exact `perDay`; `aggregateHealth` gives the max; filtering by included sources.
12. Health chunk invariance: for every split index k of the sample, `push(a); push(b); finish()` equals the single-push result. Also test with 1-character chunks.
13. Health: `&amp;` in sourceName decoded; `>` inside an attribute; empty input → 0 records.
14. `parseStepsCSV`: header/no header; `;` and `,`; DD/MM/YYYY; BOM+CRLF; "8.420" → 8420; invalid date and negative → errors; duplicates keep the max.
15. `mergeSteps`: manual day skipped unless `overwriteManual`; added/updated counts; input not mutated.
16. `sportByDay` / `floorStatus`: the §4 vectors (Paso variant, total 6).
17. `readGym` / `readHabitsSport`: tolerant of null/garbage; valid shapes parsed.
18. `validateImport` / `migrate`: malformed rejected; partial data filled; `demoData` passes validation, with today's steps 8420 and 3 meals.

**Smoke (`tests/smoke.js`):**

1. Clock at 2026-11-04 18:20 (+01:00). Seed `gymtracker.v1` (one session today, r4) via `addInitScript`, once.
2. `#/ajustes` → `#demoBtn` → `#/hoy`. Assert:
   - `#stepsValue` = "8.420", `#stepsPct` contains "84", `#mealsCount` = "3 / 4";
   - `#weekChange` is visible;
   - the day-type hint mentions "Gimnasio".
3. `#addMeal` → the slot defaults to "cena". Set protein +2 and veg +2 → `#mSave` → `#toasts` contains "Cena guardada" and "te quedan". `#mealsCount` = "4 / 4".
4. `button[data-water="250"]` → localStorage `waterMl` = 1750.
5. `#stepsInput` = 10500 → `#stepsSave` → the "Objetivos" sidebar ✓ appears for pasos.
6. `#/actividad`:
   - add a run (series, 40', 6,2) → `#sportWeek` shows at least 2 sessions;
   - `setInputFiles("#healthFile", {name:"export.xml", mimeType:"text/xml", buffer})` with a generated XML (two sources for 2026-11-01: iPhone 7000 + Watch 6500) → `#healthSources` has 2 checkboxes → `#healthApply` → `days["2026-11-01"].steps === 7000`;
   - CSV import of `fecha,pasos\n02/11/2026;9.100` → steps for 2026-11-02 = 9100.
7. `#/historial`:
   - `.heat-cell` count = 30;
   - `#metCount` matches `/Objetivo cumplido \d+ de \d+ días/`;
   - clicking a past cell navigates to `#/hoy?d=`.
8. `#/comidas`: the recipes list has 20 entries.
9. Download `#exportJson`: `app === "paso"`.
10. Screenshots (desktop `#/hoy`, then phone); 360px check on every route; dark-mode pass.

### 6.7 Acceptance checklist (Paso)

- [ ] Hoy matches the reference: steps ring with %, "Te faltan N · X km", dark weekly-average card with 7 bars and % change, meals N/4 with times and descriptions, toast "Merienda guardada · te quedan N pasos".
- [ ] No calories anywhere. Hand portions are the unit; protein 5 palms, veg ramp (shown as the weak point), water 3 L; day type adjusts the carb/fat guidance.
- [ ] Hidden-vegetable ideas from recetas.md appear when veg is low.
- [ ] Historial heat map with the score per day, the legend, and "Objetivo cumplido N de M días".
- [ ] Actividad: weekly steps, gym sessions (read-only), manual runs, sport floor status.
- [ ] Apple Health import streams large files, deduplicates per §6.3, lets him choose sources, and never overwrites manual days unless asked. CSV import works.
- [ ] JSON export/import, demo, wipe (own key only).
- [ ] At least 18 logic tests plus the smoke test pass; screenshots saved; 360px OK; dark mode; keyboard/focus; README complete.

---

## 7. Integration notes

### 7.1 Who writes what

| Key | Ritmo | Paso |
|---|---|---|
| `ritmo.v1` | read/write | — |
| `habitos.v1` | read + only `setTick` / `setObjective` via `applyHabitMutation` | read-only |
| `paso.v1` | read-only (steps today, goal, meals count, runs → sport) | read/write |
| `gymtracker.v1` | read-only | read-only |
| `idiomas.v1` | read-only | — |
| `finanzas.v1` | read-only | — |

**Never:**
- write, "repair" or migrate a foreign key (the only exception is the `habits` repair, and only while doing an allowed habit write);
- write demo data into foreign keys (Ritmo's demo habits only when `habitos.v1` is missing or empty);
- let a wipe touch foreign keys.

### 7.2 Cross-app reading

- Ritmo's `readPaso(raw, today)` → `{stepsToday, goal, pct, meals: mealsCount, runs: [{date, type}]}`. It uses `settings.stepGoal || 10000` and `days[today]?.steps || 0`.
- Paso does not read `ritmo.v1`.
- Both use the identical `sportByDay` / `floorStatus` rules, so their numbers agree. The only difference: Ritmo also counts its own done sport tasks.
- Links between apps are relative (`../27-paso/index.html`, `../26-ritmo/index.html`, `../10-gym-tracker/index.html`, `../21-idiomas-plan/index.html`, `../11-finanzas/index.html`, `../15-habitos/app/index.html`).
- **Sharing requires one origin:**
  - GitHub Pages: every folder is under `davidcormar.github.io/Mix_ideas/`, so everything is shared.
  - `file://`: Chrome/Edge share localStorage across local files; Firefox isolates each file. Both READMEs must say so.

### 7.3 README.md (Spanish, both apps), sections in this order

1. **Qué es y para qué te sirve** — tied to his visions:
   - Ritmo: "planifico, organizo tareas y sigo mis hábitos sin saltar entre apps"; his priority order and slots; floors 3/5 and 30' with carry-over; 10 habits, goal 7.5.
   - Paso: steps plus hand portions; vegetables as the weak point; no calories.
   - Include the screenshot images.
2. **Cómo usarlo:**
   - double click;
   - GitHub Pages URL `https://davidcormar.github.io/Mix_ideas/26-ritmo/` (or `27-paso/`) and "Añadir a pantalla de inicio";
   - the exact test commands (§0);
   - the cross-origin note;
   - "exporta el JSON de vez en cuando".
   - Ritmo: the nightly-review flow in 4 steps.
   - Paso: how to export from the iPhone.
3. **Qué está hecho** (✅ list).
4. **Qué falta / siguientes pasos.**
   - Ritmo: drag & drop on the timeline; splitting long tasks across blocks; a service worker for background notifications; recurring tasks.
   - Paso: merge-import; zip support for Health; per-interval source priority; India/thali mode.
5. **Decisiones**, including at least:
   - shared `habitos.v1` with read-modify-write;
   - the 15-habitos stale-tab caveat;
   - idiomas semantics reused;
   - max-per-day sport deduplication;
   - Health deduplication by max source and its limitation;
   - stride = 0.415 × height;
   - veg ramp from the guide;
   - no frameworks/CDN;
   - Spanish number formatting done by hand.

### 7.4 For the organizer, after both executors finish (executors must not do this)

- Add `26-ritmo` and `27-paso` to the Node loop in `/home/user/Mix_ideas/ejecutar_tests.sh`.
- Add rows 26 and 27 to the root `README.md`, and update `BITACORA.md` / `PARA-DAVID.md`.
- Optional follow-up outside this scope: make `15-habitos/app/index.html` re-read localStorage before each save (and listen to `storage` events). Then it can no longer overwrite ticks Ritmo wrote while both are open.

---

### Critical files for implementation

- /home/user/Mix_ideas/15-habitos/app/logic.js — `habitos.v1` semantics: HABITS, toggle, streak, objectives.
- /home/user/Mix_ideas/15-habitos/app/index.html — the storage key, load fallback and whole-object save (lines 49–94).
- /home/user/Mix_ideas/21-idiomas-plan/logic.js — French carry-over (`pending`), the 7-session cycle, LANGS.fr.
- /home/user/Mix_ideas/01-claude-skills/organizador-diario/SKILL.md — priority order, slots, review procedure.
- /home/user/Mix_ideas/16-nutricion/guia-raciones.md and /home/user/Mix_ideas/16-nutricion/recetas.md — hand portions, targets, the 20 recipes.
- Also for the foreign shapes: /home/user/Mix_ideas/10-gym-tracker/app.js, /home/user/Mix_ideas/11-finanzas/logic.js, /home/user/Mix_ideas/22-escalera-ironman/semana-hibrida.md.