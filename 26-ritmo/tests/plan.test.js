process.env.TZ = "Europe/Madrid";
const test = require("node:test");
const assert = require("node:assert");
const L = require("../logic.js");

const NOW = "2026-11-01T10:00:00.000Z";
function base(today = "2026-11-01") {
  const s = L.emptyState(today);
  s.settings.fixedWeekly = [{ id: "c", title: "Clases", days: [1, 2, 3, 4, 5], start: "09:00", end: "14:30" }];
  return s;
}
let seq = 0;
const T = (s, f) => { const t = L.newTask(f, { id: f.id || "x" + ++seq, nowIso: f.createdAt || `2026-11-01T10:${String(seq % 60).padStart(2, "0")}:00Z` }); s.tasks.push(t); return t; };
const hm = (b) => `${L.fmtHM(b.start)}-${L.fmtHM(b.end)}`;

test("priority: rank order and entrega weight × urgency", () => {
  const day = "2026-11-05";
  assert.deepStrictEqual(L.priority({ category: "evento" }, day), { rank: 1, score: 0 });
  assert.strictEqual(L.priority({ category: "frances" }, day).rank, 3);
  assert.strictEqual(L.priority({ category: "fase0" }, day).rank, 4);
  assert.strictEqual(L.priority({ category: "entrega", weight: 20, due: "2026-11-07" }, day).score, 10);  // 20 × 1/2
  assert.strictEqual(L.priority({ category: "entrega", weight: 20, due: "2026-11-03" }, day).score, 40);  // overdue → urgency 2
  assert.strictEqual(L.priority({ category: "entrega", weight: 20, due: "2026-11-05" }, day).score, 40);  // due today → 2
  assert.ok(Math.abs(L.priority({ category: "entrega", weight: 20, due: null }, day).score - 2) < 1e-12); // no due → 0.1
});

test("sortTasks: rank → score → date (nulls last) → createdAt", () => {
  const s = base();
  T(s, { id: "r", title: "resto", category: "resto", date: "2026-11-01" });
  T(s, { id: "e1", title: "entrega lejana", category: "entrega", weight: 40, due: "2026-11-25" });
  T(s, { id: "e2", title: "entrega cerca", category: "entrega", weight: 20, due: "2026-11-06" });
  T(s, { id: "ev", title: "evento", category: "evento", date: "2026-11-09" });
  T(s, { id: "f2", title: "fase0 sin fecha", category: "fase0", date: null, createdAt: "2026-10-01T00:00:00Z" });
  T(s, { id: "f1", title: "fase0 con fecha", category: "fase0", date: "2026-11-03", createdAt: "2026-10-05T00:00:00Z" });
  assert.deepStrictEqual(L.sortTasks(s.tasks, "2026-11-05").map((t) => t.id), ["ev", "e2", "e1", "f1", "f2", "r"]);
});

test("slotWarnings: training window, low focus, overlap, outside day", () => {
  const st = L.DEFAULT_SETTINGS;
  const B = (kind, t, dur, key = "k") => ({ key, kind, start: L.parseHM(t), end: L.parseHM(t) + dur, title: kind });
  const codes = (b, others) => L.slotWarnings(b, st, others).map((w) => w.code);
  assert.deepStrictEqual(codes(B("deporte", "10:00", 60)), ["train_out_of_window"]);
  assert.match(L.slotWarnings(B("deporte", "10:00", 60), st)[0].text, /fuera de franja: solo antes de las 9:00 o desde las 19:00/);
  assert.deepStrictEqual(codes(B("deporte", "08:00", 60)), []);
  assert.deepStrictEqual(codes(B("deporte", "19:00", 60)), []);
  assert.deepStrictEqual(codes(B("deporte", "18:30", 60)), ["train_out_of_window"]);
  assert.deepStrictEqual(codes(B("fase0", "15:30", 60)), ["deep_in_low_focus"]);
  assert.strictEqual(L.slotWarnings(B("fase0", "15:30", 60), st)[0].text, "Franja de poco foco (15–17 h): mejor tareas mecánicas.");
  assert.deepStrictEqual(codes(B("resto", "15:30", 60)), []);
  const o = L.slotWarnings(B("resto", "10:00", 60), st, [{ key: "other", title: "Clases", start: 540, end: 870 }]);
  assert.deepStrictEqual(o, [{ code: "overlap", text: "Se solapa con «Clases»." }]);
  assert.deepStrictEqual(codes(B("resto", "23:00", 60)), ["outside_day"]);
  assert.deepStrictEqual(codes(B("resto", "06:30", 30)), ["outside_day"]);
});

