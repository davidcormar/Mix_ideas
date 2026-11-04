process.env.TZ = "Europe/Madrid";
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const WEEK = L.weekDays("2026-11-02");
function vectors() {
  const habits = { habits: L.HABITS_DEFAULT.slice(), months: { "2026-11": { 3: [2, 3, 5] } } };
  return {
    habits, sportIdx: 3,
    gymSessions: [{ date: "2026-11-03" }, { date: "2026-11-04" }],
    runs: [{ date: "2026-11-03" }, { date: "2026-11-06" }],
    ritmoDone: ["2026-11-05", "2026-11-07", "2026-11-07"],
  };
}

test("sportByDay: shared §4 vectors (Ritmo variant, total 8)", () => {
  const r = L.sportByDay(WEEK, vectors());
  assert.deepStrictEqual(WEEK.map((d) => r.byDay[d]), [1, 2, 1, 1, 1, 2, 0]);
  assert.strictEqual(r.total, 8);
  assert.deepStrictEqual(r.sources, { habit: true, gym: true, runs: true, ritmo: true });
});

test("sportByDay: shared §4 vectors (Paso variant, no Ritmo tasks, total 6)", () => {
  const r = L.sportByDay(WEEK, { ...vectors(), ritmoDone: null });
  assert.deepStrictEqual(WEEK.map((d) => r.byDay[d]), [1, 2, 1, 1, 1, 0, 0]);
  assert.strictEqual(r.total, 6);
  assert.strictEqual(r.sources.ritmo, false);
  // ritmoDone may also come as a {iso:n} map or as task-like objects
  assert.strictEqual(L.sportByDay(WEEK, { ...vectors(), ritmoDone: { "2026-11-05": 1, "2026-11-07": 2 } }).total, 8);
  assert.strictEqual(L.sportByDay(WEEK, { ...vectors(), ritmoDone: [{ doneOn: "2026-11-07" }, { doneOn: "2026-11-07" }, { doneOn: "2026-11-05" }] }).total, 8);
  assert.strictEqual(L.sportByDay(WEEK, {}).total, 0);
});

test("floorStatus: shared §4 vectors", () => {
  assert.deepStrictEqual(L.floorStatus(1, "2026-11-05"), { state: "falta", need: 2, daysLeft: 4 });
  assert.strictEqual(L.floorStatus(1, "2026-11-07").state, "riesgo");
  assert.strictEqual(L.floorStatus(0, "2026-11-08").state, "riesgo");
  assert.strictEqual(L.floorStatus(3, "2026-11-04").state, "suelo");
  assert.strictEqual(L.floorStatus(5, "2026-11-04").state, "estandar");
});

test("frenchStatus (idiomas source) matches 21-idiomas pending()", () => {
  const S = L.DEFAULT_SETTINGS;
  const E = (date, minutes, type = "gramatica", lang = "fr") => ({ date, minutes, type, lang });
  const r = L.frenchStatus({ idiomas: { log: [E("2026-10-15", 30), E("2026-10-17", 30)] }, tasks: [] }, "2026-10-18", S);
  assert.deepStrictEqual([r.source, r.owed, r.todayRequired, r.doneToday], ["idiomas", 30, 60, 0]);
  // extras and other languages do not count
  const x = L.frenchStatus({ idiomas: { log: [E("2026-10-15", 30, "extra"), E("2026-10-15", 30, "gramatica", "de")] } }, "2026-10-16", S);
  assert.strictEqual(x.owed, 30);
  // before the start date: owed 0, required = floor
  assert.deepStrictEqual(L.frenchStatus({ idiomas: { log: [] } }, "2026-10-10", S).todayRequired, 30);
  // cross-check against the real 21-idiomas implementation when present
  const fs = require("node:fs"), path = require("node:path");
  const p = path.resolve(__dirname, "../../21-idiomas-plan/logic.js");
  if (fs.existsSync(p)) {
    const I = require(p);
    const rng = L.mulberry32(11);
    const log = [];
    for (let i = 0; i < 25; i++) if (rng() < 0.7) log.push(E(L.addDays("2026-10-15", i), [10, 20, 30, 45, 60][Math.floor(rng() * 5)], rng() < 0.2 ? "extra" : "escucha"));
    for (const today of ["2026-10-20", "2026-11-04", "2026-11-09"]) {
      const a = I.pending(log, "fr", today), b = L.frenchStatus({ idiomas: { log } }, today, S);
      assert.deepStrictEqual([b.owed, b.todayRequired], [a.owed, a.todayRequired], today);
    }
  }
});

