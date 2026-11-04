process.env.TZ = "Europe/Madrid";
// Day score, month heat map, week met days and the shared sport rule (§4).
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const T = "2026-11-04";
const S = (over = {}) => L.normSettings({ veg: { mode: "fija", fixed: 2 }, ...over }, T);
const day = (steps, protein, veg, waterMl) => ({ ...L.emptyDay(), steps, waterMl, meals: protein || veg ? [{ id: "m", slot: "comida", time: "", desc: "", protein, veg, carbs: 0, fat: 0 }] : [] });

test("dayScore: unregistered → null; 4/4; 3/4 meets 0.75; missing steps count as not met", () => {
  const s = S();
  assert.deepStrictEqual(L.dayScore(L.emptyDay(), s, T).score, null);
  assert.strictEqual(L.dayScore(undefined, s, T).registered, false);
  const full = L.dayScore(day(10000, 5, 2, 3000), s, T);
  assert.strictEqual(full.score, 1);
  assert.deepStrictEqual(full.met, { steps: true, protein: true, veg: true, water: true });
  const three = L.dayScore(day(0, 5, 2, 3000), s, T);
  assert.deepStrictEqual([three.score, three.met.steps, three.registered], [0.75, false, true]);
  assert.ok(L.isDayMet(three.score, s));
  assert.ok(!L.isDayMet(0.5, s));
  assert.ok(!L.isDayMet(null, s));
  assert.ok(!L.isDayMet(0.75, S({ dayMetThreshold: 1 })));
  assert.strictEqual(L.dayScore({ ...L.emptyDay(), waterMl: 250 }, s, T).score, 0); // registered, nothing met
});

test("monthHeat: grid offsets, 28/30/31 days, future flagged, level = round(score × 4)", () => {
  const s = S();
  const data = { days: { "2026-11-01": day(12000, 5, 2, 3000), "2026-11-02": day(9000, 5, 0, 3000), "2026-11-03": day(9000, 0, 0, 500) } };
  const h = L.monthHeat(data, "2026-11", T, s);
  assert.strictEqual(h.offset, 6);
  assert.strictEqual(h.cells.length, 30);
  assert.deepStrictEqual(h.cells.slice(0, 5).map((c) => c.level), [4, 2, 0, "none", "none"]);
  assert.deepStrictEqual(h.cells.slice(0, 5).map((c) => c.future), [false, false, false, false, true]);
  assert.deepStrictEqual([h.metDays, h.elapsedDays], [1, 4]); // the unregistered 4th counts in M, not in N
  assert.deepStrictEqual(h.perObjectivePct, { steps: 25, protein: 50, veg: 25, water: 50 });
  const feb = L.monthHeat({ days: {} }, "2027-02", T, s);
  assert.deepStrictEqual([feb.offset, feb.cells.length, feb.elapsedDays, feb.metDays], [0, 28, 0, 0]);
  assert.ok(feb.cells.every((c) => c.future && c.level === "none"));
  const oct = L.monthHeat({ days: {} }, "2026-10", T, s);
  assert.deepStrictEqual([oct.offset, oct.cells.length, oct.elapsedDays], [3, 31, 31]);
  // every possible offset appears across 2026–2027
  const offsets = new Set();
  for (let m = 0; m < 24; m++) offsets.add(L.monthGrid(L.addMonths("2026-01", m)).offset);
  assert.deepStrictEqual([...offsets].sort(), [0, 1, 2, 3, 4, 5, 6]);
});

test("weekMet counts Monday…today only", () => {
  const s = S();
  const data = { days: { "2026-11-02": day(10000, 5, 2, 3000), "2026-11-03": day(5000, 1, 0, 500), "2026-11-05": day(20000, 9, 9, 9000) } };
  assert.deepStrictEqual(L.weekMet(data, T, s).met, 1);
  assert.deepStrictEqual(L.weekMet(data, T, s).elapsed, 3);
  assert.deepStrictEqual(L.weekMet(data, "2026-11-02", s).elapsed, 1);
});

