const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");
const T = "2026-11-04"; // miércoles

test("fechas locales: semana desde el lunes, semana ISO y cambio de año", () => {
  assert.equal(L.weekStart(T), "2026-11-02");
  assert.equal(L.dow("2026-11-08"), 7);
  assert.equal(L.isoWeek(T), "2026-W45");
  assert.equal(L.isoWeek("2027-01-01"), "2026-W53");
  assert.equal(L.isoWeek("2027-01-04"), "2027-W01");
  assert.equal(L.addDays("2026-10-24", 2), "2026-10-26"); // cambio de hora
  assert.equal(L.daysBetween("2026-10-24", "2026-10-26"), 2);
  assert.equal(L.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(L.fmtLong(T), "Miércoles, 4 de noviembre");
});

test("sueño: cruza medianoche, rechaza valores imposibles", () => {
  assert.equal(L.sleepMinutes({ bed: "23:30", wake: "07:15" }), 465);
  assert.equal(L.sleepMinutes({ bed: "00:40", wake: "08:00" }), 440);
  assert.equal(L.sleepMinutes({ bed: "07:00", wake: "06:00" }), null); // 23 h
  assert.equal(L.sleepMinutes({ bed: "23:00" }), null);
});

test("estadísticas de sueño: media, deuda, hora media de acostarse y contraste de energía", () => {
  let s = L.emptyState();
  const nights = [["23:00", "07:00", 5], ["23:30", "07:30", 4], ["01:00", "06:30", 2], ["00:30", "06:00", 2]];
  nights.forEach(([b, w, e], i) => { s = L.setDay(s, L.addDays(T, -i), { bed: b, wake: w, energy: e }); });
  const st = L.sleepStats(s, L.range(L.addDays(T, -3), T));
  assert.equal(st.nights, 4);
  assert.equal(Math.round(st.avgMin), (480 + 480 + 330 + 330) / 4);
  assert.equal(st.debtMin, 150 + 150);
  assert.equal(st.bedAvg, "00:00"); // 23:00, 23:30, 01:00, 00:30
  assert.deepEqual(st.contrast, { long: 4.5, short: 2, cut: 420 });
});

test("setDay borra campos vacíos y elimina días vacíos", () => {
  let s = L.setDay(L.emptyState(), T, { screenMin: 45, journal: { good: "Series" } });
  assert.deepEqual(s.days[T], { screenMin: 45, journal: { good: "Series" } });
  s = L.setDay(s, T, { journal: { good: "  " } });
  assert.deepEqual(s.days[T], { screenMin: 45 });
  s = L.setDay(s, T, { screenMin: "" });
  assert.equal(T in s.days, false);
});

test("móvil: media, días dentro del objetivo y 0 redes por la mañana", () => {
  let s = L.emptyState();
  [30, 60, 90, 120].forEach((m, i) => { s = L.setDay(s, L.addDays(T, -i), { screenMin: m, noSocialAM: i % 2 === 0 }); });
  const st = L.screenStats(s, L.range(L.addDays(T, -6), T));
  assert.equal(st.avg, 75); assert.equal(st.onGoal, 2); assert.equal(st.max, 120);
  assert.equal(st.noSocialAM, 2); assert.equal(st.noSocialN, 4);
  assert.equal(L.pctChange(60, 80), -25); assert.equal(L.pctChange(60, null), null);
});

test("diario: racha que no se rompe si hoy aún no has escrito", () => {
  let s = L.emptyState();
  for (let i = 1; i <= 3; i++) s = L.setDay(s, L.addDays(T, -i), { journal: { grateful: "x" } });
  assert.equal(L.journalStreak(s, T), 3);
  s = L.setDay(s, T, { journal: { good: "y" } });
  assert.equal(L.journalStreak(s, T), 4);
});

test("lectura: registra el avance, termina el libro y calcula el ritmo", () => {
  let s = L.migrate({ books: [{ id: "b1", title: "Meditaciones", total: 100, progress: 40 }, { id: "c1", title: "ML", kind: "curso", total: 10 }] });
  s = L.logReading(s, "b1", 60, 30, L.addDays(T, -1));
  s = L.logReading(s, "c1", 2, 50, T);
  const st = L.readingStats(s, L.weekDays(T));
  assert.deepEqual(st, { pages: 20, lessons: 2, minutes: 80, learnMin: 50 });
  const eta = L.bookEta(s, "b1", T);
  assert.equal(eta.days, 28); // 40 páginas a 20/14 por día
  s = L.logReading(s, "b1", 500, 0, T);
  assert.equal(s.books[0].progress, 100); assert.equal(s.books[0].status, "terminado"); assert.equal(s.books[0].finished, T);
  assert.equal(L.bookEta(s, "b1", T), null);
  assert.equal(L.logReading(s, "nope", 5, 5, T), s);
});

test("metas: número automático, hito con pasos, en ritmo / atrasada / vencida", () => {
  const g = L.normGoal({ title: "Francés", kind: "numero", target: 600, auto: "frHours", start: "2026-11-01", deadline: "2027-06-15" });
  const p = L.goalProgress(g, T, { frHours: 3 });
  assert.equal(p.current, 3); assert.equal(p.status, "en-ritmo");
  assert.equal(L.goalProgress(g, "2027-03-01", { frHours: 100 }).status, "atrasada");
  assert.equal(L.goalProgress(g, "2027-07-01", { frHours: 100 }).status, "vencida");
  assert.equal(L.goalProgress(g, "2027-07-01", { frHours: 600 }).status, "hecho");
  const h = L.normGoal({ title: "India", kind: "hito", steps: [{ text: "Visado", done: true }, { text: "Vacunas" }] });
  assert.equal(L.goalProgress(h, T).pct, 0.5); assert.equal(L.goalProgress(h, T).label, "1/2 pasos");
  assert.equal(L.starterGoals(T).length, 6);
});

test("revisión semanal: foto de la semana y semáforos", () => {
  let s = L.emptyState();
  s = L.setDay(s, "2026-11-02", { bed: "23:00", wake: "07:00", screenMin: 50, journal: { good: "a" } });
  s = L.setDay(s, "2026-11-03", { bed: "23:30", wake: "07:30", screenMin: 70 });
  const snap = L.weekSnapshot(s, T, T, { sport: 3, habitsMean: 8, frOwed: 0 });
  assert.equal(snap.week, "2026-W45"); assert.equal(snap.days, 3); assert.equal(snap.sleepAvgMin, 480); assert.equal(snap.journalDays, 1);
  const li = L.lights(snap, s.settings);
  assert.deepEqual(li, { sueno: "ok", movil: "ok", deporte: "meh", habitos: "ok", frances: "ok", lectura: "bad" });
});

test("migrate: tolera basura y conserva lo válido", () => {
  for (const x of [null, [], "x", 5, { days: [] }, { settings: { sleepGoalMin: -3, bedTarget: "25:00" } }]) {
    const s = L.migrate(x);
    assert.equal(s.settings.sleepGoalMin, 480); assert.equal(s.settings.bedTarget, "23:30");
  }
  const s = L.migrate({ days: { [T]: { energy: 9, screenMin: 30 }, "2026-13-01": { energy: 3 } }, readLog: [{ date: T, bookId: "zzz", amount: 3 }], reviews: { "2026-W45": { wins: ["a", "b", "c", "d"] }, bad: {} } });
  assert.deepEqual(s.days, { [T]: { screenMin: 30 } });
  assert.equal(s.readLog.length, 0);
  assert.deepEqual(Object.keys(s.reviews), ["2026-W45"]); assert.equal(s.reviews["2026-W45"].wins.length, 3);
});

test("copia de seguridad de todas las apps: solo claves conocidas y JSON válido", () => {
  const store = { "panel.v1": '{"version":1}', "gymtracker.v1": '{"sessions":[]}', "finanzas.v1": "{roto", "otra.cosa": "{}" };
  const b = L.buildBackup((k) => (k in store ? store[k] : null), "2026-11-04T12:00");
  assert.deepEqual(Object.keys(b.data).sort(), ["gymtracker.v1", "panel.v1"]);
  const p = L.parseBackup(JSON.stringify({ ...b, data: { ...b.data, "otra.cosa": {} } }));
  assert.equal(p.ok, true); assert.deepEqual(p.entries.map((e) => e.key), ["panel.v1", "gymtracker.v1"]);
  assert.equal(L.parseBackup("{").ok, false);
  assert.equal(L.parseBackup('{"format":"x","data":{}}').ok, false);
  assert.equal(L.parseBackup('{"format":"mix-ideas-backup","data":{}}').ok, false);
});

test("datos de ejemplo válidos y marcados como ejemplo", () => {
  const d = L.demoState(T);
  const m = L.migrate(JSON.parse(JSON.stringify(d)));
  assert.equal(m.demo, true);
  assert.equal(Object.keys(m.days).length, 21);
  assert.ok(m.readLog.length > 0 && m.books.length === 3 && m.goals.length === 6);
  assert.equal(L.esc('<b>"x"</b>'), "&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
});
