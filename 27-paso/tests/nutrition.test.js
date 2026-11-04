process.env.TZ = "Europe/Madrid";
// Hand portions (no calories): veg ramp, targets per day type, meals, recipes.
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const T = "2026-11-04";
const S = (over = {}) => L.normSettings(over, T);
const meal = (slot, p = 0, v = 0, c = 0, f = 0, time = "") => ({ id: `m_${slot}_${time}`, slot, time, desc: "", protein: p, veg: v, carbs: c, fat: f });

test("vegTargetFor: ramp 2 → 4, +1 every 2 weeks from rampStart; fixed mode", () => {
  const s = S({ veg: { mode: "rampa", start: 2, final: 4, rampStart: "2026-11-04", weeksPerStep: 2 } });
  const cases = { "2026-11-04": 2, "2026-11-17": 2, "2026-11-18": 3, "2026-12-01": 3, "2026-12-02": 4, "2027-03-01": 4, "2026-11-01": 2 };
  for (const [iso, want] of Object.entries(cases)) assert.strictEqual(L.vegTargetFor(s, iso), want, iso);
  assert.strictEqual(L.vegTargetFor(S({ veg: { mode: "fija", fixed: 3.5 } }), "2026-11-04"), 3.5);
  assert.strictEqual(L.emptyState(T).settings.veg.rampStart, T); // first run starts the ramp today
});

test("targetsFor: carbs/fat guidance per day type (guide table ×3 meals + snack)", () => {
  const s = S();
  assert.deepStrictEqual(L.targetsFor(s, "descanso", T), { steps: 10000, protein: 5, veg: 2, waterMl: 3000, carbs: [3, 4], fat: [3, 6] });
  assert.deepStrictEqual([L.targetsFor(s, "gimnasio", T).carbs, L.targetsFor(s, "gimnasio", T).fat], [[6, 7], [3, 4]]);
  assert.deepStrictEqual([L.targetsFor(s, "series", T).carbs, L.targetsFor(s, "series", T).fat], [[6, 9], [3, 4]]);
  assert.deepStrictEqual(L.targetsFor(s, "otro", T).carbs, [3, 4]);
});

test("suggestDayType: series/tirada run → series; gym session → gimnasio; nothing → null; effective type", () => {
  const data = { runs: [{ date: T, type: "rodaje" }] };
  const gym = [{ date: T, routine: "r4" }];
  assert.deepStrictEqual(L.suggestDayType(T, data, gym), { type: "gimnasio", reason: "sesión en Gym Tracker" });
  assert.strictEqual(L.suggestDayType(T, { runs: [{ date: T, type: "series" }] }, gym).type, "series");
  assert.strictEqual(L.suggestDayType(T, { runs: [{ date: T, type: "tirada" }] }, []).type, "series");
  assert.strictEqual(L.suggestDayType(T, data, []), null);
  assert.strictEqual(L.suggestDayType(T, data, [{ date: "2026-11-03T23:30:00.000Z" }]), null); // gym dates read as-is
  const s = S();
  assert.strictEqual(L.effectiveDayType({ dayType: "series" }, { type: "gimnasio" }, s), "series");
  assert.strictEqual(L.effectiveDayType({ dayType: null }, { type: "gimnasio" }, s), "gimnasio");
  assert.strictEqual(L.effectiveDayType({ dayType: null }, null, s), "descanso");
});

test("portions, mealsCount (main slots once), nextSlot by time, extra when 4 are logged", () => {
  const day = { meals: [meal("desayuno", 1, 0, 1, 1, "08:10"), meal("comida", 2, 1, 2, 1, "14:00"), meal("merienda", 0, 0, 1, 1, "17:30")] };
  assert.deepStrictEqual(L.portions(day), { protein: 3, veg: 1, carbs: 4, fat: 3 });
  assert.strictEqual(L.mealsCount(day), 3);
  assert.strictEqual(L.nextSlot(day, "18:20"), "cena");
  const dup = { meals: [...day.meals, meal("comida", 1), meal("extra", 1)] };
  assert.strictEqual(L.mealsCount(dup), 3); // duplicates and extra do not count
  assert.strictEqual(L.nextSlot({ meals: [] }, "07:00"), "desayuno");
  assert.strictEqual(L.nextSlot({ meals: [meal("desayuno")] }, "12:40"), "comida"); // 14:00 ≤ 12:40 + 90'
  assert.strictEqual(L.nextSlot({ meals: [meal("desayuno")] }, "11:00"), "comida"); // none due → first missing
  assert.strictEqual(L.nextSlot({ meals: [meal("comida")] }, "16:00"), "desayuno");
  assert.strictEqual(L.nextSlot({ meals: ["desayuno", "comida", "merienda", "cena"].map((s) => meal(s)) }, "22:00"), "extra");
});

