/* Paso — pure logic (browser: window.PasoLogic · Node: module.exports).
   Steps + hand portions (no calories). No DOM, no storage and no hidden clock:
   every function receives `today` / `iso` / `now` explicitly (except todayISO/nowHM helpers). */
(function (root) {
  "use strict";

  // ───────────────────────── small utils
  const isPlainObject = (x) => Object.prototype.toString.call(x) === "[object Object]";
  const pad2 = (n) => String(n).padStart(2, "0");
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const round2 = (x) => Math.round(x * 100) / 100;
  const roundHalf = (x) => Math.round(x * 2) / 2;
  /** Number from number/string ("6,2" accepted); empty/invalid → dflt. */
  function num(x, dflt) {
    if (x === null || x === undefined || x === "") return dflt;
    const n = typeof x === "string" ? Number(x.trim().replace(",", ".")) : Number(x);
    return Number.isFinite(n) ? n : dflt;
  }
  function defaultId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ───────────────────────── dates (ISO strings, local; arithmetic in UTC → DST-safe)
  const DAY_MS = 864e5;
  function todayISO(now = new Date()) {
    return `${String(now.getFullYear()).padStart(4, "0")}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }
  function nowHM(now = new Date()) { return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`; }
  const ymd = (iso) => [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];
  const utc = (iso) => { const [y, m, d] = ymd(iso); return Date.UTC(y, m - 1, d); };
  function fromUTC(ms) {
    const d = new Date(ms);
    return `${String(d.getUTCFullYear()).padStart(4, "0")}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  function daysInMonth(ym) { const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function isISO(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [, m, d] = ymd(s);
    return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(s.slice(0, 7));
  }
  const isYM = (s) => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
  const addDays = (iso, n) => fromUTC(utc(iso) + n * DAY_MS);
  const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / DAY_MS);
  const dow = (iso) => { const w = new Date(utc(iso)).getUTCDay(); return w === 0 ? 7 : w; };
  const weekStart = (iso) => addDays(iso, 1 - dow(iso));
  const weekDays = (iso) => { const s = weekStart(iso); return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(s, i)); };
  /** Monday-first grid: offset = empty leading cells. */
  function monthGrid(ym) { return { offset: dow(ym + "-01") - 1, days: daysInMonth(ym) }; }
  function monthDates(ym) { const n = daysInMonth(ym); return Array.from({ length: n }, (_, i) => `${ym}-${pad2(i + 1)}`); }
  function addMonths(ym, n) {
    const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n;
    const yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    return `${String(yy).padStart(4, "0")}-${pad2(mm + 1)}`;
  }
  function parseHM(hm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || "").trim());
    if (!m) return null;
    const h = Number(m[1]), mi = Number(m[2]);
    return h <= 23 && mi <= 59 ? h * 60 + mi : null;
  }
  function fmtHM(min) { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; }
  const ceil15 = (min) => Math.ceil(min / 15) * 15;

  // ───────────────────────── Spanish formatting (by hand: es-ES does not group 4-digit numbers)
  const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
  const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const group3 = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  function fmtInt(n) {
    const v = Math.round(Number(n) || 0);
    return (v < 0 ? "-" : "") + group3(String(Math.abs(v)));
  }
  function fmtDec(x, d = 1) {
    const v = Number(x) || 0;
    const s = Math.abs(v).toFixed(d);
    const [i, f] = s.split(".");
    return (v < 0 && Number(s) !== 0 ? "-" : "") + group3(i) + (f ? "," + f : "");
  }
  /** Like fmtDec but trims trailing zeros: 3 → "3", 1.5 → "1,5". */
  function fmtNum(x, maxDec = 1) {
    const s = fmtDec(x, maxDec);
    return s.includes(",") ? s.replace(/,?0+$/, "") : s;
  }
  function fmtDur(min) {
    const m = Math.max(0, Math.round(Number(min) || 0));
    const h = Math.floor(m / 60), r = m % 60;
    if (!h) return `${r} min`;
    return r ? `${h} h ${r} min` : `${h} h`;
  }
  function titleParts(iso) {
    const [, m, d] = ymd(iso);
    return { weekday: cap(DAY_NAMES[dow(iso) - 1]), rest: `${d} de ${MONTHS[m - 1]}` };
  }
  const fmtDayMonth = (iso) => { const [, m, d] = ymd(iso); return `${d} de ${MONTHS[m - 1]}`; };
  const fmtShortDay = (iso) => `${DAY_SHORT[dow(iso) - 1]} ${ymd(iso)[2]}`;
  const fmtDateShort = (iso) => { const [, m, d] = ymd(iso); return `${d} ${MONTHS_SHORT[m - 1]}`; };
  const monthName = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1];
  function fmtWeekRange(iso) {
    const s = weekStart(iso), e = addDays(s, 6);
    const [, ms, ds] = ymd(s), [, me, de] = ymd(e);
    return ms === me ? `${ds}–${de} de ${MONTHS[me - 1]}` : `${ds} de ${MONTHS[ms - 1]} – ${de} de ${MONTHS[me - 1]}`;
  }

  // ───────────────────────── value sets
  const SLOTS = ["desayuno", "comida", "merienda", "cena", "extra"];
  const MAIN_SLOTS = ["desayuno", "comida", "merienda", "cena"];
  const SLOT_LABEL = { desayuno: "Desayuno", comida: "Comida", merienda: "Merienda", cena: "Cena", extra: "Extra" };
  const SLOT_COLOR = { desayuno: "#E9C99A", comida: "#A9C8A0", merienda: "#D2B48C", cena: "#9DB4CF", extra: "#CFCFCB" };
  const SLOT_TIME = { desayuno: "08:00", comida: "14:00", merienda: "17:30", cena: "21:00" };
  const SLOT_FOR = { desayuno: "el desayuno", comida: "la comida", merienda: "la merienda", cena: "la cena", extra: "un extra" };
  const PORTIONS = ["protein", "veg", "carbs", "fat"];
  const PORTION_INFO = {
    protein: { emoji: "🥩", label: "Proteína", one: "palma", many: "palmas", help: "1 palma ≈ pechuga o filete de pescado, 3 huevos, 200 g de skyr, 150 g de tofu" },
    veg: { emoji: "🥦", label: "Verdura", one: "puño", many: "puños", help: "1 puño ≈ 1 taza: brócoli, espinacas, pimiento, zanahoria, calabacín" },
    carbs: { emoji: "🍚", label: "Hidratos", one: "mano", many: "manos", help: "1 mano ahuecada ≈ arroz, pasta, patata, avena, 1 pieza de fruta, 1 rebanada grande de pan" },
    fat: { emoji: "🥑", label: "Grasa", one: "pulgar", many: "pulgares", help: "1 pulgar ≈ 1 cda de aceite, un puñadito de frutos secos, ¼ de aguacate, queso" },
  };
  const STEP_SOURCES = ["manual", "health", "csv", "demo"];
  const STEP_SOURCE_LABEL = { manual: "Manual", health: "Apple Health", csv: "CSV", demo: "Ejemplo" };
  const DAY_TYPES = ["descanso", "gimnasio", "series"];
  const DAY_TYPE_LABEL = { descanso: "Descanso / día normal", gimnasio: "Gimnasio", series: "Series o tirada larga" };
  const DAY_TYPE_SHORT = { descanso: "Descanso", gimnasio: "Gimnasio", series: "Series / tirada" };
  const RUN_TYPES = ["rodaje", "series", "tirada", "trote", "natacion", "otro"];
  const RUN_LABEL = { rodaje: "Rodaje Z2", series: "Series", tirada: "Tirada larga", trote: "Trote corto (cuenta para el suelo)", natacion: "Natación", otro: "Otro" };
  const RUN_SHORT = { rodaje: "Rodaje Z2", series: "Series", tirada: "Tirada larga", trote: "Trote corto", natacion: "Natación", otro: "Otro" };
  /** Gym tracker routine names (10-gym-tracker/logic.js). */
  const GYM_ROUTINES = { r1: "Tren superior", r2: "Pecho-espalda", r3: "Brazo-hombro", r4: "Espalda-bíceps", r5: "Pecho-hombro-tríceps" };
  const routineLabel = (id) => (GYM_ROUTINES[id] ? `${String(id).slice(1)} · ${GYM_ROUTINES[id]}` : String(id || "Sesión"));
  /** Byte-exact copy of 15-habitos/app/logic.js HABITS (used only to detect habits when the array is missing). */
  const HABITS_DEFAULT = ["📵 Móvil (0 redes <14:00, máx 1 h)", "🧠 Deep work", "🇫🇷 Francés", "🏃 Deporte", "🥗 Nutrición + 3 L agua",
    "🌙 Rutina de noche + leer", "🤖 ML (plan del día)", "⏰ Levantarse a su hora", "🇬🇧 Inglés", "🧘 Meditar (prueba)"];

  /** Carbs/fat guidance per day type = per-main-meal table in 16-nutricion/guia-raciones.md × 3 meals + snack.
      Guidance only: never scored. */
  const DAY_RANGES = {
    descanso: { carbs: [3, 4], fat: [3, 6] },
    gimnasio: { carbs: [6, 7], fat: [3, 4] },
    series: { carbs: [6, 9], fat: [3, 4] },
  };

  // ───────────────────────── state
  const DEFAULT_SETTINGS = {
    name: "David", stepGoal: 10000, heightCm: 175, strideM: null,
    proteinTarget: 5,
    veg: { mode: "rampa", fixed: 4, start: 2, final: 4, rampStart: null, weeksPerStep: 2 },
    waterGoalMl: 3000, glassMl: 250, bottleMl: 500,
    dayMetThreshold: 0.75, defaultDayType: "descanso",
    healthSources: { "iPhone de David": true },
  };
  const emptyDay = () => ({ steps: 0, stepsSource: null, waterMl: 0, dayType: null, meals: [] });
  function emptyState(today) {
    const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    s.veg.rampStart = today;
    return { version: 1, settings: s, days: {}, runs: [], imports: [] };
  }

  function normSettings(src, today) {
    const d = DEFAULT_SETTINGS, s = isPlainObject(src) ? src : {};
    const v = isPlainObject(s.veg) ? s.veg : {};
    const name = typeof s.name === "string" && s.name.trim() ? s.name.trim().slice(0, 40) : d.name;
    const strideRaw = num(s.strideM, null);
    const start = clamp(roundHalf(num(v.start, d.veg.start)), 0, 10);
    const out = {
      name,
      stepGoal: clamp(Math.round(num(s.stepGoal, d.stepGoal)), 1000, 50000),
      heightCm: clamp(Math.round(num(s.heightCm, d.heightCm)), 120, 230),
      strideM: strideRaw === null || strideRaw <= 0 ? null : clamp(Math.round(strideRaw * 1000) / 1000, 0.3, 1.5),
      proteinTarget: clamp(roundHalf(num(s.proteinTarget, d.proteinTarget)), 1, 10),
      veg: {
        mode: v.mode === "fija" ? "fija" : "rampa",
        fixed: clamp(roundHalf(num(v.fixed, d.veg.fixed)), 0, 10),
        start,
        final: Math.max(start, clamp(roundHalf(num(v.final, d.veg.final)), 0, 10)),
        rampStart: isISO(v.rampStart) ? v.rampStart : today,
        weeksPerStep: clamp(Math.round(num(v.weeksPerStep, d.veg.weeksPerStep)), 1, 12),
      },
      waterGoalMl: clamp(Math.round(num(s.waterGoalMl, d.waterGoalMl) / 50) * 50, 500, 8000),
      glassMl: clamp(Math.round(num(s.glassMl, d.glassMl)), 50, 1000),
      bottleMl: clamp(Math.round(num(s.bottleMl, d.bottleMl)), 100, 2000),
      dayMetThreshold: clamp(Math.round(num(s.dayMetThreshold, d.dayMetThreshold) * 4) / 4, 0.25, 1),
      defaultDayType: DAY_TYPES.includes(s.defaultDayType) ? s.defaultDayType : d.defaultDayType,
      healthSources: {},
    };
    const hs = isPlainObject(s.healthSources) ? s.healthSources : d.healthSources;
    for (const [k, val] of Object.entries(hs)) if (typeof val === "boolean" && k.length <= 120) out.healthSources[k] = val;
    return out;
  }

  const clampPortion = (x) => clamp(roundHalf(num(x, 0)), 0, 10);
  function normMeal(m, genId = defaultId) {
    const src = isPlainObject(m) ? m : {};
    return {
      id: typeof src.id === "string" && src.id ? src.id.slice(0, 60) : genId("m"),
      slot: SLOTS.includes(src.slot) ? src.slot : "extra",
      time: parseHM(src.time) === null ? "" : fmtHM(parseHM(src.time)),
      desc: typeof src.desc === "string" ? src.desc.trim().slice(0, 140) : "",
      protein: clampPortion(src.protein), veg: clampPortion(src.veg), carbs: clampPortion(src.carbs), fat: clampPortion(src.fat),
    };
  }
  function normDay(d, genId = defaultId) {
    const day = emptyDay();
    if (!isPlainObject(d)) return day;
    day.steps = clamp(Math.round(num(d.steps, 0)), 0, 200000);
    day.stepsSource = STEP_SOURCES.includes(d.stepsSource) ? d.stepsSource : (day.steps > 0 ? "manual" : null);
    day.waterMl = clamp(Math.round(num(d.waterMl, 0)), 0, 20000);
    day.dayType = DAY_TYPES.includes(d.dayType) ? d.dayType : null;
    day.meals = Array.isArray(d.meals) ? d.meals.filter(isPlainObject).map((m) => normMeal(m, genId)) : [];
    return day;
  }
  function normRun(r, genId = defaultId) {
    if (!isPlainObject(r) || !isISO(r.date)) return null;
    return {
      id: typeof r.id === "string" && r.id ? r.id.slice(0, 60) : genId("r"),
      date: r.date,
      type: RUN_TYPES.includes(r.type) ? r.type : "otro",
      minutes: clamp(Math.round(num(r.minutes, 0)), 0, 1440),
      km: clamp(round2(num(r.km, 0)), 0, 500),
      notes: typeof r.notes === "string" ? r.notes.slice(0, 280) : "",
    };
  }
  /** Fill defaults, coerce invalid values and drop what cannot be repaired. Never throws. */
  function migrate(any, today, opts = {}) {
    const genId = opts.id || defaultId;
    const src = isPlainObject(any) ? any : {};
    const out = { version: 1, settings: normSettings(src.settings, today), days: {}, runs: [], imports: [] };
    if (isPlainObject(src.days)) for (const [k, v] of Object.entries(src.days)) if (isISO(k)) out.days[k] = normDay(v, genId);
    if (Array.isArray(src.runs)) out.runs = src.runs.map((r) => normRun(r, genId)).filter(Boolean);
    if (Array.isArray(src.imports)) {
      out.imports = src.imports.filter(isPlainObject).slice(-50).map((x) => ({
        at: typeof x.at === "string" ? x.at : "", kind: ["health", "csv", "json"].includes(x.kind) ? x.kind : "csv",
        days: Math.max(0, Math.round(num(x.days, 0))),
        sources: Array.isArray(x.sources) ? x.sources.filter((s) => typeof s === "string").slice(0, 20) : [],
      }));
    }
    return out;
  }
  function validateImport(obj, today) {
    const fail = (error) => ({ ok: false, error });
    let raw = obj;
    if (isPlainObject(obj) && obj.app !== undefined) {
      if (obj.app !== "paso") return fail(`no es una copia de Paso (app: ${String(obj.app).slice(0, 20)})`);
      raw = obj.data;
    }
    if (!isPlainObject(raw)) return fail("no contiene un objeto de datos");
    if (!isPlainObject(raw.days)) return fail("falta 'days'");
    for (const [k, v] of Object.entries(raw.days)) {
      if (!isISO(k)) return fail(`fecha no válida en 'days': ${k.slice(0, 20)}`);
      if (!isPlainObject(v)) return fail(`el día ${k} no es un objeto`);
      if (v.meals !== undefined && !Array.isArray(v.meals)) return fail(`'meals' del ${k} no es una lista`);
    }
    if (!Array.isArray(raw.runs)) return fail("falta 'runs' (lista)");
    return { ok: true, data: migrate(raw, today) };
  }
  function parseImport(text, today) {
    let obj;
    try { obj = JSON.parse(String(text).replace(/^﻿/, "")); } catch { return { ok: false, error: "JSON no válido" }; }
    return validateImport(obj, today);
  }
  const exportBundle = (data, nowIso) => ({ app: "paso", version: 1, exportedAt: nowIso, data });

  // ───────────────────────── day mutations (mutate `data`, return the day)
  function dayOf(data, iso) { return (data && data.days && data.days[iso]) || emptyDay(); }
  function ensureDay(data, iso) { return (data.days[iso] ||= emptyDay()); }
  function pruneDay(data, iso) {
    const d = data.days[iso];
    if (d && !d.steps && !d.waterMl && !d.meals.length && d.dayType === null) delete data.days[iso];
  }
  function setSteps(data, iso, steps, source = "manual") {
    const d = ensureDay(data, iso);
    d.steps = clamp(Math.round(num(steps, 0)), 0, 200000);
    d.stepsSource = d.steps > 0 ? (STEP_SOURCES.includes(source) ? source : "manual") : null;
    pruneDay(data, iso);
    return dayOf(data, iso);
  }
  function addWater(data, iso, deltaMl) {
    const d = ensureDay(data, iso);
    d.waterMl = clamp(Math.round(d.waterMl + num(deltaMl, 0)), 0, 20000);
    pruneDay(data, iso);
    return dayOf(data, iso);
  }
  function setDayType(data, iso, type) {
    const d = ensureDay(data, iso);
    d.dayType = DAY_TYPES.includes(type) ? type : null;
    pruneDay(data, iso);
    return dayOf(data, iso);
  }
  function saveMeal(data, iso, meal, opts = {}) {
    const d = ensureDay(data, iso);
    const m = normMeal(meal, opts.id || defaultId);
    const i = d.meals.findIndex((x) => x.id === m.id);
    if (i >= 0) d.meals[i] = m; else d.meals.push(m);
    d.meals.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99") || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
    return m;
  }
  function deleteMeal(data, iso, id) {
    const d = data.days[iso];
    if (!d) return false;
    const n = d.meals.length;
    d.meals = d.meals.filter((m) => m.id !== id);
    pruneDay(data, iso);
    return n !== (data.days[iso] ? data.days[iso].meals.length : 0);
  }
  function addRun(data, run, opts = {}) {
    const r = normRun(run, opts.id || defaultId);
    if (!r) return null;
    data.runs.push(r);
    data.runs.sort((a, b) => a.date.localeCompare(b.date));
    return r;
  }
  function deleteRun(data, id) { const n = data.runs.length; data.runs = data.runs.filter((r) => r.id !== id); return n !== data.runs.length; }

  // ───────────────────────── steps
  const stepGoalOf = (s) => clamp(Math.round(num(s && s.stepGoal, 10000)), 1000, 50000);
  /** Stride (m) = override, or 0.415 × height (175 cm → 0.72625 m). */
  function strideM(s) {
    const o = num(s && s.strideM, null);
    if (o !== null && o > 0) return o;
    const h = clamp(num(s && s.heightCm, 175), 120, 230);
    return (h * 415) / 100000;
  }
  const kmFromSteps = (n, s) => (Math.max(0, num(n, 0)) * strideM(s)) / 1000;
  function stepsProgress(steps, s) {
    const goal = stepGoalOf(s), n = Math.max(0, Math.round(num(steps, 0)));
    const remaining = Math.max(0, goal - n);
    return { steps: n, goal, pct: Math.min(n / goal, 1), pctLabel: Math.round((n / goal) * 100), remaining,
      kmRemaining: kmFromSteps(remaining, s), met: n >= goal, surplus: Math.max(0, n - goal) };
  }
  function stepsLabel(p) {
    if (p.met) return p.surplus > 0 ? `¡Objetivo cumplido! +${fmtInt(p.surplus)} pasos` : "¡Objetivo cumplido!";
    return `Te faltan ${fmtInt(p.remaining)} · ${fmtDec(p.kmRemaining, 1)} km`;
  }
  const stepsOn = (data, iso) => (data && data.days && data.days[iso] ? data.days[iso].steps || 0 : 0);
  function avgSteps(data, dates) {
    const v = dates.map((d) => stepsOn(data, d)).filter((x) => x > 0);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  }
  /** Week Monday–Sunday around iso. avg = mean of days ≤ iso with steps; prevAvg = previous whole week. */
  function weekStats(data, iso) {
    const days = weekDays(iso).map((date) => ({ date, steps: stepsOn(data, date), isToday: date === iso, future: date > iso }));
    const past = days.filter((d) => !d.future);
    const avg = avgSteps(data, past.map((d) => d.date));
    const prevAvg = avgSteps(data, weekDays(addDays(weekStart(iso), -7)));
    const changePct = prevAvg && avg ? Math.round(((avg - prevAvg) / prevAvg) * 100) : null;
    const total = past.reduce((a, d) => a + d.steps, 0);
    return { days, avg, prevAvg, changePct, total };
  }
  /** Average steps per week for the `n` weeks ending with iso's week (oldest first). */
  function weeklyAverages(data, iso, n = 8) {
    const out = [];
    for (let k = n - 1; k >= 0; k--) {
      const ws = addDays(weekStart(iso), -7 * k);
      const dates = weekDays(ws).filter((d) => d <= iso);
      out.push({ weekStart: ws, avg: avgSteps(data, dates) });
    }
    return out;
  }

  // ───────────────────────── nutrition
  /** Veg target: fixed, or the guide's ramp (start → final, +1 puño every `weeksPerStep` weeks). */
  function vegTargetFor(s, iso) {
    const v = (s && s.veg) || DEFAULT_SETTINGS.veg;
    if (v.mode === "fija") return num(v.fixed, 4);
    const start = num(v.start, 2), fin = num(v.final, 4), w = Math.max(1, num(v.weeksPerStep, 2));
    if (!isISO(v.rampStart) || iso < v.rampStart) return start;
    return Math.min(fin, start + Math.floor(Math.floor(daysBetween(v.rampStart, iso) / 7) / w));
  }
  function targetsFor(s, dayType, iso) {
    const r = DAY_RANGES[dayType] || DAY_RANGES.descanso;
    return { steps: stepGoalOf(s), protein: num(s.proteinTarget, 5), veg: vegTargetFor(s, iso), waterMl: num(s.waterGoalMl, 3000),
      carbs: r.carbs.slice(), fat: r.fat.slice() };
  }
  function suggestDayType(iso, data, gymSessions) {
    const run = ((data && data.runs) || []).find((r) => r && r.date === iso && (r.type === "series" || r.type === "tirada"));
    if (run) return { type: "series", reason: run.type === "tirada" ? "tirada larga registrada" : "series registradas" };
    if ((gymSessions || []).some((g) => g && String(g.date).slice(0, 10) === iso)) return { type: "gimnasio", reason: "sesión en Gym Tracker" };
    return null;
  }
  const effectiveDayType = (day, suggestion, s) => (day && day.dayType) || (suggestion && suggestion.type) || (s && s.defaultDayType) || "descanso";
  function portions(day) {
    const out = { protein: 0, veg: 0, carbs: 0, fat: 0 };
    for (const m of (day && day.meals) || []) for (const k of PORTIONS) out[k] += num(m[k], 0);
    return out;
  }
  const mealsCount = (day) => new Set(((day && day.meals) || []).map((m) => m.slot).filter((s) => MAIN_SLOTS.includes(s))).size;
  /** First missing main slot that is already due (default time ≤ hm + 90'); else the first missing; all 4 → "extra". */
  function nextSlot(day, hm) {
    const present = new Set(((day && day.meals) || []).map((m) => m.slot));
    const missing = MAIN_SLOTS.filter((s) => !present.has(s));
    if (!missing.length) return "extra";
    const t = parseHM(hm);
    const due = t === null ? null : missing.find((s) => parseHM(SLOT_TIME[s]) <= t + 90);
    return due || missing[0];
  }
  function mealSavedText(slot, remaining, met) {
    const masc = slot === "desayuno" || slot === "extra";
    const saved = `${SLOT_LABEL[slot] || "Comida"} ${masc ? "guardado" : "guardada"}`;
    return met ? `${saved} · objetivo de pasos cumplido 🎉` : `${saved} · te quedan ${fmtInt(remaining)} pasos`;
  }
  const unit = (k, n) => (n === 1 ? PORTION_INFO[k].one : PORTION_INFO[k].many);
  /** What is still missing for the day (steps, protein, veg, water). */
  function pendingItems(day, s, iso) {
    const d = day || emptyDay(), p = portions(d), out = [];
    const sp = stepsProgress(d.steps, s);
    if (!sp.met) out.push({ key: "steps", text: `${fmtInt(sp.remaining)} pasos` });
    const prot = num(s.proteinTarget, 5) - p.protein;
    if (prot > 0) out.push({ key: "protein", text: `${fmtNum(prot)} ${unit("protein", prot)} de proteína` });
    const veg = vegTargetFor(s, iso) - p.veg;
    if (veg > 0) out.push({ key: "veg", text: `${fmtNum(veg)} ${unit("veg", veg)} de verdura` });
    const water = num(s.waterGoalMl, 3000) - d.waterMl;
    if (water > 0) out.push({ key: "water", text: `${fmtNum(water / 1000)} L de agua` });
    return out;
  }

  // ───────────────────────── score & history
  function dayScore(day, s, iso) {
    const d = day || emptyDay();
    const registered = d.steps > 0 || ((d.meals && d.meals.length) || 0) > 0 || d.waterMl > 0;
    const p = portions(d);
    const met = {
      steps: d.steps >= stepGoalOf(s),
      protein: p.protein >= num(s.proteinTarget, 5),
      veg: p.veg >= vegTargetFor(s, iso),
      water: d.waterMl >= num(s.waterGoalMl, 3000),
    };
    if (!registered) return { score: null, met, registered };
    const n = Object.values(met).filter(Boolean).length;
    return { score: n / 4, met, registered };
  }
  const isDayMet = (score, s) => score !== null && score >= num(s.dayMetThreshold, 0.75);
  function monthHeat(data, ym, today, s) {
    const { offset } = monthGrid(ym);
    const keys = ["steps", "protein", "veg", "water"], hits = { steps: 0, protein: 0, veg: 0, water: 0 };
    let metDays = 0, elapsedDays = 0;
    const cells = monthDates(ym).map((date) => {
      const future = date > today;
      if (future) return { date, score: null, level: "none", future: true, met: null, registered: false };
      elapsedDays++;
      const ds = dayScore(dayOf(data, date), s, date);
      if (isDayMet(ds.score, s)) metDays++;
      if (ds.registered) for (const k of keys) if (ds.met[k]) hits[k]++;
      return { date, score: ds.score, level: ds.score === null ? "none" : Math.round(ds.score * 4), future: false, met: ds.met, registered: ds.registered };
    });
    const perObjectivePct = {};
    for (const k of keys) perObjectivePct[k] = elapsedDays ? Math.round((hits[k] / elapsedDays) * 100) : 0;
    return { offset, cells, metDays, elapsedDays, perObjectivePct };
  }
  function weekMet(data, today, s) {
    const dates = weekDays(today).filter((d) => d <= today);
    const met = dates.filter((d) => isDayMet(dayScore(dayOf(data, d), s, d).score, s)).length;
    return { met, elapsed: dates.length, dates };
  }

  // ───────────────────────── recipes (16-nutricion/recetas.md) — groups: d desayuno, c comida/cena, t tentempié
  const RECIPES = [
    { id: 1, name: "Batido verde que no sabe a verde", minutes: 3, protein: 1.5, veg: 1, group: "d", hidden: "espinacas" },
    { id: 2, name: "Tortitas de avena y calabacín", minutes: 15, protein: 1.5, veg: 0.5, group: "d", hidden: "calabacín rallado" },
    { id: 3, name: "Revuelto de huevos con espinacas y queso", minutes: 8, protein: 1.5, veg: 1, group: "d", hidden: "espinacas picadas" },
    { id: 4, name: "Overnight oats de zanahoria", minutes: 5, protein: 1, veg: 0.5, group: "d", hidden: "zanahoria rallada" },
    { id: 5, name: "Boloñesa \"secreta\"", minutes: 30, protein: 2, veg: 2, group: "c", hidden: "zanahoria, calabacín y pimiento triturados" },
    { id: 6, name: "Albóndigas con verdura rallada", minutes: 35, protein: 2, veg: 1, group: "c", hidden: "calabacín y zanahoria" },
    { id: 7, name: "Pollo al curry con lentejas rojas", minutes: 25, protein: 2, veg: 1, group: "c", hidden: "pimiento y espinacas" },
    { id: 8, name: "Crema de calabaza y zanahoria con huevo y jamón", minutes: 25, protein: 1.5, veg: 2, group: "c", hidden: "calabaza y zanahoria" },
    { id: 9, name: "Pizza de base de tortilla", minutes: 15, protein: 2, veg: 1, group: "c", hidden: "pimiento asado triturado, champiñones" },
    { id: 10, name: "Arroz frito \"limpia-nevera\"", minutes: 15, protein: 2, veg: 1.5, group: "c", hidden: "guisantes, zanahoria, maíz" },
    { id: 11, name: "Hamburguesas caseras de pavo y brócoli", minutes: 25, protein: 2, veg: 1, group: "c", hidden: "brócoli muy picado" },
    { id: 12, name: "Lasaña rápida de calabacín y ricotta", minutes: 40, protein: 2, veg: 2, group: "c", hidden: "calabacín + boloñesa secreta" },
    { id: 13, name: "Wrap de pollo con hummus", minutes: 10, protein: 1.5, veg: 1, group: "c", hidden: "pimiento asado, lechuga, zanahoria" },
    { id: 14, name: "Merluza en papillote con verduras", minutes: 25, protein: 1.5, veg: 1.5, group: "c", hidden: "calabacín, cebolla, tomate" },
    { id: 15, name: "Garbanzos con espinacas y huevo", minutes: 15, protein: 1.5, veg: 1.5, group: "c", hidden: "espinacas" },
    { id: 16, name: "Mac & cheese con coliflor", minutes: 25, protein: 1.5, veg: 1, group: "c", hidden: "coliflor en la salsa" },
    { id: 17, name: "Salmón al horno con boniato y brócoli", minutes: 30, protein: 1.5, veg: 1, group: "c", hidden: "brócoli" },
    { id: 18, name: "Tortilla de patata \"con trampa\"", minutes: 30, protein: 1.5, veg: 1, group: "c", hidden: "calabacín y pimiento" },
    { id: 19, name: "Skyr con frutos rojos y semillas", minutes: 2, protein: 1, veg: 0, group: "t", hidden: "" },
    // Recipe 20: the source gives no 🥦 value; 0.5 is our estimate (pimiento, espinacas y cebolla in 2 muffins).
    { id: 20, name: "Muffins salados de huevo y verduras", minutes: 25, protein: 1, veg: 0.5, group: "t", hidden: "pimiento, espinacas, cebolla" },
  ];
  /** Modo India (Woxsen): typical dishes with orientative hand portions per serving (not from 16-nutricion). */
  const INDIA = [
    { id: 101, name: "Thali vegetariano (dal, sabzi, raita, 2 chapatis, arroz)", minutes: 0, protein: 1.5, veg: 1.5, carbs: 3, fat: 2, group: "c", hidden: "pide doble de sabzi (verdura)" },
    { id: 102, name: "Dal tadka con arroz", minutes: 0, protein: 1, veg: 0.5, carbs: 2, fat: 1, group: "c", hidden: "tomate y cebolla del dal" },
    { id: 103, name: "Chana masala con 2 chapatis", minutes: 0, protein: 1, veg: 1, carbs: 2, fat: 1, group: "c", hidden: "tomate, cebolla y espinacas si hay" },
    { id: 104, name: "Palak paneer con 1 chapati", minutes: 0, protein: 1.5, veg: 1.5, carbs: 1, fat: 2, group: "c", hidden: "espinacas (palak)" },
    { id: 105, name: "Pollo tandoori con kachumber", minutes: 0, protein: 2, veg: 1, carbs: 0, fat: 1, group: "c", hidden: "ensalada de pepino, tomate y cebolla" },
    { id: 106, name: "Egg bhurji con paratha", minutes: 0, protein: 1.5, veg: 0.5, carbs: 1, fat: 1, group: "d", hidden: "tomate, cebolla y pimiento" },
    { id: 107, name: "Upma o idli de verduras con sambar", minutes: 0, protein: 0.5, veg: 1, carbs: 2, fat: 1, group: "d", hidden: "verduras del sambar" },
    { id: 108, name: "Curd (yogur) o lassi salado con fruta", minutes: 0, protein: 1, veg: 0, carbs: 1, fat: 0, group: "t", hidden: "" },
  ];
  const RECIPE_GROUPS = { desayuno: ["d"], merienda: ["d", "t"], comida: ["c"], cena: ["c"], extra: ["c"] };
  /** Top-6 veg recipes for the slot, rotated by date (deterministic variety). */
  function suggestRecipes(slot, iso, n = 3) {
    const groups = RECIPE_GROUPS[slot] || RECIPE_GROUPS.comida;
    const top = RECIPES.filter((r) => groups.includes(r.group) && r.veg >= 0.5)
      .sort((a, b) => b.veg - a.veg || a.minutes - b.minutes || a.id - b.id).slice(0, 6);
    if (!top.length) return [];
    const start = ((daysBetween("2026-01-01", iso) % 6) + 6) % 6;
    const out = [];
    for (let k = 0; k < Math.min(n, top.length); k++) out.push(top[(start + k) % top.length]);
    return out;
  }

  // ───────────────────────── Apple Health export.xml — streaming step parser
  const STEP_TYPE = "HKQuantityTypeIdentifierStepCount";
  const STEP_TYPE_ATTR = `type="${STEP_TYPE}"`;
  const MAX_TAG = 1 << 20; // a Record tag is ~300 chars; guards malformed input against unbounded buffering
  const ENT = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
  function decodeXmlEntities(s) {
    return String(s).replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (m, e) => {
      if (e[0] !== "#") return ENT[e];
      const cp = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    });
  }
  function parseTagAttrs(tag) {
    const out = {}, re = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = re.exec(tag))) out[m[1]] = decodeXmlEntities(m[2]);
    return out;
  }
  /** Index of the first ">" outside a quoted attribute ("…" or '…'), or -1 if the tag is incomplete. */
  function findTagEnd(buf, s) {
    for (let j = s; j < buf.length; j++) {
      const c = buf.charCodeAt(j);
      if (c === 62) return j; // >
      if (c === 34 || c === 39) { // " or '
        const k = buf.indexOf(c === 34 ? "\"" : "'", j + 1);
        if (k < 0) return -1;
        j = k;
      }
    }
    return -1;
  }
  function createHealthStepParser() {
    let buf = "", records = 0, skipped = 0;
    const perDay = {};
    function handle(tag) {
      if (tag.indexOf(STEP_TYPE_ATTR) < 0) return;
      const a = parseTagAttrs(tag);
      if (a.type !== STEP_TYPE) return;
      const day = String(a.startDate || "").slice(0, 10); // local date as written, e.g. "2026-11-03 20:55:12 +0100"
      const v = a.value === undefined || a.value.trim() === "" ? NaN : Number(a.value);
      if (!isISO(day) || !Number.isFinite(v) || v < 0) { skipped++; return; }
      const src = (a.sourceName || "").trim() || "Origen desconocido";
      const bucket = (perDay[day] ||= {});
      bucket[src] = (bucket[src] || 0) + v;
      records++;
    }
    function push(text) {
      buf += text;
      let i = 0;
      for (;;) {
        const s = buf.indexOf("<Record", i);
        if (s < 0) { buf = buf.slice(Math.max(i, buf.length - 6)); return; }
        const e = findTagEnd(buf, s);
        if (e < 0 && buf.length - s <= MAX_TAG) { buf = buf.slice(s); return; }
        if (e < 0 || e - s > MAX_TAG) { // malformed giant tag: skip its opener and keep scanning
          if (buf.slice(s, s + 400).indexOf(STEP_TYPE_ATTR) >= 0) skipped++;
          i = s + 7;
          continue;
        }
        if (/\s/.test(buf.charAt(s + 7))) handle(buf.slice(s, e + 1));
        i = e + 1;
      }
    }
    function finish() {
      const sources = {};
      for (const bySrc of Object.values(perDay)) {
        for (const [src, v] of Object.entries(bySrc)) {
          const o = (sources[src] ||= { steps: 0, days: 0 });
          o.steps += v; o.days++;
        }
      }
      for (const o of Object.values(sources)) o.steps = Math.round(o.steps);
      return { perDay, records, skipped, sources };
    }
    return { push, finish };
  }
  /** Dedup iPhone + Watch: per day, the largest per-source sum among the included sources. */
  function aggregateHealth(perDay, included) {
    const inc = included ? (included instanceof Set ? included : new Set(included)) : null;
    const out = {};
    for (const day of Object.keys(perDay || {}).sort()) {
      let best = 0;
      for (const [src, v] of Object.entries(perDay[day])) if (!inc || inc.has(src)) best = Math.max(best, v);
      const r = Math.round(best);
      if (r > 0) out[day] = r;
    }
    return out;
  }

  // ───────────────────────── CSV (fecha,pasos)
  function parseCSVDate(raw) {
    const s = String(raw).trim().replace(/^"(.*)"$/, "$1").replace(/[ T]\d{1,2}:\d{2}(:\d{2})?.*$/, "");
    let m, y, mo, d;
    if ((m = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(s))) [y, mo, d] = [m[1], m[3], m[4]];
    else if ((m = /^(\d{1,2})([-/])(\d{1,2})\2(\d{4})$/.exec(s))) [d, mo, y] = [m[1], m[3], m[4]];
    else return null;
    const iso = `${y}-${pad2(Number(mo))}-${pad2(Number(d))}`;
    return isISO(iso) ? iso : null;
  }
  function parseStepsCSV(text) {
    const errors = [], byDate = new Map();
    let duplicates = 0, first = true;
    String(text || "").replace(/^﻿/, "").split(/\r?\n/).forEach((line, idx) => {
      const ln = idx + 1;
      if (!line.trim()) return;
      if (first) { first = false; if (!/^\s*"?\d/.test(line)) return; } // header: does not start with a digit
      const sep = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
      const f = line.split(sep).map((x) => x.trim().replace(/^"(.*)"$/, "$1").trim());
      if (f.length > 2 && f.slice(2).some((x) => x !== "")) { errors.push([ln, "columnas de más (¿separador de miles con coma?)"]); return; }
      const date = parseCSVDate(f[0] || "");
      if (!date) { errors.push([ln, `fecha no válida «${(f[0] || "").slice(0, 24)}»`]); return; }
      const digits = (f[1] || "").replace(/[\s.']/g, "");
      if (!/^\d+$/.test(digits)) { errors.push([ln, `pasos no válidos «${(f[1] || "").slice(0, 24)}»`]); return; }
      const steps = Number(digits);
      if (steps > 200000) { errors.push([ln, "demasiados pasos (máx. 200.000)"]); return; }
      if (byDate.has(date)) { duplicates++; byDate.set(date, Math.max(byDate.get(date), steps)); } else byDate.set(date, steps);
    });
    const rows = Array.from(byDate, ([date, steps]) => ({ date, steps })).sort((a, b) => a.date.localeCompare(b.date));
    return { rows, errors, duplicates };
  }
  /** Replace (never add) steps for each row. Manual days with steps are kept unless overwriteManual. Input untouched. */
  function mergeSteps(data, rows, source, opts = {}) {
    const out = JSON.parse(JSON.stringify(data || {}));
    if (!isPlainObject(out.days)) out.days = {};
    let added = 0, updated = 0, skipped = 0;
    for (const r of rows || []) {
      if (!r || !isISO(r.date)) { skipped++; continue; }
      const cur = out.days[r.date];
      if (cur && cur.stepsSource === "manual" && cur.steps > 0 && !opts.overwriteManual) { skipped++; continue; }
      const day = cur || (out.days[r.date] = emptyDay());
      if (cur && cur.steps > 0) updated++; else added++;
      day.steps = clamp(Math.round(num(r.steps, 0)), 0, 200000);
      day.stepsSource = day.steps > 0 ? source : null;
    }
    return { data: out, added, updated, skipped };
  }
  function importSummaryText(r) {
    const n = r.added + r.updated;
    return `Importados ${fmtInt(n)} ${n === 1 ? "día" : "días"} (${fmtInt(r.added)} nuevos, ${fmtInt(r.updated)} actualizados, ${fmtInt(r.skipped)} omitidos por ser manuales)`;
  }

  // ───────────────────────── foreign data (read-only, never throws)
  function safeParse(raw) {
    if (typeof raw !== "string" || !raw) return undefined;
    try { return JSON.parse(raw); } catch { return undefined; }
  }
  /** gymtracker.v1 → [{date, routine}] (dates are stored via toISOString: read as-is). */
  function readGym(raw) {
    const d = safeParse(raw);
    if (!isPlainObject(d) || !Array.isArray(d.sessions)) return [];
    return d.sessions.filter((s) => isPlainObject(s) && typeof s.date === "string" && isISO(s.date.slice(0, 10)))
      .map((s) => ({ date: s.date.slice(0, 10), routine: typeof s.routine === "string" ? s.routine : "" }));
  }
  /** habitos.v1 → {habits, months} or null when missing / invalid. */
  function readHabitsData(raw) {
    const d = safeParse(raw);
    if (!isPlainObject(d) || !isPlainObject(d.months)) return null;
    const habits = Array.isArray(d.habits) && d.habits.length && d.habits.every((h) => typeof h === "string") ? d.habits : HABITS_DEFAULT;
    return { habits, months: d.months };
  }
  function findHabit(habits, re) { const i = (habits || []).findIndex((h) => re.test(h)); return i < 0 ? null : i; }
  function isTicked(d, iso, h) {
    const m = d && isPlainObject(d.months) ? d.months[iso.slice(0, 7)] : null;
    if (!isPlainObject(m) || h === null || h === undefined) return false;
    const arr = m[String(h)];
    const day = Number(iso.slice(8, 10));
    return Array.isArray(arr) && arr.some((x) => Number(x) === day);
  }
  function ticksFor(d, h) {
    const out = {};
    for (const [ym, month] of Object.entries(d.months)) {
      if (!isYM(ym) || !isPlainObject(month) || !Array.isArray(month[String(h)])) continue;
      for (const x of month[String(h)]) {
        const n = Number(x);
        if (Number.isInteger(n) && n >= 1 && n <= daysInMonth(ym)) out[`${ym}-${pad2(n)}`] = true;
      }
    }
    return out;
  }
  function readHabitsSport(raw) {
    const d = readHabitsData(raw);
    if (!d) return null;
    const sportIdx = findHabit(d.habits, /deporte/i);
    return { sportIdx, ticksByDate: sportIdx === null ? {} : ticksFor(d, sportIdx), habitName: sportIdx === null ? null : d.habits[sportIdx], data: d };
  }
  /** Read-only nutrition habit status for a date: null (key missing/invalid) · {idx:null} (no such habit) · {idx, name, ticked}. */
  function readHabitsNutrition(raw, iso) {
    const d = readHabitsData(raw);
    if (!d) return null;
    const idx = findHabit(d.habits, /nutrici/i);
    return idx === null ? { idx: null, name: null, ticked: false } : { idx, name: d.habits[idx], ticked: isTicked(d, iso, idx) };
  }

  // ───────────────────────── sport sessions (shared rule with 26-ritmo, §4)
  /** n_d = max(habitTick ? 1 : 0, gym_d + runs_d, ritmoDone_d). `habits` is the parsed habitos.v1 object. */
  function sportByDay(dates, ctx = {}) {
    const { habits = null, sportIdx = null, gymSessions = [], runs = [], ritmoDone = null } = ctx;
    const byDay = {}, sources = { habit: false, gym: false, runs: false, ritmo: false };
    let total = 0;
    for (const d of dates) {
      const h = habits && sportIdx !== null && sportIdx !== undefined && isTicked(habits, d, sportIdx) ? 1 : 0;
      const g = (gymSessions || []).filter((s) => s && String(s.date).slice(0, 10) === d).length;
      const r = (runs || []).filter((x) => x && x.date === d).length;
      const t = ritmoDone && Number(ritmoDone[d]) > 0 ? Number(ritmoDone[d]) : 0;
      const n = Math.max(h, g + r, t);
      byDay[d] = n; total += n;
      if (h) sources.habit = true;
      if (g) sources.gym = true;
      if (r) sources.runs = true;
      if (t) sources.ritmo = true;
    }
    return { byDay, total, sources };
  }
  function floorStatus(total, iso, floor = 3, standard = 5) {
    const daysLeft = 8 - dow(iso);
    const need = Math.max(0, floor - total);
    const state = total >= standard ? "estandar" : total >= floor ? "suelo" : need >= daysLeft ? "riesgo" : "falta";
    return { state, need, daysLeft };
  }
  function floorText(f) {
    if (f.state === "estandar") return "Estándar cumplido 💪";
    if (f.state === "suelo") return "Suelo cumplido";
    if (f.state === "riesgo") return `⚠ Suelo en riesgo: quedan ${f.daysLeft} ${f.daysLeft === 1 ? "día" : "días"}`;
    return `Faltan ${f.need} para el suelo`;
  }
  /** Per-day detail lines for Actividad: [{date, n, items:[text]}] (days with something only). */
  function sportWeekLines(dates, ctx = {}) {
    const { habits = null, sportIdx = null, habitName = "Deporte", gymSessions = [], runs = [] } = ctx;
    const counts = sportByDay(dates, { habits, sportIdx, gymSessions, runs }).byDay;
    const plainHabit = String(habitName || "Deporte").replace(/^[^\p{L}]+/u, "") || "Deporte";
    const out = [];
    for (const d of dates) {
      const items = [];
      for (const g of gymSessions || []) if (g && String(g.date).slice(0, 10) === d) items.push(`Gimnasio · ${routineLabel(g.routine)}`);
      for (const r of runs || []) {
        if (!r || r.date !== d) continue;
        const bits = [RUN_SHORT[r.type] || "Carrera"];
        if (r.minutes) bits[0] += ` ${r.minutes}'`;
        if (r.km) bits.push(`${fmtNum(r.km, 2)} km`);
        items.push(bits.join(" · "));
      }
      if (habits && sportIdx !== null && isTicked(habits, d, sportIdx)) items.push(`Hábito ${plainHabit} ✓`);
      if (items.length) out.push({ date: d, n: counts[d], items });
    }
    return out;
  }

  // ───────────────────────── demo (seeded, relative to today)
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const DEMO_MEALS = {
    desayuno: [["Avena, yogur y fruta", 1, 0, 1, 1], ["Tostadas con huevos revueltos", 1.5, 0, 1, 1], ["Batido verde con skyr", 1.5, 1, 1, 1],
      ["Skyr con avena y plátano", 1, 0, 2, 0.5], ["Tostada con jamón y tomate", 1, 0, 1.5, 1], ["Tortitas de avena y calabacín", 1.5, 0.5, 1, 0.5]],
    comida: [["Pollo, arroz y verdura", 2, 1, 2, 1], ["Lentejas estofadas", 1.5, 0.5, 2, 1], ["Macarrones con atún y tomate", 1.5, 0, 2, 1],
      ["Arroz a la cubana con huevo", 1.5, 0, 2.5, 1.5], ["Bocadillo de tortilla", 1.5, 0, 2, 1.5], ["Merluza con patata y judías", 1.5, 1, 1.5, 1]],
    merienda: [["Tostada y café", 0, 0, 1, 1], ["Skyr con frutos rojos", 1, 0, 0.5, 0.5], ["Plátano y frutos secos", 0, 0, 1, 1.5], ["Bocadillo de pavo", 1, 0, 1.5, 0.5]],
    cena: [["Tortilla francesa y ensalada", 1.5, 1, 0.5, 1.5], ["Salmón con boniato", 1.5, 0.5, 1.5, 1.5], ["Hamburguesa de pavo con pan", 2, 0, 1, 1],
      ["Pizza casera", 1.5, 0.5, 2, 2], ["Huevos con patatas", 1.5, 0, 2, 2], ["Sándwich de jamón y queso", 1, 0, 1.5, 1.5]],
  };
  /** Veg-rich choices (recipes from 16-nutricion) used on the demo's "good" days. */
  const DEMO_VEG = {
    comida: [["Pasta con boloñesa secreta", 2, 2, 2, 1], ["Arroz frito limpia-nevera", 2, 1.5, 2, 1]],
    cena: [["Merluza en papillote con verduras", 1.5, 1.5, 1, 1], ["Tortilla francesa y ensalada", 1.5, 1, 0.5, 1.5]],
  };
  const DEMO_TIMES = { desayuno: [470, 510], comida: [840, 885], merienda: [1035, 1080], cena: [1260, 1305] };
  function demoData(today) {
    const rnd = mulberry32(42);
    let seq = 0;
    const id = (p) => `${p}_demo${(seq++).toString(36)}`;
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const data = emptyState(today);
    data.settings.veg.rampStart = addDays(today, -20);
    const ws = weekStart(today), prevWs = addDays(ws, -7);
    const PREV_WEEK = [7900, 9300, 8100, 10200, 8800, 6400, 9500]; // mean 8.600 → this week's chip shows ↑
    const THIS_WEEK = [9450, 9580]; // Mon, Tue (+ today 8.420 → mean 9.150)
    const meal = (slot, row, minute) => ({ id: id("m"), slot, time: fmtHM(minute), desc: row[0], protein: row[1], veg: row[2], carbs: row[3], fat: row[4] });
    for (let k = 45; k >= 1; k--) {
      const date = addDays(today, -k);
      const q = rnd(); // how "good" the day was: correlates the four objectives so the heat map has contrast
      let steps = Math.round((5000 + 8000 * (0.6 * q + 0.4 * rnd())) / 10) * 10;
      if (date >= prevWs && date < ws) steps = PREV_WEEK[dow(date) - 1];
      if (date >= ws && THIS_WEEK[dow(date) - 1]) steps = THIS_WEEK[dow(date) - 1];
      const thisWeek = date >= ws, good = thisWeek || q > 0.55;
      const meals = [];
      for (const slot of MAIN_SLOTS) {
        if (slot === "merienda" && !good && rnd() < 0.5) continue;
        const pool = DEMO_MEALS[slot];
        const vegRich = () => DEMO_VEG[slot][thisWeek ? 0 : Math.floor(rnd() * 2)];
        let row = pick(pool);
        if (slot === "merienda" && good) row = pool[1]; // skyr: +1 palm of protein
        if (slot === "desayuno" && thisWeek) row = pool[2];
        if (slot === "comida" && (thisWeek || (good && rnd() < 0.2))) row = vegRich();
        if (slot === "cena" && thisWeek) row = vegRich();
        const [a, b] = DEMO_TIMES[slot];
        meals.push(meal(slot, row, a + Math.round((rnd() * (b - a)) / 5) * 5));
      }
      const water = Math.min(3200, 1500 + 250 * Math.floor((0.6 * q + 0.4 * rnd()) * 8));
      data.days[date] = { steps, stepsSource: "demo", waterMl: thisWeek || (good && rnd() < 0.85) || rnd() < 0.2 ? Math.max(water, 3000) : water, dayType: null, meals };
      // two runs a week: series on Tuesday, long run on Sunday (an easy jog some Thursdays)
      const w = dow(date);
      if (w === 2) data.runs.push({ id: id("r"), date, type: "series", minutes: 40, km: date >= ws ? 6.2 : round2(5.8 + rnd() * 1.2), notes: "" });
      if (w === 7) data.runs.push({ id: id("r"), date, type: "tirada", minutes: 70 + Math.round(rnd() * 4) * 5, km: round2(11 + rnd() * 4), notes: "" });
      if (w === 4 && rnd() < 0.3) data.runs.push({ id: id("r"), date, type: "trote", minutes: 20, km: 3.2, notes: "" });
    }
    data.days[today] = {
      steps: 8420, stepsSource: "demo", waterMl: 1500, dayType: null,
      meals: [
        { id: id("m"), slot: "desayuno", time: "08:10", desc: "Avena, yogur y fruta", protein: 1, veg: 0, carbs: 1, fat: 1 },
        { id: id("m"), slot: "comida", time: "14:00", desc: "Pollo, arroz y verdura", protein: 2, veg: 1, carbs: 2, fat: 1 },
        { id: id("m"), slot: "merienda", time: "17:30", desc: "Tostada y café", protein: 0, veg: 0, carbs: 1, fat: 1 },
      ],
    };
    data.runs.sort((a, b) => a.date.localeCompare(b.date));
    return data;
  }

  const api = {
    // utils & dates
    isPlainObject, num, clamp, todayISO, nowHM, isISO, isYM, addDays, daysBetween, dow, weekStart, weekDays, monthGrid, monthDates,
    daysInMonth, addMonths, parseHM, fmtHM, ceil15,
    // format
    fmtInt, fmtDec, fmtNum, fmtDur, titleParts, fmtDayMonth, fmtShortDay, fmtDateShort, fmtWeekRange, monthName,
    DAY_NAMES, DAY_SHORT, DAY_LETTERS, MONTHS, MONTHS_SHORT,
    // value sets
    SLOTS, MAIN_SLOTS, SLOT_LABEL, SLOT_COLOR, SLOT_TIME, SLOT_FOR, PORTIONS, PORTION_INFO, STEP_SOURCES, STEP_SOURCE_LABEL,
    DAY_TYPES, DAY_TYPE_LABEL, DAY_TYPE_SHORT, DAY_RANGES, RUN_TYPES, RUN_LABEL, RUN_SHORT, GYM_ROUTINES, routineLabel, HABITS_DEFAULT,
    // state
    DEFAULT_SETTINGS, emptyDay, emptyState, normSettings, normMeal, normDay, normRun, migrate, validateImport, parseImport, exportBundle,
    dayOf, setSteps, addWater, setDayType, saveMeal, deleteMeal, addRun, deleteRun,
    // steps
    stepGoalOf, strideM, kmFromSteps, stepsProgress, stepsLabel, weekStats, weeklyAverages,
    // nutrition
    vegTargetFor, targetsFor, suggestDayType, effectiveDayType, portions, mealsCount, nextSlot, mealSavedText, pendingItems,
    // history
    dayScore, isDayMet, monthHeat, weekMet,
    // recipes
    RECIPES, INDIA, suggestRecipes,
    // imports
    decodeXmlEntities, parseTagAttrs, findTagEnd, createHealthStepParser, aggregateHealth, parseCSVDate, parseStepsCSV, mergeSteps, importSummaryText,
    // foreign
    readGym, readHabitsData, readHabitsSport, readHabitsNutrition, findHabit, isTicked, sportByDay, floorStatus, floorText, sportWeekLines,
    // demo
    mulberry32, demoData,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PasoLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
