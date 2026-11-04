process.env.TZ = "Europe/Madrid";
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const TODAY = "2026-11-04";

test("parseImport: garbage → error, nothing accepted", () => {
  for (const t of ["", "not json", "[]", "42", '{"hello":"world"}', JSON.stringify({ app: "ritmo", ritmo: { settings: {} } })]) {
    const r = L.parseImport(t, TODAY);
    assert.strictEqual(r.ok, false, t);
    assert.ok(r.error);
  }
  assert.match(L.parseImport("x".repeat(5e6 + 1), TODAY).error, /demasiado grande/);
});

test("parseImport: raw object and bundle; invalid habitos → null + warning", () => {
  const raw = { settings: { dayStart: "06:30" }, tasks: [{ id: "t1", title: "Hola", category: "resto" }] };
  const r = L.parseImport(JSON.stringify(raw), TODAY);
  assert.ok(r.ok);
  assert.strictEqual(r.ritmo.settings.dayStart, "06:30");
  assert.strictEqual(r.ritmo.tasks[0].title, "Hola");
  assert.strictEqual(r.habitos, null);
  const bundle = L.exportBundle(r.ritmo, '{"months":[]}', "2026-11-04T18:00:00Z");
  assert.strictEqual(bundle.app, "ritmo");
  assert.strictEqual(bundle.habitos, null);
  const b2 = L.parseImport(JSON.stringify({ ...bundle, habitos: { months: "nope" } }), TODAY);
  assert.ok(b2.ok);
  assert.strictEqual(b2.habitos, null);
  assert.deepStrictEqual(b2.warnings, ["Hábitos ignorados: formato no válido"]);
  const good = L.exportBundle(r.ritmo, JSON.stringify({ habits: ["a"], months: { "2026-11": { 0: [1] } } }), "2026-11-04T18:00:00Z");
  const b3 = L.parseImport(JSON.stringify(good), TODAY);
  assert.deepStrictEqual(b3.habitos.months, { "2026-11": { 0: [1] } });
  assert.deepStrictEqual(b3.warnings, []);
});

test("migrate({}) gives a valid state with first-run defaults", () => {
  const s = L.migrate({}, TODAY);
  assert.strictEqual(s.version, 1);
  assert.deepStrictEqual(s.settings.fixedWeekly, []);
  assert.strictEqual(s.settings.frenchCountFrom, TODAY);
  assert.deepStrictEqual(s.settings.habitLinks, { sport: 3, french: 2 });
  assert.strictEqual(s.routines.length, 2);
  assert.strictEqual(s.routines[1].habitIndex, 5);
  assert.deepStrictEqual(s.tasks, []);
  assert.deepStrictEqual(L.migrate(null, TODAY), L.emptyState(TODAY));
  // habit links are auto-detected by name, never by fixed index
  const other = L.emptyState(TODAY, ["Leer", "Correr: deporte", "Noche sin pantallas", "Francais"]);
  assert.deepStrictEqual(other.settings.habitLinks, { sport: 1, french: null });
  assert.strictEqual(other.routines[1].habitIndex, 2);
});

