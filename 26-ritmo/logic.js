/* Ritmo — pure logic (browser: window.RitmoLogic · Node: module.exports).
   No DOM, no localStorage, no hidden clock: every function receives `today` / `now` explicitly.
   The only exceptions are todayISO() and nowHM(), which default to new Date() and use local getters. */
(function (root) {
  "use strict";

  // ───────────────────────────────────────────── basics
  const DAY_MS = 864e5;
  const pad2 = (n) => String(n).padStart(2, "0");
  const isPlainObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function isISO(s) {
    if (typeof s !== "string") return false;
    const m = ISO_RE.exec(s);
    if (!m) return false;
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  }
  const isYM = (s) => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

  /** HTML escaping for every piece of user text that reaches innerHTML. */
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /** Seeded PRNG (deterministic demo data and property tests). */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeId(prefix = "t") {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ───────────────────────────────────────────── dates (string / UTC based → DST-safe)
  function todayISO(now = new Date()) {
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }
  function nowHM(now = new Date()) {
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }
  const toUTC = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const fromUTC = (ms) => { const dt = new Date(ms); return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`; };
  const addDays = (iso, n) => fromUTC(toUTC(iso) + n * DAY_MS);
  const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
  const dow = (iso) => { const w = new Date(toUTC(iso)).getUTCDay(); return w === 0 ? 7 : w; };
  const weekStart = (iso) => addDays(iso, 1 - dow(iso));
  const weekDays = (iso) => { const m = weekStart(iso); return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(m, i)); };
  const ymOf = (iso) => iso.slice(0, 7);
  const daysInMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
  const monthGrid = (ym) => ({ ym, offset: dow(ym + "-01") - 1, days: daysInMonth(ym) });
  function addMonths(ym, k) {
    const [y, m] = ym.split("-").map(Number);
    const t = y * 12 + (m - 1) + k;
    return `${Math.floor(t / 12)}-${pad2((t % 12) + 1)}`;
  }
  function datesBetween(a, b) { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; }

  // ───────────────────────────────────────────── times
  /** "HH:MM" → minutes since midnight ("24:00" → 1440); null when invalid. */
  function parseHM(hm) {
    if (typeof hm !== "string") return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
    if (!m) return null;
    const h = +m[1], mi = +m[2];
    if (mi > 59) return null;
    if (h === 24 && mi === 0) return 1440;
    if (h > 23) return null;
    return h * 60 + mi;
  }
  const isHM = (s) => { const v = parseHM(s); return v !== null && v < 1440; };
  function fmtHM(min) { const v = Math.max(0, Math.round(min)); return pad2(Math.floor(v / 60)) + ":" + pad2(v % 60); }
  const ceil15 = (min) => Math.ceil(min / 15) * 15;
  /** Local epoch for a wall-clock time (DST-correct; non-existent times are normalised by Date). */
  function toEpoch(iso, hm) {
    const [y, m, d] = iso.split("-").map(Number);
    const mins = parseHM(hm) ?? 0;
    return new Date(y, m - 1, d, Math.floor(mins / 60), mins % 60).getTime();
  }
  /** "9:00" style (no leading zero), for human sentences. */
  const hmHuman = (hm) => { const v = parseHM(hm); return v === null ? hm : `${Math.floor(v / 60)}:${pad2(v % 60)}`; };

  // ───────────────────────────────────────────── Spanish formatting (by hand, see README)
  const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
  const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function titleParts(iso) {
    const [, m, d] = iso.split("-").map(Number);
    return { weekday: capFirst(DAY_NAMES[dow(iso) - 1]), rest: `${d} de ${MONTH_NAMES[m - 1]}` };
  }
  const fmtDayMonth = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${d} de ${MONTH_NAMES[m - 1]}`; };
  const fmtShort = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTH_SHORT[m - 1]}`; };
  const fmtLong = (iso) => `${DAY_NAMES[dow(iso) - 1]} ${fmtDayMonth(iso)}`;
  const fmtMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return `${capFirst(MONTH_NAMES[m - 1])} ${y}`; };

  const groupInt = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  function fmtInt(n) {
    const v = Math.round(Number(n) || 0);
    return (v < 0 ? "-" : "") + groupInt(String(Math.abs(v)));
  }
  function fmtDec(x, d = 1) {
    const v = Number(x) || 0;
    const s = Math.abs(v).toFixed(d);
    const [i, f] = s.split(".");
    return (v < 0 && Number(s) !== 0 ? "-" : "") + groupInt(i) + (f ? "," + f : "");
  }
  function fmtDur(min) {
    const m = Math.max(0, Math.round(Number(min) || 0));
    const h = Math.floor(m / 60), r = m % 60;
    if (h && r) return `${h} h ${r} min`;
    if (h) return `${h} h`;
    return `${r} min`;
  }
  const plural = (n, one, many) => (n === 1 ? one : many);

  // ───────────────────────────────────────────── habits (shared key habitos.v1)
  const HABITS_DEFAULT = ["📵 Móvil (0 redes <14:00, máx 1 h)", "🧠 Deep work", "🇫🇷 Francés", "🏃 Deporte", "🥗 Nutrición + 3 L agua",
    "🌙 Rutina de noche + leer", "🤖 ML (plan del día)", "⏰ Levantarse a su hora", "🇬🇧 Inglés", "🧘 Meditar (prueba)"];
  const HABIT_RE = { sport: /deporte/i, french: /franc[eé]s/i, nutrition: /nutrici/i, night: /noche/i };

  const validHabitList = (h) => Array.isArray(h) && h.length > 0 && h.every((s) => typeof s === "string");
  const habitsOf = (d) => (d && validHabitList(d.habits) ? d.habits : HABITS_DEFAULT);
  const habitCount = (d) => habitsOf(d).length;

  function readHabits(raw) {
    if (raw === null || raw === undefined) return { status: "missing", data: null, habits: HABITS_DEFAULT.slice() };
    let data;
    try { data = JSON.parse(raw); } catch (e) { return { status: "invalid", error: "JSON no válido" }; }
    if (!isPlainObject(data)) return { status: "invalid", error: "no es un objeto" };
    if (!isPlainObject(data.months)) return { status: "invalid", error: "falta 'months'" };
    return { status: "ok", data, habits: validHabitList(data.habits) ? data.habits : HABITS_DEFAULT.slice() };
  }

  function isTicked(d, iso, h) {
    if (!d || !isPlainObject(d.months)) return false;
    const month = d.months[iso.slice(0, 7)];
    if (!isPlainObject(month)) return false;
    const arr = month[h];
    if (!Array.isArray(arr)) return false;
    const day = Number(iso.slice(8, 10));
    return arr.some((x) => Number(x) === day);
  }
  function dayScore(d, iso, n = habitCount(d)) {
    let c = 0;
    for (let h = 0; h < n; h++) if (isTicked(d, iso, h)) c++;
    return c;
  }
  function last7(d, iso, h) {
    const out = [];
    for (let i = 6; i >= 0; i--) out.push(isTicked(d, addDays(iso, -i), h));
    return out;
  }
  /** % of the week (Monday … iso) done: Σ ticks / (n × days). */
  function weekPct(d, iso, n = habitCount(d)) {
    const days = datesBetween(weekStart(iso), iso);
    if (!n || !days.length) return 0;
    const sum = days.reduce((a, x) => a + dayScore(d, x, n), 0);
    return Math.round((sum / (n * days.length)) * 100);
  }
  function weekMean(d, iso, n = habitCount(d)) {
    const days = datesBetween(weekStart(iso), iso);
    return days.reduce((a, x) => a + dayScore(d, x, n), 0) / days.length;
  }
  /** Current streak; an unticked `iso` does not break it (same as 15-habitos). */
  function streak(d, iso, h) {
    let cur = iso;
    if (!isTicked(d, cur, h)) cur = addDays(cur, -1);
    let c = 0;
    while (c < 1000 && isTicked(d, cur, h)) { c++; cur = addDays(cur, -1); }
    return c;
  }
  function habitPct(d, iso, h, days) {
    if (!days) return 0;
    let c = 0;
    for (let i = 0; i < days; i++) if (isTicked(d, addDays(iso, -i), h)) c++;
    return Math.round((c / days) * 100);
  }
  /** Lowest % over the last 7 complete days (iso−7 … iso−1); ties → lower index. */
  function weakest(d, iso, k = 3) {
    const names = habitsOf(d);
    return names.map((name, h) => ({ h, name, pct: habitPct(d, addDays(iso, -1), h, 7) }))
      .sort((a, b) => a.pct - b.pct || a.h - b.h).slice(0, k);
  }
  const TIPS = [
    [/m[oó]vil/i, "Deja el móvil fuera de la habitación y modo concentración hasta las 14:00."],
    [/deep/i, "El bloque de 20:00 ya está reservado: empieza por lo más difícil, sin móvil."],
    [/franc[eé]s/i, "Si el día se complica, haz los 30' del suelo justo después de comer."],
    [/deporte/i, "Deja la ropa preparada esta noche; 20' de trote también cuentan."],
    [/nutrici/i, "Llena la botella de 1 L tres veces y ten verdura congelada a mano."],
    [/noche/i, "Alarma a las 22:45: pantallas fuera y 20' de lectura."],
    [/\bML\b/, "Decide esta noche la primera tarea de ML de mañana (una línea)."],
    [/levant/i, "Despertador lejos de la cama y sin posponer."],
    [/ingl/i, "Un vídeo técnico en inglés en el desayuno."],
    [/medit/i, "5' después de levantarte, antes del móvil."],
  ];
  function tipFor(name) {
    for (const [re, tip] of TIPS) if (re.test(String(name))) return tip;
    return "Hazlo más fácil: reduce el primer paso a 2 minutos.";
  }
  function findHabit(habits, re) {
    if (!Array.isArray(habits)) return null;
    const i = habits.findIndex((s) => typeof s === "string" && re.test(s));
    return i >= 0 ? i : null;
  }
  function hasAnyTicks(d) {
    if (!d || !isPlainObject(d.months)) return false;
    return Object.values(d.months).some((m) => isPlainObject(m) && Object.values(m).some((a) => Array.isArray(a) && a.length > 0));
  }

  /** The ONLY way Ritmo writes habitos.v1: fresh read-modify-write of the raw string. */
  function applyHabitMutation(raw, mutate) {
    let data;
    if (raw === null || raw === undefined) data = { habits: HABITS_DEFAULT.slice(), months: {} };
    else {
      try { data = JSON.parse(raw); } catch (e) { return { ok: false, error: "JSON no válido" }; }
      if (!isPlainObject(data) || !isPlainObject(data.months)) return { ok: false, error: "falta 'months'" };
      if (!validHabitList(data.habits)) data.habits = HABITS_DEFAULT.slice(); // repair only: 15-habitos crashes without it
    }
    if (mutate(data) === false) return { ok: false, error: "cambio no permitido" };
    return { ok: true, data, json: JSON.stringify(data) }; // no indentation, same as 15-habitos
  }

  /** Tick / untick habit h on iso. Refuses future dates, bad indices and malformed months. */
  function setTick(data, iso, h, on, today) {
    if (!data || !isPlainObject(data.months) || !Array.isArray(data.habits)) return false;
    if (!Number.isInteger(h) || h < 0 || h >= data.habits.length) return false;
    if (!isISO(iso) || !isISO(today) || iso > today) return false;
    const ym = iso.slice(0, 7), day = Number(iso.slice(8, 10));
    if (data.months[ym] === undefined) data.months[ym] = {};
    const month = data.months[ym];
    if (!isPlainObject(month)) return false;
    const prev = Array.isArray(month[h]) ? month[h] : [];
    let arr = prev.map(Number).filter((x) => Number.isInteger(x) && x >= 1 && x <= 31);
    arr = arr.filter((x) => x !== day);
    if (on) arr.push(day);
    month[h] = [...new Set(arr)].sort((a, b) => a - b); // an empty array is kept, like 15-habitos' toggle
    return true;
  }
  function normObjectives(cur) {
    const c = Array.isArray(cur) ? cur : [];
    return [0, 1, 2].map((i) => ({ text: c[i]?.text || "", done: !!c[i]?.done }));
  }
  /** Same normalisation as 15-habitos objectives(): exactly 3 {text, done}. */
  function setObjective(data, ym, i, patch = {}) {
    if (!data || !isYM(ym) || ![0, 1, 2].includes(i)) return false;
    if (data.objectives !== undefined && !isPlainObject(data.objectives)) return false;
    data.objectives ||= {};
    const list = normObjectives(data.objectives[ym]);
    if (typeof patch.text === "string") list[i].text = patch.text.slice(0, 300);
    if ("done" in patch) list[i].done = !!patch.done;
    data.objectives[ym] = list;
    return true;
  }
  function objectivesOf(d, ym) {
    const o = d && isPlainObject(d.objectives) ? d.objectives[ym] : undefined;
    return normObjectives(o);
  }
  /** 15-habitos style month stats: elapsed days, mean, days on goal. */
  function monthStats(d, ym, today, goal = 7.5) {
    const cur = today.slice(0, 7);
    const n = ym < cur ? daysInMonth(ym) : ym > cur ? 0 : Number(today.slice(8, 10));
    const nh = habitCount(d);
    const daily = [];
    for (let i = 1; i <= n; i++) daily.push(dayScore(d, `${ym}-${pad2(i)}`, nh));
    const mean = n ? daily.reduce((a, b) => a + b, 0) / n : 0;
    return { days: n, daily, mean, daysOnGoal: daily.filter((x) => x >= goal).length };
  }
  /** Heat level 0..4 from score/n (goal = 7.5 of 10 → .75). */
  function heatLevel(score, n, goal = 7.5) {
    const r = n ? score / n : 0;
    if (r === 0) return 0;
    if (r < 0.4) return 1;
    if (r < 0.6) return 2;
    if (r < goal / 10) return 3;
    return 4;
  }

  // ───────────────────────────────────────────── state
  const CATEGORIES = {
    evento: { label: "Evento fijo", rank: 1, color: "#6B7280" },
    entrega: { label: "Entrega", rank: 2, color: "#C2412D" },
    deporte: { label: "Deporte", rank: 3, color: "#3E7B58" },
    frances: { label: "Francés", rank: 3, color: "#3B5BA5" },
    fase0: { label: "Fase 0 · ML", rank: 4, color: "#7A4FA0" },
    resto: { label: "Resto", rank: 5, color: "#A07A3B" },
  };
  const CATEGORY_KEYS = Object.keys(CATEGORIES);
  const RUTINA_COLOR = "#8A8F87";
  const catLabel = (c) => (CATEGORIES[c] ? CATEGORIES[c].label : c === "rutina" ? "Rutina" : c === "fijo" ? "Horario fijo" : c === "margen" ? "Margen" : "Resto");
  const HYBRID_WEEK = ["", "Series", "Fuerza: empuje (pecho-hombro-tríceps)", "Rodaje Z2 35-45'", "Fuerza: tirón (espalda-bíceps)",
    "Pierna + saltos + prevención", "Natación técnica o descanso activo", "Tirada larga"];
  const GYM_ROUTINES = { r1: "Tren superior", r2: "Pecho-espalda", r3: "Brazo-hombro", r4: "Espalda-bíceps", r5: "Pecho-hombro-tríceps" };
  const FR_START = "2026-10-15";
  const FR_CYCLE = ["gramatica", "escucha", "lectura", "gramatica", "escucha", "escritura", "conversacion"];
  const LABEL = { gramatica: "Gramática", escucha: "Escucha", lectura: "Lectura y vocabulario", escritura: "Escritura", conversacion: "Conversación y repaso", extra: "Extra (no cuenta)", inmersion: "Inmersión" };

  const DEFAULT_SETTINGS = {
    dayStart: "07:00", dayEnd: "23:30",
    morningTrainEnd: "09:00", eveningTrainStart: "19:00", latestTrainStart: "21:00",
    bestFocus: ["20:00", "23:00"], lowFocus: ["15:00", "17:00"],
    trainingPreference: "tarde",
    sportFloor: 3, sportStandard: 5, sportDurationMin: 60,
    frenchFloorMin: 30, frenchStandardMin: 60, frenchStart: "2026-10-15",
    frenchCountFrom: null, frenchPreferredTime: "17:00", frenchMaxBlockMin: 120,
    maxFocusMin: 360, marginMin: 30, habitGoal: 7.5,
    habitLinks: { sport: 3, french: 2 }, autoTickHabits: true,
    reminders: { enabled: true, leadMin: 0 },
    fixedWeekly: [],
  };
  const DEFAULT_ROUTINES = [
    { id: "manana", name: "Mañana", time: "07:00", durationMin: 20, habitIndex: null,
      items: [{ id: "m1", text: "Levantarme a mi hora (sin posponer)" }, { id: "m2", text: "Vaso grande de agua" }, { id: "m3", text: "Meditar 5' (prueba)" }, { id: "m4", text: "Mirar los bloques de hoy" }, { id: "m5", text: "Móvil sin redes hasta las 14:00" }] },
    { id: "noche", name: "Noche", time: "23:00", durationMin: 30, habitIndex: 5,
      items: [{ id: "rev", text: "Revisión nocturna en Ritmo" }, { id: "n2", text: "Preparar mochila y ropa de entreno" }, { id: "n3", text: "Pantallas fuera" }, { id: "n4", text: "Leer 20 min" }, { id: "n5", text: "Despertador lejos de la cama" }] },
  ];
  const TIME_KEYS = ["dayStart", "dayEnd", "morningTrainEnd", "eveningTrainStart", "latestTrainStart", "frenchPreferredTime"];
  const NUM_KEYS = { sportFloor: [0, 14, true], sportStandard: [0, 14, true], sportDurationMin: [5, 240, true], frenchFloorMin: [0, 600, true],
    frenchStandardMin: [0, 600, true], frenchMaxBlockMin: [15, 600, true], maxFocusMin: [30, 1440, true], marginMin: [0, 240, true], habitGoal: [0, 50, false] };

  function emptyState(today, habits = HABITS_DEFAULT) {
    const settings = clone(DEFAULT_SETTINGS);
    settings.frenchCountFrom = today;
    settings.habitLinks = { sport: findHabit(habits, HABIT_RE.sport), french: findHabit(habits, HABIT_RE.french) };
    const routines = clone(DEFAULT_ROUTINES);
    routines.find((r) => r.id === "noche").habitIndex = findHabit(habits, HABIT_RE.night);
    return { version: 1, settings, tasks: [], routines, routineLog: {}, reviews: {} };
  }

  const intIn = (x, lo, hi) => { const n = Math.round(Number(x)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  const linkIdx = (x) => (x === null ? null : Number.isInteger(x) && x >= 0 && x < 100 ? x : undefined);

  function normTask(t) {
    const category = CATEGORIES[t.category] ? t.category : "resto";
    const dur = Math.round(Number(t.durationMin));
    const w = Number(t.weight);
    return {
      id: t.id, title: t.title.trim().slice(0, 200), category,
      date: isISO(t.date) ? t.date : null,
      time: isHM(t.time) ? fmtHM(parseHM(t.time)) : null,
      durationMin: Number.isFinite(dur) && t.durationMin !== null && t.durationMin !== "" ? Math.min(720, Math.max(5, dur)) : 60,
      due: category === "entrega" && isISO(t.due) ? t.due : null,
      weight: category === "entrega" ? (Number.isFinite(w) && t.weight !== null && t.weight !== "" && w >= 0 && w <= 100 ? w : 10) : null,
      notes: typeof t.notes === "string" ? t.notes.slice(0, 2000) : "",
      status: ["open", "done", "archived"].includes(t.status) ? t.status : "open",
      createdAt: typeof t.createdAt === "string" ? t.createdAt : "",
      updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : "",
      doneAt: typeof t.doneAt === "string" ? t.doneAt : null,
      doneOn: isISO(t.doneOn) ? t.doneOn : null,
      auto: !!t.auto,
    };
  }

  /** Fill defaults, coerce invalid values, drop tasks without id/title. Never throws. */
  function migrate(any, today, habits = HABITS_DEFAULT) {
    const s = emptyState(today, habits);
    if (!isPlainObject(any)) return s;
    const inS = isPlainObject(any.settings) ? any.settings : {};
    const st = s.settings;
    for (const k of TIME_KEYS) if (parseHM(inS[k]) !== null) st[k] = fmtHM(parseHM(inS[k]));
    for (const k of ["bestFocus", "lowFocus"]) {
      const v = inS[k];
      if (Array.isArray(v) && v.length === 2 && parseHM(v[0]) !== null && parseHM(v[1]) !== null && parseHM(v[0]) < parseHM(v[1])) st[k] = [fmtHM(parseHM(v[0])), fmtHM(parseHM(v[1]))];
    }
    for (const [k, [lo, hi, int]] of Object.entries(NUM_KEYS)) {
      const n = Number(inS[k]);
      if (inS[k] !== null && inS[k] !== "" && Number.isFinite(n) && n >= lo && n <= hi) st[k] = int ? Math.round(n) : n;
    }
    if (["tarde", "manana"].includes(inS.trainingPreference)) st.trainingPreference = inS.trainingPreference;
    if (isISO(inS.frenchStart)) st.frenchStart = inS.frenchStart;
    if (isISO(inS.frenchCountFrom)) st.frenchCountFrom = inS.frenchCountFrom;
    if (typeof inS.autoTickHabits === "boolean") st.autoTickHabits = inS.autoTickHabits;
    if (isPlainObject(inS.habitLinks)) {
      for (const k of ["sport", "french"]) { const v = linkIdx(inS.habitLinks[k]); if (v !== undefined) st.habitLinks[k] = v; }
    }
    if (isPlainObject(inS.reminders)) {
      if (typeof inS.reminders.enabled === "boolean") st.reminders.enabled = inS.reminders.enabled;
      const lead = intIn(inS.reminders.leadMin, 0, 120);
      if (lead !== null) st.reminders.leadMin = lead;
    }
    if (Array.isArray(inS.fixedWeekly)) {
      const seen = new Set();
      st.fixedWeekly = inS.fixedWeekly.filter((f) => isPlainObject(f) && typeof f.title === "string" && f.title.trim() && isHM(f.start) && parseHM(f.end) !== null)
        .map((f, i) => {
          let id = typeof f.id === "string" && f.id ? f.id : `fw_${i + 1}`;
          while (seen.has(id)) id += "x";
          seen.add(id);
          const days = Array.isArray(f.days) ? [...new Set(f.days.map(Number).filter((x) => Number.isInteger(x) && x >= 1 && x <= 7))].sort() : [];
          return { id, title: f.title.trim().slice(0, 120), days, start: fmtHM(parseHM(f.start)), end: fmtHM(parseHM(f.end)) };
        });
    }
    // tasks
    const ids = new Set();
    s.tasks = (Array.isArray(any.tasks) ? any.tasks : [])
      .filter((t) => isPlainObject(t) && typeof t.id === "string" && t.id && typeof t.title === "string" && t.title.trim())
      .filter((t) => (ids.has(t.id) ? false : (ids.add(t.id), true)))
      .map(normTask);
    // routines
    if (Array.isArray(any.routines)) {
      const rids = new Set();
      s.routines = any.routines.filter((r) => isPlainObject(r) && typeof r.id === "string" && r.id && !rids.has(r.id) && rids.add(r.id))
        .map((r) => {
          const def = DEFAULT_ROUTINES.find((x) => x.id === r.id);
          const iids = new Set();
          return {
            id: r.id,
            name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 60) : def ? def.name : r.id,
            time: isHM(r.time) ? fmtHM(parseHM(r.time)) : def ? def.time : "07:00",
            durationMin: intIn(r.durationMin, 5, 720) ?? (def ? def.durationMin : 20),
            habitIndex: linkIdx(r.habitIndex) === undefined ? null : linkIdx(r.habitIndex),
            items: (Array.isArray(r.items) ? r.items : []).filter((it) => isPlainObject(it) && typeof it.id === "string" && it.id && typeof it.text === "string" && !iids.has(it.id) && iids.add(it.id))
              .map((it) => ({ id: it.id, text: it.text.slice(0, 200) })),
          };
        });
    }
    // routine log
    if (isPlainObject(any.routineLog)) {
      for (const [d, v] of Object.entries(any.routineLog)) {
        if (!isISO(d) || !isPlainObject(v)) continue;
        const day = {};
        for (const [rid, arr] of Object.entries(v)) if (Array.isArray(arr)) day[rid] = [...new Set(arr.filter((x) => typeof x === "string"))];
        s.routineLog[d] = day;
      }
    }
    if (isPlainObject(any.reviews)) {
      for (const [d, v] of Object.entries(any.reviews)) if (isISO(d) && isPlainObject(v)) s.reviews[d] = v;
    }
    // ticks the demo added to habitos.v1 (so they can be taken out later); absent for real data
    const demo = normDemoRecord(any.demoHabits);
    if (demo) s.demoHabits = demo;
    return s;
  }

  function newTask(fields = {}, opts = {}) {
    const id = typeof opts.id === "function" ? opts.id() : opts.id || makeId("t");
    const nowIso = opts.nowIso || "";
    const t = normTask({ title: "Tarea", ...fields, id, status: "open", createdAt: nowIso, updatedAt: nowIso, doneAt: null, doneOn: null });
    t.auto = !!fields.auto;
    return t;
  }

  // ───────────────────────────────────────────── tasks and day
  function priority(task, day) {
    const rank = CATEGORIES[task.category] ? CATEGORIES[task.category].rank : 5;
    let score = 0;
    if (task.category === "entrega") {
      const w = Number.isFinite(task.weight) ? task.weight : 10;
      let urgency;
      if (!task.due) urgency = 0.1;
      else { const n = daysBetween(day, task.due); urgency = n <= 0 ? 2 : 1 / n; }
      score = w * urgency;
    }
    return { rank, score };
  }
  function taskComparator(day) {
    return (a, b) => {
      const pa = priority(a, day), pb = priority(b, day);
      return pa.rank - pb.rank || pb.score - pa.score
        || (a.date === b.date ? 0 : a.date === null ? 1 : b.date === null ? -1 : a.date < b.date ? -1 : 1)
        || String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id));
    };
  }
  const sortTasks = (tasks, day) => tasks.slice().sort(taskComparator(day));

  function routineTitle(r) { return "Rutina de " + r.name.charAt(0).toLowerCase() + r.name.slice(1); }

  function dayBlocks(state, iso) {
    const timed = [];
    const d = dow(iso);
    for (const f of state.settings.fixedWeekly || []) {
      if (!f.days.includes(d)) continue;
      const s = parseHM(f.start), e = parseHM(f.end);
      if (s === null || e === null || e <= s) continue;
      timed.push({ key: `fixed:${f.id}`, kind: "fijo", title: f.title, start: s, end: e, fixedId: f.id, rank: 1 });
    }
    for (const r of state.routines || []) {
      const s = parseHM(r.time);
      if (s === null) continue;
      timed.push({ key: `routine:${r.id}`, kind: "rutina", title: routineTitle(r), start: s, end: Math.min(1440, s + r.durationMin), routineId: r.id, rank: 6 });
    }
    for (const t of state.tasks || []) {
      if (t.date !== iso || !t.time || t.status === "archived") continue;
      const s = parseHM(t.time);
      if (s === null) continue;
      const rank = priority(t, iso).rank;
      timed.push({ key: `task:${t.id}`, kind: t.category, title: t.title, start: s, end: Math.min(1440, s + t.durationMin), clipped: s + t.durationMin > 1440,
        taskId: t.id, priority: rank, rank, done: t.status === "done", notes: t.notes });
    }
    timed.sort((a, b) => a.start - b.start || a.rank - b.rank || a.end - b.end || a.key.localeCompare(b.key));
    const untimed = sortTasks((state.tasks || []).filter((t) => t.date === iso && !t.time && t.status !== "archived"), iso);
    return { timed, untimed };
  }
  function overdue(state, today) {
    return sortTasks(state.tasks.filter((t) => t.status === "open" && t.date && t.date < today), today)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

  function slotWarnings(block, settings, others = []) {
    const out = [];
    const P = parseHM;
    if (block.kind === "deporte" && overlaps(block.start, block.end, P(settings.morningTrainEnd), P(settings.eveningTrainStart)))
      out.push({ code: "train_out_of_window", text: `Entreno fuera de franja: solo antes de las ${hmHuman(settings.morningTrainEnd)} o desde las ${hmHuman(settings.eveningTrainStart)}.` });
    if ((block.kind === "entrega" || block.kind === "fase0") && overlaps(block.start, block.end, P(settings.lowFocus[0]), P(settings.lowFocus[1]))) {
      const h = (x) => String(Math.floor(P(x) / 60)) + (P(x) % 60 ? ":" + pad2(P(x) % 60) : "");
      out.push({ code: "deep_in_low_focus", text: `Franja de poco foco (${h(settings.lowFocus[0])}–${h(settings.lowFocus[1])} h): mejor tareas mecánicas.` });
    }
    for (const o of others) {
      if (o.key === block.key) continue;
      if (overlaps(block.start, block.end, o.start, o.end)) out.push({ code: "overlap", text: `Se solapa con «${o.title}».` });
    }
    if (block.start < P(settings.dayStart) || block.end > P(settings.dayEnd)) out.push({ code: "outside_day", text: "Fuera de tu jornada." });
    return out;
  }
  function plannedMinutes(state, iso) {
    return state.tasks.filter((t) => t.date === iso && t.status !== "archived").reduce((a, t) => a + t.durationMin, 0);
  }

  // ───────────────────────────────────────────── routines
  function routineProgress(state, rid, iso) {
    const r = (state.routines || []).find((x) => x.id === rid);
    if (!r) return { done: 0, total: 0, complete: false };
    const log = (state.routineLog[iso] && state.routineLog[iso][rid]) || [];
    const ids = new Set(r.items.map((i) => i.id));
    const done = [...new Set(log)].filter((id) => ids.has(id)).length;
    return { done, total: r.items.length, complete: r.items.length > 0 && done === r.items.length };
  }
  function routineStreak(state, rid, iso) {
    const complete = (d) => routineProgress(state, rid, d).complete;
    let cur = iso;
    if (!complete(cur)) cur = addDays(cur, -1);
    let current = 0;
    while (current < 1000 && complete(cur)) { current++; cur = addDays(cur, -1); }
    const dates = Object.keys(state.routineLog || {}).filter((d) => isISO(d) && d <= iso && complete(d)).sort();
    let best = 0, run = 0, prev = null;
    for (const d of dates) { run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    return { current, best: Math.max(best, current) };
  }
  function toggleRoutineItem(state, rid, itemId, iso) {
    const r = (state.routines || []).find((x) => x.id === rid);
    if (!r || !r.items.some((i) => i.id === itemId) || !isISO(iso)) return null;
    const before = routineProgress(state, rid, iso).complete;
    state.routineLog[iso] ||= {};
    const arr = (state.routineLog[iso][rid] ||= []);
    const i = arr.indexOf(itemId);
    let checked;
    if (i >= 0) { arr.splice(i, 1); checked = false; } else { arr.push(itemId); checked = true; }
    const after = routineProgress(state, rid, iso).complete;
    return { checked, complete: after, becameComplete: !before && after };
  }

  // ───────────────────────────────────────────── foreign readers (never throw)
  function parseObj(raw) {
    if (typeof raw !== "string") return null;
    try { const d = JSON.parse(raw); return isPlainObject(d) ? d : null; } catch (e) { return null; }
  }
  function readGym(raw, today) {
    const d = parseObj(raw);
    if (!d || !Array.isArray(d.sessions)) return null;
    const sessions = d.sessions
      .filter((s) => isPlainObject(s) && typeof s.date === "string" && isISO(s.date.slice(0, 10)))
      .map((s) => ({ date: s.date.slice(0, 10), routine: typeof s.routine === "string" ? s.routine : String(s.routine ?? ""),
        name: GYM_ROUTINES[s.routine] || String(s.routine ?? "—") }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let thisWeek = null, last = null;
    if (isISO(today)) {
      const ws = weekStart(today), we = addDays(ws, 6);
      thisWeek = sessions.filter((s) => s.date >= ws && s.date <= we).length;
      last = sessions.filter((s) => s.date <= today).at(-1) || null;
    } else last = sessions.at(-1) || null;
    return { sessions, thisWeek, last };
  }
  /** Mirrors 21-idiomas validate(): any malformed entry makes the whole key unusable. */
  function readIdiomas(raw) {
    const d = parseObj(raw);
    if (!d || !Array.isArray(d.log)) return null;
    for (const e of d.log) {
      if (!isPlainObject(e) || !["fr", "de", "en"].includes(e.lang) || !(Number(e.minutes) >= 0) || typeof e.date !== "string" || !ISO_RE.test(e.date)) return null;
    }
    return { log: d.log, base: isPlainObject(d.base) ? d.base : {} };
  }
  function readFinanzas(raw, today) {
    const d = parseObj(raw);
    if (!d || !Array.isArray(d.txs)) return null;
    const goals = (Array.isArray(d.goals) ? d.goals : []).filter((g) => isPlainObject(g) && Number(g.target) > 0).map((g) => {
      const saved = (Array.isArray(g.contributions) ? g.contributions : []).reduce((a, c) => a + (Number(c && c.amount) || 0), 0);
      const target = Number(g.target);
      return { id: String(g.id ?? ""), name: String(g.name ?? "Meta"), target, saved, pct: Math.max(0, Math.min(saved / target, 1)),
        deadline: isISO(g.deadline) ? g.deadline : null, daysLeft: isISO(g.deadline) && isISO(today) ? daysBetween(today, g.deadline) : null };
    });
    return { goals };
  }
  const MAIN_SLOTS = ["desayuno", "comida", "merienda", "cena"];
  function readPaso(raw, today) {
    const d = parseObj(raw);
    if (!d || !isPlainObject(d.days)) return null;
    const settings = isPlainObject(d.settings) ? d.settings : {};
    const goal = Number(settings.stepGoal) > 0 ? Number(settings.stepGoal) : 10000;
    const day = isPlainObject(d.days[today]) ? d.days[today] : null;
    const stepsToday = day && Number(day.steps) > 0 ? Number(day.steps) : 0;
    const meals = day && Array.isArray(day.meals) ? new Set(day.meals.filter((m) => isPlainObject(m) && MAIN_SLOTS.includes(m.slot)).map((m) => m.slot)).size : 0;
    const runs = (Array.isArray(d.runs) ? d.runs : []).filter((r) => isPlainObject(r) && isISO(r.date)).map((r) => ({ date: r.date, type: String(r.type || "otro") }));
    return { stepsToday, goal, pct: Math.round((stepsToday / goal) * 100), meals, runs };
  }

  // ───────────────────────────────────────────── shared sport rule (identical in Ritmo and Paso)
  const dateOfEntry = (x) => (typeof x === "string" ? x.slice(0, 10) : isPlainObject(x) && typeof (x.date || x.doneOn) === "string" ? String(x.date || x.doneOn).slice(0, 10) : null);
  function countByDate(list) {
    const m = {};
    if (Array.isArray(list)) for (const x of list) { const d = dateOfEntry(x); if (d) m[d] = (m[d] || 0) + 1; }
    else if (isPlainObject(list)) for (const [d, n] of Object.entries(list)) m[d] = Number(n) || 0;
    return m;
  }
  /** n_d = max(habitTick_d ? 1 : 0, gymCount_d + runsCount_d, ritmoDoneSport_d).
      habits: habitos.v1 data (or null) · gymSessions/runs: [{date}] (or null) · ritmoDone: [iso | {doneOn}] or {iso:n} (or null). */
  function sportByDay(dates, { habits = null, sportIdx = null, gymSessions = null, runs = null, ritmoDone = null } = {}) {
    const gym = countByDate(gymSessions), run = countByDate(runs), rit = countByDate(ritmoDone);
    const useHabit = !!habits && Number.isInteger(sportIdx) && sportIdx >= 0;
    const byDay = {};
    let total = 0;
    for (const iso of dates) {
      const h = useHabit && isTicked(habits, iso, sportIdx) ? 1 : 0;
      const n = Math.max(h, (gym[iso] || 0) + (run[iso] || 0), rit[iso] || 0);
      byDay[iso] = n;
      total += n;
    }
    return { byDay, total, sources: { habit: useHabit, gym: Array.isArray(gymSessions), runs: Array.isArray(runs), ritmo: ritmoDone != null } };
  }
  function floorStatus(total, iso, floor = 3, standard = 5) {
    const daysLeft = 8 - dow(iso);
    const need = Math.max(0, floor - total);
    const state = total >= standard ? "estandar" : total >= floor ? "suelo" : need >= daysLeft ? "riesgo" : "falta";
    return { state, need, daysLeft };
  }
  const ritmoSportDone = (state) => state.tasks.filter((t) => t.status === "done" && t.category === "deporte" && t.doneOn).map((t) => t.doneOn);

  // ───────────────────────────────────────────── French (port of 21-idiomas pending/nextSession)
  function frenchMinutesByDay(src, settings) {
    const idi = src && src.idiomas;
    if (idi && Array.isArray(idi.log)) {
      const m = {};
      for (const e of idi.log) if (e.lang === "fr" && e.type !== "extra") m[e.date] = (m[e.date] || 0) + (Number(e.minutes) || 0);
      return { source: "idiomas", byDay: m, start: FR_START };
    }
    const m = {};
    for (const t of (src && src.tasks) || []) if (t.status === "done" && t.category === "frances" && t.doneOn) m[t.doneOn] = (m[t.doneOn] || 0) + t.durationMin;
    const a = settings.frenchStart || FR_START, b = settings.frenchCountFrom || a;
    return { source: "ritmo", byDay: m, start: a > b ? a : b };
  }
  /** src = { idiomas: readIdiomas(...) | null, tasks: state.tasks }. */
  function frenchStatus(src, iso, settings) {
    const floor = settings.frenchFloorMin, standard = settings.frenchStandardMin;
    const { source, byDay, start } = frenchMinutesByDay(src, settings);
    const doneToday = byDay[iso] || 0;
    if (iso < start) return { source, owed: 0, todayRequired: floor, doneToday, floor, standard, start };
    let p = 0;
    for (let d = start; d < iso; d = addDays(d, 1)) p = Math.max(0, p + floor - (byDay[d] || 0));
    return { source, owed: p, todayRequired: Math.max(0, floor + p - doneToday), doneToday, floor, standard, start };
  }
  function frenchMinutesInRange(src, settings, from, to) {
    const { byDay } = frenchMinutesByDay(src, settings);
    let s = 0;
    for (const [d, m] of Object.entries(byDay)) if (d >= from && d <= to) s += m;
    return s;
  }
  function frenchNextType(log) {
    const sess = (Array.isArray(log) ? log : []).filter((e) => e && e.lang === "fr" && FR_CYCLE.includes(e.type))
      .sort((a, b) => (a.date + (a.t || "")).localeCompare(b.date + (b.t || "")));
    if (!sess.length) return FR_CYCLE[0];
    let idx = -1;
    for (const s of sess) {
      let k = FR_CYCLE.indexOf(s.type, idx + 1);
      if (k === -1) k = FR_CYCLE.indexOf(s.type);
      idx = k;
    }
    return FR_CYCLE[(idx + 1) % FR_CYCLE.length];
  }

  // ───────────────────────────────────────────── nightly review
  function reviewDates(now) {
    const today = todayISO(now);
    const reviewDay = now.getHours() < 4 ? addDays(today, -1) : today;
    return { reviewDay, tomorrow: addDays(reviewDay, 1) };
  }
  function reviewQueue(state, reviewDay) {
    const lim = addDays(reviewDay, 1);
    const items = state.tasks.filter((t) => t.status === "open" && t.date && t.date <= lim);
    const order = new Map(sortTasks(items, reviewDay).map((t, i) => [t.id, i]));
    items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || order.get(a.id) - order.get(b.id));
    return { items, tableMode: items.length > 15 };
  }
  function applyReviewAction(state, id, action, { date, today, nowIso } = {}) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t || !isISO(today)) return false;
    switch (action) {
      case "done": t.status = "done"; t.doneAt = nowIso || `${today}T00:00:00`; t.doneOn = today; break;
      case "tomorrow": t.date = addDays(today, 1); t.time = null; break;
      case "date": if (!isISO(date)) return false; t.date = date; t.time = null; break;
      case "archive": t.status = "archived"; break;
      case "keep": break;
      default: return false;
    }
    t.updatedAt = nowIso || `${today}T00:00:00`;
    return true;
  }

  // ───────────────────────────────────────────── proposeDay (§5.4-A)
  const FOCUS_CATS = new Set(["entrega", "fase0", "frances"]);

  function proposeDay(state, day, ctx = {}) {
    const st = state.settings;
    const P = parseHM;
    const dayStart = P(st.dayStart), dayEnd = P(st.dayEnd);
    const BF = st.bestFocus.map(P), LF = st.lowFocus.map(P);
    const margin = st.marginMin;
    const fromHM = ctx.fromHM == null ? null : typeof ctx.fromHM === "number" ? ctx.fromHM : P(ctx.fromHM);
    const winStart = Math.max(dayStart, fromHM ?? dayStart);
    const res = { day, blocks: [], busy: [], top3: [], moved: [], warnings: [], overflow: false, focusMin: 0 };

    // 1. free time
    res.busy = dayBlocks(state, day).timed;
    let free = winStart < dayEnd ? [[winStart, dayEnd]] : [];
    const subtract = (s, e) => {
      const out = [];
      for (const [a, b] of free) {
        if (e <= a || s >= b) out.push([a, b]);
        else { if (a < s) out.push([a, s]); if (e < b) out.push([e, b]); }
      }
      free = out;
    };
    for (const b of res.busy) subtract(b.start, b.end);
    const totalFree = () => free.reduce((acc, [a, b]) => acc + b - a, 0);
    const place = (dur, windows) => {
      for (let w = 0; w < windows.length; w++) {
        const [ws, we] = windows[w];
        for (const [a, b] of free) {
          const s0 = Math.max(a, ws), e0 = Math.min(b, we);
          if (e0 <= s0) continue;
          const s = ceil15(s0);
          if (s + dur <= e0) { subtract(s, s + dur); return { start: s, end: s + dur, windowIndex: w }; }
        }
      }
      return null;
    };
    let focusMin = res.busy.filter((b) => b.taskId && FOCUS_CATS.has(b.kind)).reduce((a, b) => a + (b.end - b.start), 0);

    // 2. window lists
    const deepW = [[BF[0], BF[1]], [dayStart, LF[0]], [LF[1], BF[0]], [BF[1], dayEnd], [LF[0], LF[1]]];
    const mechW = [[LF[0], LF[1]], [LF[1], BF[0]], [dayStart, LF[0]], [BF[1], dayEnd], [BF[0], BF[1]]];
    const sportW = (dur) => {
      const eve = [P(st.eveningTrainStart), P(st.latestTrainStart) + dur], morn = [dayStart, P(st.morningTrainEnd)];
      return st.trainingPreference === "manana" ? [morn, eve] : [eve, morn];
    };
    const frenchW = [[P(st.frenchPreferredTime), BF[0]], [dayStart, BF[0]], [BF[0], dayEnd]];

    // 3. candidates
    const lim7 = addDays(day, 7);
    const open = state.tasks.filter((t) => t.status === "open");
    const cands = open.filter((t) => !t.time && t.category !== "evento" && ((t.date && t.date <= day) || (t.category === "entrega" && !t.date && t.due && t.due <= lim7)));
    for (const t of open) if (t.category === "evento" && !t.time && t.date && t.date <= day) res.warnings.push(`Evento sin hora: ponle hora («${t.title}»)`);
    const byCreated = (a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id));

    const order = [];
    const handled = new Set();
    const movedTasks = [];
    const tryPlace = (cat, dur, windows) => {
      if (totalFree() - margin < dur) return { fail: "No cabe en el día" };
      if (FOCUS_CATS.has(cat) && focusMin + dur > st.maxFocusMin) return { fail: `Tope de foco (${fmtDur(st.maxFocusMin)})` };
      const slot = place(dur, windows);
      if (!slot) return { fail: "Sin hueco en su franja" };
      if (FOCUS_CATS.has(cat)) focusMin += dur;
      return slot;
    };
    const pushBlock = (b) => { res.blocks.push(b); order.push(b.key); };
    const taskBlock = (t, slot, extra = {}) => ({ key: `task:${t.id}`, kind: t.category, category: t.category, title: t.title, start: slot.start, end: slot.end,
      taskId: t.id, priority: CATEGORIES[t.category].rank, warnings: [], ...extra });
    const moveTask = (t, reason) => { handled.add(t.id); movedTasks.push({ t, reason }); };
    const placeTask = (t, dur, windows, extra = {}) => {
      handled.add(t.id);
      const r = tryPlace(t.category, dur, windows);
      if (r.fail) { moveTask(t, r.fail); return false; }
      const b = taskBlock(t, r, extra);
      if (windows === deepW && r.windowIndex === 4) {
        const w = slotWarnings({ kind: t.category, start: r.start, end: r.end, key: b.key }, st).filter((x) => x.code === "deep_in_low_focus");
        b.warnings.push(...w);
        res.warnings.push(`«${t.title}» queda en la franja de poco foco.`);
      }
      pushBlock(b);
      return true;
    };
    // reuse an existing open task of a category (dated `day` first, then the most recent overdue)
    const reusable = (cat) => cands.filter((t) => t.category === cat && t.date && !handled.has(t.id))
      .sort((a, b) => (a.date === day ? -1 : 0) - (b.date === day ? -1 : 0) || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0] || null;
    const dayTasks = state.tasks.filter((t) => t.date === day && t.status !== "archived");
    const sportCovered = dayTasks.some((t) => t.category === "deporte" && (t.time || t.status === "done"));
    const frenchCovered = dayTasks.some((t) => t.category === "frances" && t.time);

    let sportDone = false;
    const placeSport = (reason) => {
      sportDone = true;
      if (sportCovered) return;
      const t = reusable("deporte");
      const dur = t ? t.durationMin : st.sportDurationMin;
      const sportFail = () => res.warnings.push(`No hay hueco para entrenar en tu franja (antes de las ${hmHuman(st.morningTrainEnd)} o desde las ${hmHuman(st.eveningTrainStart)})`);
      if (t) { if (!placeTask(t, dur, sportW(dur), reason ? { reason } : {})) sportFail(); return; }
      const r = tryPlace("deporte", dur, sportW(dur));
      if (r.fail) { sportFail(); return; }
      pushBlock({ key: "new:deporte", kind: "deporte", category: "deporte", title: "Deporte · " + HYBRID_WEEK[dow(day)], start: r.start, end: r.end,
        priority: 3, warnings: [], ...(reason ? { reason } : {}) });
    };

    // 4.1 sport at risk
    const sportBefore = Number(ctx.sportDoneBefore) || 0;
    const fs = floorStatus(sportBefore, day, st.sportFloor, st.sportStandard);
    if (fs.state === "riesgo") placeSport(`Suelo en riesgo: ${sportBefore} de ${st.sportFloor}, ${plural(fs.daysLeft, "queda 1 día", `quedan ${fs.daysLeft} días`)}`);
    // 4.2 entregas
    for (const t of sortTasks(cands.filter((x) => x.category === "entrega"), day)) {
      const due = t.due ? ` · vence ${fmtShort(t.due)}` : "";
      placeTask(t, t.durationMin, deepW, { reason: `Peso ${fmtDec(t.weight ?? 10, 0)} %${due}` });
    }
    // 4.3 minimums
    if (!sportDone && sportBefore < st.sportStandard) placeSport(null);
    if (day >= st.frenchStart) {
      const req = Math.max(0, Number(ctx.frenchRequired ?? st.frenchFloorMin) || 0);
      let dur = totalFree() - margin >= 180 ? Math.max(req, st.frenchStandardMin) : req;
      dur = Math.min(dur, st.frenchMaxBlockMin);
      const t = frenchCovered ? null : reusable("frances");
      if (!frenchCovered && (req > 0 || t)) {
        if (req > dur) res.warnings.push(`Francés: quedan ${req - dur}' pendientes que no caben en un bloque`);
        const frFail = () => res.warnings.push("No cabe el francés: hazlo antes que lo de prioridad 4-5");
        const title = "Francés" + (ctx.frenchNextType && LABEL[ctx.frenchNextType] ? " · " + LABEL[ctx.frenchNextType] : "");
        if (t) { if (!placeTask(t, Math.max(t.durationMin, dur), frenchW)) frFail(); }
        else {
          const r = tryPlace("frances", dur, frenchW);
          if (r.fail) frFail();
          else pushBlock({ key: "new:frances", kind: "frances", category: "frances", title, start: r.start, end: r.end, priority: 3, warnings: [] });
        }
      }
    }
    // other sport / French tasks the user wrote explicitly
    for (const t of cands.filter((x) => (x.category === "deporte" || x.category === "frances") && !handled.has(x.id)).sort(byCreated)) {
      placeTask(t, t.durationMin, t.category === "deporte" ? sportW(t.durationMin) : frenchW);
    }
    // 4.4 Fase 0, 4.5 resto
    for (const t of cands.filter((x) => x.category === "fase0").sort(byCreated)) placeTask(t, t.durationMin, deepW);
    for (const t of cands.filter((x) => x.category === "resto").sort(byCreated)) placeTask(t, t.durationMin, mechW);

    // 6. moved
    const cmp = taskComparator(day);
    res.moved = movedTasks.sort((a, b) => cmp(a.t, b.t)).map(({ t, reason }) => ({ taskId: t.id, title: t.title, toDate: addDays(day, 1), reason }));
    res.overflow = res.moved.length > 0;
    if (res.overflow) res.warnings.unshift(`El día no cabe: se mueven ${res.moved.length} ${plural(res.moved.length, "tarea", "tareas")} (las de menor prioridad).`);

    // 8. margin
    let marginBlock = null;
    if (margin > 0) {
      for (const [a, b] of free) {
        const s = ceil15(a);
        if (s + margin <= b) { marginBlock = { key: "margin", kind: "margen", category: null, title: `Margen ${margin}'`, start: s, end: s + margin, priority: null, warnings: [] }; break; }
      }
      if (marginBlock) { subtract(marginBlock.start, marginBlock.end); res.blocks.push(marginBlock); }
      else res.warnings.push(`Sin margen de ${margin}'`);
    }
    res.top3 = order.slice(0, 3);
    res.blocks.sort((a, b) => a.start - b.start);
    res.focusMin = focusMin;
    return res;
  }

  function acceptProposal(state, proposal, selectedKeys, { nowIso, id } = {}) {
    const sel = new Set(selectedKeys || proposal.blocks.map((b) => b.key));
    const day = proposal.day;
    let created = 0, updated = 0, moved = 0, accepted = 0;
    for (const b of proposal.blocks) {
      if (!sel.has(b.key) || b.key === "margin") continue;
      accepted++;
      if (b.key.startsWith("task:")) {
        const t = state.tasks.find((x) => x.id === b.taskId);
        if (!t || t.status !== "open") continue;
        t.date = day; t.time = fmtHM(b.start);
        if (b.end - b.start !== t.durationMin) t.durationMin = b.end - b.start;
        t.updatedAt = nowIso || t.updatedAt;
        updated++;
      } else if (b.key === "new:deporte" || b.key === "new:frances") {
        const cat = b.category;
        if (state.tasks.some((t) => t.status === "open" && t.category === cat && t.date === day)) continue; // idempotent
        state.tasks.push(newTask({ category: cat, title: b.title, date: day, time: fmtHM(b.start), durationMin: b.end - b.start, auto: true }, { nowIso, id }));
        created++;
      }
    }
    for (const m of proposal.moved) {
      const t = state.tasks.find((x) => x.id === m.taskId);
      if (!t || t.status !== "open") continue;
      t.date = m.toDate; t.time = null; t.updatedAt = nowIso || t.updatedAt;
      moved++;
    }
    return { created, updated, moved, accepted };
  }

  // ───────────────────────────────────────────── reminders
  function dueReminders(blocksToday, today, lastTickMs, nowMs, leadMin = 0, sentSet = new Set()) {
    const sent = sentSet instanceof Set ? sentSet : new Set(sentSet || []);
    return blocksToday.filter((b) => {
      if (b.key === "margin" || b.kind === "margen" || b.done || sent.has(b.key)) return false;
      const fireAt = toEpoch(today, fmtHM(b.start)) - leadMin * 60000;
      return lastTickMs < fireAt && fireAt <= nowMs;
    });
  }

  // ───────────────────────────────────────────── ICS
  function icsEscape(s) {
    return String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
  }
  const utf8Len = (str) => { let n = 0; for (const ch of str) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; } return n; };
  /** Splits into user-perceived characters (enough for flags, ZWJ emoji, skin tones, combining marks). */
  function graphemes(str) {
    const out = [];
    let prevJoin = false, riOpen = false;
    for (const ch of str) {
      const c = ch.codePointAt(0);
      const isRI = c >= 0x1f1e6 && c <= 0x1f1ff;
      const extend = (c >= 0x300 && c <= 0x36f) || c === 0x200d || (c >= 0xfe00 && c <= 0xfe0f) || (c >= 0x1f3fb && c <= 0x1f3ff) || (c >= 0xe0020 && c <= 0xe007f) || c === 0x20e3;
      if (out.length && (extend || prevJoin || (isRI && riOpen))) {
        out[out.length - 1] += ch;
        riOpen = false;
      } else {
        out.push(ch);
        riOpen = isRI;
      }
      prevJoin = c === 0x200d;
    }
    return out;
  }
  /** RFC 5545 folding: physical lines ≤ 75 octets, CRLF + space, never inside a character. */
  function foldLine(line) {
    if (utf8Len(line) <= 75) return line;
    const units = [];
    for (const g of graphemes(line)) { if (utf8Len(g) > 74) units.push(...Array.from(g)); else units.push(g); }
    const out = [];
    let cur = "", len = 0, limit = 75;
    for (const u of units) {
      const l = utf8Len(u);
      if (len + l > limit && cur) { out.push(cur); cur = ""; len = 0; limit = 74; }
      cur += u; len += l;
    }
    out.push(cur);
    return out.join("\r\n ");
  }
  const VTIMEZONE = ["BEGIN:VTIMEZONE", "TZID:Europe/Madrid", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
    "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "BEGIN:STANDARD", "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"];
  /** Zones with an embedded VTIMEZONE. Madrid (home) and Kolkata (Woxsen, Jan–Jun 2027; no DST). */
  const VTIMEZONES = {
    "Europe/Madrid": VTIMEZONE,
    "Asia/Kolkata": ["BEGIN:VTIMEZONE", "TZID:Asia/Kolkata", "BEGIN:STANDARD", "TZOFFSETFROM:+0530", "TZOFFSETTO:+0530", "TZNAME:IST",
      "DTSTART:19700101T000000", "END:STANDARD", "END:VTIMEZONE"],
  };
  const TZ_ALIASES = { "Asia/Calcutta": "Asia/Kolkata" };
  /** The ICS zone for the browser's zone: a known TZID, or null → floating local times (the calendar's own zone). */
  function icsZone(tz) {
    const z = TZ_ALIASES[tz] || tz;
    return VTIMEZONES[z] ? z : null;
  }
  const ymd = (iso) => iso.replace(/-/g, "");
  const hms = (min) => pad2(Math.floor(min / 60)) + pad2(min % 60) + "00";
  function utcStamp(x) {
    if (typeof x === "string" && /^\d{8}T\d{6}Z$/.test(x)) return x;
    const d = new Date(x);
    if (isNaN(d)) return "19700101T000000Z";
    return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
  }
  /** tzid: the wall-clock zone of the times (default Europe/Madrid, as in the spec). Pass the browser's zone so that
      "20:00" in India stays 20:00 in India; an unknown zone gives floating times (no TZID). */
  function toICS(events, { calName = "Ritmo", dtstamp, tzid = "Europe/Madrid" } = {}) {
    const stamp = utcStamp(dtstamp);
    const tz = icsZone(tzid);
    const at = tz ? `;TZID=${tz}:` : ":";
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mix_ideas//Ritmo//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:" + icsEscape(calName), ...(tz ? ["X-WR-TIMEZONE:" + tz, ...VTIMEZONES[tz]] : [])];
    for (const e of events) {
      const endMin = e.start + e.durationMin;
      const endDate = addDays(e.date, Math.floor(endMin / 1440));
      L.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${stamp}`,
        `DTSTART${at}${ymd(e.date)}T${hms(e.start)}`,
        `DTEND${at}${ymd(endDate)}T${hms(endMin % 1440)}`,
        `SUMMARY:${icsEscape(e.summary)}`, `DESCRIPTION:${icsEscape(e.description)}`, `CATEGORIES:${icsEscape(e.category)}`, "END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return L.map(foldLine).join("\r\n") + "\r\n";
  }
  function blocksToEvents(state, dates, { includeRoutines = false, includeFixed = false } = {}) {
    const ev = [];
    for (const iso of dates) {
      for (const b of dayBlocks(state, iso).timed) {
        if (b.taskId) {
          const t = state.tasks.find((x) => x.id === b.taskId);
          ev.push({ uid: `ritmo-task-${t.id}-${ymd(iso)}@mix-ideas`, date: iso, start: b.start, durationMin: t.durationMin, summary: t.title,
            description: `${catLabel(t.category)} · P${CATEGORIES[t.category].rank}` + (t.notes ? "\n" + t.notes : ""), category: t.category });
        } else if (b.kind === "rutina" && includeRoutines) {
          const r = state.routines.find((x) => x.id === b.routineId);
          ev.push({ uid: `ritmo-rutina-${r.id}-${ymd(iso)}@mix-ideas`, date: iso, start: b.start, durationMin: r.durationMin, summary: b.title,
            description: "Rutina" + (r.items.length ? "\n" + r.items.map((i) => "· " + i.text).join("\n") : ""), category: "rutina" });
        } else if (b.kind === "fijo" && includeFixed) {
          ev.push({ uid: `ritmo-fijo-${b.fixedId}-${ymd(iso)}@mix-ideas`, date: iso, start: b.start, durationMin: b.end - b.start, summary: b.title,
            description: "Evento fijo · P1", category: "evento" });
        }
      }
    }
    return ev;
  }

  // ───────────────────────────────────────────── IO
  function exportBundle(state, habitsRaw, nowIso) {
    const h = readHabits(habitsRaw);
    return { app: "ritmo", version: 1, exportedAt: nowIso, ritmo: state, habitos: h.status === "ok" ? h.data : null };
  }
  function parseImport(text, today) {
    const fail = (error) => ({ ok: false, ritmo: null, habitos: null, warnings: [], error });
    if (typeof text !== "string" || !text.trim()) return fail("archivo vacío");
    if (text.length > 5e6) return fail("archivo demasiado grande (máx. 5 MB)");
    let obj;
    try { obj = JSON.parse(text); } catch (e) { return fail("JSON no válido"); }
    if (!isPlainObject(obj)) return fail("no es un objeto JSON");
    const warnings = [];
    let raw, habitos = null;
    if (obj.app === "ritmo" && isPlainObject(obj.ritmo)) {
      raw = obj.ritmo;
      if (obj.habitos != null) {
        const r = readHabits(JSON.stringify(obj.habitos));
        if (r.status === "ok") habitos = r.data;
        else warnings.push("Hábitos ignorados: formato no válido");
      }
    } else if (Array.isArray(obj.tasks) && isPlainObject(obj.settings)) raw = obj;
    else return fail("no es una copia de Ritmo");
    if (!Array.isArray(raw.tasks)) return fail("falta la lista de tareas");
    return { ok: true, ritmo: migrate(raw, today), habitos, warnings, error: null };
  }

  // ───────────────────────────────────────────── demo (deterministic, relative to today)
  /** True while the state still holds the demo tasks (ids t_demoNN), to label it as example data. */
  const isDemoState = (s) => !!s && Array.isArray(s.tasks) && s.tasks.some((t) => /^t_demo\d+$/.test(t.id));
  function demoState(today, habits = HABITS_DEFAULT) {
    const s = emptyState(today, habits); // habit links follow the real habit list
    const rng = mulberry32(42);
    s.settings.fixedWeekly = [{ id: "fw_clases", title: "Clases UIE", days: [1, 2, 3, 4, 5], start: "09:00", end: "14:30" }];
    s.settings.frenchCountFrom = addDays(today, -13);
    let n = 0;
    const id = () => "t_demo" + pad2(++n);
    const add = (f, created = addDays(today, -1), extra = {}) => { const t = newTask(f, { id, nowIso: `${created}T07:00:00.000Z` }); Object.assign(t, extra); s.tasks.push(t); return t; };
    const done = (on, hm = "20:00") => ({ status: "done", doneOn: on, doneAt: `${on}T${hm}:00.000Z`, updatedAt: `${on}T${hm}:00.000Z` });
    // today
    add({ title: "Rodaje Z2 40'", category: "deporte", date: today, time: "07:30", durationMin: 45 }, addDays(today, -1), done(today, "08:20"));
    add({ title: "Responder correos de la práctica", category: "resto", date: today, time: "16:00", durationMin: 30, notes: "El profesor espera la propuesta del proyecto: lleva 9 días sin respuesta." });
    add({ title: "Francés · Escritura", category: "frances", date: today, time: "17:00", durationMin: 45 });
    add({ title: "Práctica de Señales: filtros FIR", category: "entrega", date: today, time: "20:00", durationMin: 120, due: addDays(today, 3), weight: 20 }, addDays(today, -6));
    add({ title: "Miniproyecto F1: cargar datos de vueltas", category: "fase0", date: today, time: "22:15", durationMin: 45 });
    add({ title: "Comprar zapatillas de series", category: "resto", date: today, time: null, durationMin: 30 });
    // around today
    add({ title: "Pedir cita en Vacunación Internacional", category: "resto", date: addDays(today, -1), durationMin: 15 }, addDays(today, -3));
    add({ title: "Fuerza: tirón", category: "deporte", date: addDays(today, 1), time: "19:00", durationMin: 60 });
    add({ title: "Vuelo a Londres", category: "evento", date: addDays(today, 15), time: "08:00", durationMin: 120 }, addDays(today, -10));
    add({ title: "Informe de laboratorio de Fluidos", category: "entrega", date: null, durationMin: 90, due: addDays(today, 6), weight: 15 }, addDays(today, -4));
    add({ title: "Curso de Andrew Ng: vídeos de la semana 2", category: "fase0", date: null, durationMin: 60 }, addDays(today, -5));
    add({ title: "Llamar al banco por la tarjeta", category: "resto", date: addDays(today, 1), durationMin: 15 });
    // sport done earlier this week
    const mon = weekStart(today);
    if (mon < today) add({ title: "Series 6×800 m", category: "deporte", date: mon, time: "19:30", durationMin: 60 }, addDays(mon, -1), done(mon, "20:30"));
    if (addDays(mon, 1) < today) add({ title: "Fuerza: empuje", category: "deporte", date: addDays(mon, 1), time: "19:00", durationMin: 60 }, addDays(mon, -1), done(addDays(mon, 1), "20:05"));
    // French on 10 of the last 13 days
    const pool = [];
    for (let i = 13; i >= 1; i--) pool.push(addDays(today, -i));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    pool.slice(0, 10).sort().forEach((d, k) => {
      add({ title: "Francés · " + LABEL[FR_CYCLE[k % 7]], category: "frances", date: d, time: "17:00", durationMin: rng() < 0.5 ? 30 : 45 }, addDays(d, -1), done(d, "17:45"));
    });
    // routine log, last 14 days
    for (let i = 13; i >= 1; i--) {
      const d = addDays(today, -i);
      const pick = (r, p) => (rng() < p ? r.items.map((x) => x.id) : r.items.filter(() => rng() < 0.6).map((x) => x.id));
      s.routineLog[d] = { manana: pick(s.routines[0], 0.8), noche: pick(s.routines[1], 0.7) };
    }
    s.routineLog[today] = { manana: s.routines[0].items.map((x) => x.id), noche: [] };
    s.reviews[addDays(today, -1)] = { at: `${addDays(today, -1)}T22:40:00.000Z`, done: 3, tomorrow: 2, redated: 1, archived: 1, kept: 0, accepted: 5 };
    return s;
  }
  function demoHabits(today) {
    const rng = mulberry32(4242);
    const data = { habits: HABITS_DEFAULT.slice(), months: {} };
    const prob = HABITS_DEFAULT.map((name) => (/medit/i.test(name) ? 0.42 : /nutrici/i.test(name) ? 0.55 : 0.82));
    for (let i = 34; i >= 1; i--) {
      const d = addDays(today, -i);
      for (let h = 0; h < HABITS_DEFAULT.length; h++) if (rng() < prob[h]) setTick(data, d, h, true, today);
    }
    for (const h of [0, 3, 7, 8]) setTick(data, today, h, true, today);
    const ym = ymOf(today);
    data.months[ym] ||= {};
    data.objectives = { [ym]: [
      { text: "Media de hábitos ≥ 7,5 todo el mes", done: false },
      { text: "3 sesiones de deporte cada semana", done: true },
      { text: "Terminar el miniproyecto F1", done: false },
    ] };
    return data;
  }
  /** Writes the demo ticks/objectives into habitos.v1 data (allowed mutators only) and returns exactly what it added,
      so that it can be taken out again later: {ticks:{ym:{h:[day]}}, objectives:{ym:[{text,done}×3]}|null}. */
  function applyDemoHabits(data, demo, today) {
    const rec = { ticks: {}, objectives: null };
    for (const [ym, month] of Object.entries((demo && demo.months) || {})) {
      if (!isYM(ym) || !isPlainObject(month)) continue;
      for (const [hs, days] of Object.entries(month)) {
        const h = Number(hs);
        if (!Number.isInteger(h) || h >= data.habits.length || !Array.isArray(days)) continue;
        for (const day of days) {
          const iso = `${ym}-${pad2(day)}`;
          if (!isISO(iso) || isTicked(data, iso, h) || !setTick(data, iso, h, true, today)) continue;
          ((rec.ticks[ym] ||= {})[h] ||= []).push(Number(day));
        }
      }
    }
    const ym = ymOf(today);
    const objs = demo && isPlainObject(demo.objectives) ? demo.objectives[ym] : null;
    if (Array.isArray(objs) && !objectivesOf(data, ym).some((o) => o.text)) {
      objs.forEach((o, i) => setObjective(data, ym, i, o));
      rec.objectives = { [ym]: objectivesOf(data, ym) };
    }
    return rec;
  }
  /** Number of demo ticks recorded by applyDemoHabits. */
  const demoTickCount = (rec) => Object.values((rec && rec.ticks) || {}).reduce((a, m) => a + Object.values(m).reduce((b, d) => b + d.length, 0), 0);
  /** Takes out of habitos.v1 data exactly the demo ticks that are still there, and the demo objectives if unchanged. */
  function removeDemoHabits(data, rec, today) {
    let removed = 0;
    for (const [ym, month] of Object.entries((rec && rec.ticks) || {})) {
      for (const [hs, days] of Object.entries(month)) {
        const h = Number(hs);
        for (const day of days) {
          const iso = `${ym}-${pad2(day)}`;
          if (isTicked(data, iso, h) && setTick(data, iso, h, false, today)) removed++;
        }
      }
    }
    for (const [ym, list] of Object.entries((rec && rec.objectives) || {})) {
      if (JSON.stringify(objectivesOf(data, ym)) === JSON.stringify(normObjectives(list))) {
        for (const i of [0, 1, 2]) setObjective(data, ym, i, { text: "", done: false });
      }
    }
    return removed;
  }
  /** Validates the demo record kept in ritmo.v1 (or null). */
  function normDemoRecord(x) {
    if (!isPlainObject(x) || !isPlainObject(x.ticks)) return null;
    const ticks = {};
    for (const [ym, month] of Object.entries(x.ticks)) {
      if (!isYM(ym) || !isPlainObject(month)) continue;
      for (const [hs, days] of Object.entries(month)) {
        const h = Number(hs);
        if (!Number.isInteger(h) || h < 0 || h > 99 || !Array.isArray(days)) continue;
        const ds = [...new Set(days.map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= daysInMonth(ym)))].sort((a, b) => a - b);
        if (ds.length) (ticks[ym] ||= {})[h] = ds;
      }
    }
    let objectives = null;
    if (isPlainObject(x.objectives)) {
      for (const [ym, list] of Object.entries(x.objectives)) if (isYM(ym) && Array.isArray(list)) (objectives ||= {})[ym] = normObjectives(list);
    }
    return Object.keys(ticks).length || objectives ? { ticks, objectives } : null;
  }

  // ───────────────────────────────────────────── export
  const api = {
    // basics
    isISO, isYM, isPlainObject, esc, mulberry32, makeId, clone,
    // dates & format
    todayISO, nowHM, addDays, daysBetween, dow, weekStart, weekDays, monthGrid, addMonths, daysInMonth, datesBetween, ymOf,
    parseHM, isHM, fmtHM, ceil15, toEpoch, hmHuman, titleParts, fmtDayMonth, fmtShort, fmtLong, fmtMonth, fmtInt, fmtDec, fmtDur, plural,
    DAY_NAMES, DAY_SHORT, DAY_LETTERS, MONTH_NAMES, MONTH_SHORT,
    // habits
    HABITS_DEFAULT, HABIT_RE, habitsOf, habitCount, readHabits, isTicked, dayScore, last7, weekPct, weekMean, streak, habitPct, weakest, tipFor,
    findHabit, hasAnyTicks, applyHabitMutation, setTick, setObjective, objectivesOf, monthStats, heatLevel,
    // state
    DEFAULT_SETTINGS, DEFAULT_ROUTINES, CATEGORIES, CATEGORY_KEYS, RUTINA_COLOR, catLabel, HYBRID_WEEK, GYM_ROUTINES, FR_START, FR_CYCLE, LABEL,
    emptyState, migrate, newTask,
    // tasks & day
    priority, sortTasks, dayBlocks, overdue, slotWarnings, plannedMinutes, routineTitle,
    // routines
    routineProgress, routineStreak, toggleRoutineItem,
    // minimums & foreign
    readGym, readIdiomas, readFinanzas, readPaso, sportByDay, floorStatus, ritmoSportDone, frenchStatus, frenchMinutesInRange, frenchNextType,
    // review & plan
    reviewDates, reviewQueue, applyReviewAction, proposeDay, acceptProposal,
    // reminders, ics, io, demo
    dueReminders, icsEscape, foldLine, utf8Len, icsZone, toICS, blocksToEvents, exportBundle, parseImport, demoState, demoHabits,
    applyDemoHabits, removeDemoHabits, demoTickCount, normDemoRecord, isDemoState,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RitmoLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
