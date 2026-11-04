/* Language hours tracker — pure logic (browser: window.LangLogic · Node: module.exports).
   Rules from David's "Visión Idiomas":
   - floor 30 min/day; if a day is missed, the missing minutes are added to the next day (carry-over)
   - extras (Duolingo, podcasts while training, series) do NOT count
   - 7-session cycle without fixed days: G E L G E W C
   - from Nov 2026 the priority is PRODUCTION (writing + speaking) */
(function (root) {
  const CYCLE = ["gramatica", "escucha", "lectura", "gramatica", "escucha", "escritura", "conversacion"];
  const LABEL = { gramatica: "Gramática", escucha: "Escucha", lectura: "Lectura y vocabulario", escritura: "Escritura", conversacion: "Conversación y repaso", extra: "Extra (no cuenta)", inmersion: "Inmersión" };
  const PRODUCTION = new Set(["escritura", "conversacion"]);

  const LANGS = {
    fr: { name: "Francés", goal: "DELF B2", start: "2026-10-15", deadline: "2027-06-05", hoursTarget: 600, hoursRange: [550, 650], floorMin: 30, standardMin: 60, cycle: true },
    de: { name: "Alemán", goal: "Goethe B2", start: "2027-07-01", deadline: "2028-06-30", hoursTarget: 525, hoursRange: [450, 600], floorMin: 30, standardMin: 90, cycle: true },
    en: { name: "Inglés", goal: "C1 Advanced", start: "2026-10-01", deadline: "2027-09-30", hoursTarget: 200, hoursRange: [150, 250], floorMin: 0, standardMin: 20, cycle: false },
  };

  const DAY = 864e5;
  const toDate = (s) => new Date(s + "T00:00:00Z");
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (s, n) => iso(new Date(toDate(s).getTime() + n * DAY));
  const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);

  const counts = (e) => e.type !== "extra";

  function minutesByDay(log, lang) {
    const m = {};
    for (const e of log) if (e.lang === lang && counts(e)) m[e.date] = (m[e.date] || 0) + e.minutes;
    return m;
  }

  /** Carry-over debt: pending_t = max(0, pending_{t-1} + floor - done_t). Returns minutes owed BEFORE today's work
      (i.e. what must be added to today's floor) and the full series. */
  function pending(log, lang, today) {
    const L = LANGS[lang];
    if (!L.floorMin || today < L.start) return { owed: 0, todayRequired: L.floorMin, daysBelowFloor: 0 };
    const byDay = minutesByDay(log, lang);
    let p = 0, below = 0;
    for (let d = L.start; d < today; d = addDays(d, 1)) {
      const done = byDay[d] || 0;
      if (done < L.floorMin) below++;
      p = Math.max(0, p + L.floorMin - done);
    }
    const doneToday = byDay[today] || 0;
    return { owed: p, todayRequired: Math.max(0, L.floorMin + p - doneToday), daysBelowFloor: below };
  }

  /** baseHours: estimated prior hours (e.g. school French) that count towards the target. */
  function summary(log, lang, today, baseHours = 0) {
    const L = LANGS[lang];
    const byDay = minutesByDay(log, lang);
    const totalMin = Object.values(byDay).reduce((a, b) => a + b, 0);
    const hours = totalMin / 60 + baseHours;
    // pace over the last 28 days (or since start if shorter)
    const from = [addDays(today, -27), L.start].sort().at(-1);
    const span = Math.max(1, daysBetween(from, today) + 1);
    let recent = 0;
    for (const [d, m] of Object.entries(byDay)) if (d >= from && d <= today) recent += m;
    const pace = recent / span; // min/day
    const remainingH = Math.max(0, L.hoursTarget - hours);
    const daysLeft = Math.max(0, daysBetween(today, L.deadline));
    const requiredPerDay = daysLeft ? (remainingH * 60) / daysLeft : Infinity;
    const etaDays = pace > 0 ? Math.ceil((remainingH * 60) / pace) : null;
    const eta = etaDays === null ? null : addDays(today, etaDays);
    const prodMin = log.filter((e) => e.lang === lang && PRODUCTION.has(e.type)).reduce((a, e) => a + e.minutes, 0);
    return { hours, pace, remainingH, daysLeft, requiredPerDay, eta, onTrack: eta !== null && eta <= L.deadline,
      productionShare: totalMin ? prodMin / totalMin : 0, ...pending(log, lang, today) };
  }

  /** Next session of the 7-cycle = the one after the last logged cycle session. */
  function nextSession(log, lang) {
    const sess = log.filter((e) => e.lang === lang && CYCLE.includes(e.type)).sort((a, b) => (a.date + (a.t || "")).localeCompare(b.date + (b.t || "")));
    if (!sess.length) return { index: 0, type: CYCLE[0] };
    // walk the cycle following the logged sequence (tolerates out-of-order sessions)
    let idx = -1;
    for (const s of sess) {
      let k = CYCLE.indexOf(s.type, idx + 1);
      if (k === -1) k = CYCLE.indexOf(s.type);
      idx = k;
    }
    const n = (idx + 1) % CYCLE.length;
    return { index: n, type: CYCLE[n] };
  }

  function weeklyMinutes(log, lang, today, weeks = 8) {
    const out = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const end = addDays(today, -7 * w), start = addDays(end, -6);
      out.push({ start, minutes: log.filter((e) => e.lang === lang && counts(e) && e.date >= start && e.date <= end).reduce((a, e) => a + e.minutes, 0) });
    }
    return out;
  }

  function validate(d) {
    if (!d || !Array.isArray(d.log)) throw new Error("JSON sin 'log'");
    for (const e of d.log) if (!LANGS[e.lang] || !(e.minutes >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) throw new Error("entrada no válida: " + JSON.stringify(e));
    return d;
  }

  const api = { CYCLE, LABEL, LANGS, PRODUCTION, addDays, daysBetween, pending, summary, nextSession, weeklyMinutes, validate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LangLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
