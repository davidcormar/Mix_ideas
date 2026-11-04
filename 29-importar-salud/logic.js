/* Importar salud — pure logic (browser: window.SaludLogic · Node: module.exports).
   Turns three sources into one per-day preview: an iPhone Shortcut text, Apple Health export.xml (streaming)
   and Strava activities.csv. Writing to paso.v1 / panel.v1 is done in app.js with those apps' own logic. */
(function (root) {
  "use strict";
  const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const pad2 = (n) => String(n).padStart(2, "0");
  const isISO = (s) => typeof s === "string" && ISO_RE.test(s) && !isNaN(new Date(s + "T12:00:00").getTime());
  const isHM = (s) => typeof s === "string" && HM_RE.test(s);
  const localISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const localHM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const addDays = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); return localISO(new Date(y, m - 1, d + n, 12)); };
  const round2 = (x) => Math.round(x * 100) / 100;

  // ───────────── workouts: one shape for every source
  /** kind: run | swim | bike | cardio | strength | walk | other.  Paso type: rodaje | tirada | trote | natacion | otro. */
  const HK_KIND = {
    Running: "run", Swimming: "swim", Cycling: "bike", HighIntensityIntervalTraining: "cardio", Rowing: "cardio", Elliptical: "cardio",
    CrossTraining: "cardio", MixedCardio: "cardio", StairClimbing: "cardio", JumpRope: "cardio", Yoga: "other", Pilates: "other",
    TraditionalStrengthTraining: "strength", FunctionalStrengthTraining: "strength", CoreTraining: "strength",
    Walking: "walk", Hiking: "walk",
  };
  const STRAVA_KIND = {
    Run: "run", TrailRun: "run", VirtualRun: "run", Swim: "swim", Ride: "bike", VirtualRide: "bike", EBikeRide: "bike", GravelRide: "bike", MountainBikeRide: "bike",
    Workout: "cardio", Crossfit: "cardio", HighIntensityIntervalTraining: "cardio", Rowing: "cardio", Elliptical: "cardio", StairStepper: "cardio",
    WeightTraining: "strength", Yoga: "other", Pilates: "other", Walk: "walk", Hike: "walk",
  };
  const KIND_LABEL = { run: "Carrera", swim: "Natación", bike: "Bici", cardio: "Cardio", strength: "Fuerza", walk: "Caminar", other: "Otro" };
  /** By default strength (already in Gym Tracker) and walks are not imported as sessions. */
  const DEFAULT_ON = (kind) => kind !== "strength" && kind !== "walk";
  function pasoType(w) {
    if (w.kind === "swim") return "natacion";
    if (w.kind !== "run") return "otro";
    if (w.km >= 12 || w.minutes >= 75) return "tirada";
    if (w.minutes < 25) return "trote";
    return "rodaje";
  }
  /** Same session from two sources (Strava writes to Health): same day, same kind, start ±15 min or (no time) minutes ±5 and km ±0.3. */
  function sameWorkout(a, b) {
    if (a.date !== b.date) return false;
    if (a.kind && b.kind && a.kind !== b.kind) return false;
    if (a.start && b.start) return Math.abs(hm2min(a.start) - hm2min(b.start)) <= 15;
    return Math.abs((a.minutes || 0) - (b.minutes || 0)) <= 5 && Math.abs((a.km || 0) - (b.km || 0)) <= 0.3;
  }
  const hm2min = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  function dedupWorkouts(list) {
    const out = [];
    for (const w of list) {
      const dup = out.find((o) => sameWorkout(o, w));
      if (!dup) out.push({ ...w, sources: [w.source] });
      else { if (!dup.sources.includes(w.source)) dup.sources.push(w.source); if (!dup.km && w.km) dup.km = w.km; }
    }
    return out.sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")));
  }
  /** Is a Paso run (no start time) already the same session? */
  const matchesRun = (w, r) => r.date === w.date && Math.abs((r.minutes || 0) - w.minutes) <= 5 && Math.abs((r.km || 0) - (w.km || 0)) <= 0.3;

  // ───────────── dates from Health ("2026-11-03 20:55:12 +0100") and Strava ("Nov 3, 2026, 5:12:45 PM", UTC)
  function healthDate(s) {
    const m = String(s || "").match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})(?::\d{2})?/);
    return m && isISO(m[1]) ? { date: m[1], hm: `${m[2]}:${m[3]}` } : null; // local wall clock as exported
  }
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11, ene: 0, abr: 3, ago: 7, dic: 11, sept: 8 };
  /** Strava export dates are UTC. Returns a Date (absolute) or null. */
  function stravaDate(s) {
    const t = String(s || "").trim();
    let m = t.match(/^([A-Za-z]{3,4})\.? (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i);
    if (m && MON[m[1].toLowerCase()] !== undefined) {
      let h = Number(m[4]); const ap = (m[7] || "").toUpperCase();
      if (ap === "PM" && h < 12) h += 12; if (ap === "AM" && h === 12) h = 0;
      return new Date(Date.UTC(Number(m[3]), MON[m[1].toLowerCase()], Number(m[2]), h, Number(m[5]), Number(m[6])));
    }
    m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
    return null;
  }

  // ───────────── CSV (RFC 4180: quotes, commas and newlines inside fields)
  function parseCSV(text) {
    const rows = []; let row = [], f = "", q = false;
    const s = String(text || "").replace(/^﻿/, "");
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim() !== ""));
  }
  /** Strava activities.csv → { workouts, errors, skipped }. Distance: first "Distance" column (km). */
  function parseStrava(text) {
    const rows = parseCSV(text);
    if (!rows.length) return { ok: false, error: "El fichero está vacío." };
    const head = rows[0].map((h) => h.trim());
    const col = (name) => head.indexOf(name);
    const cDate = col("Activity Date"), cType = col("Activity Type"), cName = col("Activity Name"), cEl = col("Elapsed Time"), cMov = col("Moving Time"), cDist = col("Distance");
    if (cDate < 0 || cType < 0) return { ok: false, error: "No parece el activities.csv de Strava (faltan «Activity Date» y «Activity Type»)." };
    const workouts = []; let errors = 0;
    for (const r of rows.slice(1)) {
      const d = stravaDate(r[cDate]);
      if (!d || isNaN(d)) { errors++; continue; }
      const kind = STRAVA_KIND[(r[cType] || "").replace(/\s+/g, "")] || "other";
      const secs = Number(r[cMov]) > 0 ? Number(r[cMov]) : Number(r[cEl]) || 0;
      let km = Number(String(r[cDist] || "").replace(",", "."));
      if (!Number.isFinite(km) || km < 0) km = 0;
      if (km > 500) km = km / 1000; // some exports give metres
      workouts.push({ source: "Strava", date: localISO(d), start: localHM(d), kind, minutes: Math.round(secs / 60), km: round2(km), name: String(r[cName] || "").slice(0, 80) });
    }
    return { ok: true, workouts, errors };
  }

  // ───────────── Shortcut text: JSON {d, steps, bed, wake} (or {days:[…]}) or "clave=valor" lines / ; / &
  function parseShortcut(text, today) {
    const t = String(text || "").trim();
    if (!t) return { ok: false, error: "No hay nada que importar." };
    let items = [];
    try {
      const o = JSON.parse(t);
      items = Array.isArray(o) ? o : Array.isArray(o.days) ? o.days : [o];
    } catch (e) {
      const o = {};
      for (const part of t.replace(/^[#?/]*(atajos\?)?/, "").split(/[\n;&]+/)) {
        const m = part.match(/^\s*([a-zA-Z]+)\s*[=:]\s*(.*?)\s*$/); if (m) o[m[1].toLowerCase()] = decodeURIComponent(m[2]);
      }
      items = [o];
    }
    const days = [], problems = [];
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const date = isISO(it.d || it.date || it.fecha) ? (it.d || it.date || it.fecha) : today;
      const steps = Number(String(it.steps ?? it.pasos ?? "").replace(/[.\s]/g, "").replace(",", "."));
      const bed = normHM(it.bed ?? it.acostarse), wake = normHM(it.wake ?? it.levantarse);
      const e = { date };
      if (Number.isFinite(steps) && steps > 0 && steps < 200000) e.steps = Math.round(steps);
      if (bed && wake) { e.bed = bed; e.wake = wake; }
      if (Object.keys(e).length > 1) days.push(e); else problems.push(date);
    }
    return days.length ? { ok: true, days, problems } : { ok: false, error: "No encuentro pasos ni horas de sueño. Formato: d=2026-11-04;steps=8420;bed=23:40;wake=07:25" };
  }
  /** "23:40", "23.40", "7:05", "2026-11-04 07:05:00", "11:40 PM" → "HH:MM". */
  function normHM(v) {
    const s = String(v ?? "").trim();
    let m = s.match(/(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?\s*$/i);
    if (!m) return null;
    let h = Number(m[1]); const ap = (m[3] || "").toLowerCase().replace(/[.\s]/g, "");
    if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0;
    const out = `${pad2(h)}:${m[2]}`;
    return isHM(out) ? out : null;
  }

  // ───────────── Apple Health export.xml (streaming): steps, sleep and workouts
  const STEP = "HKQuantityTypeIdentifierStepCount", SLEEP = "HKCategoryTypeIdentifierSleepAnalysis";
  const MAX_TAG = 1 << 20;
  function attrs(tag) {
    const a = {}; const re = /([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g; let m;
    while ((m = re.exec(tag))) a[m[1]] = decode(m[3] !== undefined ? m[3] : m[4]);
    return a;
  }
  const decode = (s) => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (x, e) => ({ lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" }[e.toLowerCase()] ??
    (e[1] === "x" || e[1] === "X" ? String.fromCodePoint(parseInt(e.slice(2), 16)) : String.fromCodePoint(Number(e.slice(1))))));
  function tagEnd(s, from) { let q = null; for (let i = from; i < s.length; i++) { const c = s[i]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === ">") return i; } return -1; }
  function createHealthParser() {
    let buf = "", cur = null; // cur = open <Workout> collecting <WorkoutStatistics>
    const steps = {}, sleep = [], workouts = []; let skipped = 0;
    function onTag(tag) {
      if (tag.startsWith("<Record")) {
        if (tag.indexOf(STEP) >= 0) {
          const a = attrs(tag); if (a.type !== STEP) return;
          const d = healthDate(a.startDate), v = Number(a.value);
          if (!d || !(v >= 0)) { skipped++; return; }
          const src = (a.sourceName || "?").trim(); (steps[d.date] ||= {})[src] = (steps[d.date][src] || 0) + v;
        } else if (tag.indexOf(SLEEP) >= 0) {
          const a = attrs(tag); if (a.type !== SLEEP) return;
          const s = healthDate(a.startDate), e = healthDate(a.endDate);
          if (!s || !e) { skipped++; return; }
          const v = String(a.value || "");
          const asleep = /Asleep/.test(v), inBed = /InBed/.test(v);
          if (!asleep && !inBed) return; // Awake
          sleep.push({ src: (a.sourceName || "?").trim(), s, e, asleep });
        }
      } else if (tag.startsWith("<Workout") && !tag.startsWith("<WorkoutStatistics") && !tag.startsWith("<WorkoutEvent") && !tag.startsWith("<WorkoutRoute") && !tag.startsWith("<WorkoutActivity")) {
        const a = attrs(tag), d = healthDate(a.startDate), type = String(a.workoutActivityType || "").replace("HKWorkoutActivityType", "");
        if (!d) { skipped++; return; }
        let minutes = Number(a.duration) || 0; if (/^s/.test(a.durationUnit || "")) minutes /= 60; if (/^h/.test(a.durationUnit || "")) minutes *= 60;
        let km = Number(a.totalDistance) || 0; if (a.totalDistanceUnit === "m") km /= 1000; if (a.totalDistanceUnit === "mi") km *= 1.609344;
        const w = { source: (a.sourceName || "Salud").trim(), date: d.date, start: d.hm, kind: HK_KIND[type] || "other", minutes: Math.round(minutes), km: round2(km), name: type };
        workouts.push(w);
        cur = /\/>\s*$/.test(tag) ? null : w;
      } else if (tag.startsWith("<WorkoutStatistics") && cur && !cur.km) {
        const a = attrs(tag);
        if (/Distance/.test(a.type || "") && Number(a.sum) > 0) cur.km = round2(a.unit === "m" ? a.sum / 1000 : a.unit === "mi" ? a.sum * 1.609344 : Number(a.sum));
      } else if (tag.startsWith("</Workout>")) cur = null;
    }
    function push(text) {
      buf += text; let i = 0;
      for (;;) {
        const s = buf.indexOf("<", i);
        if (s < 0) { buf = ""; return; }
        const head = buf.slice(s, s + 20);
        if (!/^<\/?(Record|Workout)/.test(head)) {
          if (buf.length - s < 20) { buf = buf.slice(s); return; }
          i = s + 1; continue;
        }
        const e = tagEnd(buf, s);
        if (e < 0) { if (buf.length - s > MAX_TAG) { skipped++; i = s + 1; continue; } buf = buf.slice(s); return; }
        onTag(buf.slice(s, e + 1)); i = e + 1;
      }
    }
    function finish() { return summarizeHealth(steps, sleep, workouts, skipped); }
    return { push, finish };
  }
  /** Steps: max source per day (iPhone + Watch not added). Sleep: per night (= wake-up date), the source with most minutes;
      bed = first start, wake = last end of that source's samples between 18:00 the evening before and 15:00. */
  function summarizeHealth(steps, sleep, workouts, skipped = 0) {
    const days = {};
    for (const [d, bySrc] of Object.entries(steps)) days[d] = { date: d, steps: Math.round(Math.max(...Object.values(bySrc))) };
    const nights = {};
    for (const x of sleep) {
      const endMin = hm2min(x.e.hm), night = endMin < 15 * 60 ? x.e.date : addDays(x.e.date, 1);
      if (!(x.s.date === addDays(night, -1) && hm2min(x.s.hm) >= 18 * 60) && x.s.date !== night) continue;
      ((nights[night] ||= {})[x.src] ||= []).push(x);
    }
    const abs = (p) => (p.date + " " + p.hm);
    for (const [night, bySrc] of Object.entries(nights)) {
      let best = null, bestMin = -1;
      for (const list of Object.values(bySrc)) {
        const use = list.some((x) => x.asleep) ? list.filter((x) => x.asleep) : list;
        const mins = use.reduce((a, x) => a + span(x.s, x.e), 0);
        if (mins > bestMin) { bestMin = mins; best = use; }
      }
      const bed = best.map((x) => x.s).sort((a, b) => abs(a).localeCompare(abs(b)))[0], wake = best.map((x) => x.e).sort((a, b) => abs(b).localeCompare(abs(a)))[0];
      (days[night] ||= { date: night }).bed = bed.hm; days[night].wake = wake.hm; days[night].asleepMin = Math.round(bestMin);
    }
    return { days, workouts: dedupWorkouts(workouts.filter((w) => w.minutes > 0 || w.km > 0)), skipped };
  }
  const span = (s, e) => { const a = new Date(s.date + "T" + s.hm), b = new Date(e.date + "T" + e.hm); return Math.max(0, (b - a) / 60000); };

  // ───────────── preview: merge sources into one list per day
  /** health = summarizeHealth(...) | null, shortcut = parseShortcut(...).days | null, strava = workouts | null. */
  function buildPreview({ health = null, shortcut = null, strava = null } = {}) {
    const days = {};
    const put = (d) => (days[d] ||= { date: d, steps: null, bed: null, wake: null, asleepMin: null, workouts: [] });
    if (health) for (const x of Object.values(health.days)) { const e = put(x.date); if (x.steps) e.steps = x.steps; if (x.bed) { e.bed = x.bed; e.wake = x.wake; e.asleepMin = x.asleepMin; } }
    if (shortcut) for (const x of shortcut) { const e = put(x.date); if (x.steps) e.steps = x.steps; if (x.bed) { e.bed = x.bed; e.wake = x.wake; } }
    const ws = dedupWorkouts([...(health ? health.workouts : []), ...(strava || [])].map((w) => ({ ...w, sources: undefined })));
    for (const w of ws) put(w.date).workouts.push({ ...w, pasoType: pasoType(w), on: DEFAULT_ON(w.kind) });
    return Object.values(days).sort((a, b) => b.date.localeCompare(a.date));
  }

  const api = { isISO, isHM, addDays, localISO, localHM, HK_KIND, STRAVA_KIND, KIND_LABEL, DEFAULT_ON, pasoType, sameWorkout, dedupWorkouts, matchesRun,
    healthDate, stravaDate, parseCSV, parseStrava, parseShortcut, normHM, createHealthParser, summarizeHealth, buildPreview };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SaludLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
