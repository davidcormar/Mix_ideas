const test = require("node:test");
const assert = require("node:assert");
const H = require("../app/logic.js");

test("days and elapsed days", () => {
  assert.strictEqual(H.daysIn("2026-11"), 30);
  assert.strictEqual(H.daysIn("2027-02"), 28);
  assert.strictEqual(H.elapsedDays("2026-11", "2026-11-04"), 4);
  assert.strictEqual(H.elapsedDays("2026-10", "2026-11-04"), 31);
  assert.strictEqual(H.elapsedDays("2026-12", "2026-11-04"), 0);
});

test("toggle keeps sorted unique days", () => {
  const m = {};
  H.toggle(m, 0, 3); H.toggle(m, 0, 1); H.toggle(m, 0, 3);
  assert.deepStrictEqual(m[0], [1]);
});

test("stats: mean, streaks, weakest", () => {
  const m = { 0: [1, 2, 3, 4], 1: [1, 3, 4], 2: [] };
  const s = H.stats(m, 3, "2026-11", "2026-11-04", 2);
  assert.deepStrictEqual(s.daily, [2, 1, 2, 2]);
  assert.strictEqual(s.mean, 7 / 4);
  assert.strictEqual(s.daysOnGoal, 3);
  assert.strictEqual(s.perHabit[0].best, 4); assert.strictEqual(s.perHabit[0].current, 4);
  assert.strictEqual(s.perHabit[1].best, 2); assert.strictEqual(s.perHabit[1].current, 2);
  assert.strictEqual(s.weakest.h, 2);
});

test("current streak not broken by today being unticked yet", () => {
  const s = H.stats({ 0: [1, 2, 3] }, 1, "2026-11", "2026-11-04");
  assert.strictEqual(s.perHabit[0].current, 3);
});

test("three monthly objectives are created and preserved", () => {
  const d = { months: {} };
  const ob = H.objectives(d, "2026-12");
  assert.strictEqual(ob.length, 3);
  ob[1].text = "Media maratón: elegir carrera"; ob[1].done = true;
  assert.deepStrictEqual(H.objectives(d, "2026-12")[1], { text: "Media maratón: elegir carrera", done: true });
  assert.strictEqual(H.objectives(d, "2027-01")[0].text, "");
});
