const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const F = require("../logic.js");

test("amounts and dates in Spanish bank format", () => {
  assert.strictEqual(F.parseAmount("-1.234,56"), -1234.56);
  assert.strictEqual(F.parseAmount("1,234.56", "."), 1234.56);
  assert.strictEqual(F.parseAmount("12,00 €"), 12);
  assert.throws(() => F.parseAmount("abc"));
  assert.strictEqual(F.parseDate("03/11/2026"), "2026-11-03");
  assert.strictEqual(F.parseDate("2026-11-03", "YYYY-MM-DD"), "2026-11-03");
  assert.strictEqual(F.parseDate("3/11/26"), "2026-11-03");
  assert.throws(() => F.parseDate("32/13/2026"));
});

test("quoted CSV fields with separator inside", () => {
  assert.deepStrictEqual(F.splitLine('a;"b;c";d', ";"), ["a", "b;c", "d"]);
});

test("categorization by keywords (accent-insensitive)", () => {
  assert.strictEqual(F.categorize("MERCADONA A CORUÑA", -30), "Comida (súper)");
  assert.strictEqual(F.categorize("Ryanair SCQ-BHX", -60), "Transporte");
  assert.strictEqual(F.categorize("algo raro", -5), "Otros");
  assert.strictEqual(F.categorize("algo raro", 5), "Otros ingresos");
  assert.strictEqual(F.categorize("BECA MINISTERIO DE EDUCACION", 400), "Becas");
});

test("parse example bank CSV", () => {
  const txt = fs.readFileSync(path.join(__dirname, "../ejemplos/banco-ejemplo.csv"), "utf8");
  const { rows, errors } = F.parseCSV(txt, {});
  assert.strictEqual(errors.length, 0);
  assert.strictEqual(rows.length, 13);
  assert.strictEqual(rows[4].concept, "BAR O CANTIÑO, CORUÑA");
  assert.strictEqual(rows[4].category, "Comer fuera");
});

test("monthly summary", () => {
  const txt = fs.readFileSync(path.join(__dirname, "../ejemplos/banco-ejemplo.csv"), "utf8");
  const s = F.monthlySummary(F.parseCSV(txt, {}).rows, "2026-10");
  assert.strictEqual(s.income, 650);
  assert.ok(Math.abs(s.expense - 234.51) < 1e-9);
  assert.ok(Math.abs(s.byCat["Comida (súper)"] - 75.58) < 1e-9);
});

test("goal status", () => {
  const g = { target: 3500, deadline: "2027-01-06", contributions: [{ amount: 500 }, { amount: 1000 }] };
  const s = F.goalStatus(g, "2026-11-04");
  assert.strictEqual(s.saved, 1500); assert.strictEqual(s.remaining, 2000);
  assert.strictEqual(s.daysLeft, 63);
  assert.ok(Math.abs(s.perMonth - 2000 / (63 / 30.44)) < 1e-9); // ≈ 966 €/mes
});

test("dedupe on re-import", () => {
  const a = [{ date: "2026-11-01", concept: "X", amount: -1 }];
  const r = F.mergeTransactions(a, [{ date: "2026-11-01", concept: "x", amount: -1 }, { date: "2026-11-02", concept: "y", amount: -2 }]);
  assert.strictEqual(r.added, 1); assert.strictEqual(r.skipped, 1);
});
