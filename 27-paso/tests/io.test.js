process.env.TZ = "Europe/Madrid";
// CSV import, merging steps, foreign readers (read-only), JSON import/export, migrate and demo data.
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const T = "2026-11-04";

test("parseStepsCSV: header or not, ',' ';' and tab, DD/MM/YYYY, BOM + CRLF, thousand separators", () => {
  assert.deepStrictEqual(L.parseStepsCSV("date,steps\n2026-11-02,9420\n2026-11-03,10100\n").rows,
    [{ date: "2026-11-02", steps: 9420 }, { date: "2026-11-03", steps: 10100 }]);
  assert.deepStrictEqual(L.parseStepsCSV("2026-11-02,9420").rows, [{ date: "2026-11-02", steps: 9420 }]); // no header
  const r = L.parseStepsCSV("﻿fecha;pasos\r\n02/11/2026;8.420\r\n\r\n03-11-2026;1 234\r\n2026/11/04\t7'500\r\n");
  assert.deepStrictEqual(r.rows, [{ date: "2026-11-02", steps: 8420 }, { date: "2026-11-03", steps: 1234 }, { date: "2026-11-04", steps: 7500 }]);
  assert.deepStrictEqual([r.errors, r.duplicates], [[], 0]);
  assert.deepStrictEqual(L.parseStepsCSV("fecha,pasos\n02/11/2026;9.100").rows, [{ date: "2026-11-02", steps: 9100 }]); // separator per line
  assert.deepStrictEqual(L.parseStepsCSV("\"2026-11-02\",\"9420\"").rows, [{ date: "2026-11-02", steps: 9420 }]);
});

test("parseStepsCSV: invalid dates, negative/huge numbers, extra columns → errors with line numbers; duplicates keep the max", () => {
  const r = L.parseStepsCSV("fecha,pasos\n2027-02-30,100\n2026-11-02,-500\n2026-11-03,300000\n2026-11-04,8,420\n2026-11-05,7000\n2026-11-05,9000\n2026-11-05,8000\nhola,1\n2026-11-06,\n");
  assert.deepStrictEqual(r.rows, [{ date: "2026-11-05", steps: 9000 }]);
  assert.strictEqual(r.duplicates, 2);
  assert.deepStrictEqual(r.errors.map((e) => e[0]), [2, 3, 4, 5, 9, 10]);
  assert.match(r.errors[0][1], /fecha no válida/);
  assert.match(r.errors[1][1], /pasos no válidos/);
  assert.match(r.errors[2][1], /máx/);
  assert.strictEqual(r.errors[3][1], "columnas de más (¿separador de miles con coma?)");
  assert.deepStrictEqual(L.parseStepsCSV("").rows, []);
});

test("mergeSteps: replaces (never adds), skips manual days unless overwriteManual, input untouched", () => {
  const data = { version: 1, days: {
    "2026-11-01": { ...L.emptyDay(), steps: 5000, stepsSource: "manual" },
    "2026-11-02": { ...L.emptyDay(), steps: 4000, stepsSource: "health" },
    "2026-11-03": { ...L.emptyDay(), waterMl: 500 },
  } };
  const before = JSON.stringify(data);
  const rows = [{ date: "2026-11-01", steps: 7000 }, { date: "2026-11-02", steps: 9000 }, { date: "2026-11-03", steps: 8000 }, { date: "2026-11-04", steps: 6000 }];
  const m = L.mergeSteps(data, rows, "health");
  assert.strictEqual(JSON.stringify(data), before);
  assert.deepStrictEqual([m.added, m.updated, m.skipped], [2, 1, 1]);
  assert.deepStrictEqual(Object.fromEntries(Object.entries(m.data.days).map(([d, x]) => [d, [x.steps, x.stepsSource]])),
    { "2026-11-01": [5000, "manual"], "2026-11-02": [9000, "health"], "2026-11-03": [8000, "health"], "2026-11-04": [6000, "health"] });
  assert.strictEqual(m.data.days["2026-11-03"].waterMl, 500); // other fields kept
  const o = L.mergeSteps(data, rows, "csv", { overwriteManual: true });
  assert.deepStrictEqual([o.added, o.updated, o.skipped, o.data.days["2026-11-01"].steps], [2, 2, 0, 7000]);
  assert.strictEqual(L.importSummaryText(m), "Importados 3 días (2 nuevos, 1 actualizados, 1 omitidos por ser manuales)");
});

test("readGym / readHabitsSport / readHabitsNutrition: tolerant of null and garbage, valid shapes parsed", () => {
  for (const bad of [null, "", "{", "[]", "42", JSON.stringify({ sessions: "x" })]) assert.deepStrictEqual(L.readGym(bad), []);
  const gym = JSON.stringify({ sessions: [{ date: "2026-11-04", routine: "r4", exercises: [] }, { date: "garbage" }, null, { date: "2026-11-03T22:10:00.000Z", routine: "r5" }], draft: null });
  assert.deepStrictEqual(L.readGym(gym), [{ date: "2026-11-04", routine: "r4" }, { date: "2026-11-03", routine: "r5" }]);
  for (const bad of [null, "nope", "[]", JSON.stringify({ habits: [] }), JSON.stringify({ months: [] })]) {
    assert.strictEqual(L.readHabitsSport(bad), null);
    assert.strictEqual(L.readHabitsNutrition(bad, T), null);
  }
  const hab = JSON.stringify({ months: { "2026-11": { 3: [1, "4", 31, "x"], 4: [4] }, "bad": { 3: [1] } } }); // habits missing → defaults
  const sp = L.readHabitsSport(hab);
  assert.strictEqual(sp.sportIdx, 3);
  assert.deepStrictEqual(sp.ticksByDate, { "2026-11-01": true, "2026-11-04": true }); // 31 Nov does not exist
  assert.deepStrictEqual(L.readHabitsNutrition(hab, T), { idx: 4, name: "🥗 Nutrición + 3 L agua", ticked: true });
  const custom = JSON.stringify({ habits: ["Leer", "Correr"], months: {} });
  assert.deepStrictEqual([L.readHabitsSport(custom).sportIdx, L.readHabitsNutrition(custom, T).idx], [null, null]); // "Sin vincular"
});