test("dayBlocks: fixed + routines + timed tasks, sorted; untimed separate; clipped at midnight", () => {
  const s = base();
  T(s, { id: "a", title: "Tarde", category: "resto", date: "2026-11-05", time: "16:00", durationMin: 30 });
  T(s, { id: "b", title: "Sin hora", category: "resto", date: "2026-11-05" });
  T(s, { id: "c", title: "Archivada", category: "resto", date: "2026-11-05", time: "18:00" }).status = "archived";
  T(s, { id: "d", title: "Noche larga", category: "fase0", date: "2026-11-05", time: "23:30", durationMin: 90 });
  const { timed, untimed } = L.dayBlocks(s, "2026-11-05");
  assert.deepStrictEqual(timed.map((b) => b.key), ["routine:manana", "fixed:c", "task:a", "routine:noche", "task:d"]);
  assert.deepStrictEqual(untimed.map((t) => t.id), ["b"]);
  const late = timed.at(-1);
  assert.strictEqual(late.end, 1440);
  assert.ok(late.clipped);
  assert.strictEqual(L.dayBlocks(s, "2026-11-07").timed.filter((b) => b.kind === "fijo").length, 0); // Saturday
});

test("proposeDay: the normative vector of §5.4-A, exactly", () => {
  const s = base();
  T(s, { id: "A", title: "A", category: "entrega", durationMin: 120, due: "2026-11-07", weight: 20, date: null });
  T(s, { id: "B", title: "B", category: "fase0", durationMin: 90, date: "2026-11-05" });
  T(s, { id: "C", title: "C", category: "resto", durationMin: 30, date: "2026-11-05" });
  const p = L.proposeDay(s, "2026-11-05", { sportDoneBefore: 1, frenchRequired: 45, frenchNextType: "escritura" });
  const by = Object.fromEntries(p.blocks.map((b) => [b.key, b]));
  assert.strictEqual(hm(by["task:A"]), "20:00-22:00");
  assert.strictEqual(hm(by["new:deporte"]), "19:00-20:00");
  assert.strictEqual(by["new:deporte"].title, "Deporte · Fuerza: tirón (espalda-bíceps)");
  assert.strictEqual(hm(by["new:frances"]), "17:00-18:00");
  assert.strictEqual(by["new:frances"].title, "Francés · Escritura");
  assert.strictEqual(hm(by["task:B"]), "07:30-09:00");
  assert.strictEqual(hm(by["task:C"]), "15:00-15:30");
  assert.strictEqual(hm(by.margin), "14:30-15:00");
  assert.strictEqual(p.blocks.length, 6);
  assert.deepStrictEqual(p.top3, ["task:A", "new:deporte", "new:frances"]);
  assert.deepStrictEqual(p.moved, []);
  assert.strictEqual(p.overflow, false);
  assert.strictEqual(p.focusMin, 270);
  assert.deepStrictEqual(p.busy.map((b) => b.key), ["routine:manana", "fixed:c", "routine:noche"]);
});

