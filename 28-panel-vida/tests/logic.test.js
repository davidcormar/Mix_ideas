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
  assert.equal(eta.days, 14); // libro empezado ayer: 40 páginas a 20/7 por día (mínimo 7 días, no 14)
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
  // miércoles: 3 sesiones en 2 días terminados van a ritmo de 5 → verde; 0 páginas siguen en rojo
  assert.deepEqual(li, { sueno: "ok", movil: "ok", deporte: "ok", habitos: "ok", frances: "ok", lectura: "bad" });
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

test("cuenta atrás editable: parseo, validación, orden y fechas pasadas ocultas", () => {
  const p = L.parseCountdowns("2027-10-17 Media maratón\n\nmal formato\n2027-13-01 Imposible\n2027-01-06 Woxsen (India)");
  assert.deepEqual(p.errors, [3, 4]);
  assert.deepEqual(L.countdowns(T, p.list).map((c) => c.label), ["Woxsen (India)", "Media maratón"]);
  assert.deepEqual(L.countdowns("2027-02-01", p.list).map((c) => c.label), ["Media maratón"]);
  const s = L.migrate({ settings: { countdowns: [...p.list, { date: "x", label: "y" }] } });
  assert.equal(s.settings.countdowns.length, 2);
  assert.equal(L.emptyState().settings.countdowns.length, 4);
  assert.equal(L.parseCountdowns(L.countdownsText(p.list)).list.length, 2);
});

test("tendencia de 8 semanas: medias por semana, de la más antigua a la actual", () => {
  let s = L.emptyState();
  s = L.setDay(s, "2026-11-03", { bed: "23:00", wake: "07:00", energy: 4, screenMin: 50 });
  s = L.setDay(s, "2026-10-27", { bed: "00:00", wake: "06:00", energy: 2, screenMin: 120 });
  const tr = L.trend(s, T, 8);
  assert.equal(tr.length, 8);
  assert.equal(tr[7].week, "2026-W45"); assert.equal(tr[7].current, true);
  assert.equal(tr[7].sleepAvgMin, 480); assert.equal(tr[6].sleepAvgMin, 360); assert.equal(tr[6].screenAvg, 120);
  assert.equal(tr[0].sleepAvgMin, null);
});

// ───────────── regresiones de la revisión QA

test("horas y minutos redondean antes de partir: nunca «7 h 60» ni «23:60»", () => {
  assert.equal(L.fmtHours(479.6), "8 h 00");
  assert.equal(L.fmtHours(467.5), "7 h 48");
  assert.equal(L.fmtHours(NaN), "—"); assert.equal(L.fmtHours(Infinity), "—"); assert.equal(L.fmtHours(null), "—");
  assert.equal(L.min2hm(1439.7), "00:00");
  assert.equal(L.min2hm(-30), "23:30");
  // hora media de acostarse con media no entera (23:59 y 00:00 → 23:59,5)
  let s = L.emptyState();
  s = L.setDay(s, "2026-11-03", { bed: "23:59", wake: "07:00" });
  s = L.setDay(s, "2026-11-04", { bed: "00:00", wake: "07:00" });
  assert.match(L.sleepStats(s, ["2026-11-03", "2026-11-04"]).bedAvg, /^([01]\d|2[0-3]):[0-5]\d$/);
});

test("sueño en los cambios de hora (Madrid) cuenta la hora de reloj y las fechas no se desplazan", () => {
  // 25 oct 2026 (se atrasa el reloj) y 28 mar 2027 (se adelanta): mismas cuentas que cualquier otra noche
  let s = L.emptyState();
  s = L.setDay(s, "2026-10-25", { bed: "23:30", wake: "07:30" });
  s = L.setDay(s, "2027-03-28", { bed: "23:30", wake: "07:30" });
  assert.equal(L.sleepMinutes(s.days["2026-10-25"]), 480);
  assert.equal(L.sleepMinutes(s.days["2027-03-28"]), 480);
  assert.equal(L.addDays("2027-03-27", 1), "2027-03-28"); assert.equal(L.addDays("2027-03-28", 1), "2027-03-29");
  assert.equal(L.daysBetween("2026-10-01", "2026-11-01"), 31); assert.equal(L.daysBetween("2027-03-01", "2027-04-01"), 31);
  assert.equal(L.weekStart("2027-03-28"), "2027-03-22"); assert.equal(L.isoWeek("2026-10-25"), "2026-W43");
});

