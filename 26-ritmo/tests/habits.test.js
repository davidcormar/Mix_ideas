process.env.TZ = "Europe/Madrid";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../logic.js");

const TODAY = "2026-11-04";
const tick = (data, iso, h) => assert.ok(L.setTick(data, iso, h, true, TODAY > iso ? TODAY : iso));

test("readHabits: missing / invalid / ok", () => {
  assert.strictEqual(L.readHabits(null).status, "missing");
  assert.strictEqual(L.readHabits(null).habits.length, 10);
  assert.strictEqual(L.readHabits("{oops").status, "invalid");
  assert.strictEqual(L.readHabits("[]").status, "invalid");
  assert.strictEqual(L.readHabits('{"habits":[]}').status, "invalid");
  const ok = L.readHabits('{"months":{}}');
  assert.strictEqual(ok.status, "ok");
  assert.deepStrictEqual(ok.habits, L.HABITS_DEFAULT);
  assert.deepStrictEqual(L.readHabits('{"habits":["a","b"],"months":{}}').habits, ["a", "b"]);
});

test("applyHabitMutation: null raw creates the exact 10 default habits", () => {
  const r = L.applyHabitMutation(null, (d) => L.setTick(d, "2026-11-04", 3, true, TODAY));
  assert.ok(r.ok);
  assert.deepStrictEqual(r.data.habits, ["📵 Móvil (0 redes <14:00, máx 1 h)", "🧠 Deep work", "🇫🇷 Francés", "🏃 Deporte", "🥗 Nutrición + 3 L agua",
    "🌙 Rutina de noche + leer", "🤖 ML (plan del día)", "⏰ Levantarse a su hora", "🇬🇧 Inglés", "🧘 Meditar (prueba)"]);
  assert.deepStrictEqual(r.data.months, { "2026-11": { 3: [4] } });
  assert.strictEqual(r.json, JSON.stringify(r.data)); // compact, like 15-habitos
});

test("applyHabitMutation: invalid input is never written", () => {
  assert.strictEqual(L.applyHabitMutation("{not json", () => {}).ok, false);
  assert.strictEqual(L.applyHabitMutation('{"habits":[]}', () => {}).ok, false);
  assert.strictEqual(L.applyHabitMutation('{"months":[]}', () => {}).ok, false);
  assert.strictEqual(L.applyHabitMutation('{"months":{}}', () => false).ok, false);
});

test("applyHabitMutation preserves unknown fields, other months and objectives byte-identically", () => {
  const original = { habits: ["A", "B", "C"], months: { "2026-10": { 0: [1, 2], 2: [31] }, "2026-11": { 1: [2] } },
    objectives: { "2026-10": [{ text: "x", done: true }, { text: "", done: false }, { text: "y", done: false }] }, extra: { deep: [1, { a: 2 }] }, v: 7 };
  const raw = JSON.stringify(original);
  const r = L.applyHabitMutation(raw, (d) => L.setTick(d, "2026-11-04", 0, true, TODAY));
  assert.ok(r.ok);
  const after = JSON.parse(r.json);
  assert.deepStrictEqual(after.months["2026-10"], original.months["2026-10"]);
  assert.deepStrictEqual(after.objectives, original.objectives);
  assert.deepStrictEqual(after.extra, original.extra);
  assert.strictEqual(after.v, 7);
  assert.deepStrictEqual(after.habits, ["A", "B", "C"]);
  assert.deepStrictEqual(after.months["2026-11"], { 0: [4], 1: [2] });
  assert.deepStrictEqual(Object.keys(after), Object.keys(original));
});

test("applyHabitMutation repairs a missing habits list (15-habitos crashes without it)", () => {
  const r = L.applyHabitMutation('{"months":{"2026-11":{"3":[1]}}}', (d) => L.setTick(d, "2026-11-02", 3, true, TODAY));
  assert.ok(r.ok);
  assert.strictEqual(r.data.habits.length, 10);
  assert.deepStrictEqual(r.data.months["2026-11"]["3"], [1, 2]);
});