test("migrate coerces bad values and drops tasks without id or title", () => {
  const s = L.migrate({
    settings: { dayStart: "99:00", marginMin: -5, trainingPreference: "noche", bestFocus: ["23:00", "20:00"], reminders: { enabled: false, leadMin: 10 },
      habitLinks: { sport: null, french: 7 }, fixedWeekly: [{ title: "Clases", days: [1, 9, "2"], start: "09:00", end: "14:30" }, { title: "" }] },
    tasks: [
      { id: "a", title: "Ok", category: "nope", time: "25:61", status: "zombie", durationMin: 5000, weight: 50 },
      { id: "b", title: "Entrega", category: "entrega", date: "2026-02-30", due: "2026-11-10", weight: "abc", time: "7:05" },
      { id: "", title: "sin id" }, { id: "c" }, { id: "d", title: "   " }, { id: "a", title: "duplicada" }, "basura",
    ],
    routines: [{ id: "manana", name: "", items: [{ id: "m1", text: "Agua" }, { id: "m1", text: "dup" }, { text: "sin id" }] }],
    routineLog: { "2026-11-04": { manana: ["m1", 3] }, "bad": {} },
  }, TODAY);
  assert.strictEqual(s.settings.dayStart, "07:00");
  assert.strictEqual(s.settings.marginMin, 30);
  assert.strictEqual(s.settings.trainingPreference, "tarde");
  assert.deepStrictEqual(s.settings.bestFocus, ["20:00", "23:00"]);
  assert.deepStrictEqual(s.settings.reminders, { enabled: false, leadMin: 10 });
  assert.deepStrictEqual(s.settings.habitLinks, { sport: null, french: 7 });
  assert.deepStrictEqual(s.settings.fixedWeekly, [{ id: "fw_1", title: "Clases", days: [1, 2], start: "09:00", end: "14:30" }]);
  assert.deepStrictEqual(s.tasks.map((t) => t.id), ["a", "b"]);
  const [a, b] = s.tasks;
  assert.deepStrictEqual([a.category, a.time, a.status, a.durationMin, a.weight, a.due], ["resto", null, "open", 720, null, null]);
  assert.deepStrictEqual([b.date, b.due, b.weight, b.time], [null, "2026-11-10", 10, "07:05"]);
  assert.deepStrictEqual(s.routines, [{ id: "manana", name: "Mañana", time: "07:00", durationMin: 20, habitIndex: null, items: [{ id: "m1", text: "Agua" }] }]);
  assert.deepStrictEqual(s.routineLog, { "2026-11-04": { manana: ["m1"] } });
  assert.deepStrictEqual(L.migrate(s, TODAY), s); // idempotent
});

test("demoState: deterministic, today's layout and history as specified", () => {
  const s = L.demoState(TODAY);
  assert.deepStrictEqual(L.demoState(TODAY), s);
  assert.deepStrictEqual(L.migrate(JSON.parse(JSON.stringify(s)), TODAY), s);
  const timed = L.dayBlocks(s, TODAY).timed.filter((b) => b.taskId).map((b) => `${L.fmtHM(b.start)} ${b.title}`);
  assert.deepStrictEqual(timed, ["07:30 Rodaje Z2 40'", "16:00 Responder correos de la práctica", "17:00 Francés · Escritura",
    "20:00 Práctica de Señales: filtros FIR", "22:15 Miniproyecto F1: cargar datos de vueltas"]);
  const t = (title) => s.tasks.find((x) => x.title === title);
  assert.strictEqual(t("Rodaje Z2 40'").status, "done");
  assert.deepStrictEqual([t("Práctica de Señales: filtros FIR").due, t("Práctica de Señales: filtros FIR").weight], ["2026-11-07", 20]);
  assert.strictEqual(t("Comprar zapatillas de series").time, null);
  assert.deepStrictEqual([t("Pedir cita en Vacunación Internacional").date, t("Fuerza: tirón").date, t("Fuerza: tirón").time, t("Vuelo a Londres").date],
    ["2026-11-03", "2026-11-05", "19:00", "2026-11-19"]);
  assert.strictEqual(s.settings.frenchCountFrom, "2026-10-22");
  const frDays = new Set(s.tasks.filter((x) => x.category === "frances" && x.status === "done").map((x) => x.doneOn));
  assert.strictEqual(frDays.size, 10);
  assert.deepStrictEqual(L.ritmoSportDone(s).sort(), ["2026-11-02", "2026-11-03", "2026-11-04"]);
  assert.strictEqual(Object.keys(s.routineLog).length, 14);
  assert.ok(L.routineProgress(s, "manana", TODAY).complete);
  assert.deepStrictEqual(s.settings.fixedWeekly[0].days, [1, 2, 3, 4, 5]);
});

test("esc renders hostile titles as text", () => {
  assert.strictEqual(L.esc('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.strictEqual(L.esc("Tom & 'Jerry'"), "Tom &amp; &#39;Jerry&#39;");
  assert.strictEqual(L.esc(null), "");
});
