// Checks that the apps install a service worker over http and open WITHOUT internet.
// Run from the repo root:  NODE_PATH=$(npm root -g) node herramientas/test_pwa.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const PREFIX = "/Mix_ideas"; // same path shape as GitHub Pages
const APPS = ["28-panel-vida/", "26-ritmo/", "27-paso/", "15-habitos/app/", "10-gym-tracker/", "21-idiomas-plan/", "11-finanzas/", "12-mapa-viajes/", "25-habilidades/mecanografia/"];

function check(c, m) { if (!c) throw new Error("FALLO: " + m); }

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (!p.startsWith(PREFIX + "/")) { res.writeHead(404); return res.end(); }
  p = path.join(ROOT, p.slice(PREFIX.length));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}${PREFIX}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "28-panel-vida/");
  await page.waitForSelector(".card");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cached = await page.evaluate(async () => (await (await caches.open("mix-ideas-v1")).keys()).length);
  check(cached >= 45, "ficheros precargados en caché: " + cached);
  const man = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
  check(man.start_url && man.icons.length === 2, "manifest válido");

  await ctx.setOffline(true);
  const offline = [];
  for (const app of APPS) {
    await page.goto(base + app);
    const ok = await page.evaluate(() => document.body && document.body.innerText.trim().length > 40);
    check(ok, "abre sin conexión: " + app);
    offline.push(app.replace(/\/$/, ""));
  }
  await page.goto(base + "28-panel-vida/#/semana"); await page.waitForSelector("#reviewForm");
  await ctx.setOffline(false);
  check(errors.length === 0, "errores: " + errors.join(" | "));
  await browser.close(); server.close();
  console.log(`pwa OK · ${cached} ficheros en caché · sin conexión abren: ${offline.length} apps`);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
