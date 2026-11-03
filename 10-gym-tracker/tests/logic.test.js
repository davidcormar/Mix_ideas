const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const S = (date, id, sets) => ({ date, routine: "r1", exercises: [{ id, sets: sets.map(([weight, reps]) => ({ weight, reps })) }] });

test("Epley 1RM", () => {
  assert.strictEqual(L.e1rm(100, 1), 100);
  assert.ok(Math.abs(L.e1rm(60, 10) - 80) < 1e-9);
  assert.strictEqual(L.e1rm(0, 10), 0);
});

test("routines reference known exercises and set counts", () => {
  assert.strictEqual(L.ROUTINES.length, 5);
  for (const r of L.ROUTINES) for (const [id, n] of r.items) { assert.ok(L.EXERCISES[id], id); assert.ok(n >= 2 && n <= 3); }
  assert.deepStrictEqual(L.ROUTINES[1].items.at(-1), ["press_plano_maquina", 2]);
});

test("double progression: up, same, down", () => {
  // compound range 6-10
  let s = [S("2026-11-01", "remo_t", [[50, 10], [50, 10], [50, 10]])];
  assert.strictEqual(L.suggestion(s, "remo_t").action, "up");
  assert.strictEqual(L.suggestion(s, "remo_t").weight, 52.5);
  s = [S("2026-11-01", "remo_t", [[50, 8], [50, 7], [50, 6]])];
  const sg = L.suggestion(s, "remo_t");
  assert.strictEqual(sg.action, "same"); assert.strictEqual(sg.reps, 9);
  s = [S("2026-11-01", "remo_t", [[50, 4], [50, 3]])];
  assert.strictEqual(L.suggestion(s, "remo_t").action, "down");
  assert.strictEqual(L.suggestion([], "remo_t").weight, null);
});

test("personal records across sessions", () => {
  const s = [S("2026-11-01", "peck_deck", [[40, 12], [40, 10]]), S("2026-11-05", "peck_deck", [[45, 8]]), S("2026-11-08", "peck_deck", [[42.5, 14]])];
  const pr = L.personalRecords(s, "peck_deck");
  assert.strictEqual(pr.weight, 45); assert.strictEqual(pr.weight_date, "2026-11-05");
  assert.strictEqual(pr.e1rm_date, "2026-11-08"); // 42.5*(1+14/30)=62.3 > 45*(1+8/30)=57
  assert.strictEqual(pr.volume_date, "2026-11-01"); // 880
});

test("history is chronological and skips empty sets", () => {
  const s = [S("2026-11-05", "remo_t", [[50, 8]]), S("2026-11-01", "remo_t", [[0, 0]]), S("2026-11-03", "remo_t", [[48, 9]])];
  assert.deepStrictEqual(L.exerciseHistory(s, "remo_t").map((h) => h.date), ["2026-11-03", "2026-11-05"]);
});

test("import validation", () => {
  assert.throws(() => L.validateImport({}));
  assert.ok(L.validateImport({ sessions: [{ date: "2026-11-01", exercises: [] }] }));
});