// §4 shared vectors: week 2026-11-02…08; Deporte ticks 2,3,5; gym 3,4; runs 3,6; Paso passes ritmoDone = null.
const WEEK = L.weekDays("2026-11-02");
const HAB = { habits: L.HABITS_DEFAULT, months: { "2026-11": { 3: [2, "3", 5] } } };
const GYM = [{ date: "2026-11-03", routine: "r5" }, { date: "2026-11-04", routine: "r4" }];
const RUNS = [{ id: "r1", date: "2026-11-03", type: "series", minutes: 40, km: 6.2 }, { id: "r2", date: "2026-11-06", type: "rodaje", minutes: 35, km: 0 }];

test("sportByDay: §4 vector, Paso variant (total 6)", () => {
  const r = L.sportByDay(WEEK, { habits: HAB, sportIdx: 3, gymSessions: GYM, runs: RUNS, ritmoDone: null });
  assert.deepStrictEqual(Object.values(r.byDay), [1, 2, 1, 1, 1, 0, 0]);
  assert.strictEqual(r.total, 6);
  assert.deepStrictEqual(r.sources, { habit: true, gym: true, runs: true, ritmo: false });
  // the Ritmo variant (same code) gives 8 when its done sport tasks are passed
  const ritmo = L.sportByDay(WEEK, { habits: HAB, sportIdx: 3, gymSessions: GYM, runs: RUNS, ritmoDone: { "2026-11-05": 1, "2026-11-07": 2 } });
  assert.deepStrictEqual([Object.values(ritmo.byDay), ritmo.total], [[1, 2, 1, 1, 1, 2, 0], 8]);
  assert.strictEqual(L.sportByDay(WEEK, {}).total, 0);
  assert.strictEqual(L.sportByDay(WEEK, { habits: HAB, sportIdx: null }).total, 0); // "Sin vincular"
});

test("floorStatus: §4 vectors and texts", () => {
  assert.deepStrictEqual(L.floorStatus(1, "2026-11-05"), { state: "falta", need: 2, daysLeft: 4 });
  assert.strictEqual(L.floorStatus(1, "2026-11-07").state, "riesgo");
  assert.strictEqual(L.floorStatus(0, "2026-11-08").state, "riesgo");
  assert.strictEqual(L.floorStatus(3, "2026-11-04").state, "suelo");
  assert.strictEqual(L.floorStatus(5, "2026-11-04").state, "estandar");
  assert.strictEqual(L.floorText(L.floorStatus(1, "2026-11-05")), "Faltan 2 para el suelo");
  assert.strictEqual(L.floorText(L.floorStatus(1, "2026-11-07")), "⚠ Suelo en riesgo: quedan 2 días");
  assert.strictEqual(L.floorText(L.floorStatus(6, "2026-11-07")), "Estándar cumplido 💪");
});

test("sportWeekLines: per-day details for Actividad", () => {
  const lines = L.sportWeekLines(WEEK, { habits: HAB, sportIdx: 3, habitName: "🏃 Deporte", gymSessions: GYM, runs: RUNS });
  assert.deepStrictEqual(lines.map((l) => [l.date, l.n]), [["2026-11-02", 1], ["2026-11-03", 2], ["2026-11-04", 1], ["2026-11-05", 1], ["2026-11-06", 1]]);
  assert.deepStrictEqual(lines[1].items, ["Gimnasio · 5 · Pecho-hombro-tríceps", "Series 40' · 6,2 km", "Hábito Deporte ✓"]);
  assert.deepStrictEqual(lines[2].items, ["Gimnasio · 4 · Espalda-bíceps"]);
  assert.deepStrictEqual(lines[4].items, ["Rodaje Z2 35'"]);
  assert.strictEqual(L.routineLabel("r9"), "r9");
});