test("proposeDay invariants over 50 seeded random task sets", () => {
  const rng = L.mulberry32(2026);
  const cats = ["entrega", "fase0", "resto", "deporte", "frances", "evento"];
  const days = ["2026-11-02", "2026-11-05", "2026-11-07", "2026-11-08"];
  for (let run = 0; run < 50; run++) {
    const s = base();
    const day = days[run % days.length];
    const n = 1 + Math.floor(rng() * 12);
    for (let i = 0; i < n; i++) {
      const category = cats[Math.floor(rng() * cats.length)];
      const durationMin = [15, 30, 45, 60, 90, 120, 180][Math.floor(rng() * 7)];
      const date = rng() < 0.15 && category === "entrega" ? null : L.addDays(day, -Math.floor(rng() * 3));
      T(s, { id: `r${run}_${i}`, title: `T${i}`, category, durationMin, date, due: L.addDays(day, Math.floor(rng() * 6)), weight: 5 + Math.floor(rng() * 30) });
    }
    if (rng() < 0.3) T(s, { id: `fixed${run}`, title: "Ocupado", category: "evento", date: day, time: "16:00", durationMin: 120 });
    const ctx = { sportDoneBefore: Math.floor(rng() * 6), frenchRequired: [0, 30, 45, 90, 400][Math.floor(rng() * 5)], frenchNextType: "lectura" };
    const p = L.proposeDay(s, day, ctx);
    const all = [...p.blocks, ...p.busy];
    for (const b of p.blocks) {
      assert.strictEqual(b.start % 15, 0, `run ${run}: ${b.key} start ${b.start}`);
      for (const o of all) if (o !== b) assert.ok(!(b.start < o.end && o.start < b.end), `run ${run}: ${b.key} overlaps ${o.key}`);
      if (b.kind === "deporte") assert.ok(b.end <= 540 || b.start >= 1140, `run ${run}: sport at ${b.start}`);
    }
    assert.ok(p.focusMin <= 360, `run ${run}: focus ${p.focusMin}`);
    const lim7 = L.addDays(day, 7);
    const cands = s.tasks.filter((t) => t.status === "open" && !t.time && t.category !== "evento" && ((t.date && t.date <= day) || (t.category === "entrega" && !t.date && t.due <= lim7)));
    const placed = new Set(p.blocks.filter((b) => b.taskId).map((b) => b.taskId));
    const moved = new Set(p.moved.map((m) => m.taskId));
    for (const t of cands) assert.ok(placed.has(t.id) !== moved.has(t.id), `run ${run}: candidate ${t.id} placed=${placed.has(t.id)} moved=${moved.has(t.id)}`);
    assert.strictEqual(p.overflow, p.moved.length > 0);
  }
});

test("proposeDay: sport at risk goes first; at standard there is no sport block", () => {
  const s = base();
  T(s, { id: "E", title: "Entrega", category: "entrega", durationMin: 120, due: "2026-11-09", weight: 30, date: "2026-11-07" });
  const p = L.proposeDay(s, "2026-11-07", { sportDoneBefore: 1, frenchRequired: 30 });
  assert.strictEqual(p.top3[0], "new:deporte");
  const sport = p.blocks.find((b) => b.key === "new:deporte");
  assert.match(sport.reason, /^Suelo en riesgo: 1 de 3, quedan 2 días/);
  assert.strictEqual(sport.title, "Deporte · Natación técnica o descanso activo");
  const q = L.proposeDay(s, "2026-11-07", { sportDoneBefore: 5, frenchRequired: 30 });
  assert.ok(!q.blocks.some((b) => b.kind === "deporte"));
});

test("proposeDay reuses existing sport/French tasks, caps French and reports a full day", () => {
  const s = base();
  T(s, { id: "S", title: "Rodaje", category: "deporte", durationMin: 45, date: "2026-11-05" });
  T(s, { id: "F", title: "Francés", category: "frances", durationMin: 30, date: "2026-11-05" });
  const p = L.proposeDay(s, "2026-11-05", { sportDoneBefore: 1, frenchRequired: 300, frenchNextType: "lectura" });
  assert.ok(p.blocks.some((b) => b.key === "task:S"));
  assert.ok(!p.blocks.some((b) => b.key.startsWith("new:")));
  const fr = p.blocks.find((b) => b.key === "task:F");
  assert.strictEqual(fr.end - fr.start, 120);
  assert.ok(p.warnings.includes("Francés: quedan 180' pendientes que no caben en un bloque"));
  // a day with no free time: every candidate is moved
  const full = base();
  full.settings.fixedWeekly.push({ id: "all", title: "Todo el día", days: [4], start: "07:00", end: "23:30" });
  T(full, { id: "X", title: "X", category: "resto", durationMin: 30, date: "2026-11-05" });
  T(full, { id: "Y", title: "Y", category: "entrega", durationMin: 60, date: "2026-11-05", due: "2026-11-06" });
  const f = L.proposeDay(full, "2026-11-05", { sportDoneBefore: 0, frenchRequired: 30 });
  assert.deepStrictEqual(f.moved.map((m) => m.taskId), ["Y", "X"]);
  assert.ok(f.overflow);
  assert.strictEqual(f.warnings[0], "El día no cabe: se mueven 2 tareas (las de menor prioridad).");
  assert.ok(f.warnings.some((w) => w.startsWith("No hay hueco para entrenar en tu franja")));
  assert.ok(f.warnings.includes("No cabe el francés: hazlo antes que lo de prioridad 4-5"));
  assert.ok(f.warnings.includes("Sin margen de 30'"));
});

