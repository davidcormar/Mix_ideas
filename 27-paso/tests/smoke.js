// Headless smoke test for Paso, opened from file:// like a double click.
// Run from 27-paso/:  NODE_PATH=$(npm root -g) node tests/smoke.js
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const URL = "file://" + path.join(ROOT, "index.html");
const T = "2026-11-04";
const ROUTES = ["#/hoy", "#/actividad", "#/comidas", "#/historial", "#/ajustes", `#/hoy?d=2026-11-02`];
const GYM = JSON.stringify({ sessions: [{ date: T, routine: "r4", exercises: [{ id: "remo_t", sets: [{ weight: 50, reps: 10 }] }] }], draft: null });
const HAB = JSON.stringify({ habits: ["📵 Móvil (0 redes <14:00, máx 1 h)", "🧠 Deep work", "🇫🇷 Francés", "🏃 Deporte", "🥗 Nutrición + 3 L agua"],
  months: { "2026-11": { 3: [2], 4: [2, 3] } }, objectives: { "2026-11": [{ text: "x", done: false }, { text: "", done: false }, { text: "", done: false }] } });

function check(cond, msg) { if (!cond) throw new Error("FALLO: " + msg); }
function healthXml() {
  const rec = (src, start, v, child = "") => `<Record type="HKQuantityTypeIdentifierStepCount" sourceName="${src}" unit="count" creationDate="${start}" startDate="${start}" endDate="${start}" value="${v}"${child ? `>${child}</Record>` : "/>"}\n`;
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<HealthData locale=\"es_ES\">\n" +
    rec("iPhone de David", "2026-11-01 09:00:00 +0100", 4000) + rec("iPhone de David", "2026-11-01 18:00:00 +0100", 3000) +
    rec("Apple Watch de David", "2026-11-01 09:00:00 +0100", 3500, "<MetadataEntry key=\"HKMetadataKeySyncVersion\" value=\"2\"/>") +
    rec("Apple Watch de David", "2026-11-01 18:00:00 +0100", 3000) +
    "<Record type=\"HKQuantityTypeIdentifierHeartRate\" sourceName=\"Apple Watch de David\" startDate=\"2026-11-01 10:00:00 +0100\" value=\"61\"/>\n</HealthData>\n";
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-ES", timezoneId: "Europe/Madrid", acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/i.test(m.text())) errors.push("console: " + m.text()); });
  page.on("dialog", (d) => d.accept());
  await page.clock.install({ time: new Date("2026-11-04T18:20:00+01:00") });
  await page.addInitScript(([gym, hab]) => { // foreign keys seeded once (read-only for Paso)
    if (!localStorage.getItem("gymtracker.v1")) localStorage.setItem("gymtracker.v1", gym);
    if (!localStorage.getItem("habitos.v1")) localStorage.setItem("habitos.v1", hab);
  }, [GYM, HAB]);

  const txt = (sel) => page.textContent(sel).then((s) => (s || "").trim());
  const paso = () => page.evaluate(() => JSON.parse(localStorage.getItem("paso.v1")));
  const clearToasts = () => page.evaluate(() => { document.getElementById("toasts").innerHTML = ""; });
  const nav = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForFunction((h) => location.hash === h, hash); };
  const loadDemo = async () => {
    await nav("#/ajustes");
    await page.click("#demoBtn");
    await page.waitForFunction(() => location.hash === "#/hoy");
    await page.waitForSelector("#stepsValue");
  };

  // 2 · demo → Hoy
  await page.goto(URL + "#/ajustes");
  await loadDemo();
  check(await txt("#stepsValue") === "8.420", "#stepsValue = 8.420");
  check((await txt("#stepsPct")).includes("84"), "#stepsPct contiene 84");
  check(await txt("#mealsCount") === "3 / 4", "#mealsCount = 3 / 4");
  check(await page.isVisible("#weekChange"), "#weekChange visible");
  check((await txt("#weekChange")).startsWith("↑"), "la media semanal sube");
  check((await txt("#weekAvg")) === "9.150", "#weekAvg = 9.150");
  check((await txt("#dayTypeHint")).includes("Gimnasio"), "pista de tipo de día menciona Gimnasio (Gym Tracker)");
  check((await txt("#stepsLeft")) === "Te faltan 1.580 · 1,1 km", "Te faltan 1.580 · 1,1 km");
  check(await page.$("#vegIdeas .idea") !== null, "ideas de verdura visibles con verdura baja");
  check((await page.$$("#heatCard .heat-cell")).length === 61, "tira de calor: octubre + noviembre");
  check((await txt("#water")).includes("1,5"), "agua 1,5 L");
  check((await txt("#water")).includes("sin marcar"), "línea de Hábitos (solo lectura)");

  // 3 · new meal defaults to cena; +2 palms, +2 fists
  await clearToasts();
  await page.click("#addMeal");
  await page.waitForSelector("#mealDialog[open]");
  check(await page.inputValue("#mSlot") === "cena", "la comida siguiente es la cena");
  for (let i = 0; i < 4; i++) { await page.click("button[data-step=\"protein\"][data-dir=\"1\"]"); await page.click("button[data-step=\"veg\"][data-dir=\"1\"]"); }
  check(await txt("#mProtein") === "2" && await txt("#mVeg") === "2", "steppers ±0,5");
  await page.fill("#mDesc", "Merluza en papillote <img src=x onerror=\"window.__xss=1\">");
  await page.click("#mSave");
  await page.waitForFunction(() => /Cena guardada/.test(document.getElementById("toasts").textContent));
  check((await txt("#toasts")).includes("te quedan"), "toast: te quedan N pasos");
  check(await txt("#mealsCount") === "4 / 4", "#mealsCount = 4 / 4");
  check(await page.evaluate(() => window.__xss === undefined), "XSS en la descripción se muestra como texto");
  check((await txt("#mealsCard")).includes("<img"), "descripción escapada visible");
  const cena = (await paso()).days[T].meals.find((m) => m.slot === "cena");
  check(cena && cena.protein === 2 && cena.veg === 2, "cena guardada con 2 palmas y 2 puños");

  // 4 · water
  await page.click("button[data-water=\"250\"]");
  check((await paso()).days[T].waterMl === 1750, "agua 1750 ml");
  await page.click("button[data-water=\"-250\"]"); await page.click("button[data-water=\"250\"]");
  check((await paso()).days[T].waterMl === 1750, "− y + vaso");

  // 5 · steps → sidebar goal ✓
  check(await page.$("[data-goal=\"steps\"].met") === null, "pasos aún no cumplidos");
  await page.fill("#stepsInput", "10500");
  await page.click("#stepsSave");
  await page.waitForSelector("[data-goal=\"steps\"].met");
  check((await paso()).days[T].stepsSource === "manual", "pasos manuales");
  check((await txt("#stepsLeft")).includes("¡Objetivo cumplido! +500"), "objetivo cumplido +500");

  // bell popover
  await page.click("#bellBtn");
  check(await page.isVisible("#pendingPopover"), "popover de pendientes");
  check(!(await txt("#pendingPopover")).includes("pasos"), "los pasos ya no están pendientes");
  await page.keyboard.press("Escape");
  check(!(await page.isVisible("#pendingPopover")), "Esc cierra el popover");

  // 6 · Actividad: run, Apple Health, CSV
  await clearToasts();
  await page.click(".side-nav a[data-nav=\"actividad\"]");
  await page.waitForSelector("#runForm");
  await page.selectOption("#rType", "series");
  await page.fill("#rMinutes", "40");
  await page.fill("#rKm", "6,2");
  await page.click("#rSave");
  await page.waitForFunction(() => /Carrera guardada/.test(document.getElementById("toasts").textContent));
  const sessions = Number(((await txt("#sportWeek")).match(/Sesiones esta semana: (\d+)/) || [])[1]);
  check(sessions >= 2, `#sportWeek ≥ 2 sesiones (hay ${sessions})`);
  check((await txt("#sportWeek")).includes("Gimnasio · 4 · Espalda-bíceps"), "sesión de gimnasio leída");
  const run = (await paso()).runs.find((r) => r.date === T);
  check(run && run.km === 6.2 && run.minutes === 40 && run.type === "series", "carrera guardada (6,2 km)");

  await page.setInputFiles("#healthFile", { name: "export.xml", mimeType: "text/xml", buffer: Buffer.from(healthXml()) });
  await page.waitForFunction(() => document.querySelectorAll("#healthSources input[type=checkbox]").length === 2);
  check((await txt("#healthApply")).startsWith("Importar 1 día"), "botón Importar 1 día");
  await page.click("#healthApply");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("paso.v1")).days["2026-11-01"].steps === 7000);
  check((await paso()).days["2026-11-01"].stepsSource === "health", "fuente health");
  check((await txt("#importSummary")).includes("Importados 1 día"), "resumen de importación");

  await page.setInputFiles("#csvFile", { name: "pasos.csv", mimeType: "text/csv", buffer: Buffer.from("fecha,pasos\n02/11/2026;9.100") });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("paso.v1")).days["2026-11-02"].steps === 9100);
  // manual days are respected by imports
  await page.setInputFiles("#csvFile", { name: "pasos.csv", mimeType: "text/csv", buffer: Buffer.from("2026-11-04,1234") });
  await page.waitForFunction(() => /omitidos/.test(document.getElementById("importSummary").textContent));
  check((await paso()).days[T].steps === 10500, "un CSV no pisa los pasos manuales");

  // 7 · Historial
  await page.click(".side-nav a[data-nav=\"historial\"]");
  await page.waitForSelector("#calendar");
  check((await page.$$(".heat-cell")).length === 30, ".heat-cell = 30");
  check(/Objetivo cumplido \d+ de \d+ días/.test(await txt("#metCount")), "#metCount");
  check((await page.$$(".heat-cell[disabled]")).length === 26, "26 días futuros deshabilitados");
  const label = await page.getAttribute(".heat-cell[data-date=\"2026-11-02\"]", "aria-label");
  check(/^2 de noviembre: \d de 4 objetivos \(pasos [✓✗], proteína [✓✗], verdura [✓✗], agua [✓✗]\)$/.test(label), "aria-label de la celda: " + label);
  await page.click(".heat-cell[data-date=\"2026-11-02\"]");
  await page.waitForFunction(() => location.hash === "#/hoy?d=2026-11-02" && /Volver a hoy/.test((document.getElementById("pageHead") || {}).textContent || ""));
  check((await txt("#pageHead")).includes("Lunes,") && (await txt("#pageHead")).includes("Volver a hoy"), "Hoy de otra fecha");
  check(await txt("#stepsValue") === "9.100", "pasos del 2 de noviembre (CSV)");

  // 8 · Comidas
  await page.click(".side-nav a[data-nav=\"comidas\"]");
  await page.waitForSelector("#recipeList");
  check((await page.$$("#recipeList li")).length === 20, "20 recetas");
  await page.click("[data-filter=\"veg\"]");
  check((await page.$$("#recipeList li")).length === 6, "6 recetas con ≥ 1,5 puños");
  await page.click("[data-filter=\"all\"]");
  check((await page.$$("table.t7 tbody tr")).length === 7, "tabla de 7 días");

  // 9 · export / import JSON
  await clearToasts();
  await page.click(".side-link[data-nav=\"ajustes\"]");
  await page.waitForSelector("#exportJson");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#exportJson")]);
  check(dl.suggestedFilename() === `paso-${T}.json`, "nombre del fichero exportado");
  const bundle = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check(bundle.app === "paso" && bundle.version === 1 && bundle.data.days[T].steps === 10500, "bundle exportado");
  const before = await page.evaluate(() => localStorage.getItem("paso.v1"));
  await page.setInputFiles("#importFile", { name: "roto.json", mimeType: "application/json", buffer: Buffer.from("{\"days\": 5}") });
  await page.waitForFunction(() => /Archivo no válido/.test(document.getElementById("toasts").textContent));
  check(await page.evaluate(() => localStorage.getItem("paso.v1")) === before, "un import inválido no cambia nada");
  await page.setInputFiles("#importFile", { name: "copia.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(bundle)) });
  await page.waitForFunction(() => /Datos importados/.test(document.getElementById("toasts").textContent));
  check((await paso()).days[T].steps === 10500, "import de la copia");
  // settings are clamped
  await page.fill("input[data-set=\"stepGoal\"]", "200");
  await page.press("input[data-set=\"stepGoal\"]", "Tab");
  check((await paso()).settings.stepGoal === 1000 && await page.inputValue("input[data-set=\"stepGoal\"]") === "1000", "objetivo de pasos limitado a 1.000");
  await page.fill("input[data-set=\"stepGoal\"]", "10000");
  await page.press("input[data-set=\"stepGoal\"]", "Tab");

  // keyboard: n opens a meal, Esc closes it (shortcuts are ignored while typing in a field)
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("n");
  await page.waitForSelector("#mealDialog[open]");
  await page.keyboard.press("Escape");
  await page.waitForSelector("#mealDialog:not([open])", { state: "attached" });

  // 10 · screenshots like the reference: demo data + "Merienda guardada" toast
  await loadDemo();
  const shotWithToast = async (file) => {
    await clearToasts();
    await page.evaluate(() => window.scrollTo(0, 0));
    const id = await page.getAttribute(".meal-row[aria-label^=\"Editar Merienda\"]", "data-meal-id");
    await page.click(`.meal-row[data-meal-id="${id}"]`);
    await page.waitForSelector("#mealDialog[open]");
    await page.click("#mSave");
    await page.waitForFunction(() => /Merienda guardada/.test(document.getElementById("toasts").textContent));
    check((await txt("#toasts")).includes("te quedan 1.580 pasos hoy"), "toast «Merienda guardada · te quedan 1.580 pasos hoy»");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(350); // let the toast finish its entrance
    await page.screenshot({ path: path.join(ROOT, file), animations: "disabled" });
  };
  await shotWithToast("captura-escritorio.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400); // charts redraw after the resize debounce
  await shotWithToast("captura-movil.png");

  // no horizontal scroll at 360 px on any route (and with the meal dialog open)
  await page.setViewportSize({ width: 360, height: 740 });
  for (const r of ROUTES) {
    await nav(r);
    await page.waitForTimeout(250);
    const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    check(ok, `sin scroll horizontal a 360 px en ${r}`);
  }
  await nav("#/hoy");
  await page.click("#addMeal");
  await page.waitForSelector("#mealDialog[open]");
  check(await page.evaluate(() => { const d = document.getElementById("mealDialog"); return d.scrollWidth <= d.clientWidth + 1; }), "diálogo sin scroll horizontal a 360 px");
  await page.click("#mealDialog [data-close]");

  // dark mode pass
  await page.emulateMedia({ colorScheme: "dark" });
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    for (const r of ROUTES) { await nav(r); await page.waitForTimeout(150); }
  }
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(bg === "rgb(17, 19, 17)", "modo oscuro aplicado: " + bg);
  await page.emulateMedia({ colorScheme: "light" });

  // foreign keys are read-only; wipe only touches paso.v1
  const foreign = await page.evaluate(() => [localStorage.getItem("gymtracker.v1"), localStorage.getItem("habitos.v1")]);
  check(foreign[0] === GYM && foreign[1] === HAB, "gymtracker.v1 y habitos.v1 intactos");
  await page.setViewportSize({ width: 1280, height: 800 });
  await nav("#/ajustes");
  await page.click("#wipeBtn");
  const after = await page.evaluate(() => [localStorage.getItem("paso.v1"), localStorage.getItem("gymtracker.v1"), localStorage.getItem("habitos.v1")]);
  check(after[0] === null && after[1] === GYM && after[2] === HAB, "borrar solo elimina paso.v1");

  await browser.close();
  if (errors.length) throw new Error("Errores en la página:\n" + errors.join("\n"));
  console.log(`smoke OK · 8.420 → 10.500 pasos, 4/4 comidas, ${sessions} sesiones, Health 7.000 (máx. de 2 fuentes), CSV 9.100, 30 celdas, export/import JSON, 360 px y modo oscuro sin errores`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
