const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const E = (date, minutes, type = "gramatica", lang = "fr") => ({ date, minutes, type, lang });

test("carry-over: a missed day adds its floor to the next one", () => {
  const log = [E("2026-10-15", 30), /* 16 missed */ E("2026-10-17", 30)];
  const p = L.pending(log, "fr", "2026-10-18");
  assert.strictEqual(p.owed, 30);            // 16th still owed after 17th's 30'
  assert.strictEqual(p.todayRequired, 60);
  assert.strictEqual(p.daysBelowFloor, 1);
});

test("carry-over is paid back by doing more", () => {
  const log = [E("2026-10-15", 0), E("2026-10-16", 60), E("2026-10-17", 30)];
  assert.strictEqual(L.pending(log, "fr", "2026-10-18").owed, 0);
});

test("extras do not count", () => {
  const log = [E("2026-10-15", 30, "extra")];
  assert.strictEqual(L.pending(log, "fr", "2026-10-16").owed, 30);
  assert.strictEqual(L.summary(log, "fr", "2026-10-16").hours, 0);
});

test("summary: required pace and projection", () => {
  const log = [];
  for (let i = 0; i < 20; i++) log.push(E(L.addDays("2026-10-15", i), 60, i % 2 ? "escritura" : "escucha"));
  const s = L.summary(log, "fr", "2026-11-03");
  assert.strictEqual(s.hours, 20);
  assert.ok(Math.abs(s.pace - 60) < 1e-9);
  assert.ok(s.requiredPerDay > 60 * 2);       // 580 h left in ~214 days → ~163 min/day
  assert.strictEqual(s.onTrack, false);
  assert.ok(Math.abs(s.productionShare - 0.5) < 1e-9);
});

test("next session follows the 7-cycle", () => {
  assert.strictEqual(L.nextSession([], "fr").type, "gramatica");
  const log = ["gramatica", "escucha", "lectura"].map((t, i) => E(L.addDays("2026-10-15", i), 60, t));
  assert.strictEqual(L.nextSession(log, "fr").type, "gramatica");      // G2
  const full = ["gramatica", "escucha", "lectura", "gramatica", "escucha", "escritura", "conversacion"].map((t, i) => E(L.addDays("2026-10-15", i), 60, t));
  assert.strictEqual(L.nextSession(full, "fr").type, "gramatica");     // new cycle
  assert.strictEqual(L.nextSession(full.slice(0, 5), "fr").type, "escritura");
});

test("German has no debt before it starts", () => {
  assert.strictEqual(L.pending([], "de", "2026-11-04").owed, 0);
});

test("validation", () => {
  assert.throws(() => L.validate({ log: [{ date: "x", lang: "fr", minutes: 3 }] }));
  assert.ok(L.validate({ log: [E("2026-10-15", 30)] }));
});

test("prior hours count towards the target", () => {
  const a = L.summary([], "fr", "2026-11-04", 0), b = L.summary([], "fr", "2026-11-04", 150);
  assert.strictEqual(b.remainingH, a.remainingH - 150);
});