test("proposeDay with fromHM only uses the rest of the day; untimed eventos only warn", () => {
  const s = base();
  T(s, { id: "R", title: "Recado", category: "resto", durationMin: 30, date: "2026-11-05" });
  T(s, { id: "V", title: "Cita médico", category: "evento", date: "2026-11-05" });
  const p = L.proposeDay(s, "2026-11-05", { sportDoneBefore: 3, frenchRequired: 0, fromHM: L.ceil15(L.parseHM("18:40")) });
  for (const b of p.blocks) assert.ok(b.start >= L.parseHM("18:45"));
  assert.ok(p.warnings.some((w) => w.startsWith("Evento sin hora: ponle hora")));
  assert.ok(!p.blocks.some((b) => b.taskId === "V"));
});

test("acceptProposal: sets times, creates auto tasks, idempotent, moves to the next day", () => {
  const s = base("2026-11-29");
  T(s, { id: "A", title: "A", category: "entrega", durationMin: 120, due: "2026-12-02", weight: 20, date: "2026-11-30" });
  T(s, { id: "M", title: "Mover", category: "resto", durationMin: 30, date: "2026-11-30" });
  const p = L.proposeDay(s, "2026-11-30", { sportDoneBefore: 0, frenchRequired: 30, frenchNextType: "escucha" });
  // force M into moved to check the date roll-over
  p.blocks = p.blocks.filter((b) => b.taskId !== "M");
  p.moved.push({ taskId: "M", title: "Mover", toDate: L.addDays("2026-11-30", 1), reason: "test" });
  let k = 0;
  const opts = { nowIso: NOW, id: () => "new" + ++k };
  const r1 = L.acceptProposal(s, p, p.blocks.map((b) => b.key), opts);
  const a = s.tasks.find((t) => t.id === "A");
  assert.strictEqual(a.time, "20:00");
  assert.strictEqual(a.date, "2026-11-30");
  const autos = s.tasks.filter((t) => t.auto);
  assert.deepStrictEqual(autos.map((t) => t.category).sort(), ["deporte", "frances"]);
  assert.ok(autos.every((t) => t.date === "2026-11-30" && t.time));
  assert.strictEqual(s.tasks.find((t) => t.id === "M").date, "2026-12-01");
  assert.strictEqual(s.tasks.find((t) => t.id === "M").time, null);
  assert.strictEqual(r1.created, 2);
  const n = s.tasks.length;
  const r2 = L.acceptProposal(s, p, p.blocks.map((b) => b.key), opts);
  assert.strictEqual(s.tasks.length, n);
  assert.strictEqual(r2.created, 0);
  // unselected blocks change nothing
  const s2 = base();
  T(s2, { id: "Z", title: "Z", category: "resto", durationMin: 30, date: "2026-11-05" });
  const p2 = L.proposeDay(s2, "2026-11-05", { sportDoneBefore: 0, frenchRequired: 30 });
  L.acceptProposal(s2, p2, [], opts);
  assert.strictEqual(s2.tasks.find((t) => t.id === "Z").time, null);
  assert.strictEqual(s2.tasks.length, 1);
});

