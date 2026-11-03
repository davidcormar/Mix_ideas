// Headless check: page loads without JS errors (map may fail offline; the app must still work).
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  await p.goto("file://" + path.resolve(__dirname, "../index.html"), { waitUntil: "load", timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const cards = await p.$$eval("#placeList .card", (c) => c.length);
  await p.click('[data-toggle="1"]');
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("mapaviajes.v1")).places[1].status);
  const leaflet = await p.evaluate(() => !!window.L);
  await p.click('nav button[data-tab="viajes"]');
  const trips = await p.$$eval("#tripList .card", (c) => c.length);
  await p.screenshot({ path: path.resolve(__dirname, "../captura.png") });
  await b.close();
  if (errors.length) throw new Error(errors.join("\n"));
  if (cards !== 5 || trips !== 2 || st !== "visitado") throw new Error(`cards=${cards} trips=${trips} st=${st}`);
  console.log("smoke OK · leaflet loaded:", leaflet);
})().catch((e) => { console.error(e); process.exit(1); });