test("validateImport / parseImport: malformed rejected, bundle or raw accepted, never throws", () => {
  assert.strictEqual(L.parseImport("{nope", T).ok, false);
  assert.strictEqual(L.parseImport("[]", T).error, "no contiene un objeto de datos");
  assert.strictEqual(L.validateImport({ runs: [] }, T).error, "falta 'days'");
  assert.match(L.validateImport({ days: { "2026-13-01": {} }, runs: [] }, T).error, /fecha no válida/);
  assert.match(L.validateImport({ days: { "2026-11-01": { meals: {} } }, runs: [] }, T).error, /meals/);
  assert.match(L.validateImport({ days: {}, runs: {} }, T).error, /runs/);
  assert.match(L.validateImport({ app: "ritmo", data: {} }, T).error, /no es una copia de Paso/);
  const raw = { days: { "2026-11-01": { steps: "8420", meals: [{ slot: "cena", protein: 2 }] } }, runs: [{ date: "2026-11-01", type: "x", km: "6,2" }, { date: "bad" }] };
  const ok = L.validateImport(raw, T);
  assert.ok(ok.ok);
  assert.strictEqual(ok.data.days["2026-11-01"].steps, 8420);
  assert.strictEqual(ok.data.days["2026-11-01"].stepsSource, "manual");
  assert.deepStrictEqual([ok.data.runs.length, ok.data.runs[0].type, ok.data.runs[0].km], [1, "otro", 6.2]);
  const bundle = L.exportBundle(ok.data, "2026-11-04T17:20:00.000Z");
  assert.deepStrictEqual([bundle.app, bundle.version, bundle.exportedAt], ["paso", 1, "2026-11-04T17:20:00.000Z"]);
  const back = L.parseImport(JSON.stringify(bundle), T);
  assert.deepStrictEqual(back.data, ok.data); // round trip
});

test("migrate: partial or garbage data is filled with valid defaults", () => {
  const m = L.migrate({}, T);
  assert.deepStrictEqual(Object.keys(m), ["version", "settings", "days", "runs", "imports"]);
  assert.deepStrictEqual(m.settings, { ...L.DEFAULT_SETTINGS, veg: { ...L.DEFAULT_SETTINGS.veg, rampStart: T } });
  assert.deepStrictEqual(L.migrate(null, T), m);
  const p = L.migrate({ settings: { name: "  ", stepGoal: "12000", veg: { mode: "fija" }, healthSources: { a: true, b: "x" } }, days: { x: {}, "2026-11-01": { waterMl: -50, dayType: "raro", meals: [null, { slot: "comida", desc: 5 }] } } }, T, { id: (p) => p + "_t" });
  assert.deepStrictEqual([p.settings.name, p.settings.stepGoal, p.settings.veg.mode, p.settings.veg.final, p.settings.healthSources], ["David", 12000, "fija", 4, { a: true }]);
  assert.deepStrictEqual(Object.keys(p.days), ["2026-11-01"]);
  assert.deepStrictEqual(p.days["2026-11-01"], { steps: 0, stepsSource: null, waterMl: 0, dayType: null, meals: [{ id: "m_t", slot: "comida", time: "", desc: "", protein: 0, veg: 0, carbs: 0, fat: 0 }] });
});

test("demoData: deterministic, valid, today = 8.420 steps and 3 meals, last week ≈ 8.600 so the chip shows ↑", () => {
  const d = L.demoData(T);
  assert.deepStrictEqual(d, L.demoData(T));
  const v = L.validateImport(JSON.parse(JSON.stringify(d)), T);
  assert.ok(v.ok);
  assert.deepStrictEqual(v.data, d); // already normalised
  const today = d.days[T];
  assert.deepStrictEqual([today.steps, today.waterMl, today.meals.length, L.mealsCount(today)], [8420, 1500, 3, 3]);
  assert.deepStrictEqual(today.meals.map((m) => [m.slot, m.time, m.desc, m.protein, m.veg, m.carbs, m.fat]), [
    ["desayuno", "08:10", "Avena, yogur y fruta", 1, 0, 1, 1],
    ["comida", "14:00", "Pollo, arroz y verdura", 2, 1, 2, 1],
    ["merienda", "17:30", "Tostada y café", 0, 0, 1, 1],
  ]);
  const w = L.weekStats(d, T);
  assert.strictEqual(w.prevAvg, 8600);
  assert.ok(w.changePct > 0);
  assert.strictEqual(d.settings.veg.rampStart, L.addDays(T, -20));
  assert.strictEqual(Object.keys(d.days).length, 46);
  const steps = Object.values(d.days).map((x) => x.steps);
  assert.ok(steps.every((s) => s >= 5000 && s <= 13000));
  assert.ok(Object.values(d.days).every((x) => x.dayType === null && x.meals.length >= 3 && x.meals.length <= 4));
  assert.ok(Object.values(d.days).every((x) => x.waterMl >= 1500 && x.waterMl <= 3200));
  assert.ok(d.runs.length >= 12 && d.runs.every((r) => r.date < T));
  // vegetables really are the weak point in the demo: lowest share of days met in the last full month
  const h = L.monthHeat(d, "2026-10", T, d.settings).perObjectivePct;
  assert.ok(h.veg <= Math.min(h.protein, h.water), JSON.stringify(h));
});
