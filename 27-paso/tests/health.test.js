process.env.TZ = "Europe/Madrid";
// Apple Health export.xml streaming parser + dedup (spec §6.3).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../logic.js");

const SAMPLE = fs.readFileSync(path.join(__dirname, "fixtures", "export-sample.xml"), "utf8");
const IPHONE = "iPhone de prueba", WATCH = "Apple Watch de prueba", SCALE = "Báscula & Co";
const EXPECTED = {
  // 25 Oct 2026 = DST change: +0200 before 03:00, +0100 after. The 23:55→00:10 record counts on its start day.
  "2026-10-25": { [IPHONE]: 1200 + 3000 + 300, [WATCH]: 1100 + 2800 },
  "2026-10-26": { [IPHONE]: 2500 + 1000, [WATCH]: 2600 + 1500, [SCALE]: 50 },
};

function parseAll(chunks) {
  const p = L.createHealthStepParser();
  for (const c of chunks) p.push(c);
  return p.finish();
}

test("fixture: exact perDay, records, skipped and per-source totals", () => {
  const r = parseAll([SAMPLE]);
  assert.deepStrictEqual(r.perDay, EXPECTED);
  assert.strictEqual(r.records, 10); // HeartRate, MetadataEntry, Workout and <RecordFake> are ignored
  assert.strictEqual(r.skipped, 3); // value "abc", value -5, startDate "fecha-rota"
  assert.deepStrictEqual(r.sources, {
    [IPHONE]: { steps: 8000, days: 2 },
    [WATCH]: { steps: 8000, days: 2 },
    [SCALE]: { steps: 50, days: 1 },
  });
});

test("aggregateHealth: max source per day (iPhone + Watch never added) and filtering by source", () => {
  const { perDay } = parseAll([SAMPLE]);
  assert.deepStrictEqual(L.aggregateHealth(perDay, null), { "2026-10-25": 4500, "2026-10-26": 4100 });
  assert.deepStrictEqual(L.aggregateHealth(perDay, new Set([IPHONE])), { "2026-10-25": 4500, "2026-10-26": 3500 });
  assert.deepStrictEqual(L.aggregateHealth(perDay, new Set([WATCH])), { "2026-10-25": 3900, "2026-10-26": 4100 });
  assert.deepStrictEqual(L.aggregateHealth(perDay, [SCALE]), { "2026-10-26": 50 });
  assert.deepStrictEqual(L.aggregateHealth(perDay, new Set()), {}); // zero days dropped
  assert.deepStrictEqual(L.aggregateHealth({ "2026-01-01": { a: 0.4 } }, null), {}); // rounds to 0 → dropped
});

test("chunk invariance: every split index k gives the single-push result", () => {
  const whole = parseAll([SAMPLE]);
  for (let k = 0; k <= SAMPLE.length; k++) {
    const r = parseAll([SAMPLE.slice(0, k), SAMPLE.slice(k)]);
    assert.deepStrictEqual(r, whole, `split at ${k}`);
  }
});

test("chunk invariance: 1-character chunks and 3-way random splits", () => {
  const whole = parseAll([SAMPLE]);
  assert.deepStrictEqual(parseAll(Array.from(SAMPLE)), whole);
  const rnd = L.mulberry32(7);
  for (let n = 0; n < 200; n++) {
    const a = Math.floor(rnd() * SAMPLE.length), b = Math.floor(rnd() * SAMPLE.length);
    const [i, j] = a < b ? [a, b] : [b, a];
    assert.deepStrictEqual(parseAll([SAMPLE.slice(0, i), SAMPLE.slice(i, j), SAMPLE.slice(j)]), whole);
  }
});

test("entities in sourceName, '>' inside a quoted attribute, single quotes", () => {
  const xml = `<Record sourceVersion="a > b" type="HKQuantityTypeIdentifierStepCount" sourceName="Watch &amp; &#x41;&#66; &lt;x&gt; &quot;q&quot; &apos;s&apos;" startDate="2026-11-03 20:55:12 +0100" value="10"/>` +
    `<Record note='it > is' type="HKQuantityTypeIdentifierStepCount" sourceName="S" startDate="2026-11-03 21:00:00 +0100" value="5"/>`;
  const r = parseAll([xml]);
  assert.deepStrictEqual(r.perDay, { "2026-11-03": { "Watch & AB <x> \"q\" 's'": 10, S: 5 } });
  assert.strictEqual(L.decodeXmlEntities("&amp;lt;"), "&lt;"); // decoded once, not recursively
  assert.strictEqual(L.findTagEnd(`<Record a="x>y" b='>'>`, 0), 21);
  assert.strictEqual(L.findTagEnd(`<Record a="x>y`, 0), -1);
});

test("empty input, non-Health XML and records without steps → 0 records", () => {
  assert.deepStrictEqual(parseAll([""]), { perDay: {}, records: 0, skipped: 0, sources: {} });
  const html = "<html><body><p>Hola</p><Records>nada</Records></body></html>";
  assert.strictEqual(parseAll([html]).records, 0);
  const hr = `<Record type="HKQuantityTypeIdentifierHeartRate" sourceName="W" startDate="2026-11-03 10:00:00 +0100" value="60"/>`;
  assert.strictEqual(parseAll([hr]).records, 0);
  const noValue = `<Record type="HKQuantityTypeIdentifierStepCount" sourceName="W" startDate="2026-11-03 10:00:00 +0100"/>`;
  assert.deepStrictEqual([parseAll([noValue]).records, parseAll([noValue]).skipped], [0, 1]);
});

test("long stream in 20.000 chunks with interleaved non-step elements: exact totals", () => {
  const rec = (i) => `<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" startDate="2026-0${1 + (i % 9)}-1${i % 10} 10:00:00 +0100" value="${i % 50}"/>\n`;
  const p = L.createHealthStepParser();
  let expected = 0;
  for (let i = 0; i < 20000; i++) { p.push(rec(i) + "<Correlation x=\"1\">filler</Correlation>\n"); expected += i % 50; }
  const r = p.finish();
  assert.strictEqual(r.records, 20000);
  assert.strictEqual(r.sources.iPhone.steps, expected);
});
