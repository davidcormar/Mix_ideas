/* Panel de vida — pure logic (browser: window.PanelLogic · Node: module.exports).
   No DOM, no hidden clock: every function that needs "today" receives it.
   Own storage key: "panel.v1". Other apps' keys are only read (see app.js). */
(function (root) {
  "use strict";
  const KEY = "panel.v1";
  const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  // round trip: V8 turns "2027-02-30" into 2 March instead of rejecting it
  const isISO = (s) => { if (typeof s !== "string" || !ISO_RE.test(s)) return false; const [y, m, d] = s.split("-").map(Number), t = new Date(y, m - 1, d, 12); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d; };
  const isHM = (s) => typeof s === "string" && HM_RE.test(s);
  const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  const pad2 = (n) => String(n).padStart(2, "0");
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const num = (x, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ───────────── dates (local, never toISOString)
  const todayISO = (now = new Date()) => `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const parseISO = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return todayISO(d); };
  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
  const dow = (iso) => ((parseISO(iso).getDay() + 6) % 7) + 1; // 1 = lunes … 7 = domingo
  const weekStart = (iso) => addDays(iso, 1 - dow(iso));
  const weekDays = (iso) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(iso), i));
  const range = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; };
  /** ISO-8601 week label, e.g. "2026-W45". */
  function isoWeek(iso) {
    const thu = addDays(weekStart(iso), 3), y = Number(thu.slice(0, 4));
    return `${y}-W${pad2(Math.floor(daysBetween(`${y}-01-01`, thu) / 7) + 1)}`;
  }
  const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const fmtDay = (iso) => `${Number(iso.slice(8))} de ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
  const fmtLong = (iso) => { const d = DAYS[dow(iso) - 1]; return `${d[0].toUpperCase()}${d.slice(1)}, ${fmtDay(iso)}`; };
  const fmtInt = (n) => { const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (n < 0 ? "−" : "") + s; };
  const fmtDec = (n, k = 1) => (Number.isFinite(n) ? n.toFixed(k).replace(".", ",") : "—");
  /** Rounds first, so 479.6 min is "8 h 00" and never "7 h 60". */
  const fmtHours = (min) => { if (min == null || !Number.isFinite(min)) return "—"; const m = Math.round(min); return `${Math.floor(m / 60)} h ${pad2(m % 60)}`; };
  const hm2min = (s) => (isHM(s) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3)) : null);
  const min2hm = (x) => { const m = ((Math.round(x) % 1440) + 1440) % 1440; return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; };
  /** Local "AAAA-MM-DD HH:MM" for a Date you pass in (never toISOString, which is UTC). */
  const stamp = (d) => `${todayISO(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  /** A real number (number or numeric string); booleans, null, "", [] and {} are not. */
  const numLike = (x) => (typeof x === "number" || (typeof x === "string" && x.trim() !== "")) && Number.isFinite(Number(x));

  // ───────────── state
  const DEFAULT_SETTINGS = { name: "David", sleepGoalMin: 480, bedTarget: "23:30", screenGoalMin: 60, pagesWeekGoal: 100, learnWeekGoalMin: 180 };
  /** Same limits as the Ajustes form; a huge or absurd number in a file is clamped, never shown as "Infinity". */
  const SETTING_RANGE = { sleepGoalMin: [300, 660], screenGoalMin: [5, 600], pagesWeekGoal: [5, 2000], learnWeekGoalMin: [10, 3000] };
  const AREAS = { cuerpo: "Cuerpo", idiomas: "Idiomas", tecnico: "Técnico", finanzas: "Finanzas", aprendizaje: "Aprendizaje", vida: "Vida" };
  const AUTO = {
    frHours: "Horas de francés (app Idiomas)",
    booksDone: "Libros terminados (desde «Desde»)",
    sportYear: "Sesiones de deporte (desde «Desde»)",
    habitsMean: "Media de hábitos del mes",
  };
  const emptyState = () => ({ version: 1, settings: { ...DEFAULT_SETTINGS, countdowns: COUNTDOWNS.map((c) => ({ ...c })) }, days: {}, books: [], readLog: [], goals: [], reviews: {} });

  /** Accepts anything; returns a valid state (drops what it cannot understand). */
  function migrate(any) {
    const s = emptyState();
    if (!isObj(any)) return s;
    if (isObj(any.settings)) for (const k of Object.keys(DEFAULT_SETTINGS)) {
      const v = any.settings[k];
      if (SETTING_RANGE[k] && numLike(v) && Number(v) > 0) s.settings[k] = Math.round(clamp(Number(v), ...SETTING_RANGE[k]));
      if (k === "bedTarget" && isHM(v)) s.settings[k] = v;
      if (k === "name" && typeof v === "string") s.settings[k] = v.slice(0, 40);
    }
    if (isObj(any.settings) && Array.isArray(any.settings.countdowns))
      s.settings.countdowns = any.settings.countdowns.filter((c) => isObj(c) && isISO(c.date) && typeof c.label === "string" && c.label.trim()).slice(0, 8).map((c) => ({ date: c.date, label: c.label.trim().slice(0, 40) }));
    if (isObj(any.days)) for (const [d, v] of Object.entries(any.days)) { if (isISO(d) && isObj(v)) { const e = normDay(v); if (e) s.days[d] = e; } }
    if (Array.isArray(any.books)) s.books = any.books.filter((b) => isObj(b) && typeof b.title === "string" && b.title.trim()).map(normBook);
    const ids = new Set(s.books.map((b) => b.id));
    if (Array.isArray(any.readLog)) s.readLog = any.readLog.filter((r) => isObj(r) && isISO(r.date) && ids.has(r.bookId))
      .map((r) => ({ date: r.date, bookId: r.bookId, amount: clamp(Math.round(num(r.amount)), 0, 100000), minutes: clamp(Math.round(num(r.minutes)), 0, 1440) }));
    if (Array.isArray(any.goals)) s.goals = any.goals.filter((g) => isObj(g) && typeof g.title === "string" && g.title.trim()).map(normGoal);
    if (isObj(any.reviews)) for (const [w, v] of Object.entries(any.reviews)) if (/^\d{4}-W\d{2}$/.test(w) && isObj(v)) s.reviews[w] = normReview(v);
    if (any.demo === true) {
      s.demo = true;
      // what the Panel held before loading the examples; «Quitar datos de ejemplo» brings it back
      if (isObj(any.before) && any.before.demo !== true) s.before = migrate(any.before);
    }
    return s;
  }
  function normDay(v) {
    const e = {};
    if (isHM(v.bed)) e.bed = v.bed;
    if (isHM(v.wake)) e.wake = v.wake;
    if (numLike(v.energy) && Number(v.energy) >= 1 && Number(v.energy) <= 5) e.energy = Math.round(Number(v.energy));
    if (numLike(v.screenMin) && Number(v.screenMin) >= 0) e.screenMin = Math.min(1440, Math.round(Number(v.screenMin)));
    if (typeof v.noSocialAM === "boolean") e.noSocialAM = v.noSocialAM;
    if (isObj(v.journal)) {
      const j = {};
      for (const k of ["good", "better", "grateful"]) if (typeof v.journal[k] === "string" && v.journal[k].trim()) j[k] = v.journal[k].slice(0, 500);
      if (Object.keys(j).length) e.journal = j;
    }
    return Object.keys(e).length ? e : null;
  }
  const makeId = (p) => p + Math.random().toString(36).slice(2, 9);
  function normBook(b) {
    const kind = ["libro", "curso"].includes(b.kind) ? b.kind : "libro";
    const total = clamp(Math.round(num(b.total, 1)), 1, 100000);
    return { id: typeof b.id === "string" && b.id ? b.id : makeId("b"), title: b.title.trim().slice(0, 120), author: String(b.author || "").slice(0, 80), kind,
      unit: kind === "curso" ? "lecciones" : "páginas", total, progress: clamp(Math.round(num(b.progress)), 0, total),
      status: ["leyendo", "pendiente", "terminado"].includes(b.status) ? b.status : "leyendo", finished: isISO(b.finished) ? b.finished : null };
  }
  function normGoal(g) {
    const kind = g.kind === "hito" ? "hito" : "numero";
    const steps = Array.isArray(g.steps) ? g.steps.filter((x) => isObj(x) && typeof x.text === "string" && x.text.trim()).map((x) => ({ text: x.text.slice(0, 120), done: !!x.done })) : [];
    return { id: typeof g.id === "string" && g.id ? g.id : makeId("g"), title: g.title.trim().slice(0, 120), area: AREAS[g.area] ? g.area : "vida", kind,
      start: isISO(g.start) ? g.start : null, deadline: isISO(g.deadline) ? g.deadline : null,
      target: clamp(num(g.target), 0, 1e9), current: clamp(num(g.current), 0, 1e9), unit: String(g.unit || "").slice(0, 20),
      auto: AUTO[g.auto] ? g.auto : null, steps, done: !!g.done };
  }
  function normReview(v) {
    const arr = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map((x) => String(x ?? "").slice(0, 300));
    return { at: typeof v.at === "string" ? v.at.slice(0, 25) : "", wins: arr(v.wins, 3), lesson: String(v.lesson || "").slice(0, 500), priorities: arr(v.priorities, 3),
      score: Number(v.score) >= 1 && Number(v.score) <= 10 ? Math.round(Number(v.score)) : null, snapshot: isObj(v.snapshot) ? v.snapshot : {} };
  }
  /** Update one day's entry; empty values delete the field, an empty day is removed. Returns a new state. */
  function setDay(state, iso, patch) {
    const s = { ...state, days: { ...state.days } };
    const cur = { ...(s.days[iso] || {}) };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") delete cur[k];
      else if (k === "journal") { const j = { ...(cur.journal || {}), ...v }; for (const x of Object.keys(j)) if (!String(j[x] || "").trim()) delete j[x]; if (Object.keys(j).length) cur.journal = j; else delete cur.journal; }
      else cur[k] = v;
    }
    const e = normDay(cur);
    if (e) s.days[iso] = e; else delete s.days[iso];
    return s;
  }

  // ───────────── sleep & energy
  /** Night that ends on the morning of `iso`: minutes between bed (evening before or after midnight) and wake. */
  function sleepMinutes(e) {
    if (!e) return null;
    const b = hm2min(e.bed), w = hm2min(e.wake);
    if (b === null || w === null) return null;
    let m = w - b; if (m <= 0) m += 1440;
    return m > 16 * 60 ? null : m;
  }
  /** Bedtime as minutes from noon so that 23:30 and 00:30 are close (690 and 750). */
  const bedFromNoon = (hm) => { const m = hm2min(hm); return m === null ? null : (m - 720 + 1440) % 1440; };
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const sd = (a) => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
  function sleepStats(state, dates) {
    const goal = state.settings.sleepGoalMin, rows = dates.map((d) => ({ d, e: state.days[d] || null }));
    const mins = rows.map((r) => sleepMinutes(r.e)).filter((x) => x !== null);
    const beds = rows.map((r) => (r.e ? bedFromNoon(r.e.bed) : null)).filter((x) => x !== null);
    const energy = rows.map((r) => (r.e && r.e.energy ? r.e.energy : null)).filter((x) => x !== null);
    const debt = mins.reduce((a, m) => a + Math.max(0, goal - m), 0);
    // energy split by nights ≥ goal−60 vs shorter (only if both groups have ≥ 2 nights)
    const split = { long: [], short: [] };
    for (const r of rows) { const m = sleepMinutes(r.e); if (m !== null && r.e.energy) (m >= goal - 60 ? split.long : split.short).push(r.e.energy); }
    const contrast = split.long.length >= 2 && split.short.length >= 2 ? { long: mean(split.long), short: mean(split.short), cut: goal - 60 } : null;
    const bedMean = mean(beds);
    return { nights: mins.length, avgMin: mean(mins), debtMin: debt, onGoal: mins.filter((m) => m >= goal).length,
      bedAvg: bedMean === null ? null : min2hm(bedMean + 720), bedSdMin: sd(beds), energyAvg: mean(energy), energyN: energy.length, contrast };
  }

  // ───────────── screen time (habit "📵 Móvil: 0 redes <14:00, máx 1 h")
  function screenStats(state, dates) {
    const goal = state.settings.screenGoalMin;
    const v = dates.map((d) => state.days[d]).filter((e) => e && e.screenMin !== undefined).map((e) => e.screenMin);
    const am = dates.map((d) => state.days[d]).filter((e) => e && typeof e.noSocialAM === "boolean");
    return { n: v.length, avg: mean(v), onGoal: v.filter((m) => m <= goal).length, max: v.length ? Math.max(...v) : null,
      noSocialAM: am.filter((e) => e.noSocialAM).length, noSocialN: am.length };
  }
  const pctChange = (now, before) => (now == null || before == null || before === 0 ? null : Math.round(((now - before) / before) * 100));

  // ───────────── journal
  const journalDone = (e) => !!(e && e.journal && Object.keys(e.journal).length);
  function journalStreak(state, today) {
    let d = journalDone(state.days[today]) ? today : addDays(today, -1), n = 0;
    while (journalDone(state.days[d])) { n++; d = addDays(d, -1); }
    return n;
  }

  // ───────────── reading & learning
  /** Log progress on a book: sets new absolute progress, records the delta in readLog. */
  function logReading(state, bookId, newProgress, minutes, iso) {
    const s = { ...state, books: state.books.map((b) => ({ ...b })), readLog: state.readLog.slice() };
    const b = s.books.find((x) => x.id === bookId);
    if (!b) return state;
    const p = clamp(Math.round(num(newProgress, b.progress)), 0, b.total), delta = p - b.progress;
    const mins = clamp(Math.round(num(minutes)), 0, 1440);
    if (delta === 0 && !(mins > 0)) return state;
    b.progress = p;
    if (p >= b.total && b.status !== "terminado") { b.status = "terminado"; b.finished = iso; }
    if (p < b.total && b.status === "terminado") { b.status = "leyendo"; b.finished = null; }
    if (delta < 0) {
      // going back (a typo such as 300 instead of 30): take the pages back from the newest entries of this book,
      // so the week's pages, the reading light and the ETA do not keep phantom pages
      let left = -delta;
      for (let i = s.readLog.length - 1; i >= 0 && left > 0; i--) {
        const r = s.readLog[i];
        if (r.bookId !== bookId || !(r.amount > 0)) continue;
        const take = Math.min(r.amount, left);
        s.readLog[i] = { ...r, amount: r.amount - take }; left -= take;
      }
      s.readLog = s.readLog.filter((r) => r.amount > 0 || r.minutes > 0);
    }
    if (delta > 0 || mins > 0) s.readLog.push({ date: iso, bookId, amount: Math.max(0, delta), minutes: mins });
    return s;
  }
  function readingStats(state, dates) {
    const set = new Set(dates), kind = (id) => (state.books.find((b) => b.id === id) || {}).kind;
    let pages = 0, lessons = 0, minutes = 0, learnMin = 0;
    for (const r of state.readLog) if (set.has(r.date)) {
      if (kind(r.bookId) === "curso") { lessons += r.amount; learnMin += r.minutes; } else pages += r.amount;
      minutes += r.minutes;
    }
    return { pages, lessons, minutes, learnMin };
  }
  /** Days left to finish a book at the pace of the last 14 days, or since its first entry if it is newer
      (at least 7 days, so one good day does not promise the moon). null if there is no pace. */
  function bookEta(state, bookId, today) {
    const b = state.books.find((x) => x.id === bookId);
    if (!b || b.status === "terminado") return null;
    const from = addDays(today, -13), logs = state.readLog.filter((r) => r.bookId === bookId && r.date <= today && r.amount > 0);
    const done = logs.filter((r) => r.date >= from).reduce((a, r) => a + r.amount, 0);
    if (done <= 0) return null;
    const first = logs.reduce((m, r) => (r.date < m ? r.date : m), today);
    const span = clamp(daysBetween(first, today) + 1, 7, 14);
    const perDay = done / span, left = b.total - b.progress;
    return { perDay, days: Math.ceil(left / perDay), date: addDays(today, Math.ceil(left / perDay)) };
  }

  // ───────────── goals
  /** ext = { frHours, booksDone, sportYear, habitsMean } computed by the app from other apps. */
  function goalProgress(g, today, ext = {}) {
    let pct, current = g.current, label;
    if (g.kind === "hito") {
      const n = g.steps.length, k = g.steps.filter((x) => x.done).length;
      pct = g.done ? 1 : n ? k / n : 0;
      label = g.done ? "Hecho" : n ? `${k}/${n} pasos` : "Sin pasos";
    } else {
      if (g.auto && ext[g.auto] != null) current = ext[g.auto];
      pct = g.target > 0 ? clamp(current / g.target, 0, 1) : 0;
      label = `${fmtDec(current, Number.isInteger(current) ? 0 : 1)} / ${fmtDec(g.target, Number.isInteger(g.target) ? 0 : 1)}${g.unit ? " " + g.unit : ""}`;
    }
    let expected = null, status = "sin-fecha", daysLeft = null;
    if (g.deadline) {
      daysLeft = daysBetween(today, g.deadline);
      if (g.start && g.start < g.deadline) expected = clamp(daysBetween(g.start, today) / daysBetween(g.start, g.deadline), 0, 1);
      if (pct >= 1) status = "hecho";
      else if (daysLeft < 0) status = "vencida";
      else if (expected === null) status = "en-curso";
      else status = pct >= expected - 0.1 ? "en-ritmo" : "atrasada";
    } else if (pct >= 1) status = "hecho";
    return { pct, current, label, expected, status, daysLeft };
  }
  const STATUS_LABEL = { hecho: "Hecho", vencida: "Vencida", "en-ritmo": "En ritmo", atrasada: "Atrasada", "en-curso": "En curso", "sin-fecha": "Sin fecha" };

  const FR_B2_DATE = "2027-06-05"; // DELF B2, same date as 21-idiomas-plan (LANGS.fr.deadline)
  const WOXSEN_DATE = "2027-01-06";
  /** Starter goals taken from David's visions (all editable/deletable). Fixed dates stay fixed whatever year you start;
      a goal whose date has passed is left out, and "end of year" moves to next year in the last 4 weeks. */
  function starterGoals(today) {
    const y = Number(today.slice(0, 4)), endY = today > `${y}-12-03` ? y + 1 : y;
    return [
      { title: "5 km en menos de 26:00", area: "cuerpo", kind: "hito", start: today, deadline: `${endY}-12-28`, steps: [{ text: "Test de 3 km para recalibrar ritmos" }, { text: "8 semanas del plan de 02-running-tools" }, { text: "Carrera o contrarreloj < 26:00" }] },
      { title: `No bajar del suelo: 3 sesiones por semana hasta fin de ${endY}`, area: "cuerpo", kind: "numero", target: 3 * Math.ceil((daysBetween(today, `${endY}-12-31`) + 1) / 7), unit: "sesiones", auto: "sportYear", start: today, deadline: `${endY}-12-31` },
      today < FR_B2_DATE && { title: "Horas de francés hacia el B2", area: "idiomas", kind: "numero", target: 600, unit: "h", auto: "frHours", start: today, deadline: FR_B2_DATE },
      { title: "Media de hábitos ≥ 7,5 este mes", area: "vida", kind: "numero", target: 7.5, unit: "/10", auto: "habitsMean" },
      { title: "Leer 12 libros en un año", area: "aprendizaje", kind: "numero", target: 12, unit: "libros", auto: "booksDone", start: today, deadline: addDays(today, 365) },
      today < WOXSEN_DATE && { title: "Preparar Woxsen (India)", area: "vida", kind: "hito", start: today, deadline: WOXSEN_DATE, steps: [{ text: "Visado de estudiante" }, { text: "Vacunas (consulta en Sanidad Exterior)" }, { text: "Dinero, tarjeta y SIM" }, { text: "Maleta y documentos" }] },
    ].filter(Boolean).map(normGoal);
  }

  // ───────────── countdowns
  const COUNTDOWNS = [
    { date: "2027-01-06", label: "Woxsen (India)" },
    { date: "2027-10-17", label: "Media maratón" },
    { date: "2028-01-10", label: "Prácticas (ene 2028, aprox.)" },
    { date: "2032-09-01", label: "Ironman (2032, aprox.)" },
  ];
  /** settingsOrList: state.settings (uses .countdowns) or a list. Past dates are hidden; sorted by date. */
  const countdowns = (today, src = COUNTDOWNS) => (Array.isArray(src) ? src : src && Array.isArray(src.countdowns) ? src.countdowns : COUNTDOWNS)
    .map((c) => ({ ...c, days: daysBetween(today, c.date) })).filter((c) => c.days >= 0).sort((a, b) => a.days - b.days);
  /** "2027-01-06 Woxsen (India)" per line → [{date,label}] (max 8). Returns { list, errors:[lineNo] }. */
  function parseCountdowns(text) {
    const list = [], errors = [];
    String(text || "").split(/\r?\n/).forEach((line, i) => {
      const s = line.trim(); if (!s) return;
      const m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
      if (m && isISO(m[1])) list.push({ date: m[1], label: m[2].trim().slice(0, 40) }); else errors.push(i + 1);
    });
    return { list: list.slice(0, 8), errors };
  }
  const countdownsText = (list) => list.map((c) => `${c.date} ${c.label}`).join("\n");

  // ───────────── trends (weekly averages, oldest first)
  function trend(state, today, weeks = 8) {
    const out = [];
    for (let k = weeks - 1; k >= 0; k--) {
      const ws = addDays(weekStart(today), -7 * k), days = weekDays(ws).filter((d) => d <= today);
      const sl = sleepStats(state, days), sc = screenStats(state, days);
      out.push({ week: isoWeek(ws), from: ws, sleepAvgMin: sl.avgMin, energyAvg: sl.energyAvg, screenAvg: sc.avg, current: k === 0 });
    }
    return out;
  }

  // ───────────── weekly review
  /** Week the «Semana» screen opens on: on a Monday (also at 00:30, after a late Sunday) with last week not reviewed
      and this one not started, last week — a week of 1 day is not worth reviewing. Otherwise today. */
  function reviewDefault(state, today) {
    const prev = addDays(today, -7);
    return dow(today) === 1 && !state.reviews[isoWeek(today)] && !state.reviews[isoWeek(prev)] ? prev : today;
  }
  /** Snapshot numbers for the week of `iso` (Mon–Sun, capped at today). ext comes from other apps. */
  function weekSnapshot(state, iso, today, ext = {}) {
    const days = weekDays(iso).filter((d) => d <= today);
    const sl = sleepStats(state, days), sc = screenStats(state, days), rd = readingStats(state, days);
    return {
      week: isoWeek(iso), from: days[0] || weekStart(iso), to: days.at(-1) || weekStart(iso), days: days.length,
      sleepAvgMin: sl.avgMin, energyAvg: sl.energyAvg, screenAvg: sc.avg, journalDays: days.filter((d) => journalDone(state.days[d])).length,
      pages: rd.pages, lessons: rd.lessons, learnMin: rd.learnMin,
      ...ext,
    };
  }
  /** Traffic light per area: "ok" | "meh" | "bad" | null (no data). */
  function lights(snap, settings) {
    const L = {};
    const t = (v, good, meh, higherBetter = true) => (v == null ? null : higherBetter ? (v >= good ? "ok" : v >= meh ? "meh" : "bad") : v <= good ? "ok" : v <= meh ? "meh" : "bad");
    L.sueno = t(snap.sleepAvgMin, settings.sleepGoalMin - 15, settings.sleepGoalMin - 60);
    L.movil = t(snap.screenAvg, settings.screenGoalMin, settings.screenGoalMin * 1.5, false);
    // weekly totals: a week still in progress is judged on the days already finished (today still counts as open),
    // so Monday is not red for 0 sessions or 0 pages
    const part = snap.days >= 7 ? 1 : Math.max(0, (snap.days || 0) - 1) / 7;
    L.deporte = t(snap.sport, 5 * part, 3 * part);
    L.habitos = t(snap.habitsMean, 7.5, 6);
    L.frances = snap.frOwed == null ? null : snap.frOwed === 0 ? "ok" : snap.frOwed <= 60 ? "meh" : "bad";
    L.lectura = t(snap.pages, settings.pagesWeekGoal * part, settings.pagesWeekGoal * part * 0.5);
    return L;
  }

  // ───────────── other apps
  /** Makes RitmoLogic.readIdiomas() output safe for LangLogic.summary(): minutes as numbers ("40" would be
      concatenated as text) and a finite base of hours ("abc" made the whole Panel fail to draw). */
  function cleanLang(idi) {
    if (!isObj(idi) || !Array.isArray(idi.log)) return null;
    const log = idi.log.filter((e) => isObj(e) && typeof e.date === "string" && ISO_RE.test(e.date))
      .map((e) => ({ ...e, minutes: clamp(num(e.minutes), 0, 1440) }));
    const fr = isObj(idi.base) ? num(idi.base.fr) : 0;
    return { log, base: { ...(isObj(idi.base) ? idi.base : {}), fr: fr >= 0 && fr <= 5000 ? fr : 0 } };
  }

  // ───────────── backup of every app in the repo
  const APP_KEYS = [
    { key: "panel.v1", app: "Panel de vida", path: "28-panel-vida/" },
    { key: "ritmo.v1", app: "Ritmo", path: "26-ritmo/" },
    { key: "paso.v1", app: "Paso", path: "27-paso/" },
    { key: "habitos.v1", app: "Hábitos", path: "15-habitos/app/" },
    { key: "gymtracker.v1", app: "Gym Tracker", path: "10-gym-tracker/" },
    { key: "idiomas.v1", app: "Idiomas", path: "21-idiomas-plan/" },
    { key: "finanzas.v1", app: "Finanzas", path: "11-finanzas/" },
    { key: "mapaviajes.v1", app: "Mapa de viajes", path: "12-mapa-viajes/" },
    { key: "mecanografia.v1", app: "Mecanografía", path: "25-habilidades/mecanografia/" },
  ];
  /** get(key) → raw string | null. Only valid JSON values are included. */
  function buildBackup(get, now) {
    const data = {};
    for (const { key } of APP_KEYS) { const raw = get(key); if (raw == null) continue; try { data[key] = JSON.parse(raw); } catch (e) { /* skip corrupt */ } }
    return { format: "mix-ideas-backup", version: 1, exportedAt: now, data };
  }
  /** Returns { ok, entries:[{key, app, size}] } or { ok:false, error }. Unknown keys are ignored. */
  function parseBackup(text) {
    let o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: "El fichero no es JSON válido." }; }
    if (!isObj(o) || o.format !== "mix-ideas-backup" || !isObj(o.data)) return { ok: false, error: "No es una copia de seguridad del Panel de vida." };
    // every app stores a JSON object; an array or a number would leave that app unreadable after restoring
    const entries = APP_KEYS.filter(({ key }) => Object.prototype.hasOwnProperty.call(o.data, key) && isObj(o.data[key]))
      .map(({ key, app }) => ({ key, app, value: JSON.stringify(o.data[key]) }));
    if (!entries.length) return { ok: false, error: "La copia no contiene datos de ninguna app." };
    return { ok: true, exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : "", entries };
  }

  // ───────────── demo (clearly fictional, only panel.v1)
  /** before: the current Panel state, kept inside the demo so «Quitar datos de ejemplo» restores it. */
  function demoState(today, before) {
    let s = emptyState();
    s.goals = starterGoals(today);
    s.books = [
      normBook({ id: "bdemo1", title: "Meditaciones", author: "Marco Aurelio", total: 250, progress: 120, status: "leyendo" }),
      normBook({ id: "bdemo2", title: "Machine Learning Specialization", author: "Andrew Ng", kind: "curso", total: 60, progress: 22, status: "leyendo" }),
      normBook({ id: "bdemo3", title: "Retórica", author: "Aristóteles", total: 300, progress: 0, status: "pendiente" }),
    ];
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const lines = [["Series cumplidas", "Acostarme antes", "Café con amigos"], ["Deep work de 2 h", "Menos móvil por la tarde", "Buen tiempo para correr"], ["Francés hecho temprano", "Planificar la cena", "Llamada con la familia"]];
    for (let i = 20; i >= 1; i--) {
      const d = addDays(today, -i), bed = 1380 + Math.round(rnd() * 90) - 30, sleep = 400 + Math.round(rnd() * 120);
      const wake = (bed + sleep) % 1440, scr = 40 + Math.round(rnd() * 70);
      s.days[d] = { bed: min2hm(bed), wake: min2hm(wake), energy: clamp(Math.round(1 + (sleep - 380) / 40 + rnd()), 1, 5), screenMin: scr, noSocialAM: rnd() > 0.35 };
      if (rnd() > 0.3) { const l = lines[i % 3]; s.days[d].journal = { good: l[0], better: l[1], grateful: l[2] }; }
      if (rnd() > 0.4) s.readLog.push({ date: d, bookId: "bdemo1", amount: 8 + Math.round(rnd() * 12), minutes: 25 });
      if (rnd() > 0.7) s.readLog.push({ date: d, bookId: "bdemo2", amount: 1, minutes: 40 });
    }
    s.days[today] = { bed: "23:40", wake: "07:25", energy: 4, screenMin: 52, noSocialAM: true };
    s.demo = true;
    if (isObj(before) && before.demo !== true) s.before = migrate(before);
    return s;
  }

  const api = {
    KEY, isISO, isHM, isObj, esc, todayISO, stamp, numLike, SETTING_RANGE, reviewDefault, cleanLang, FR_B2_DATE, WOXSEN_DATE, addDays, daysBetween, dow, weekStart, weekDays, range, isoWeek, fmtDay, fmtLong, fmtInt, fmtDec, fmtHours, hm2min, min2hm, MONTHS,
    DEFAULT_SETTINGS, AREAS, AUTO, STATUS_LABEL, emptyState, migrate, setDay, makeId, normBook, normGoal, normReview,
    sleepMinutes, sleepStats, screenStats, pctChange, journalDone, journalStreak, logReading, readingStats, bookEta,
    goalProgress, starterGoals, COUNTDOWNS, countdowns, parseCountdowns, countdownsText, trend, weekSnapshot, lights, APP_KEYS, buildBackup, parseBackup, demoState, mean,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PanelLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
