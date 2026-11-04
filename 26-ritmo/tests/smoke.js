// End-to-end smoke test for Ritmo (file://, headless Chromium). Run: NODE_PATH=$(npm root -g) node tests/smoke.js
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const APP = "file://" + path.join(ROOT, "index.html");
const HABITOS = "file://" + path.resolve(ROOT, "../15-habitos/app/index.html");
const ROUTES = ["#/hoy", "#/hoy?d=2026-11-07", "#/semana", "#/mes", "#/mes?m=2027-02", "#/habitos", "#/rutina/manana", "#/rutina/noche", "#/progreso", "#/ajustes"];

function check(cond, msg) { if (!cond) throw new Error("smoke: " + msg); }

/** Foreign keys seeded once, before Ritmo runs (Ritmo only reads them). */
function seedForeign() {
  const put = (k, v) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, JSON.stringify(v)); };
  put("gymtracker.v1", { sessions: [{ date: "2026-11-03", routine: "r5", exercises: [{ id: "press_inclinado_smith", sets: [{ weight: 50, reps: 8 }] }] }], draft: null });
  const types = ["gramatica", "escucha", "lectura", "gramatica", "escucha", "escritura", "conversacion"], log = [];
  for (let i = 0, k = 0; i < 20; i++) {
    const d = new Date(Date.UTC(2026, 9, 15 + i)).toISOString().slice(0, 10); // UTC arithmetic → plain ISO day
    if (d !== "2026-11-02") log.push({ date: d, lang: "fr", minutes: 40, type: types[k++ % 7], t: i });
  }
  put("idiomas.v1", { log, base: { fr: 120 } });
  put("finanzas.v1", { txs: [], goals: [{ id: "woxsen", name: "Intercambio Woxsen (India)", target: 3500, deadline: "2027-01-06", contributions: [{ date: "2026-11-01", amount: 1200 }] }], csv: {} });
  put("paso.v1", { version: 1, settings: { stepGoal: 10000 }, days: { "2026-11-04": { steps: 8420, stepsSource: "manual", waterMl: 1500, dayType: null, meals: [
    { id: "m1", slot: "desayuno", time: "08:10", desc: "Avena, yogur y fruta", protein: 1, veg: 0, carbs: 1, fat: 1 },
    { id: "m2", slot: "comida", time: "14:00", desc: "Pollo, arroz y verdura", protein: 2, veg: 1, carbs: 2, fat: 1 },
    { id: "m3", slot: "merienda", time: "17:30", desc: "Tostada y café", protein: 0, veg: 0, carbs: 1, fat: 1 }] } }, runs: [], imports: [] });
}

