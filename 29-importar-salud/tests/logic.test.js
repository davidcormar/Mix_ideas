const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const S = require("../logic.js");
const XML = fs.readFileSync(path.join(__dirname, "fixture-export.xml"), "utf8");
const T = "2026-11-04";

function parseAll(chunk) {
  const p = S.createHealthParser();
  for (let i = 0; i < XML.length; i += chunk) p.push(XML.slice(i, i + chunk));
  return p.finish();
}

test("Salud: pasos sin sumar iPhone + Watch, sueño por noche y entrenos con distancia", () => {
  const h = parseAll(1 << 20);
  assert.equal(h.days["2026-11-03"].steps, 7500);
  const n = h.days[T];
  assert.deepEqual([n.bed, n.wake], ["23:40", "07:25"]); // Watch (más minutos dormido que Bevel), sin contar InBed ni la siesta
  assert.equal(n.asleepMin, 200 + 255);
  const run = h.workouts.find((w) => w.kind === "run");
  assert.deepEqual([run.date, run.start, run.minutes, run.km, run.source], [T, "18:12", 33, 5.12, "Strava"]);
  assert.equal(h.workouts.find((w) => w.kind === "strength").minutes, 60);
  assert.equal(h.workouts.find((w) => w.kind === "swim").km, 1.5);
});

test("Salud: el resultado no depende de cómo llegue troceado el fichero", () => {
  const ref = JSON.stringify(parseAll(1 << 20));
  for (const c of [1, 7, 64, 333]) assert.equal(JSON.stringify(parseAll(c)), ref, "trozos de " + c);
});

test("Strava: CSV con comillas y saltos de línea, fecha UTC a hora local, tipos", () => {
  const csv = 'Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Moving Time\n' +
    '1,"Nov 4, 2026, 5:12:00 PM","Rodaje, suave",Run,"línea 1\nlínea 2",2100,5.10,1950\n' +
    '2,"Nov 3, 2026, 6:00:00 PM",Pierna,Weight Training,,3600,0,3600\n' +
    '3,fecha rota,X,Run,,100,1,100\n';
  const r = S.parseStrava(csv);
  assert.equal(r.ok, true); assert.equal(r.errors, 1); assert.equal(r.workouts.length, 2);
  const w = r.workouts[0];
  assert.equal(w.date, S.localISO(new Date(Date.UTC(2026, 10, 4, 17, 12))));
  assert.equal(w.minutes, 33); assert.equal(w.km, 5.1); assert.equal(w.kind, "run"); assert.equal(w.name, "Rodaje, suave");
  assert.equal(r.workouts[1].kind, "strength");
  assert.equal(S.parseStrava("a,b\n1,2").ok, false);
});

test("misma sesión en Strava y en Salud cuenta una vez; fuerza y caminar no se marcan por defecto", () => {
  const h = parseAll(4096);
  const strava = [{ source: "Strava", date: T, start: "18:14", kind: "run", minutes: 32, km: 5.1, name: "Rodaje" }];
  const pv = S.buildPreview({ health: h, strava });
  const day = pv.find((d) => d.date === T);
  assert.equal(day.workouts.length, 1);
  assert.equal(day.workouts[0].pasoType, "rodaje"); assert.equal(day.workouts[0].on, true);
  const strength = pv.find((d) => d.date === "2026-11-03").workouts[0];
  assert.equal(strength.kind, "strength"); assert.equal(strength.on, false);
  assert.equal(pv.find((d) => d.date === "2026-11-02").workouts[0].pasoType, "natacion");
  assert.equal(S.pasoType({ kind: "run", minutes: 80, km: 14 }), "tirada");
  assert.equal(S.pasoType({ kind: "run", minutes: 15, km: 2.5 }), "trote");
  assert.equal(S.matchesRun({ date: T, minutes: 32, km: 5.1 }, { date: T, minutes: 33, km: 5.12 }), true);
});

test("Atajos: JSON, clave=valor y formatos de hora del iPhone", () => {
  assert.deepEqual(S.parseShortcut('{"d":"2026-11-03","steps":"8.420","bed":"23:40","wake":"7:25"}', T).days, [{ date: "2026-11-03", steps: 8420, bed: "23:40", wake: "07:25" }]);
  assert.deepEqual(S.parseShortcut("steps=9100;bed=11:40 p. m.;wake=7:05 a. m.", T).days, [{ date: T, steps: 9100, bed: "23:40", wake: "07:05" }]);
  assert.deepEqual(S.parseShortcut("#/atajos?d=2026-11-02&steps=5000", T).days, [{ date: "2026-11-02", steps: 5000 }]);
  assert.equal(S.parseShortcut('{"days":[{"d":"2026-11-01","steps":1},{"d":"2026-11-02","steps":2}]}', T).days.length, 2);
  assert.equal(S.parseShortcut("hola", T).ok, false);
  assert.equal(S.normHM("2026-11-04 07:05:00"), "07:05");
  assert.equal(S.normHM("25:00"), null);
});