test("setTick: sorted, unique, ints only; untick keeps []; refuses future and out-of-range", () => {
  const d = { habits: L.HABITS_DEFAULT.slice(), months: { "2026-11": { 2: [5, "3", 3, 40, "x", 1.5] } } };
  assert.ok(L.setTick(d, "2026-11-04", 2, true, TODAY));
  assert.deepStrictEqual(d.months["2026-11"][2], [3, 4, 5]);
  assert.ok(L.setTick(d, "2026-11-04", 2, true, TODAY)); // idempotent
  assert.deepStrictEqual(d.months["2026-11"][2], [3, 4, 5]);
  assert.ok(L.setTick(d, "2026-11-03", 2, false, TODAY));
  assert.ok(L.setTick(d, "2026-11-04", 2, false, TODAY));
  assert.ok(L.setTick(d, "2026-11-05", 2, false, "2026-11-05"));
  assert.deepStrictEqual(d.months["2026-11"][2], []);
  assert.strictEqual(L.setTick(d, "2026-11-05", 2, true, TODAY), false); // future
  assert.strictEqual(L.setTick(d, "2026-11-04", 10, true, TODAY), false);
  assert.strictEqual(L.setTick(d, "2026-11-04", -1, true, TODAY), false);
  assert.strictEqual(L.setTick(d, "2026-11-04", 1.5, true, TODAY), false);
  assert.ok(L.setTick(d, "2026-10-31", 0, true, TODAY));
  assert.deepStrictEqual(d.months["2026-10"], { 0: [31] });
});

test("isTicked compares with Number() (days stored as strings still count)", () => {
  const d = { habits: ["a"], months: { "2026-11": { 0: ["4", "05"] } } };
  assert.ok(L.isTicked(d, "2026-11-04", 0));
  assert.ok(L.isTicked(d, "2026-11-05", 0));
  assert.strictEqual(L.dayScore(d, "2026-11-04"), 1);
  assert.strictEqual(L.isTicked(null, "2026-11-04", 0), false);
});

test("weekPct reads both months when the week crosses a boundary", () => {
  // today 2026-11-01 (Sunday): week 26 Oct … 1 Nov → 7 days × 10 habits = 70 cells, 49 ticks → 70 %
  const d = { habits: L.HABITS_DEFAULT.slice(), months: {} };
  const days = L.datesBetween("2026-10-26", "2026-11-01");
  for (const iso of days) for (let h = 0; h < 7; h++) tick(d, iso, h);
  assert.deepStrictEqual(Object.keys(d.months).sort(), ["2026-10", "2026-11"]);
  assert.strictEqual(L.weekPct(d, "2026-11-01", 10), 70);
  // the spec's 21/30 example: Mon 30 Nov … Wed 2 Dec = 3 days × 10 habits
  const e = { habits: L.HABITS_DEFAULT.slice(), months: {} };
  for (const iso of ["2026-11-30", "2026-12-01", "2026-12-02"]) for (let h = 0; h < 7; h++) assert.ok(L.setTick(e, iso, h, true, "2026-12-02"));
  assert.strictEqual(L.weekPct(e, "2026-12-02", 10), 70);
  // year boundary: week 28 Dec 2026 … 3 Jan 2027
  const f = { habits: ["a"], months: {} };
  for (const iso of L.weekDays("2027-01-03")) assert.ok(L.setTick(f, iso, 0, true, "2027-01-03"));
  assert.strictEqual(L.weekPct(f, "2027-01-03", 1), 100);
});

test("streak counts back across months; today unticked does not break it", () => {
  const d = { habits: ["a", "b"], months: {} };
  for (const iso of ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]) assert.ok(L.setTick(d, iso, 0, true, "2026-11-02"));
  assert.strictEqual(L.streak(d, "2026-11-02", 0), 4);
  assert.ok(L.setTick(d, "2026-11-02", 0, true, "2026-11-02"));
  assert.strictEqual(L.streak(d, "2026-11-02", 0), 5);
  assert.strictEqual(L.streak(d, "2026-11-04", 0), 0);
  assert.strictEqual(L.streak(d, "2026-11-02", 1), 0);
});

test("last7, habitPct and weakest (ties → lower index)", () => {
  const d = { habits: ["a", "b", "c", "d"], months: {} };
  for (let i = 1; i <= 7; i++) { const iso = L.addDays(TODAY, -i); tick(d, iso, 0); tick(d, iso, 3); if (i <= 3) tick(d, iso, 2); }
  tick(d, TODAY, 1);
  assert.deepStrictEqual(L.last7(d, TODAY, 1), [false, false, false, false, false, false, true]);
  assert.strictEqual(L.habitPct(d, L.addDays(TODAY, -1), 0, 7), 100);
  const w = L.weakest(d, TODAY, 3);
  assert.deepStrictEqual(w.map((x) => x.h), [1, 2, 0]); // today's tick on b is ignored (complete days only)
  assert.strictEqual(w[1].pct, 43);
});

