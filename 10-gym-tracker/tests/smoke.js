// Headless smoke test: open index.html via file://, run a workout, check progress & export.
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  await p.goto("file://" + path.resolve(__dirname, "../index.html"));
  await p.click('nav button[data-tab="datos"]');
  await p.click("#demo");
  await p.click('nav button[data-tab="entrenar"]');
  await p.click("#start");
  await p.fill('input[data-e="0"][data-s="0"][data-f="weight"]', "50");
  await p.fill('input[data-e="0"][data-s="0"][data-f="reps"]', "8");
  await p.click("#finish");
  const n = await p.evaluate(() => JSON.parse(localStorage.getItem("gymtracker.v1")).sessions.length);
  await p.click('nav button[data-tab="progreso"]');
  await p.selectOption("#exSel", "press_inclinado_smith");
  const prs = await p.$$eval("#prs tr", (r) => r.length);
  await p.screenshot({ path: path.resolve(__dirname, "../captura-progreso.png") });
  await b.close();
  if (errors.length) throw new Error(errors.join("\n"));
  if (n !== 25) throw new Error("expected 25 sessions, got " + n);
  if (prs < 5) throw new Error("PR table too short");
  console.log("smoke OK:", n, "sessions,", prs - 1, "PR rows");
})().catch((e) => { console.error(e); process.exit(1); });