test("semanas ISO alrededor de año nuevo (2026 tiene semana 53)", () => {
  assert.equal(L.isoWeek("2026-12-28"), "2026-W53"); assert.equal(L.isoWeek("2027-01-03"), "2026-W53");
  assert.equal(L.weekStart("2027-01-03"), "2026-12-28");
  assert.deepEqual(L.weekDays("2027-01-01"), ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  assert.equal(L.isoWeek("2025-12-29"), "2026-W01");
  const tr = L.trend(L.emptyState(), "2027-01-05", 8);
  assert.deepEqual(tr.slice(-2).map((w) => w.week), ["2026-W53", "2027-W01"]);
});

test("revisión el lunes a las 00:30: la pantalla abre la semana pasada si aún no está hecha", () => {
  const mon = "2026-11-09";
  let s = L.emptyState();
  assert.equal(L.reviewDefault(s, mon), "2026-11-02");
  assert.equal(L.isoWeek(L.reviewDefault(s, mon)), "2026-W45");
  s = { ...s, reviews: { "2026-W45": L.normReview({ score: 7 }) } };
  assert.equal(L.reviewDefault(s, mon), mon);
  assert.equal(L.reviewDefault(L.emptyState(), "2026-11-10"), "2026-11-10"); // martes: la semana actual
});

test("semáforos de una semana a medias: el lunes no sale rojo, el domingo exige la semana entera", () => {
  const st = L.emptyState().settings;
  const mon = L.weekSnapshot(L.emptyState(), "2026-11-02", "2026-11-02", { sport: 0 });
  assert.equal(mon.days, 1);
  assert.equal(L.lights(mon, st).deporte, "ok"); assert.equal(L.lights(mon, st).lectura, "ok");
  const sun = L.weekSnapshot(L.emptyState(), "2026-11-08", "2026-11-08", { sport: 4 });
  assert.equal(sun.days, 7);
  assert.equal(L.lights(sun, st).deporte, "meh"); assert.equal(L.lights(sun, st).lectura, "bad");
  assert.equal(L.lights({ ...sun, sport: 2 }, st).deporte, "bad"); assert.equal(L.lights({ ...sun, sport: 5 }, st).deporte, "ok");
  assert.equal(L.lights({ ...sun, sport: undefined }, st).deporte, null);
  assert.equal(L.lights({ ...sun, screenAvg: 90 }, st).movil, "meh"); assert.equal(L.lights({ ...sun, screenAvg: 91 }, st).movil, "bad");
  assert.equal(L.lights({ ...sun, sleepAvgMin: 465 }, st).sueno, "ok"); assert.equal(L.lights({ ...sun, sleepAvgMin: 419 }, st).sueno, "bad");
});

test("migrate: números enormes, tipos raros y progreso por encima del total no llegan a la pantalla", () => {
  const s = L.migrate(JSON.parse('{"settings":{"sleepGoalMin":1e999,"screenGoalMin":true,"pagesWeekGoal":"abc","learnWeekGoalMin":[5],"name":5},' +
    '"days":{"2026-11-04":{"energy":true,"screenMin":true,"bed":"23:00"},"2026-11-03":{"energy":"3","screenMin":"45"}},' +
    '"books":[{"id":"b","title":"X","total":100,"progress":500}],"readLog":[{"date":"2026-11-04","bookId":"b","amount":1e308,"minutes":-5}],' +
    '"goals":[{"title":"G","target":1e400,"current":"x"}]}'));
  assert.equal(s.settings.sleepGoalMin, 480); assert.equal(L.migrate({ settings: { sleepGoalMin: 1e300 } }).settings.sleepGoalMin, 660);
  assert.equal(s.settings.screenGoalMin, 60); assert.equal(s.settings.pagesWeekGoal, 100);
  assert.equal(s.settings.learnWeekGoalMin, 180); assert.equal(s.settings.name, "David");
  assert.deepEqual(s.days["2026-11-04"], { bed: "23:00" });
  assert.deepEqual(s.days["2026-11-03"], { energy: 3, screenMin: 45 });
  assert.equal(s.books[0].progress, 100);
  assert.deepEqual(s.readLog[0], { date: "2026-11-04", bookId: "b", amount: 100000, minutes: 0 });
  assert.equal(s.goals[0].target, 0); assert.equal(s.goals[0].current, 0); // Infinity → descartado
  assert.equal(L.normGoal({ title: "G", target: 1e300 }).target, 1e9);
  assert.equal(L.migrate({ settings: { sleepGoalMin: 60 } }).settings.sleepGoalMin, 300);
});

test("lectura: corregir una errata hacia atrás quita las páginas fantasma de la semana", () => {
  let s = L.migrate({ books: [{ id: "b1", title: "Meditaciones", total: 400, progress: 0 }] });
  s = L.logReading(s, "b1", 20, 15, "2026-11-03");
  s = L.logReading(s, "b1", 300, 0, T); // quería poner 30
  assert.equal(L.readingStats(s, L.weekDays(T)).pages, 300);
  s = L.logReading(s, "b1", 30, 0, T);
  assert.equal(s.books[0].progress, 30);
  assert.equal(L.readingStats(s, L.weekDays(T)).pages, 30);
  assert.deepEqual(s.readLog, [{ date: "2026-11-03", bookId: "b1", amount: 20, minutes: 15 }, { date: T, bookId: "b1", amount: 10, minutes: 0 }]);
  // solo minutos (sin cambiar de página) también se apunta
  s = L.logReading(s, "b1", 30, 20, T);
  assert.equal(L.readingStats(s, [T]).minutes, 20);
  // volver a 0 deja el registro de minutos pero sin páginas
  s = L.logReading(s, "b1", 0, 0, T);
  assert.equal(L.readingStats(s, L.weekDays(T)).pages, 0); assert.equal(L.readingStats(s, L.weekDays(T)).minutes, 35);
});

test("previsión de fin de libro: ritmo de 14 días o desde el primer registro (mínimo 7)", () => {
  let s = L.migrate({ books: [{ id: "b", title: "B", total: 200, progress: 0 }] });
  for (let i = 20; i >= 1; i--) s = L.logReading(s, "b", s.books[0].progress + 5, 0, L.addDays(T, -i)); // 5 páginas/día desde hace 20 días
  const eta = L.bookEta(s, "b", T);
  assert.equal(eta.perDay, 65 / 14); assert.equal(eta.days, 22); assert.equal(eta.date, L.addDays(T, 22)); // 13 días con 5 páginas en la ventana de 14
  assert.equal(L.bookEta(L.migrate({ books: [{ id: "c", title: "C", total: 10 }] }), "c", T), null);
});

test("metas: estado sin fecha, antes de empezar, el día límite y las automáticas", () => {
  const n = (o) => L.normGoal({ title: "x", kind: "numero", target: 10, ...o });
  assert.equal(L.goalProgress(n({}), T).status, "sin-fecha");
  assert.equal(L.goalProgress(n({ current: 10 }), T).status, "hecho");
  assert.equal(L.goalProgress(n({ deadline: "2026-12-01" }), T).status, "en-curso"); // sin «Desde» no hay ritmo esperado
  const future = L.goalProgress(n({ start: "2026-12-01", deadline: "2027-01-01" }), T);
  assert.equal(future.expected, 0); assert.equal(future.status, "en-ritmo");
  assert.equal(L.goalProgress(n({ start: "2026-11-01", deadline: T, current: 5 }), T).status, "atrasada");
  assert.equal(L.goalProgress(n({ start: "2026-11-01", deadline: T, current: 5 }), T).daysLeft, 0);
  assert.equal(L.goalProgress(n({ deadline: "2026-11-03" }), T).status, "vencida");
  // automática sin datos: usa lo apuntado a mano (0) y no inventa
  const a = L.goalProgress(n({ auto: "sportYear" }), T, { sportYear: null });
  assert.equal(a.current, 0); assert.equal(a.label, "0 / 10");
  assert.equal(L.goalProgress(n({ auto: "sportYear" }), T, { sportYear: 4 }).pct, 0.4);
  assert.equal(L.goalProgress(L.normGoal({ title: "h", kind: "hito" }), T).label, "Sin pasos");
});

test("metas iniciales: fechas fijas (B2 y Woxsen) y ninguna nace vencida aunque empieces otro año", () => {
  const now = L.starterGoals(T);
  assert.equal(now.find((g) => g.auto === "frHours").deadline, L.FR_B2_DATE);
  assert.equal(now.find((g) => /Woxsen/.test(g.title)).deadline, "2027-01-06");
  for (const day of ["2026-12-20", "2026-12-31", "2027-02-10", "2027-07-01"]) {
    const gs = L.starterGoals(day);
    for (const g of gs) assert.notEqual(L.goalProgress(g, day).status, "vencida", `${day} ${g.title}`);
    for (const g of gs) if (g.deadline && !/Woxsen/.test(g.title)) assert.ok(L.daysBetween(day, g.deadline) >= 28, `${day} ${g.title} ${g.deadline}`);
  }
  assert.equal(L.starterGoals("2027-02-10").some((g) => /Woxsen/.test(g.title)), false);
  assert.equal(L.starterGoals("2027-07-01").some((g) => g.auto === "frHours"), false);
  assert.equal(L.starterGoals("2026-12-20").find((g) => g.auto === "sportYear").deadline, "2027-12-31");
});

test("cuenta atrás: hoy cuenta como 0 días, etiquetas largas se recortan y el orden es por fecha", () => {
  const c = L.countdowns(T, [{ date: "2027-01-06", label: "B" }, { date: T, label: "Hoy" }, { date: "2026-11-03", label: "Ayer" }]);
  assert.deepEqual(c.map((x) => [x.label, x.days]), [["Hoy", 0], ["B", 63]]);
  const p = L.parseCountdowns("2027-01-06 " + "x".repeat(60));
  assert.deepEqual(p.errors, []); assert.equal(p.list[0].label.length, 40);
  assert.equal(L.parseCountdowns("2027-02-30 Imposible").errors.length, 1);
  assert.equal(L.isISO("2027-02-30"), false); assert.equal(L.isISO("2028-02-29"), true); assert.equal(L.isISO("2027-02-29"), false);
  assert.equal(L.countdowns(T, []).length, 0);
  assert.equal(L.countdowns(T, null).length, 4); // sin lista válida → las de serie
});

test("copia: solo objetos por app (un array o un número dejaría la app ilegible)", () => {
  const p = L.parseBackup(JSON.stringify({ format: "mix-ideas-backup", data: { "panel.v1": [], "ritmo.v1": 5, "paso.v1": { days: {} }, "__proto__": { x: 1 } } }));
  assert.equal(p.ok, true); assert.deepEqual(p.entries.map((e) => e.key), ["paso.v1"]);
  assert.equal(L.parseBackup(JSON.stringify({ format: "mix-ideas-backup", data: { "panel.v1": null } })).ok, false);
  assert.equal(L.parseBackup("null").ok, false); assert.equal(L.parseBackup("[]").ok, false);
  // ida y vuelta de las 9 claves
  const store = Object.fromEntries(L.APP_KEYS.map(({ key }, i) => [key, JSON.stringify({ n: i })]));
  const back = L.parseBackup(JSON.stringify(L.buildBackup((k) => store[k] ?? null, "2026-11-04 19:10")));
  assert.equal(back.entries.length, 9);
  for (const e of back.entries) assert.equal(e.value, store[e.key]);
});

test("datos de ejemplo guardan tu Panel y «Quitar» lo devuelve", () => {
  let mine = L.setDay(L.emptyState(), T, { screenMin: 33 });
  mine.goals = [L.normGoal({ title: "Mía", target: 3 })];
  const demo = L.migrate(JSON.parse(JSON.stringify(L.demoState(T, mine))));
  assert.equal(demo.demo, true); assert.equal(demo.before.days[T].screenMin, 33); assert.equal(demo.before.goals[0].title, "Mía");
  assert.equal(demo.before.demo, undefined);
  // una demo dentro de otra demo no se encadena
  assert.equal(L.demoState(T, demo).before, undefined);
  assert.equal(L.migrate({ demo: true, before: { demo: true } }).before, undefined);
  // la demo es claramente ficticia
  for (const g of L.demoState(T).goals) assert.ok(g.title);
});

test("Idiomas con tipos raros se limpia antes de calcular (minutos en texto, base no numérica)", () => {
  const c = L.cleanLang({ log: [{ date: "2026-11-03", lang: "fr", minutes: "40", type: "lectura" }, null, { date: "x" }], base: { fr: "abc", de: 3 } });
  assert.deepEqual(c.log, [{ date: "2026-11-03", lang: "fr", minutes: 40, type: "lectura" }]);
  assert.equal(c.base.fr, 0); assert.equal(c.base.de, 3);
  assert.equal(L.cleanLang({ log: [], base: { fr: 1e308 } }).base.fr, 0);
  assert.equal(L.cleanLang(null), null);
  const LL = require("../../21-idiomas-plan/logic.js");
  const sum = LL.summary(c.log, "fr", T, c.base.fr);
  assert.ok(Number.isFinite(sum.hours));
});

test("hora local para las marcas de tiempo (nunca UTC)", () => {
  assert.equal(L.stamp(new Date(2026, 10, 4, 0, 30)), "2026-11-04 00:30");
  assert.equal(L.todayISO(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

test("Bevel: recuperación y esfuerzo 0-100 %", () => {
  let s = L.setDay(L.emptyState(), T, { recovery: 72, strain: "45" });
  assert.equal(s.days[T].recovery, 72); assert.equal(s.days[T].strain, 45);
  s = L.migrate({ days: { [T]: { recovery: 140, strain: -1, energy: 3 } } });
  assert.deepEqual(s.days[T], { energy: 3 });
});

test("mes: foto del mes, revisión mensual y mes por defecto", () => {
  let s = L.emptyState();
  s = L.setDay(s, "2026-11-02", { bed: "23:00", wake: "07:00", recovery: 80, journal: { good: "x" } });
  s = L.setDay(s, "2026-11-03", { bed: "00:00", wake: "07:00", recovery: 60, screenMin: 50 });
  s.reviews["2026-W45"] = L.normReview({ score: 8 });
  const m = L.monthSnapshot(s, "2026-11", T, { sport: 4 });
  assert.equal(m.days, 4); assert.equal(m.sleepAvgMin, 450); assert.equal(m.recoveryAvg, 70); assert.equal(m.journalDays, 1);
  assert.equal(m.weekReviews, 1); assert.equal(m.scoreAvg, 8); assert.equal(m.sport, 4);
  assert.equal(L.monthSnapshot(s, "2026-12", T).days, 0);
  assert.equal(L.monthDefault(s, T), "2026-10");
  assert.equal(L.monthDefault(L.migrate({ monthReviews: { "2026-10": { score: 7 } } }), T), "2026-11");
  assert.equal(L.monthDefault(s, "2026-11-20"), "2026-11");
  assert.equal(L.nextYM("2026-12"), "2027-01"); assert.equal(L.prevYM("2027-01"), "2026-12");
  const r = L.normMonthReview({ objectives: ["Francés 30' diarios"], wins: "no", score: 11 });
  assert.deepEqual(r.objectives, ["Francés 30' diarios", "", ""]); assert.deepEqual(r.wins, ["", "", ""]); assert.equal(r.score, null);
  assert.equal(Object.keys(L.migrate({ monthReviews: { "2026-13": {}, "2026-11": { score: 6 } } }).monthReviews).join(), "2026-11");
});

test("informe anual: meses hasta hoy, totales y libros del año", () => {
  let s = L.migrate({ books: [{ id: "b1", title: "Meditaciones", total: 10, progress: 0 }] });
  s = L.logReading(s, "b1", 10, 30, "2026-10-15");
  s = L.setDay(s, "2026-10-14", { bed: "23:00", wake: "07:00" });
  const y = L.yearReport(s, 2026, T, { "2026-10": { sport: 12 }, "2026-11": { sport: 3 } });
  assert.equal(y.months.length, 2); assert.equal(y.totals.pages, 10); assert.equal(y.totals.sport, 15);
  assert.equal(y.totals.sleepAvgMin, 480); assert.deepEqual(y.books.map((b) => b.title), ["Meditaciones"]);
  assert.equal(L.yearReport(s, 2027, T).months.length, 0);
});

test("meditación, aviso de copia y resumen para compartir", () => {
  let s = L.emptyState();
  assert.equal(L.backupDue(s, T), null); // nada que perder todavía
  s = L.setDay(s, "2026-11-02", { meditMin: 10 }); s = L.setDay(s, "2026-11-03", { meditMin: 15 });
  assert.equal(L.meditStreak(s, T), 2);
  assert.deepEqual(L.meditStats(s, L.weekDays(T)), { meditDays: 2, meditMin: 25 });
  assert.equal(L.weekSnapshot(s, T, T).meditMin, 25);
  assert.equal(L.backupDue(s, T), Infinity);
  assert.equal(L.backupDue(L.migrate({ ...s, lastBackup: "2026-11-01" }), T), null);
  assert.equal(L.backupDue(L.migrate({ ...s, lastBackup: "2026-10-20" }), T), 15);
  assert.equal(L.migrate({ days: { [T]: { meditMin: 9999 } } }).days[T].meditMin, 600);
  const txt = L.summaryText("Semana 45", [["Sueño medio", "7 h 50"], ["Pasos", null]], { score: 8, wins: ["5K", ""], priorities: ["Francés"], lesson: "" });
  assert.equal(txt, "## Semana 45\n\n- **Sueño medio:** 7 h 50\n- **Nota:** 8/10\n\n**Victorias**\n- 5K\n\n**Prioridades**\n- Francés\n");
});
