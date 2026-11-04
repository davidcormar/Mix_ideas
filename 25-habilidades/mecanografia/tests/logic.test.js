const test = require("node:test");
const assert = require("node:assert");
const T = require("../logic.js");

test("wpm and accuracy", () => {
  const s = T.score("hola mundo", "hola mundo", 6000); // 10 chars in 0.1 min → 2 words / 0.1 = 20 wpm
  assert.ok(Math.abs(s.wpm - 20) < 1e-9);
  assert.strictEqual(s.accuracy, 1); assert.strictEqual(s.done, true);
  const e = T.score("hola", "hxla", 6000);
  assert.strictEqual(e.accuracy, 0.75); assert.deepStrictEqual(e.errors, { o: 1 });
  assert.ok(e.netWpm < e.wpm);
});

test("summary weak keys", () => {
  const h = [{ netWpm: 40, accuracy: 0.9, errors: { é: 3, " ": 1 } }, { netWpm: 50, accuracy: 0.95, errors: { é: 1 } }];
  const s = T.summary(h);
  assert.strictEqual(s.bestWpm, 50); assert.strictEqual(s.avgWpm, 45);
  assert.deepStrictEqual(s.weakKeys[0], ["é", 4]); assert.deepStrictEqual(s.weakKeys[1], ["espacio", 1]);
});

test("next card prefers unseen, then failed", () => {
  assert.strictEqual(T.nextCard({}), 0);
  const stats = {}; T.SHORTCUTS.forEach((_, i) => (stats[i] = { ok: 3, ko: 0 })); stats[7] = { ok: 3, ko: 2 };
  assert.strictEqual(T.nextCard(stats), 7);
});

test("content is non-empty", () => {
  assert.ok(T.SHORTCUTS.length >= 20);
  for (const k of ["es", "en", "fr", "code"]) assert.ok(T.TEXTS[k].length >= 3);
});
