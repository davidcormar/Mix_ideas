process.env.TZ = "Europe/Madrid";
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const DAY = "2026-11-04";
const ms = (hm) => L.toEpoch(DAY, hm);

test("dueReminders: fires inside (lastTick, now], honours lead time, done tasks and the sent set", () => {
  const blocks = [
    { key: "task:a", kind: "resto", start: L.parseHM("18:45"), end: 1170 },
    { key: "task:d", kind: "resto", start: L.parseHM("18:45"), end: 1170, done: true },
    { key: "margin", kind: "margen", start: L.parseHM("18:45"), end: 1155 },
  ];
  assert.deepStrictEqual(L.dueReminders(blocks, DAY, ms("18:40"), ms("18:46"), 0, new Set()).map((b) => b.key), ["task:a"]);
  assert.deepStrictEqual(L.dueReminders(blocks, DAY, ms("18:40"), ms("18:46"), 5, new Set()), []);   // fireAt 18:40 = lastTick → excluded
  assert.deepStrictEqual(L.dueReminders(blocks, DAY, ms("18:39"), ms("18:46"), 5, new Set()).map((b) => b.key), ["task:a"]);
  assert.deepStrictEqual(L.dueReminders(blocks, DAY, ms("18:40"), ms("18:46"), 0, new Set(["task:a"])), []);
  assert.deepStrictEqual(L.dueReminders(blocks, DAY, ms("18:46"), ms("18:50"), 0, new Set()), []);   // already past on load
});

test("ICS: CRLF, header, exact VTIMEZONE and wall-clock DTSTART/DTEND", () => {
  const s = L.emptyState("2026-11-01");
  s.tasks.push(L.newTask({ title: "Práctica de Señales", category: "entrega", date: "2026-11-05", time: "20:00", durationMin: 120, due: "2026-11-07", weight: 20, notes: "Filtros FIR" }, { id: "t_a", nowIso: "x" }));
  s.tasks.push(L.newTask({ title: "Noche larga", category: "fase0", date: "2026-11-05", time: "23:30", durationMin: 90 }, { id: "t_b", nowIso: "x" }));
  s.tasks.push(L.newTask({ title: "Archivada", category: "resto", date: "2026-11-05", time: "10:00" }, { id: "t_c", nowIso: "x" }));
  s.tasks[2].status = "archived";
  const ev = L.blocksToEvents(s, ["2026-11-05"]);
  assert.strictEqual(ev.length, 2);
  const ics = L.toICS(ev, { calName: "Ritmo", dtstamp: "2026-11-04T17:40:00.000Z" });
  assert.ok(ics.endsWith("\r\n"));
  assert.ok(!/[^\r]\n/.test(ics), "every newline is CRLF");
  const lines = ics.split("\r\n");
  assert.deepStrictEqual(lines.slice(0, 7), ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mix_ideas//Ritmo//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Ritmo", "X-WR-TIMEZONE:Europe/Madrid"]);
  assert.ok(ics.includes(["BEGIN:VTIMEZONE", "TZID:Europe/Madrid", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"].join("\r\n")));
  assert.ok(lines.includes("DTSTART;TZID=Europe/Madrid:20261105T200000"));
  assert.ok(lines.includes("DTEND;TZID=Europe/Madrid:20261105T220000"));
  assert.ok(lines.includes("DTEND;TZID=Europe/Madrid:20261106T010000"));   // 23:30 + 90' rolls the date
  assert.ok(lines.includes("UID:ritmo-task-t_a-20261105@mix-ideas"));
  assert.ok(lines.includes("DTSTAMP:20261104T174000Z"));
  assert.ok(lines.includes("CATEGORIES:entrega"));
  assert.ok(lines.includes("DESCRIPTION:Entrega · P2\\nFiltros FIR"));
  assert.strictEqual(lines.at(-2), "END:VCALENDAR");
});

test("ICS: routines and fixed blocks only when asked", () => {
  const s = L.emptyState("2026-11-01");
  s.settings.fixedWeekly = [{ id: "fw_1", title: "Clases UIE", days: [1, 2, 3, 4, 5], start: "09:00", end: "14:30" }];
  assert.strictEqual(L.blocksToEvents(s, L.weekDays("2026-11-04")).length, 0);
  const ev = L.blocksToEvents(s, L.weekDays("2026-11-04"), { includeRoutines: true, includeFixed: true });
  assert.strictEqual(ev.length, 7 * 2 + 5);
  assert.ok(ev.some((e) => e.uid === "ritmo-fijo-fw_1-20261102@mix-ideas"));
  assert.ok(ev.some((e) => e.uid === "ritmo-rutina-noche-20261108@mix-ideas" && e.category === "rutina"));
});

test("icsEscape escapes backslash, semicolon, comma and newlines", () => {
  assert.strictEqual(L.icsEscape("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  assert.strictEqual(L.icsEscape("x\r\ny"), "x\\ny");
});

test("foldLine: ≤ 75 octets per physical line, unfolds to the original, never splits ñ or 🇫🇷", () => {
  const samples = [
    "SUMMARY:" + "ñ".repeat(80),
    "DESCRIPTION:" + "🇫🇷 Francés · ".repeat(12),
    "SUMMARY:" + "a".repeat(73) + "ñ" + "🇫🇷".repeat(30),
    "SUMMARY:" + "x".repeat(200),
    "SUMMARY:corta",
  ];
  for (const line of samples) {
    const folded = L.foldLine(line);
    const phys = folded.split("\r\n");
    for (const p of phys) assert.ok(Buffer.byteLength(p, "utf8") <= 75, `${Buffer.byteLength(p, "utf8")} octets`);
    phys.slice(1).forEach((p) => assert.strictEqual(p[0], " "));
    assert.strictEqual(folded.replace(/\r\n /g, ""), line);
    for (const p of phys) {
      assert.ok(!p.includes("�"));
      assert.strictEqual(Buffer.from(p, "utf8").toString("utf8"), p);       // valid UTF-8 on its own
      const cps = Array.from(p.trimStart());
      const ri = cps.filter((c) => c.codePointAt(0) >= 0x1f1e6 && c.codePointAt(0) <= 0x1f1ff).length;
      assert.strictEqual(ri % 2, 0, "a flag was split across lines");
    }
  }
  assert.strictEqual(L.foldLine("SUMMARY:corta"), "SUMMARY:corta");
});
