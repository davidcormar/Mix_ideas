/* Personal finance — pure logic. Browser: window.FinLogic · Node: module.exports */
(function (root) {
  const CATEGORIES = {
    gasto: ["Comida (súper)", "Comer fuera", "Transporte", "Deporte", "Estudios", "Ocio", "Suscripciones", "Ropa", "Viajes", "Salud", "Otros"],
    ingreso: ["Familia", "Trabajo", "Becas", "Otros ingresos"],
  };

  // keyword -> category (lower-case, accent-insensitive match on the concept)
  const DEFAULT_RULES = [
    ["mercadona|gadis|froiz|carrefour|lidl|dia |eroski|alcampo|supermerc", "Comida (súper)"],
    ["restaurante|bar |cafeter|burger|mcdonald|telepizza|just eat|glovo|uber eats|kebab", "Comer fuera"],
    ["renfe|alsa|tranvia|bus|taxi|uber|cabify|bolt|gasolin|repsol|cepsa|parking|ryanair|vueling|iberia", "Transporte"],
    ["gimnasio|gym|decathlon|sport|strava|carrera|inscripcion", "Deporte"],
    ["libreria|universidad|uie|matricula|coursera|udemy|amazon kindle|papeleria", "Estudios"],
    ["cine|concierto|entradas|steam|playstation|fnac|ticketmaster", "Ocio"],
    ["spotify|netflix|hbo|max |disney|apple\\.com|icloud|google one|youtube|chatgpt|claude|anthropic|prime", "Suscripciones"],
    ["zara|pull|bershka|primark|h&m|nike|adidas", "Ropa"],
    ["booking|airbnb|hostel|hotel|skyscanner|edreams", "Viajes"],
    ["farmacia|clinica|dentista|optica", "Salud"],
    ["nomina|salario|sueldo", "Trabajo"],
    ["beca|ministerio de educacion", "Becas"],
    ["bizum de mama|bizum de papa|transferencia de .*(mama|papa|padre|madre)", "Familia"],
  ];

  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function categorize(concept, amount, rules = DEFAULT_RULES) {
    const c = norm(concept) + " ";
    for (const [pat, cat] of rules) if (new RegExp(pat).test(c)) return cat;
    return amount >= 0 ? "Otros ingresos" : "Otros";
  }

  function parseAmount(s, decimal = ",") {
    let t = String(s).trim().replace(/[€\s]/g, "");
    if (decimal === ",") t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
    const v = Number(t);
    if (!Number.isFinite(v)) throw new Error(`importe no válido: "${s}"`);
    return v;
  }

  function parseDate(s, fmt = "DD/MM/YYYY") {
    const t = String(s).trim();
    let d, m, y;
    if (fmt === "YYYY-MM-DD") [y, m, d] = t.split(/[-/]/);
    else if (fmt === "MM/DD/YYYY") [m, d, y] = t.split(/[-/.]/);
    else [d, m, y] = t.split(/[-/.]/);
    if (y && y.length === 2) y = "20" + y;
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || isNaN(Date.parse(iso))) throw new Error(`fecha no válida: "${s}"`);
    return iso;
  }

  /** Split a CSV line honouring double quotes. */
  function splitLine(line, sep) {
    const out = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  }

  /**
   * cfg: { sep: ";", decimal: ",", dateFormat: "DD/MM/YYYY", skip: 1, colDate: 0, colConcept: 1, colAmount: 2 }
   * Returns { rows: [{date, concept, amount, category}], errors: [lineNo, msg] }
   */
  function parseCSV(text, cfg, rules) {
    const c = Object.assign({ sep: ";", decimal: ",", dateFormat: "DD/MM/YYYY", skip: 1, colDate: 0, colConcept: 1, colAmount: 2 }, cfg);
    const lines = text.replace(/^﻿/, "").split(/\r?\n/);
    const rows = [], errors = [];
    lines.forEach((line, i) => {
      if (i < c.skip || !line.trim()) return;
      const f = splitLine(line, c.sep);
      try {
        const amount = parseAmount(f[c.colAmount], c.decimal);
        const concept = f[c.colConcept] || "";
        rows.push({ date: parseDate(f[c.colDate], c.dateFormat), concept, amount, category: categorize(concept, amount, rules) });
      } catch (e) { errors.push([i + 1, e.message]); }
    });
    return { rows, errors };
  }

  const month = (iso) => iso.slice(0, 7);

  function monthlySummary(txs, ym) {
    const m = txs.filter((t) => month(t.date) === ym);
    const income = m.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
    const expense = -m.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0);
    const byCat = {};
    for (const t of m) if (t.amount < 0) byCat[t.category] = (byCat[t.category] || 0) - t.amount;
    return { month: ym, income, expense, balance: income - expense, savingsRate: income ? (income - expense) / income : 0, byCat };
  }

  function months(txs) {
    return [...new Set(txs.map((t) => month(t.date)))].sort();
  }

  /** Goal progress: saved, remaining, months left (ceil, min 1) and monthly amount needed. */
  function goalStatus(goal, today) {
    const saved = (goal.contributions || []).reduce((a, c) => a + c.amount, 0);
    const remaining = Math.max(goal.target - saved, 0);
    const t = new Date(today), d = new Date(goal.deadline);
    const days = Math.round((d - t) / 864e5);
    const monthsLeft = Math.max(days / 30.44, 1); // fractional months, at least 1
    return { saved, remaining, pct: Math.min(saved / goal.target, 1), daysLeft: days, perMonth: remaining / monthsLeft, overdue: days < 0 && remaining > 0 };
  }

  function dedupeKey(t) { return `${t.date}|${t.amount.toFixed(2)}|${norm(t.concept)}`; }

  function mergeTransactions(existing, incoming) {
    const keys = new Set(existing.map(dedupeKey));
    const added = incoming.filter((t) => !keys.has(dedupeKey(t)));
    return { merged: existing.concat(added), added: added.length, skipped: incoming.length - added.length };
  }

  const DEFAULT_GOALS = [
    { id: "londres", name: "Viaje Birmingham + Londres", target: 300, deadline: "2026-11-19", contributions: [] },
    { id: "woxsen", name: "Intercambio Woxsen (India)", target: 3500, deadline: "2027-01-06", contributions: [] },
  ];

  const api = { CATEGORIES, DEFAULT_RULES, DEFAULT_GOALS, categorize, parseAmount, parseDate, splitLine, parseCSV, monthlySummary, months, goalStatus, mergeTransactions };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FinLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
