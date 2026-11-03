const test = require("node:test");
const assert = require("node:assert");
const M = require("../logic.js");

test("haversine London-Birmingham ≈ 163 km", () => {
  const [, b, l] = M.SEED.places;
  const d = M.haversineKm(b, l);
  assert.ok(d > 155 && d < 170, d);
});

test("route of the UK trip", () => {
  const km = M.routeKm(M.SEED.trips[0], M.SEED.places);
  assert.ok(km > 2000 && km < 2400, km); // Coruña-BHX ~1060 + BHX-LON ~163 + LON-Coruña ~1000
});

test("seed is valid and validation catches errors", () => {
  assert.ok(M.validate(JSON.parse(JSON.stringify(M.SEED))));
  assert.throws(() => M.validate({ places: [{ id: "a", name: "x", lat: 100, lon: 0 }], trips: [] }));
  assert.throws(() => M.validate({ places: [], trips: [{ name: "t", route: ["nope"] }] }));
});

test("unique ids from names", () => {
  assert.strictEqual(M.slug("Torre de Hércules!"), "torre-de-hercules");
  assert.strictEqual(M.uniqueId("A Coruña", M.SEED.places), "a-coruna");
  assert.strictEqual(M.uniqueId("coruna", M.SEED.places), "coruna-2");
});

test("stats", () => {
  const s = M.stats(M.SEED);
  assert.strictEqual(s.places, 5); assert.strictEqual(s.visited, 1); assert.strictEqual(s.trips, 2);
  assert.ok(s.kmPlanned > 8000);
});
