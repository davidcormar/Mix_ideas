process.env.TZ = "Europe/Madrid";
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

test("addDays crosses DST changes, month ends and year ends", () => {
  assert.strictEqual(L.addDays("2026-10-24", 1), "2026-10-25");
  assert.strictEqual(L.addDays("2026-10-25", 1), "2026-10-26");   // CEST → CET
  assert.strictEqual(L.addDays("2027-03-27", 2), "2027-03-29");   // CET → CEST
  assert.strictEqual(L.addDays("2026-11-30", 1), "2026-12-01");
  assert.strictEqual(L.addDays("2026-12-31", 1), "2027-01-01");
  assert.strictEqual(L.addDays("2027-03-01", -1), "2027-02-28");
  assert.strictEqual(L.daysBetween("2026-10-24", "2026-10-26"), 2);
  assert.strictEqual(L.daysBetween("2027-03-27", "2027-03-29"), 2);
});

test("weeks run Monday to Sunday", () => {
  assert.strictEqual(L.dow("2026-11-04"), 3);
  assert.strictEqual(L.dow("2026-11-08"), 7);
  assert.strictEqual(L.weekStart("2026-11-01"), "2026-10-26");
  assert.strictEqual(L.weekStart("2027-01-01"), "2026-12-28");
  assert.deepStrictEqual(L.weekDays("2026-11-04"), ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
});

test("monthGrid: Monday-first offset and month length", () => {
  assert.strictEqual(L.monthGrid("2026-11").offset, 6);
  assert.strictEqual(L.monthGrid("2026-11").days, 30);
  assert.deepStrictEqual([L.monthGrid("2027-02").offset, L.monthGrid("2027-02").days], [0, 28]);
  assert.strictEqual(L.addMonths("2026-12", 1), "2027-01");
  assert.strictEqual(L.addMonths("2027-01", -1), "2026-12");
});

test("Spanish number formatting by hand", () => {
  assert.strictEqual(L.fmtInt(8420), "8.420");
  assert.strictEqual(L.fmtInt(999), "999");
  assert.strictEqual(L.fmtInt(10000), "10.000");
  assert.strictEqual(L.fmtInt(1234567), "1.234.567");
  assert.strictEqual(L.fmtDec(1.1475, 1), "1,1");
  assert.strictEqual(L.fmtDec(7.5, 1), "7,5");
  assert.strictEqual(L.fmtDec(1234.5, 1), "1.234,5");
});

test("fmtDur", () => {
  assert.strictEqual(L.fmtDur(95), "1 h 35 min");
  assert.strictEqual(L.fmtDur(60), "1 h");
  assert.strictEqual(L.fmtDur(45), "45 min");
  assert.strictEqual(L.fmtDur(0), "0 min");
  assert.strictEqual(L.fmtDur(330), "5 h 30 min");
});

test("times: parseHM, fmtHM, ceil15", () => {
  assert.strictEqual(L.parseHM("07:20"), 440);
  assert.strictEqual(L.parseHM("24:00"), 1440);
  assert.strictEqual(L.parseHM("25:00"), null);
  assert.strictEqual(L.parseHM("bad"), null);
  assert.strictEqual(L.fmtHM(1350), "22:30");
  assert.strictEqual(L.ceil15(440), 450);
  assert.strictEqual(L.ceil15(450), 450);
});

test("toEpoch is DST-correct and never crashes on non-existent times", () => {
  const H = 3600e3;
  assert.strictEqual(L.toEpoch("2027-03-28", "03:00") - L.toEpoch("2027-03-28", "01:00"), 1 * H);
  assert.strictEqual(L.toEpoch("2026-10-25", "03:00") - L.toEpoch("2026-10-25", "01:00"), 3 * H);
  assert.ok(Number.isFinite(L.toEpoch("2027-03-28", "02:30")));
});

test("titleParts and local today helpers", () => {
  assert.deepStrictEqual(L.titleParts("2026-11-04"), { weekday: "Miércoles", rest: "4 de noviembre" });
  assert.deepStrictEqual(L.titleParts("2027-01-03"), { weekday: "Domingo", rest: "3 de enero" });
  const d = new Date(2026, 10, 4, 0, 30); // local 00:30 → still the 4th (toISOString would say the 3rd)
  assert.strictEqual(L.todayISO(d), "2026-11-04");
  assert.strictEqual(L.nowHM(d), "00:30");
  assert.strictEqual(L.fmtShort("2026-11-03"), "3 nov");
});