async function noHorizontalScroll(page, label) {
  for (const r of ROUTES) {
    await page.evaluate((h) => { location.hash = h; }, r);
    await page.waitForTimeout(30);
    const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    check(ok, `horizontal scroll at ${label} on ${r}`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-ES", timezoneId: "Europe/Madrid" });
  const page = await context.newPage();
  const errors = [];
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !/favicon/i.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
    p.on("dialog", (d) => d.accept());
  };
  watch(page, "ritmo");
  await page.clock.install({ time: new Date("2026-11-04T18:40:00+01:00") });
  await page.addInitScript(seedForeign);
  const ls = (k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), k);

  // 2. demo → Hoy
  await page.goto(APP + "#/ajustes");
  await page.click("#demoBtn");
  await page.waitForFunction(() => location.hash === "#/hoy" && document.querySelectorAll(".tl-item").length >= 5);
  check((await page.locator(".tl-item").count()) >= 5, "at least 5 timeline items");
  const kpi = (await page.textContent("#habitsToday")).trim();
  check(/\d+ \/ 10/.test(kpi), "habitsToday shows N / 10, got " + kpi);
  check(await page.isVisible("#nowMarker"), "now marker visible");
  check((await page.textContent("#nowMarker")).includes("18:40"), "now marker shows 18:40");
  check((await page.textContent("#sportCount")).includes("Deporte esta semana"), "sport count");
  check((await page.textContent("#frenchToday")).includes("50'"), "French today = 30 floor + 20 owed (idiomas carry-over)");
  check((await page.textContent(".title")).includes("Miércoles,") && (await page.textContent(".title")).includes("4 de noviembre"), "Spanish title");

  // XSS: a hostile title renders as text
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("ritmo.v1")); s.tasks.push({ id: "t_xss", title: '<img src=x onerror="window.__xss=1">', category: "resto", date: "2026-11-04", status: "open" }); localStorage.setItem("ritmo.v1", JSON.stringify(s)); });
  await page.reload();
  await page.waitForSelector("#timeline");
  check(await page.evaluate(() => !window.__xss && !document.querySelector("#view img")), "XSS title rendered as text");
  check((await page.textContent("#untimedCard")).includes("<img"), "hostile title visible as text");
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("ritmo.v1")); s.tasks = s.tasks.filter((t) => t.id !== "t_xss"); localStorage.setItem("ritmo.v1", JSON.stringify(s)); });
  await page.reload();
  await page.waitForSelector("#timeline");

  // 3. new task with a training-window warning, then a valid time
  await page.click("#btnNewTask");
  await page.fill("#tTitle", "Prueba recordatorio");
  await page.selectOption("#tCategory", "deporte");
  await page.fill("#tTime", "11:00");
  await page.waitForFunction(() => document.querySelector("#tWarnings").textContent.includes("fuera de franja"));
  await page.fill("#tTime", "18:45");
  await page.click("#tSave");
  await page.waitForFunction(() => !document.querySelector("#taskDialog").open);
  check((await ls("ritmo.v1")).tasks.some((t) => t.title === "Prueba recordatorio" && t.time === "18:45" && t.date === "2026-11-04"), "task saved at 18:45");

  // 4. reminder toast
  await page.clock.runFor(6 * 60 * 1000);
  check((await page.textContent("#toasts")).includes("Prueba recordatorio"), "reminder toast shown");

  // 5. tick habit 2 through the shared key
  await page.click('button[data-habit="2"]');
  const hab = await ls("habitos.v1");
  check(hab.habits.length === 10, "habits list intact");
  check(hab.months["2026-11"]["2"].includes(4), "habit 2 ticked on the 4th");
  check(await page.getAttribute('button[data-habit="2"]', "aria-pressed") === "true", "habit button pressed");

  // 6. nightly review: task by task, propose, accept, save (dismiss the reminder first: ✕ and Esc)
  const toastsBefore = await page.locator("#toasts .toast").count();
  await page.click("#toasts .toast .toast-x");
  check((await page.locator("#toasts .toast").count()) === toastsBefore - 1, "toast closes with ✕");
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
  check((await page.locator("#toasts .toast").count()) === 0, "toasts close with Esc");
  await page.click("#btnReview");
  await page.waitForSelector("#reviewDialog[open]");
  const sequence = ["done", "date", "keep", "archive", "tomorrow"];
  let n = 0, movedTitle = null;
  while (await page.locator("#reviewDialog [data-review-action]").count()) {
    const act = n < sequence.length ? sequence[n] : n % 2 ? "done" : "tomorrow";
    const title = await page.textContent("#reviewDialog .rv-title");
    if (n === 1) { // exercise "← Atrás" once
      await page.click('#reviewDialog [data-review-action="keep"]');
      await page.click('#reviewDialog [data-rv="back"]');
      check((await page.textContent("#reviewDialog .rv-title")) === title, "back restores the previous task");
    }
    if (act === "date") {
      await page.click('#reviewDialog [data-review-action="date"]');
      await page.fill("#rvDate", "2026-11-10");
      await page.click('#reviewDialog [data-rv="date-ok"]');
    } else await page.click(`#reviewDialog [data-review-action="${act}"]`);
    if (act === "tomorrow" && !movedTitle) movedTitle = title;
    n++;
    check(n < 40, "review loop terminates");
  }
  check(n >= 5, "reviewed at least 5 tasks, got " + n);
  await page.click("#reviewNext");
  await page.waitForSelector("#proposalTable");
  const rows = await page.locator("#proposalTable tr[data-block]").count();
  check(rows >= 3, "proposal has ≥ 3 blocks, got " + rows);
  await page.click("#acceptPlan");
  await page.click("#reviewFinish");
  await page.waitForFunction(() => !document.querySelector("#reviewDialog").open);
  const afterReview = await ls("ritmo.v1");
  const planned = afterReview.tasks.filter((t) => t.date === "2026-11-05" && t.time && t.title !== "Fuerza: tirón");
  check(planned.length > 0, "a task dated 2026-11-05 got a time");
  check(afterReview.reviews["2026-11-04"] && afterReview.reviews["2026-11-04"].accepted >= 3, "review recorded");
  check(afterReview.routineLog["2026-11-04"].noche.includes("rev"), "routine item 'rev' auto-checked");
  check(afterReview.tasks.some((t) => t.title === movedTitle && (t.date === "2026-11-05" || t.date === "2026-11-06")), "task moved to tomorrow");
  check((await page.textContent("#toasts")).includes("Plan de mañana guardado"), "save toast with undo");

  // 7. other routes
  await page.evaluate(() => { location.hash = "#/semana"; });
  await page.waitForSelector(".week-col");
  check((await page.locator(".week-col").count()) === 7, "7 day columns");
  await page.evaluate(() => { location.hash = "#/mes"; });
  await page.waitForSelector("#calGrid");
  check((await page.locator("#calGrid button[data-date]").count()) === 30, "30 month cells");
  check((await page.locator("#calGrid .cal-blank").count()) === 6, "6 leading blanks");
  check((await page.getAttribute('#calGrid button[data-date="2026-11-04"]', "aria-label")).startsWith("4 de noviembre: "), "cell aria-label");
  await page.evaluate(() => { location.hash = "#/habitos"; });
  await page.waitForSelector(".ht");
  check((await page.locator(".ht tbody tr").count()) === 10, "10 habit rows");
  await page.evaluate(() => { location.hash = "#/rutina/noche"; });
  await page.waitForSelector('input[data-routine-item="n2"]');
  await page.check('input[data-routine-item="n2"]');
  check((await ls("ritmo.v1")).routineLog["2026-11-04"].noche.includes("n2"), "routine item toggled");
  await page.evaluate(() => { location.hash = "#/progreso"; });
  await page.waitForSelector("svg[data-chart]");
  check((await page.locator("svg[data-chart]").count()) === 4, "4 charts");
  check((await page.textContent('.app-card[data-app="paso"]')).includes("8.420"), "paso card shows 8.420");
  check((await page.textContent('.app-card[data-app="gym"]')).includes("1 sesión"), "gym card shows 1 session");
  check((await page.textContent('.app-card[data-app="finanzas"]')).includes("1.200 € de 3.500 €"), "finanzas goal");

  // 8–9. downloads
  await page.evaluate(() => { location.hash = "#/ajustes"; });
  await page.waitForSelector("#icsWeek");
  const [dlIcs] = await Promise.all([page.waitForEvent("download"), page.click("#icsWeek")]);
  const ics = fs.readFileSync(await dlIcs.path(), "utf8");
  check(dlIcs.suggestedFilename() === "ritmo-semana-2026-11-02.ics", "ics file name " + dlIcs.suggestedFilename());
  check(ics.includes("BEGIN:VCALENDAR") && ics.includes("TZID=Europe/Madrid") && ics.includes("\r\n"), "ics content");
  const [dlJson] = await Promise.all([page.waitForEvent("download"), page.click("#exportJson")]);
  const bundle = JSON.parse(fs.readFileSync(await dlJson.path(), "utf8"));
  check(bundle.app === "ritmo" && bundle.version === 1 && bundle.habitos && bundle.ritmo.tasks.length > 5, "json bundle");
  // foreign keys untouched
  check((await ls("gymtracker.v1")).sessions.length === 1 && (await ls("paso.v1")).days["2026-11-04"].steps === 8420, "foreign keys unchanged");

  // 10. 15-habitos still opens our data
  if (fs.existsSync(path.resolve(ROOT, "../15-habitos/app/index.html"))) {
    const hp = await context.newPage();
    watch(hp, "15-habitos");
    await hp.goto(HABITOS);
    await hp.waitForSelector("td.c");
    const on = await hp.locator("td.c.on").count();
    check(on > 0, "15-habitos shows Ritmo's ticks");
    await hp.close();
  }

  // 11. screenshots on a fresh demo day, 360 px checks, dark mode
  await page.evaluate(() => { location.hash = "#/ajustes"; });
  await page.click("#demoBtn");
  await page.waitForFunction(() => location.hash === "#/hoy");
  await page.clock.runFor(10 * 1000); // let the info toasts expire
  // a reminder like the reference: let the clock reach the 20:00 deep-work block
  const now = await page.evaluate(() => Date.now());
  const target = new Date("2026-11-04T20:00:30+01:00").getTime();
  if (target > now) await page.clock.runFor(target - now);
  await page.evaluate(() => window.scrollTo(0, 0));
  check((await page.textContent("#toasts")).includes("Práctica de Señales"), "20:00 reminder toast");
  await page.waitForTimeout(600); // let the toast entrance animation finish (CSS runs on real time)
  await page.screenshot({ path: path.join(ROOT, "captura-escritorio.png") });

  await page.setViewportSize({ width: 360, height: 740 });
  await noHorizontalScroll(page, "360px light");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { location.hash = "#/hoy"; window.scrollTo(0, 0); });
  await page.waitForSelector("#habitsCard");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ROOT, "captura-movil.png") });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 360, height: 740 });
  await noHorizontalScroll(page, "360px dark");
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const r of ROUTES) { await page.evaluate((h) => { location.hash = h; }, r); await page.waitForTimeout(20); }
  await page.evaluate(() => { location.hash = "#/hoy"; });
  if (process.env.RITMO_DARK_SHOT) await page.screenshot({ path: process.env.RITMO_DARK_SHOT });

  await browser.close();
  if (errors.length) throw new Error("page errors:\n" + errors.join("\n"));
  console.log(`smoke OK · ${n} tareas revisadas · ${rows} bloques propuestos · capturas: captura-escritorio.png, captura-movil.png`);
})().catch((e) => { console.error(e); process.exit(1); });