test("mealSavedText: gender, remaining steps, goal met", () => {
  assert.strictEqual(L.mealSavedText("merienda", 1580, false), "Merienda guardada · te quedan 1.580 pasos");
  assert.strictEqual(L.mealSavedText("cena", 300, false), "Cena guardada · te quedan 300 pasos");
  assert.strictEqual(L.mealSavedText("desayuno", 0, true), "Desayuno guardado · objetivo de pasos cumplido 🎉");
  assert.strictEqual(L.mealSavedText("extra", 10000, false), "Extra guardado · te quedan 10.000 pasos");
});

test("RECIPES embedded from recetas.md: 20 recipes, groups and the recipe-20 estimate", () => {
  assert.strictEqual(L.RECIPES.length, 20);
  assert.deepStrictEqual(L.RECIPES.map((r) => r.id), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepStrictEqual(L.RECIPES.filter((r) => r.group === "d").map((r) => r.id), [1, 2, 3, 4]);
  assert.deepStrictEqual(L.RECIPES.filter((r) => r.group === "t").map((r) => r.id), [19, 20]);
  const r5 = L.RECIPES[4];
  assert.deepStrictEqual([r5.name, r5.minutes, r5.protein, r5.veg, r5.hidden], ["Boloñesa \"secreta\"", 30, 2, 2, "zanahoria, calabacín y pimiento triturados"]);
  assert.strictEqual(L.RECIPES[19].veg, 0.5);
  assert.strictEqual(L.RECIPES[18].veg, 0);
});

test("suggestRecipes: veg-first, deterministic rotation by date, slot groups", () => {
  for (let k = 0; k < 12; k++) {
    const iso = L.addDays(T, k);
    const c = L.suggestRecipes("comida", iso);
    assert.strictEqual(c.length, 3);
    assert.strictEqual(new Set(c.map((r) => r.id)).size, 3);
    assert.ok(c.every((r) => r.group === "c" && r.veg >= 1), iso);
    const m = L.suggestRecipes("merienda", iso);
    assert.ok(m.every((r) => r.id !== 19 && (r.group === "d" || r.group === "t")));
    assert.ok(L.suggestRecipes("desayuno", iso).every((r) => r.group === "d"));
    assert.deepStrictEqual(L.suggestRecipes("cena", iso), L.suggestRecipes("cena", iso));
  }
  // top 6 for comida/cena: veg desc → minutes asc → id
  const all6 = new Set();
  for (let k = 0; k < 6; k++) for (const r of L.suggestRecipes("cena", L.addDays("2026-01-01", k), 1)) all6.add(r.id);
  assert.deepStrictEqual([...all6], [8, 5, 12, 10, 15, 14]);
  assert.deepStrictEqual(L.suggestRecipes("comida", "2026-01-01").map((r) => r.id), [8, 5, 12]);
  assert.deepStrictEqual(L.suggestRecipes("comida", "2026-01-06").map((r) => r.id), [14, 8, 5]); // cyclic
});

test("pendingItems and day mutations: water never below 0, portions clamped to 0–10 in halves", () => {
  const s = S();
  const data = L.emptyState(T);
  L.setSteps(data, T, 8420, "manual");
  L.addWater(data, T, 1500);
  L.saveMeal(data, T, { slot: "comida", time: "14:00", desc: "Pollo", protein: 2, veg: 1, carbs: 2, fat: 1 }, { id: () => "m_1" });
  assert.deepStrictEqual(L.pendingItems(data.days[T], s, T).map((i) => i.text), ["1.580 pasos", "3 palmas de proteína", "1 puño de verdura", "1,5 L de agua"]);
  L.addWater(data, T, -5000);
  assert.strictEqual(data.days[T].waterMl, 0);
  const m = L.saveMeal(data, T, { id: "m_1", slot: "nope", time: "99:99", desc: "<b>x</b>", protein: 12, veg: 0.3, carbs: -1, fat: "1,5" });
  assert.deepStrictEqual([m.slot, m.time, m.protein, m.veg, m.carbs, m.fat], ["extra", "", 10, 0.5, 0, 1.5]);
  assert.strictEqual(data.days[T].meals.length, 1); // same id → replaced
  L.setDayType(data, T, "gimnasio");
  assert.strictEqual(data.days[T].dayType, "gimnasio");
  L.setDayType(data, T, "auto");
  assert.strictEqual(data.days[T].dayType, null);
  assert.ok(L.deleteMeal(data, T, "m_1"));
  L.setSteps(data, T, 0);
  assert.strictEqual(data.days[T], undefined); // empty days are pruned
});
