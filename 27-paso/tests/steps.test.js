process.env.TZ = "Europe/Madrid";
// Dates, Spanish formatting, stride/km, step progress and weekly stats.
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const S = (over = {}) => L.normSettings(over, "2026-11-04");
const withSteps = (map) => ({ days: Object.fromEntries(Object.entries(map).map(([d, steps]) => [d, { ...L.emptyDay(), steps }])) });

test("dates: UTC arithmetic across DST, month and year ends; Monday-first weeks", () => {
  assert.strictEqual(L.addDays("2026-10-24", 1), "2026-10-25");
  assert.strictEqual(L.addDays("2026-10-25", 1), "2026-10-26"); // DST end
  assert.strictEqual(L.addDays("2027-03-27", 2), "2027-03-29"); // DST start
  assert.strictEqual(L.addDays("2026-12-31", 1), "2027-01-01");
  assert.strictEqual(L.addDays("2027-03-01", -1), "2027-02-28");
  assert.strictEqual(L.daysBetween("2026-10-20", "2026-10-30"), 10);
  assert.strictEqual(L.dow("2026-11-04"), 3);
  assert.strictEqual(L.dow("2026-11-08"), 7);
  assert.strictEqual(L.weekStart("2026-11-01"), "2026-10-26");
  assert.strictEqual(L.weekStart("2027-01-01"), "2026-12-28");
  assert.deepStrictEqual(L.weekDays("2026-11-04"), ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
  assert.deepStrictEqual(L.monthGrid("2026-11"), { offset: 6, days: 30 });
  assert.deepStrictEqual(L.monthGrid("2027-02"), { offset: 0, days: 28 });
  assert.strictEqual(L.addMonths("2026-12", 1), "2027-01");
  assert.strictEqual(L.addMonths("2027-01", -1), "2026-12");
  assert.ok(L.isISO("2028-02-29") && !L.isISO("2027-02-29") && !L.isISO("2026-13-01") && !L.isISO("2026-1-01"));
  assert.strictEqual(L.todayISO(new Date(2026, 10, 4, 23, 59)), "2026-11-04"); // local getters, never toISOString
  assert.strictEqual(L.nowHM(new Date(2026, 10, 4, 7, 5)), "07:05");
  assert.strictEqual(L.parseHM("18:20"), 1100);
  assert.strictEqual(L.parseHM("25:00"), null);
  assert.strictEqual(L.fmtHM(1100), "18:20");
});

test("Spanish formatting by hand: fmtInt / fmtDec / fmtNum / fmtDur / titleParts", () => {
  assert.strictEqual(L.fmtInt(8420), "8.420");
  assert.strictEqual(L.fmtInt(999), "999");
  assert.strictEqual(L.fmtInt(10000), "10.000");
  assert.strictEqual(L.fmtInt(1234567), "1.234.567");
  assert.strictEqual(L.fmtInt(-1580), "-1.580");
  assert.strictEqual(L.fmtDec(1.1475, 1), "1,1");
  assert.strictEqual(L.fmtDec(12345.678, 2), "12.345,68");
  assert.strictEqual(L.fmtNum(3), "3");
  assert.strictEqual(L.fmtNum(1.5), "1,5");
  assert.strictEqual(L.fmtNum(1.75, 2), "1,75");
  assert.strictEqual(L.fmtNum(10), "10");
  assert.strictEqual(L.fmtDur(95), "1 h 35 min");
  assert.strictEqual(L.fmtDur(60), "1 h");
  assert.strictEqual(L.fmtDur(45), "45 min");
  assert.deepStrictEqual(L.titleParts("2026-11-04"), { weekday: "Miércoles", rest: "4 de noviembre" });
  assert.strictEqual(L.fmtShortDay("2026-11-03"), "Mar 3");
  assert.strictEqual(L.fmtWeekRange("2026-11-04"), "2–8 de noviembre");
  assert.strictEqual(L.fmtWeekRange("2026-10-28"), "26 de octubre – 1 de noviembre");
});

test("stride and km: 175 cm → 0,72625 m; 1.580 pasos → 1,1 km; override respected", () => {
  assert.strictEqual(L.strideM(S()), 0.72625);
  assert.strictEqual(L.fmtDec(L.kmFromSteps(1580, S()), 1), "1,1");
  assert.strictEqual(L.strideM(S({ strideM: 0.8 })), 0.8);
  assert.strictEqual(L.kmFromSteps(10000, S({ strideM: 0.8 })), 8);
  assert.strictEqual(L.strideM(S({ heightCm: 190 })), 190 * 415 / 100000);
  assert.strictEqual(S({ strideM: "" }).strideM, null);
  assert.strictEqual(S({ strideM: "0,75" }).strideM, 0.75);
});

test("stepsProgress: pct clamped, pctLabel 84, met with surplus, labels", () => {
  const s = S();
  const p = L.stepsProgress(8420, s);
  assert.deepStrictEqual([p.pct, p.pctLabel, p.remaining, p.met], [0.842, 84, 1580, false]);
  assert.strictEqual(L.stepsLabel(p), "Te faltan 1.580 · 1,1 km");
  const q = L.stepsProgress(12500, s);
  assert.deepStrictEqual([q.pct, q.pctLabel, q.remaining, q.met, q.surplus], [1, 125, 0, true, 2500]);
  assert.strictEqual(L.stepsLabel(q), "¡Objetivo cumplido! +2.500 pasos");
  assert.strictEqual(L.stepsLabel(L.stepsProgress(10000, s)), "¡Objetivo cumplido!");
  const z = L.stepsProgress(undefined, s);
  assert.deepStrictEqual([z.steps, z.pct, z.remaining], [0, 0, 10000]);
});

test("settings are clamped: step goal 1.000–50.000, height 120–230, threshold to quarters", () => {
  assert.strictEqual(S({ stepGoal: 50 }).stepGoal, 1000);
  assert.strictEqual(S({ stepGoal: 999999 }).stepGoal, 50000);
  assert.strictEqual(S({ stepGoal: "abc" }).stepGoal, 10000);
  assert.strictEqual(S({ heightCm: 90 }).heightCm, 120);
  assert.strictEqual(S({ heightCm: 300 }).heightCm, 230);
  assert.strictEqual(S({ dayMetThreshold: 0.8 }).dayMetThreshold, 0.75);
  assert.strictEqual(S({ proteinTarget: 4.3 }).proteinTarget, 4.5);
  assert.strictEqual(L.stepGoalOf({ stepGoal: 200 }), 1000);
});

test("weekStats: avg of days ≤ today with steps, change vs previous week, null without history", () => {
  const prev = { "2026-10-26": 8600, "2026-10-27": 8600, "2026-10-28": 8600, "2026-10-29": 8600, "2026-10-30": 8600, "2026-10-31": 8600, "2026-11-01": 8600 };
  const cur = { "2026-11-02": 9000, "2026-11-03": 10000, "2026-11-04": 8420, "2026-11-05": 12000 /* future: ignored */ };
  const w = L.weekStats(withSteps({ ...prev, ...cur }), "2026-11-04");
  assert.strictEqual(w.avg, 9140);
  assert.strictEqual(w.prevAvg, 8600);
  assert.strictEqual(w.changePct, 6);
  assert.strictEqual(w.total, 27420);
  assert.deepStrictEqual(w.days.map((d) => [d.isToday, d.future]).slice(1, 4), [[false, false], [true, false], [false, true]]);
  assert.strictEqual(L.weekStats(withSteps(cur), "2026-11-04").changePct, null);
  const lower = L.weekStats(withSteps({ ...prev, "2026-11-02": 8000 }), "2026-11-04");
  assert.strictEqual(lower.changePct, -7);
});

test("weekStats works for the week of 2026-10-26 (right after the DST change)", () => {
  const data = withSteps({ "2026-10-19": 7000, "2026-10-25": 9000, "2026-10-26": 10000, "2026-10-28": 11000 });
  const w = L.weekStats(data, "2026-10-28");
  assert.deepStrictEqual(w.days.map((d) => d.date), ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  assert.deepStrictEqual([w.avg, w.prevAvg, w.changePct], [10500, 8000, 31]);
  const avgs = L.weeklyAverages(data, "2026-10-28", 3);
  assert.deepStrictEqual(avgs, [{ weekStart: "2026-10-12", avg: 0 }, { weekStart: "2026-10-19", avg: 8000 }, { weekStart: "2026-10-26", avg: 10500 }]);
});
