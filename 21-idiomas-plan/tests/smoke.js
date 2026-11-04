const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 1100 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("dialog", (d) => d.accept());
  await p.goto("file://" + path.resolve(__dirname, "../index.html"));
  // seed: daily French since 15 Oct with a gap, mostly comprehension
  await p.evaluate(() => {
    const log = [], t = ["gramatica", "escucha", "lectura", "gramatica", "escucha", "escritura", "conversacion"];
    for (let i = 0; i < 20; i++) { const d = new Date(Date.UTC(2026, 9, 15 + i)).toISOString().slice(0, 10); if (i !== 12) log.push({ date: d, lang: "fr", minutes: i % 3 ? 60 : 30, type: t[i % 7] }); }
    localStorage.setItem("idiomas.v1", JSON.stringify({ log }));
  });
  await p.reload();
  await p.fill("#fMin", "45"); await p.click("#add");
  const n = await p.evaluate(() => JSON.parse(localStorage.getItem("idiomas.v1")).log.length);
  await p.screenshot({ path: path.resolve(__dirname, "../captura.png"), fullPage: true });
  await p.click('#tabs button[data-l="de"]');
  const de = await p.textContent("#dash");
  await b.close();
  if (errs.length) throw new Error(errs.join("\n"));
  if (n !== 20) throw new Error("log length " + n);
  if (!de.includes("Goethe B2")) throw new Error("german tab");
  console.log("smoke OK");
})().catch((e) => { console.error(e); process.exit(1); });
