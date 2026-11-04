// Checks that the apps install a service worker over http and open WITHOUT internet.
// Run from the repo root:  NODE_PATH=$(npm root -g) node herramientas/test_pwa.js
// The local server imitates GitHub Pages: everything under /Mix_ideas/, a folder without the final slash
// answers 301 to "folder/", and files carry Cache-Control: max-age=600.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json", ".md": "text/markdown; charset=utf-8" };
const PREFIX = "/Mix_ideas"; // same path shape as GitHub Pages
const APPS = ["28-panel-vida/", "26-ritmo/", "27-paso/", "15-habitos/app/", "10-gym-tracker/", "21-idiomas-plan/", "11-finanzas/", "12-mapa-viajes/", "25-habilidades/mecanografia/"];
const SW_SRC = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const FILES = JSON.parse(SW_SRC.match(/const FILES = (\[[\s\S]*?\]);/)[1]);
const VERSION = SW_SRC.match(/const VERSION = "(\w+)";/)[1];

function check(c, m) { if (!c) throw new Error("FALLO: " + m); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const overrides = {}; // "/rel/path" → body (simulates a deploy)
const delays = {};    // "/rel/path" → ms (simulates a slow network)
const server = http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  let rel = decodeURIComponent(url);
  if (!rel.startsWith(PREFIX + "/")) { res.writeHead(404); return res.end(); }
  rel = rel.slice(PREFIX.length);
  if (delays[rel]) await sleep(delays[rel]);
  let p = path.join(ROOT, rel);
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    if (!rel.endsWith("/")) { res.writeHead(301, { Location: url + "/" }); return res.end(); }
    p = path.join(p, "index.html"); rel += "index.html";
  }
  const headers = { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream", "Cache-Control": "max-age=600" };
  if (overrides[rel] !== undefined) { res.writeHead(200, headers); return res.end(overrides[rel]); }
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, headers);
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}${PREFIX}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [], failed = [], requested = new Set();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => { if (r.url().startsWith(base)) failed.push(r.url().slice(base.length) + " " + (r.failure() || {}).errorText); });
  page.on("request", (r) => { if (r.url().startsWith(base)) requested.add(r.url().slice(base.length).split(/[?#]/)[0]); });

  // 1 · install: one worker for the whole repo, every file precached in the versioned cache
  await page.goto(base + "28-panel-vida/");
  await page.waitForSelector(".card");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const keys = await page.evaluate(() => caches.keys());
  check(keys.length === 1 && keys[0] === "mix-ideas-" + VERSION, "caché con la versión del sw.js: " + keys);
  const cached = await page.evaluate(async (k) => (await (await caches.open(k)).keys()).length, keys[0]);
  check(cached === FILES.length, `todos los ficheros precargados: ${cached} de ${FILES.length}`);
  const man = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
  check(man.start_url && man.scope && man.icons.some((i) => i.sizes === "192x192") && man.icons.some((i) => i.sizes === "512x512" && /any/.test(i.purpose || "any")) && man.icons.some((i) => i.purpose === "maskable"), "manifest con iconos 192, 512 y maskable");

  // 2 · online: every app (nested ones too) is controlled by the same worker and loads only files that are precached
  for (const app of APPS) {
    await page.goto(base + app);
    await page.waitForLoadState("load");
    const ctl = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { ctl: !!navigator.serviceWorker.controller, scope: r && r.scope }; });
    check(ctl.ctl && ctl.scope === base, `${app} controlada por el worker de la raíz (${ctl.scope})`);
  }
  const missing = [...requested].filter((u) => !u.endsWith("sw.js") && !FILES.includes(u) && !FILES.includes(u.replace(/index\.html$/, "")));
  check(missing.length === 0, "ficheros que las apps piden y no están en la caché: " + missing.join(", "));

  // 3 · a deploy: online you get the new file at once (network first), and the cached copy is refreshed
  overrides["/28-panel-vida/index.html"] = fs.readFileSync(path.join(ROOT, "28-panel-vida/index.html"), "utf8").replace("</body>", "<!-- deploy-nuevo --></body>");
  await page.goto(base + "28-panel-vida/index.html"); await page.waitForSelector(".card");
  check((await page.content()).includes("deploy-nuevo"), "online se ve el deploy nuevo sin esperar");
  await sleep(300);
  const cachedText = (k) => page.evaluate(async ([k, u]) => { const r = await (await caches.open(k)).match(u); return r ? r.text() : ""; }, [k, base + "28-panel-vida/index.html"]);
  check((await cachedText(keys[0])).includes("deploy-nuevo"), "la copia en caché se actualiza");
  delete overrides["/28-panel-vida/index.html"];

  // 4 · a new sw.js (new VERSION) installs a fresh cache and deletes the old one
  overrides["/sw.js"] = SW_SRC.replace(`const VERSION = "${VERSION}"`, `const VERSION = "${VERSION}b"`);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  let ks = [];
  for (let i = 0; i < 50 && !(ks.length === 1 && ks[0].endsWith("b")); i++) { await sleep(200); ks = await page.evaluate(() => caches.keys()); }
  check(ks.length === 1 && ks[0] === `mix-ideas-${VERSION}b`, "la versión nueva sustituye a la vieja: " + ks);
  check(await page.evaluate(async (k) => (await (await caches.open(k)).keys()).length, ks[0]) === FILES.length, "la versión nueva está completa");
  const fresh = await cachedText(ks[0]);
  check(fresh.includes("Panel de vida") && !fresh.includes("deploy-nuevo"), "la versión nueva se descarga entera del servidor (no de la caché HTTP del navegador)");

  // 5 · slow network: cached file → cached copy at ~4 s; file not cached → waits for the network instead of failing
  await page.goto(base + "28-panel-vida/"); await page.waitForSelector(".card");
  delays["/28-panel-vida/styles.css"] = 7000; delays["/28-panel-vida/README.md"] = 5500;
  const slow = await page.evaluate(async () => {
    const t0 = performance.now();
    const a = await fetch("styles.css?lento=1", { cache: "no-store" }); const ta = performance.now() - t0;
    const b = await fetch("README.md", { cache: "no-store" }); const tb = performance.now() - t0 - ta;
    return { a: a.status, ta, b: b.status, tb, len: (await b.text()).length };
  });
  check(slow.a === 200 && slow.ta < 6000, `con red lenta, la copia en caché a los 4 s (${Math.round(slow.ta)} ms)`);
  check(slow.b === 200 && slow.tb >= 5000 && slow.len > 100, `con red lenta y sin copia, espera a la red en vez de fallar (${slow.b}, ${Math.round(slow.tb)} ms)`);
  delete delays["/28-panel-vida/styles.css"]; delete delays["/28-panel-vida/README.md"];

  // 6 · offline: every app opens with no failed request; folder without slash and explicit index.html too
  failed.length = 0;
  await ctx.setOffline(true);
  const offline = [];
  for (const app of APPS) {
    await page.goto(base + app);
    const ok = await page.evaluate(() => document.body && document.body.innerText.trim().length > 40);
    check(ok, "abre sin conexión: " + app);
    offline.push(app.replace(/\/$/, ""));
  }
  await page.goto(base + "15-habitos/app"); await page.waitForLoadState("load");
  check(page.url() === base + "15-habitos/app/" && (await page.evaluate(() => document.body.innerText.trim().length > 40)), "sin conexión, carpeta sin barra final → " + page.url());
  await page.goto(base + "25-habilidades/mecanografia/index.html");
  check(await page.evaluate(() => document.body.innerText.trim().length > 40), "sin conexión, index.html explícito");
  await page.goto(base); await page.waitForSelector(".card"); // root redirects to the Panel
  await page.goto(base + "28-panel-vida/#/semana"); await page.waitForSelector("#reviewForm");
  check(failed.length === 0, "peticiones fallidas sin conexión: " + failed.join(" | "));
  await ctx.setOffline(false);
  check(errors.length === 0, "errores: " + errors.join(" | "));
  await browser.close(); server.close();
  console.log(`pwa OK · ${cached} ficheros en caché (versión ${VERSION}) · deploy nuevo visible online y caché renovada · red lenta sin fallos · sin conexión abren: ${offline.length} apps`);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