test("frenchStatus falls back to Ritmo tasks, counting from frenchCountFrom", () => {
  const S = { ...L.DEFAULT_SETTINGS, frenchCountFrom: "2026-11-01" };
  const tasks = [
    { status: "done", category: "frances", doneOn: "2026-10-20", durationMin: 60 },   // before counting starts
    { status: "done", category: "frances", doneOn: "2026-11-01", durationMin: 45 },
    { status: "open", category: "frances", date: "2026-11-02", durationMin: 30 },
    { status: "done", category: "frances", doneOn: "2026-11-04", durationMin: 20 },
  ];
  const r = L.frenchStatus({ idiomas: null, tasks }, "2026-11-04", S);
  // 1 Nov: 45 ≥ 30 → 0; 2 Nov: +30; 3 Nov: +30 → owed 60; today 30 + 60 − 20 = 70
  assert.deepStrictEqual([r.source, r.start, r.owed, r.todayRequired, r.doneToday], ["ritmo", "2026-11-01", 60, 70, 20]);
  assert.strictEqual(L.frenchStatus({ tasks }, "2026-10-31", S).owed, 0);
});

test("frenchNextType follows the 7-session cycle", () => {
  const E = (date, type) => ({ date, minutes: 30, type, lang: "fr" });
  assert.strictEqual(L.frenchNextType([]), "gramatica");
  assert.strictEqual(L.frenchNextType([E("2026-10-15", "gramatica")]), "escucha");
  const cyc = L.FR_CYCLE.map((t, i) => E(L.addDays("2026-10-15", i), t));
  assert.strictEqual(L.frenchNextType(cyc.slice(0, 5)), "escritura");
  assert.strictEqual(L.frenchNextType(cyc.slice(0, 6)), "conversacion");
  assert.strictEqual(L.frenchNextType(cyc), "gramatica");
  assert.strictEqual(L.frenchNextType([E("2026-10-15", "gramatica"), E("2026-10-16", "extra")]), "escucha");
  assert.strictEqual(L.LABEL[L.frenchNextType(cyc.slice(0, 5))], "Escritura");
});

test("foreign readers never throw: null/garbage → null", () => {
  for (const f of [L.readGym, L.readIdiomas, L.readFinanzas, L.readPaso]) {
    for (const raw of [null, undefined, "", "{", "[]", "null", "42", '{"x":1}']) assert.strictEqual(f(raw, "2026-11-04"), null, `${f.name}(${raw})`);
  }
  assert.strictEqual(L.readIdiomas(JSON.stringify({ log: [{ date: "2026-11-01", lang: "xx", minutes: 30 }] })), null);
  assert.strictEqual(L.readPaso(JSON.stringify({ days: [] }), "2026-11-04"), null);
});

test("readGym: sessions this week, last session and routine names", () => {
  const raw = JSON.stringify({ sessions: [
    { date: "2026-10-30", routine: "r2", exercises: [] }, { date: "2026-11-03", routine: "r5", exercises: [] },
    { date: "2026-11-02", routine: "r9", exercises: [] }, { date: "bad" }], draft: null });
  const g = L.readGym(raw, "2026-11-04");
  assert.strictEqual(g.thisWeek, 2);
  assert.deepStrictEqual(g.last, { date: "2026-11-03", routine: "r5", name: "Pecho-hombro-tríceps" });
  assert.strictEqual(g.sessions.find((s) => s.routine === "r9").name, "r9");
  assert.strictEqual(g.sessions.length, 3);
});

test("readFinanzas: goal pct = min(Σ contributions / target, 1)", () => {
  const raw = JSON.stringify({ txs: [], csv: {}, goals: [
    { id: "woxsen", name: "Intercambio Woxsen (India)", target: 3500, deadline: "2027-01-06", contributions: [{ date: "2026-11-01", amount: 1200 }] },
    { id: "x", name: "Pasada", target: 100, deadline: "2026-12-01", contributions: [{ amount: 80 }, { amount: 70 }] }] });
  const f = L.readFinanzas(raw, "2026-11-04");
  assert.strictEqual(f.goals[0].saved, 1200);
  assert.ok(Math.abs(f.goals[0].pct - 1200 / 3500) < 1e-12);
  assert.strictEqual(f.goals[1].pct, 1);
  assert.strictEqual(L.fmtInt(f.goals[0].saved), "1.200");
});

test("readPaso: steps today, goal, %, main meals and runs", () => {
  const raw = JSON.stringify({ version: 1, settings: { stepGoal: 10000 }, days: { "2026-11-04": { steps: 8420, meals: [
    { slot: "desayuno" }, { slot: "comida" }, { slot: "comida" }, { slot: "merienda" }, { slot: "extra" }] } },
    runs: [{ date: "2026-11-03", type: "series" }, { date: "oops" }] });
  assert.deepStrictEqual(L.readPaso(raw, "2026-11-04"), { stepsToday: 8420, goal: 10000, pct: 84, meals: 3, runs: [{ date: "2026-11-03", type: "series" }] });
  const empty = L.readPaso(JSON.stringify({ days: {} }), "2026-11-04");
  assert.deepStrictEqual([empty.stepsToday, empty.goal, empty.meals], [0, 10000, 0]);
});
