(function () {
  const F = window.FinLogic;
  const KEY = "finanzas.v1";
  const $ = (s) => document.querySelector(s);
  const eur = (x) => x.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  let db = load();

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.txs)) return d;
    } catch {}
    return { txs: [], goals: JSON.parse(JSON.stringify(F.DEFAULT_GOALS)), csv: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { alert("No se pudo guardar: " + e.message); } }

  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll("main > section").forEach((s) => s.classList.toggle("hidden", s.id !== b.dataset.tab));
    render();
  }));

  // ---------- movements
  const allCats = [...F.CATEGORIES.gasto, ...F.CATEGORIES.ingreso];
  $("#fCat").innerHTML = `<option value="">Categoría automática</option>` + allCats.map((c) => `<option>${c}</option>`).join("");
  $("#fDate").value = today();
  $("#add").addEventListener("click", () => {
    let amount;
    try { amount = F.parseAmount($("#fAmount").value || "x"); } catch { alert("Importe no válido"); return; }
    const concept = $("#fConcept").value.trim() || "(sin concepto)";
    db.txs.push({ date: $("#fDate").value || today(), concept, amount, category: $("#fCat").value || F.categorize(concept, amount) });
    $("#fConcept").value = ""; $("#fAmount").value = ""; save(); render();
  });
  $("#mFilter").addEventListener("change", render);
  $("#txTable").addEventListener("change", (ev) => {
    const i = ev.target.dataset.cat; if (i === undefined) return;
    db.txs[i].category = ev.target.value; save();
  });
  $("#txTable").addEventListener("click", (ev) => {
    const i = ev.target.dataset.del; if (i === undefined) return;
    if (confirm("¿Borrar movimiento?")) { db.txs.splice(Number(i), 1); save(); render(); }
  });

  function renderMovs() {
    const ms = F.months(db.txs);
    const cur = $("#mFilter").value;
    $("#mFilter").innerHTML = `<option value="">Todos los meses</option>` + ms.slice().reverse().map((m) => `<option ${m === cur ? "selected" : ""}>${m}</option>`).join("");
    const list = db.txs.map((t, i) => ({ t, i })).filter(({ t }) => !$("#mFilter").value || t.date.startsWith($("#mFilter").value)).sort((a, b) => b.t.date.localeCompare(a.t.date));
    $("#mCount").textContent = `${list.length} movimientos`;
    $("#txTable").innerHTML = list.map(({ t, i }) => `<tr><td>${t.date.slice(5)}</td><td>${esc(t.concept)}<br><select data-cat="${i}" style="padding:2px;font-size:12px;width:auto">${allCats.map((c) => `<option ${c === t.category ? "selected" : ""}>${c}</option>`).join("")}</select></td><td class="n ${t.amount < 0 ? "out" : "in"}">${eur(t.amount)}</td><td><button data-del="${i}" style="padding:2px 6px">✕</button></td></tr>`).join("") || `<tr><td class="muted">Sin movimientos. Añade uno o importa el CSV del banco.</td></tr>`;
  }

  // ---------- summary
  $("#rMonth").addEventListener("change", render);
  function renderSummary() {
    const ms = F.months(db.txs);
    const cur = $("#rMonth").value || ms.at(-1) || today().slice(0, 7);
    $("#rMonth").innerHTML = (ms.length ? ms : [cur]).slice().reverse().map((m) => `<option ${m === cur ? "selected" : ""}>${m}</option>`).join("");
    const s = F.monthlySummary(db.txs, cur);
    $("#kIn").textContent = eur(s.income); $("#kOut").textContent = eur(s.expense);
    $("#kBal").textContent = eur(s.balance); $("#kRate").textContent = Math.round(s.savingsRate * 100) + " %";
    const cats = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]);
    hbar($("#catChart"), cats);
    const series = ms.slice(-12).map((m) => F.monthlySummary(db.txs, m));
    bars2($("#monthChart"), series);
  }

  function ctx(cv, h) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600;
    cv.width = W * dpr; cv.height = h * dpr; cv.style.height = h + "px";
    const c = cv.getContext("2d"); c.scale(dpr, dpr); c.font = "12px system-ui";
    const css = getComputedStyle(document.documentElement);
    return { c, W, col: (v) => css.getPropertyValue(v).trim() };
  }
  function hbar(cv, rows) {
    const h = Math.max(60, rows.length * 26 + 10);
    const { c, W, col } = ctx(cv, h);
    if (!rows.length) { c.fillStyle = col("--mute"); c.fillText("Sin gastos este mes", 8, 30); return; }
    const max = rows[0][1], lw = 130;
    rows.forEach(([name, v], i) => {
      const y = 6 + i * 26;
      c.fillStyle = col("--ink"); c.fillText(name, 0, y + 14);
      c.fillStyle = col("--out"); c.fillRect(lw, y + 2, (W - lw - 80) * (v / max), 16);
      c.fillStyle = col("--mute"); c.fillText(eur(v), lw + (W - lw - 80) * (v / max) + 6, y + 14);
    });
  }
  function bars2(cv, series) {
    const { c, W, col } = ctx(cv, 220);
    if (!series.length) return;
    const H = 220, pb = 24, pt = 10, max = Math.max(1, ...series.flatMap((s) => [s.income, s.expense]));
    const gw = (W - 10) / series.length, bw = Math.min(18, gw / 3);
    series.forEach((s, i) => {
      const x = 10 + i * gw + gw / 2;
      const hi = (s.income / max) * (H - pb - pt), he = (s.expense / max) * (H - pb - pt);
      c.fillStyle = col("--in"); c.fillRect(x - bw, H - pb - hi, bw, hi);
      c.fillStyle = col("--out"); c.fillRect(x, H - pb - he, bw, he);
      c.fillStyle = col("--mute"); c.fillText(s.month.slice(2), x - 16, H - 6);
    });
    c.fillStyle = col("--in"); c.fillText("■ ingresos", W - 150, 12); c.fillStyle = col("--out"); c.fillText("■ gastos", W - 70, 12);
  }

  // ---------- goals
  function renderGoals() {
    $("#goals").innerHTML = db.goals.map((g, i) => {
      const s = F.goalStatus(g, today());
      return `<div class="card"><h2>${esc(g.name)}</h2>
        <div class="bar"><div style="width:${(s.pct * 100).toFixed(1)}%"></div></div>
        <p><b>${eur(s.saved)}</b> de ${eur(g.target)} (${Math.round(s.pct * 100)} %) · faltan ${eur(s.remaining)}</p>
        <p class="muted">Fecha: ${g.deadline} (${s.daysLeft >= 0 ? s.daysLeft + " días" : "pasada"}) · ${s.remaining > 0 ? `necesitas <b>${eur(s.perMonth)}/mes</b>` : "¡conseguida! 🎉"}</p>
        <div class="flex"><input data-amt="${i}" inputmode="decimal" placeholder="Aportación €" style="max-width:160px"><button data-contrib="${i}">Añadir aportación</button><button data-gdel="${i}">Borrar meta</button></div></div>`;
    }).join("");
  }
  $("#goals").addEventListener("click", (ev) => {
    const t = ev.target;
    if (t.dataset.contrib !== undefined) {
      const inp = document.querySelector(`[data-amt="${t.dataset.contrib}"]`);
      try { const a = F.parseAmount(inp.value); db.goals[t.dataset.contrib].contributions.push({ date: today(), amount: a }); save(); render(); } catch { alert("Importe no válido"); }
    } else if (t.dataset.gdel !== undefined && confirm("¿Borrar meta?")) { db.goals.splice(Number(t.dataset.gdel), 1); save(); render(); }
  });
  $("#gAdd").addEventListener("click", () => {
    try {
      db.goals.push({ id: Date.now().toString(36), name: $("#gName").value || "Meta", target: F.parseAmount($("#gTarget").value), deadline: $("#gDeadline").value || today(), contributions: [] });
      save(); render();
    } catch { alert("Objetivo no válido"); }
  });

  // ---------- CSV import
  const cfgIds = { sep: "#cSep", decimal: "#cDec", dateFormat: "#cDate", skip: "#cSkip", colDate: "#cColDate", colConcept: "#cColConcept", colAmount: "#cColAmount" };
  for (const [k, id] of Object.entries(cfgIds)) if (db.csv && db.csv[k] !== undefined) $(id).value = k.startsWith("col") ? db.csv[k] + 1 : db.csv[k];
  function csvCfg() {
    const c = {};
    for (const [k, id] of Object.entries(cfgIds)) c[k] = k === "sep" ? ($(id).value === "\\t" ? "\t" : $(id).value) : ["skip", "colDate", "colConcept", "colAmount"].includes(k) ? Number($(id).value) - (k.startsWith("col") ? 1 : 0) : $(id).value;
    return c;
  }
  let pending = null;
  $("#csvFile").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    let text = await f.text();
    if (text.includes("�")) text = new TextDecoder("windows-1252").decode(await f.arrayBuffer()); // Spanish banks often export Latin-1
    const cfg = csvCfg(); db.csv = cfg; save();
    const { rows, errors } = F.parseCSV(text, cfg);
    pending = rows;
    $("#preview").innerHTML = `<p><b>${rows.length}</b> movimientos leídos${errors.length ? `, <span class="out">${errors.length} líneas con error</span> (${errors.slice(0, 3).map((e) => "línea " + e[0] + ": " + esc(e[1])).join("; ")})` : ""}.</p>
      <table>${rows.slice(0, 8).map((t) => `<tr><td>${t.date}</td><td>${esc(t.concept)}</td><td>${t.category}</td><td class="n">${eur(t.amount)}</td></tr>`).join("")}</table>
      ${rows.length ? `<button class="primary" id="confirmImport" style="margin-top:8px">Importar ${rows.length} movimientos</button>` : ""}`;
    ev.target.value = "";
  });
  $("#preview").addEventListener("click", (ev) => {
    if (ev.target.id !== "confirmImport" || !pending) return;
    const r = F.mergeTransactions(db.txs, pending);
    db.txs = r.merged; pending = null; save();
    $("#preview").innerHTML = `<p class="in">✔ ${r.added} añadidos, ${r.skipped} duplicados ignorados.</p>`;
  });

  // ---------- JSON backup
  $("#export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "finanzas", version: 1, exported: new Date().toISOString(), ...db }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `finanzas-${today()}.json`; a.click();
  });
  $("#importBtn").addEventListener("click", () => $("#importJson").click());
  $("#importJson").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.txs) || !Array.isArray(d.goals)) throw new Error("formato no reconocido");
      if (confirm(`Sustituir los datos actuales por ${d.txs.length} movimientos y ${d.goals.length} metas?`)) { db = { txs: d.txs, goals: d.goals, csv: d.csv || {} }; save(); render(); }
    } catch (e) { alert("Error: " + e.message); }
    ev.target.value = "";
  });
  $("#wipe").addEventListener("click", () => { if (confirm("¿Borrar TODO?")) { localStorage.removeItem(KEY); db = load(); render(); } });

  function render() {
    const tab = document.querySelector("nav button.on").dataset.tab;
    if (tab === "movs") renderMovs();
    if (tab === "resumen") renderSummary();
    if (tab === "metas") renderGoals();
  }
  render();
})();