test("review: actions, queue order and table mode, dates after midnight", () => {
  const s = base();
  T(s, { id: "o", title: "Atrasada", category: "resto", date: "2026-11-02" });
  T(s, { id: "h", title: "Hoy", category: "entrega", date: "2026-11-04", due: "2026-11-05", weight: 10 });
  T(s, { id: "m", title: "Mañana", category: "resto", date: "2026-11-05", time: "10:00" });
  T(s, { id: "f", title: "Futura", category: "resto", date: "2026-11-09" });
  T(s, { id: "n", title: "Sin fecha", category: "resto", date: null });
  const q = L.reviewQueue(s, "2026-11-04");
  assert.deepStrictEqual(q.items.map((t) => t.id), ["o", "h", "m"]);
  assert.strictEqual(q.tableMode, false);
  const opt = { today: "2026-11-04", nowIso: NOW };
  assert.ok(L.applyReviewAction(s, "o", "done", opt));
  assert.deepStrictEqual([s.tasks[0].status, s.tasks[0].doneOn, s.tasks[0].updatedAt], ["done", "2026-11-04", NOW]);
  L.applyReviewAction(s, "m", "tomorrow", opt);
  assert.deepStrictEqual([s.tasks[2].date, s.tasks[2].time], ["2026-11-05", null]);
  L.applyReviewAction(s, "h", "date", { ...opt, date: "2026-11-10" });
  assert.strictEqual(s.tasks[1].date, "2026-11-10");
  assert.strictEqual(L.applyReviewAction(s, "h", "date", { ...opt, date: "nope" }), false);
  L.applyReviewAction(s, "f", "archive", opt);
  assert.strictEqual(s.tasks[3].status, "archived");
  const before = JSON.stringify(s.tasks[4]);
  L.applyReviewAction(s, "n", "keep", { today: "2026-11-04" });
  assert.strictEqual(s.tasks[4].title, JSON.parse(before).title);
  for (let i = 0; i < 16; i++) T(s, { id: "q" + i, title: "q" + i, category: "resto", date: "2026-11-04" });
  assert.strictEqual(L.reviewQueue(s, "2026-11-04").tableMode, true);
  assert.deepStrictEqual(L.reviewDates(new Date(2026, 10, 5, 1, 30)), { reviewDay: "2026-11-04", tomorrow: "2026-11-05" });
  assert.deepStrictEqual(L.reviewDates(new Date(2026, 10, 4, 21, 0)), { reviewDay: "2026-11-04", tomorrow: "2026-11-05" });
});

test("routines: progress, streak (today incomplete does not break it), toggle", () => {
  const s = L.emptyState("2026-11-01");
  const all = s.routines[0].items.map((i) => i.id);
  for (const d of ["2026-11-01", "2026-11-02", "2026-11-03"]) s.routineLog[d] = { manana: all.slice() };
  s.routineLog["2026-10-20"] = { manana: all.slice() };
  s.routineLog["2026-10-21"] = { manana: all.slice() };
  assert.deepStrictEqual(L.routineProgress(s, "manana", "2026-11-04"), { done: 0, total: 5, complete: false });
  assert.deepStrictEqual(L.routineStreak(s, "manana", "2026-11-04"), { current: 3, best: 3 });
  let r;
  for (const id of all.slice(0, 4)) r = L.toggleRoutineItem(s, "manana", id, "2026-11-04");
  assert.deepStrictEqual(r, { checked: true, complete: false, becameComplete: false });
  r = L.toggleRoutineItem(s, "manana", all[4], "2026-11-04");
  assert.deepStrictEqual(r, { checked: true, complete: true, becameComplete: true });
  assert.deepStrictEqual(L.routineStreak(s, "manana", "2026-11-04"), { current: 4, best: 4 });
  r = L.toggleRoutineItem(s, "manana", all[0], "2026-11-04");
  assert.strictEqual(r.checked, false);
  assert.deepStrictEqual(L.routineProgress(s, "manana", "2026-11-04"), { done: 4, total: 5, complete: false });
  assert.strictEqual(L.toggleRoutineItem(s, "manana", "nope", "2026-11-04"), null);
  assert.strictEqual(L.routineStreak(s, "noche", "2026-11-04").current, 0);
});
