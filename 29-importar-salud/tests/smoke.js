// Run from 29-importar-salud/:  NODE_PATH=$(npm root -g) node tests/smoke.js
const { chromium } = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html");
const check = (c, m) => { if (!c) throw new Error("FALLO: " + m); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Europe/Madrid", locale: "es-ES" });
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.clock.install({ time: new Date("2026-11-04T21:00:00+01:00") });
  await page.goto(URL);
  // a manual day in Paso, a run already logged, a manual night in the Panel, and a foreign key that must not change
  const paso = { version: 1, settings: {}, days: { "2026-11-03": { steps: 1234, stepsSource: "manual", water: 0, dayType: null, meals: [] } }, runs: [{ id: "r1", date: "2026-11-02", type: "natacion", minutes: 40, km: 1.5, notes: "" }], imports: [] };
  await page.evaluate((p) => { localStorage.setItem("paso.v1", JSON.stringify(p)); localStorage.setItem("panel.v1", JSON.stringify({ version: 1, days: { "2026-11-04": { bed: "00:10", wake: "07:00" } } })); localStorage.setItem("gymtracker.v1", '{"sessions":[]}'); }, paso);
  await page.reload();

  await page.setInputFiles("#xmlFile", path.join(__dirname, "fixture-export.xml"));
  await page.waitForFunction(() => /noches/.test(document.getElementById("xmlInfo").textContent));
  const csv = 'Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,Moving Time\n9,"Nov 4, 2026, 5:13:00 PM",Rodaje,Run,2000,5.1,1950\n8,"Nov 1, 2026, 9:00:00 AM",Bici con amigos,Ride,5400,40.2,5000\n';
  await page.setInputFiles("#csvFile", { name: "activities.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.waitForFunction(() => /actividades/.test(document.getElementById("csvInfo").textContent));
  const rows = await page.$$eval("#pvBody tr", (r) => r.map((x) => x.innerText));
  check(rows.length === 4, "4 días en la vista previa: " + rows.length);
  check(rows[0].includes("Strava") && (rows[0].match(/Carrera/g) || []).length === 1, "la carrera de Strava y Salud aparece una vez");

  await page.click("#doImport");
  await page.waitForFunction(() => /✓/.test(document.getElementById("pvNote").textContent));
  const out = await page.evaluate(() => ({ paso: JSON.parse(localStorage.getItem("paso.v1")), panel: JSON.parse(localStorage.getItem("panel.v1")), gym: localStorage.getItem("gymtracker.v1") }));
  if (!out.paso.days["2026-11-03"]) console.log(JSON.stringify(out.paso).slice(0, 600), await page.textContent("#pvNote"));
  check(out.paso.days["2026-11-03"].steps === 1234, "el día manual de Paso se respeta");
  const types = out.paso.runs.map((r) => r.date + ":" + r.type).sort();
  check(JSON.stringify(types) === JSON.stringify(["2026-11-01:otro", "2026-11-02:natacion", "2026-11-04:rodaje"]), "sesiones: natación sin duplicar, fuerza no, bici y carrera sí: " + types);
  check(out.panel.days["2026-11-04"].bed === "00:10", "la noche apuntada a mano en el Panel se respeta");
  check(out.panel.goals && out.panel.goals.length >= 1 || out.panel.version === 1, "panel válido");
  check(out.gym === '{"sessions":[]}', "no toca otras apps");

  // Shortcut via URL (Safari mode)
  await page.goto(URL + "#/atajos?d=2026-11-02&steps=8420&bed=23:30&wake=07:10");
  await page.waitForSelector("#pvBody tr");
  check(!(await page.textContent("#pvNote")).includes("✓"), "nota limpia antes de importar");
  await page.click("#doImport");
  await page.waitForFunction(() => /✓/.test(document.getElementById("pvNote").textContent));
  const o2 = await page.evaluate(() => ({ paso: JSON.parse(localStorage.getItem("paso.v1")), panel: JSON.parse(localStorage.getItem("panel.v1")) }));
  check(o2.paso.days["2026-11-02"].steps === 8420 && o2.panel.days["2026-11-02"].wake === "07:10", "Atajo por URL guardado");

  // 360 px
  const m = await b.newPage({ viewport: { width: 360, height: 780 } });
  await m.goto(URL);
  check(await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "sin scroll horizontal a 360 px");
  check(!errors.length, errors.join(" | "));
  await b.close();
  console.log("smoke OK · Salud + Strava sin duplicados, días manuales respetados, Atajo por URL, 360 px");
})().catch((e) => { console.error(e); process.exit(1); });
