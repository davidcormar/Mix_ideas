// Headless smoke test for Panel de vida, opened from file:// like a double click.
// Run from 28-panel-vida/:  NODE_PATH=$(npm root -g) node tests/smoke.js
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const URL = "file://" + path.join(ROOT, "index.html");
const T = "2026-11-04";
const R = require("../../26-ritmo/logic.js");
const PA = require("../../27-paso/logic.js");
const ROUTES = ["#/panel", "#/hoy", "#/lectura", "#/metas", "#/semana", "#/ajustes", "#/hoy?d=2026-11-01", "#/semana?d=2026-10-28"];

function check(c, msg) { if (!c) throw new Error("FALLO: " + msg); }

(async () => {
  // fixtures for the other apps (all fictional)
  const habits = R.demoHabits(T);
  const foreign = {
    "habitos.v1": JSON.stringify(habits),
    "ritmo.v1": JSON.stringify(R.demoState(T, habits.habits)),
    "paso.v1": JSON.stringify(PA.demoData(T)),
    "gymtracker.v1": JSON.stringify({ sessions: [{ date: "2026-11-02T18:00:00.000Z", routine: "r1", exercises: [] }, { date: "2026-11-03T18:00:00.000Z", routine: "r2", exercises: [] }], draft: null }),
    "idiomas.v1": JSON.stringify({ log: [{ date: "2026-11-02", lang: "fr", minutes: 40, type: "lectura", t: "1" }, { date: "2026-11-03", lang: "fr", minutes: 20, type: "escritura", t: "2" }], base: { fr: 180 } }),
    "finanzas.v1": JSON.stringify({ txs: [{ date: "2026-11-02", concept: "Super", amount: -42.5, category: "Comida" }, { date: "2026-11-03", concept: "Bizum", amount: 20, category: "Otros ingresos" }], goals: [{ id: "g1", name: "Woxsen", target: 2000, contributions: [{ amount: 700 }] }], csv: {} }),
  };
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-ES", timezoneId: "Europe/Madrid", acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("dialog", (d) => d.accept());
  await page.clock.install({ time: new Date("2026-11-04T19:10:00+01:00") });

  // 1 · first run with nothing stored: starter goals, empty states, no errors
  await page.goto(URL);
  await page.waitForSelector(".card");
  const first = JSON.parse(await page.evaluate(() => localStorage.getItem("panel.v1")));
  check(first.goals.length === 6, "6 metas iniciales de tus visiones");
  check((await page.textContent("#view")).includes("Apunta a qué hora te acostaste"), "estado vacío de sueño");

  // 2 · seed the other apps and reload
  await page.evaluate((f) => { for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v); }, foreign);
  await page.reload();
  await page.waitForSelector(".card");
  const panelTxt = await page.textContent("#view");
  for (const s of ["Hábitos", "Cuerpo", "Francés", "Dinero", "Abrir Ritmo", "Woxsen", "días · Woxsen (India)"]) check(panelTxt.includes(s), "panel muestra " + s);
  check(panelTxt.includes("43 €"), "gasto del mes leído de Finanzas: " + panelTxt.match(/\d+ €/));

  // 3 · daily log: sleep, energy, phone, journal
  await page.click('.side-nav a[data-nav="hoy"]'); await page.waitForSelector("[data-day]");
  await page.fill('[data-f="bed"]', "23:40"); await page.locator('[data-f="bed"]').dispatchEvent("change");
  await page.fill('[data-f="wake"]', "07:25"); await page.locator('[data-f="wake"]').dispatchEvent("change");
  check((await page.textContent("#sleepCalc")).includes("7 h 45"), "cálculo de horas de sueño");
  await page.click('[data-energy="4"]');
  await page.fill('[data-f="screenMin"]', "55"); await page.locator('[data-f="screenMin"]').dispatchEvent("change");
  await page.check('[data-f="noSocialAM"]');
  await page.fill('[data-j="good"]', "<b>Series</b> cumplidas");
  await page.locator('[data-j="good"]').dispatchEvent("change");
  let st = JSON.parse(await page.evaluate(() => localStorage.getItem("panel.v1")));
  check(st.days[T].bed === "23:40" && st.days[T].wake === "07:25" && st.days[T].energy === 4 && st.days[T].screenMin === 55 && st.days[T].noSocialAM === true, "día guardado: " + JSON.stringify(st.days[T]));
  check(st.days[T].journal.good === "<b>Series</b> cumplidas", "diario guardado");

  // 4 · reading
  await page.click('.side-nav a[data-nav="lectura"]'); await page.waitForSelector("#bookForm");
  await page.fill('#bookForm [name="title"]', "Meditaciones"); await page.fill('#bookForm [name="total"]', "250");
  await page.click("#bookForm button");
  await page.click('.side-nav a[data-nav="hoy"]'); await page.waitForSelector("form[data-read]");
  await page.fill('form[data-read] [name="p"]', "30"); await page.fill('form[data-read] [name="m"]', "25");
  await page.click("form[data-read] button");
  st = JSON.parse(await page.evaluate(() => localStorage.getItem("panel.v1")));
  check(st.books[0].progress === 30 && st.readLog[0].amount === 30 && st.readLog[0].minutes === 25, "lectura apuntada");

  // 5 · goals: auto + manual + milestone, add and edit
  await page.click('.side-nav a[data-nav="metas"]'); await page.waitForSelector("#goalForm");
  const metas = await page.textContent("#view");
  check(/sesiones/.test(metas) && /h \/? ?600|\/ 600 h/.test(metas), "metas automáticas (deporte y francés)");
  await page.fill('#goalForm [name="title"]', "Media maratón < 1:55");
  await page.selectOption('#goalForm [name="kind"]', "hito");
  await page.fill('#goalForm [name="steps"]', "Inscribirme\nPlan de 16 semanas");
  await page.fill('#goalForm [name="deadline"]', "2027-10-17");
  await page.click("#goalForm button.primary");
  st = JSON.parse(await page.evaluate(() => localStorage.getItem("panel.v1")));
  const g = st.goals.find((x) => x.title === "Media maratón < 1:55");
  check(g && g.steps.length === 2, "meta-hito añadida");
  await page.check(`[data-gstep="${g.id}"][data-i="0"]`);
  st = JSON.parse(await page.evaluate(() => localStorage.getItem("panel.v1")));
  check(st.goals.find((x) => x.id === g.id).steps[0].done, "paso de la meta marcado");
  await page.click(`[data-gedit="${g.id}"]`);
  check((await page.inputValue('#goalForm [name="title"]')) === "Media maratón < 1:55", "editar rellena el formulario");
  await page.click("#cancelGoal");

  // 6 · weekly review
  await page.click('.side-nav a[data-nav="semana"]'); await page.waitForSelector("#reviewForm");
  const sem = await page.textContent("#view");
  check(sem.includes("sesiones") && sem.includes("7 h 45") && sem.includes("Series"), "foto de la semana con datos de todas las apps y el diario");
  check(!(await page.innerHTML("#view")).includes("<b>Series</b>"), "el diario se muestra como texto, no HTML");
  await page.click('[data-score="8"]');
  await page.fill('[name="w0"]', "3 sesiones de gimnasio"); await page.fill('[name="p0"]', "Francés antes de cenar");
  await page.click("#reviewForm button.primary");
  st = JSON.parse(await page.evaluate(() => localStorage.getItem("panel.v1")));
  check(st.reviews["2026-W45"].score === 8 && st.reviews["2026-W45"].priorities[0] === "Francés antes de cenar" && st.reviews["2026-W45"].snapshot.sport >= 2, "revisión guardada con foto");

  // 7 · backup of every app + restore
  await page.click('a[data-nav="ajustes"]'); await page.waitForSelector("#backupAll");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#backupAll")]);
  const backup = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check(backup.format === "mix-ideas-backup" && Object.keys(backup.data).length === 7, "copia con 7 apps: " + Object.keys(backup.data));
  const before = await page.evaluate(() => localStorage.getItem("gymtracker.v1"));
  await page.evaluate(() => localStorage.setItem("gymtracker.v1", '{"sessions":[]}'));
  const tmp = path.join(require("os").tmpdir(), "panel-backup-test.json"); fs.writeFileSync(tmp, JSON.stringify(backup));
  await page.click("#restoreAll"); await page.setInputFiles("#fileIn", tmp);
  await page.waitForFunction((b) => localStorage.getItem("gymtracker.v1") === b, before);
  await page.setInputFiles("#fileIn", { name: "x.json", mimeType: "application/json", buffer: Buffer.from("{roto") });
  check((await page.evaluate(() => localStorage.getItem("gymtracker.v1"))) === before, "copia inválida no cambia nada");

  // 8 · foreign keys untouched by normal use
  for (const k of ["habitos.v1", "ritmo.v1", "paso.v1", "idiomas.v1", "finanzas.v1"]) check((await page.evaluate((x) => localStorage.getItem(x), k)) === foreign[k], "no toca " + k);

  // 9 · demo + every route at desktop, phone, 360 px and dark mode
  await page.click("#loadDemo");
  await page.goto(URL + "#/panel"); await page.reload(); await page.waitForSelector(".card");
  await page.clock.runFor(5000);
  await page.screenshot({ path: path.join(ROOT, "captura-escritorio.png") });
  for (const r of ROUTES) { await page.goto(URL + r); await page.waitForSelector(".card"); }
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "es-ES", timezoneId: "Europe/Madrid", isMobile: true, hasTouch: true });
  const pp = await phone.newPage(); pp.on("pageerror", (e) => errors.push("móvil: " + e.message));
  await pp.clock.install({ time: new Date("2026-11-04T19:10:00+01:00") });
  await pp.goto(URL); await pp.evaluate((f) => { for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v); }, foreign);
  await pp.evaluate((d) => localStorage.setItem("panel.v1", d), await page.evaluate(() => localStorage.getItem("panel.v1")));
  await pp.goto(URL + "#/panel"); await pp.reload(); await pp.waitForSelector(".card");
  await pp.screenshot({ path: path.join(ROOT, "captura-movil.png") });
  for (const scheme of ["light", "dark"]) {
    await pp.emulateMedia({ colorScheme: scheme });
    await pp.setViewportSize({ width: 360, height: 780 });
    for (const r of ROUTES) {
      await pp.goto(URL + r); await pp.waitForSelector(".card");
      const over = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(over <= 0, `scroll horizontal a 360 px en ${r} (${scheme}): ${over}px`);
    }
  }
  check(errors.length === 0, "errores: " + errors.join(" | "));
  await browser.close();
  console.log("smoke OK · registro diario, lectura, metas, revisión semanal, copia de 7 apps, 8 rutas a 360 px en claro y oscuro");
})().catch((e) => { console.error(e); process.exit(1); });