test("tipFor maps every default habit and has a fallback", () => {
  assert.match(L.tipFor("📵 Móvil (0 redes <14:00, máx 1 h)"), /fuera de la habitación/);
  assert.match(L.tipFor("🇫🇷 Francés"), /30' del suelo/);
  assert.match(L.tipFor("🤖 ML (plan del día)"), /tarea de ML/);
  assert.match(L.tipFor("🌙 Rutina de noche + leer"), /22:45/);
  assert.match(L.tipFor("⏰ Levantarse a su hora"), /Despertador/);
  assert.match(L.tipFor("Tocar la guitarra"), /2 minutos/);
  assert.strictEqual(L.findHabit(L.HABITS_DEFAULT, L.HABIT_RE.sport), 3);
  assert.strictEqual(L.findHabit(L.HABITS_DEFAULT, L.HABIT_RE.french), 2);
  assert.strictEqual(L.findHabit(["x"], L.HABIT_RE.night), null);
});

test("objectivesOf / setObjective: always 3 items, other months untouched", () => {
  const d = { habits: ["a"], months: {}, objectives: { "2026-10": [{ text: "old", done: true }] } };
  assert.deepStrictEqual(L.objectivesOf(d, "2026-11"), [{ text: "", done: false }, { text: "", done: false }, { text: "", done: false }]);
  assert.strictEqual(d.objectives["2026-11"], undefined); // non-mutating
  assert.ok(L.setObjective(d, "2026-11", 1, { text: "Media maratón" }));
  assert.ok(L.setObjective(d, "2026-11", 1, { done: true }));
  assert.deepStrictEqual(d.objectives["2026-11"], [{ text: "", done: false }, { text: "Media maratón", done: true }, { text: "", done: false }]);
  assert.deepStrictEqual(d.objectives["2026-10"], [{ text: "old", done: true }]);
  assert.strictEqual(L.setObjective(d, "2026-11", 3, { done: true }), false);
  const e = { months: {}, objectives: [] };
  assert.strictEqual(L.setObjective(e, "2026-11", 0, { done: true }), false); // malformed objectives are left alone
});

test("15-habitos compatibility: its validate() accepts our output and stats().daily equals dayScore", (t) => {
  const p = path.resolve(__dirname, "../../15-habitos/app/logic.js");
  if (!fs.existsSync(p)) { t.skip("15-habitos not present"); return; }
  const H = require(p);
  let raw = null;
  const rng = L.mulberry32(7);
  for (let day = 1; day <= 4; day++) for (let h = 0; h < 10; h++) if (rng() < 0.7) {
    const r = L.applyHabitMutation(raw, (d) => L.setTick(d, `2026-11-0${day}`, h, true, TODAY));
    assert.ok(r.ok); raw = r.json;
  }
  raw = L.applyHabitMutation(raw, (d) => L.setObjective(d, "2026-11", 0, { text: "Objetivo", done: true })).json;
  const data = JSON.parse(raw);
  assert.doesNotThrow(() => H.validate(data));
  const st = H.stats(data.months["2026-11"], data.habits.length, "2026-11", TODAY);
  assert.deepStrictEqual(st.daily, [1, 2, 3, 4].map((d) => L.dayScore(data, `2026-11-0${d}`)));
  assert.deepStrictEqual(H.objectives(JSON.parse(raw), "2026-11"), L.objectivesOf(data, "2026-11"));
  const ms = L.monthStats(data, "2026-11", TODAY);
  assert.ok(Math.abs(ms.mean - st.mean) < 1e-12);
});

test("demoHabits: ~75 % over 35 days, exactly 0,3,7,8 today; heat levels", () => {
  const d = L.demoHabits(TODAY);
  assert.strictEqual(L.dayScore(d, TODAY), 4);
  for (const h of [0, 3, 7, 8]) assert.ok(L.isTicked(d, TODAY, h));
  let sum = 0;
  for (let i = 1; i <= 34; i++) sum += L.dayScore(d, L.addDays(TODAY, -i));
  const pct = sum / 340;
  assert.ok(pct > 0.65 && pct < 0.85, String(pct));
  assert.deepStrictEqual(L.demoHabits(TODAY), d); // deterministic
  assert.strictEqual(L.heatLevel(0, 10), 0);
  assert.strictEqual(L.heatLevel(3, 10), 1);
  assert.strictEqual(L.heatLevel(5, 10), 2);
  assert.strictEqual(L.heatLevel(7, 10), 3);
  assert.strictEqual(L.heatLevel(8, 10), 4);
  assert.strictEqual(L.hasAnyTicks({ months: { "2026-11": { 0: [] } } }), false);
  assert.strictEqual(L.hasAnyTicks(d), true);
});
