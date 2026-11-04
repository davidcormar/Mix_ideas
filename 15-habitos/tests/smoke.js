const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + path.resolve(__dirname, "../app/index.html"));
  await p.fill("#month", "2026-10"); await p.dispatchEvent("#month", "change");
  for (let h = 0; h < 10; h++) for (let d = 1; d <= 31; d++) if ((h * 7 + d * 3) % 10 < 8) await p.click(`td.c[data-h="${h}"][data-d="${d}"]`);
  await p.fill('[data-ot="0"]', "Elegir media maratón de otoño 2027"); await p.dispatchEvent('[data-ot="0"]', "change");
  await p.check('[data-od="0"]');
  const objDone = await p.evaluate(() => JSON.parse(localStorage.getItem("habitos.v1")).objectives["2026-10"][0].done);
  if (!objDone) throw new Error("objective not saved");
  const mean = await p.textContent("#kpis .kpi");
  await p.screenshot({ path: path.resolve(__dirname, "../captura-app.png") });
  await b.close();
  if (errs.length) throw new Error(errs.join("\n"));
  console.log("smoke OK, mean =", mean);
})().catch((e) => { console.error(e); process.exit(1); });
