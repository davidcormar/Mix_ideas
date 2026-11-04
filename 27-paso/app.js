/* Paso — UI layer. Own key: localStorage["paso.v1"]. Read-only: "gymtracker.v1" and "habitos.v1".
   Plain script (no modules) so it works from file:// with a double click. */
(function () {
  "use strict";
  const L = window.PasoLogic;
  const KEY = "paso.v1", GYM_KEY = "gymtracker.v1", HAB_KEY = "habitos.v1";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const TICK = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><polyline points=\"5 12.5 10 17 19 7\"/></svg>";
  const pctTxt = (n) => `${n} %`;
  const unit = (k, n) => (n === 1 ? L.PORTION_INFO[k].one : L.PORTION_INFO[k].many);
  const MB = 1024 * 1024;

  // ───────────────────────── storage (never throws; one warning toast on the first failed write)
  let storageBroken = false;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) {
      try { localStorage.setItem(k, v); return true; } catch {
        if (!storageBroken) { storageBroken = true; toast({ title: "No se pudo guardar en este navegador: exporta tus datos" }); renderBanner(); }
        return false;
      }
    },
    remove(k) { try { localStorage.removeItem(k); return true; } catch { return false; } },
  };

  // ───────────────────────── state
  let today = L.todayISO();
  let corruptRaw = null;
  let state = loadState();
  let route = { name: "hoy", params: new URLSearchParams() };
  let charts = [];
  let pendingRender = false;
  let overwriteManual = false;
  let recipeFilter = "all";
  let importMsg = ""; // HTML for #importSummary, kept across re-renders
  const health = { job: null, result: null, selected: null, fileName: "", progress: 0, status: "" };
  const mealCtx = { date: today, id: null, values: { protein: 0, veg: 0, carbs: 0, fat: 0 } };

  function loadState() {
    const raw = store.get(KEY);
    if (raw === null) { const s = L.emptyState(today); corruptRaw = null; store.set(KEY, JSON.stringify(s)); return s; }
    try {
      const obj = JSON.parse(raw);
      if (!L.isPlainObject(obj)) throw new Error("shape");
      corruptRaw = null;
      const s = L.migrate(obj, today);
      const json = JSON.stringify(s);
      if (json !== raw) store.set(KEY, json); // persist filled defaults (e.g. veg.rampStart on first run)
      return s;
    } catch {
      corruptRaw = raw;
      return L.emptyState(today);
    }
  }
  function save() {
    const ok = store.set(KEY, JSON.stringify(state));
    if (ok && corruptRaw !== null) { corruptRaw = null; renderBanner(); }
    return ok;
  }
  const S = () => state.settings;
  const gymSessions = () => L.readGym(store.get(GYM_KEY));
  const dayOf = (iso) => L.dayOf(state, iso);

  // ───────────────────────── routing
  const ROUTES = {
    hoy: { title: "Hoy", render: renderHoy },
    actividad: { title: "Actividad", render: renderActividad },
    comidas: { title: "Comidas", render: renderComidas },
    historial: { title: "Historial", render: renderHistorial },
    ajustes: { title: "Ajustes y datos", render: renderAjustes },
  };
  function parseRoute() {
    const m = /^#\/([a-z]+)(?:\?(.*))?$/.exec(location.hash || "");
    const name = m && ROUTES[m[1]] ? m[1] : "hoy";
    return { name, params: new URLSearchParams((m && m[2]) || "") };
  }
  const selDate = () => { const d = route.params.get("d"); return L.isISO(d) ? d : today; };
  const selMonth = () => { const m = route.params.get("m"); return L.isYM(m) ? m : selDate().slice(0, 7); };
  const href = (name, params = {}) => {
    const q = Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "");
    return `#/${name}${q.length ? "?" + q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&") : ""}`;
  };
  const dateHref = (name, d) => href(name, { d: d === today ? null : d });
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  // ───────────────────────── render orchestration
  /** Selectors to give focus back after a re-render (first one that still exists wins). */
  function focusKey(el) {
    if (!el || el === document.body) return null;
    if (el.id) return ["#" + CSS.escape(el.id)];
    if (el.dataset.daytype === "auto") return ['[data-daytype][aria-pressed="true"]'];
    for (const a of ["data-water", "data-add-steps", "data-daytype", "data-filter", "data-range", "data-src"]) {
      if (el.hasAttribute(a)) return [`[${a}="${CSS.escape(el.getAttribute(a))}"]`];
    }
    // a meal row / recipe button that opened the dialog: back to it, or to "Añadir" if the meal was deleted
    for (const a of ["data-meal-id", "data-edit-meal", "data-use-recipe"]) {
      if (el.hasAttribute(a)) return [`[${a}="${CSS.escape(el.getAttribute(a))}"]`, "#addMeal", "[data-add-meal]"];
    }
    return null;
  }
  function render() {
    pendingRender = false;
    today = L.todayISO(); // also when a click comes before the 20 s tick after midnight or a wake-up
    route = parseRoute();
    const fk = focusKey(document.activeElement);
    charts = [];
    renderNav();
    renderSidebar();
    renderHeader();
    renderBanner();
    ROUTES[route.name].render();
    document.title = `Paso · ${ROUTES[route.name].title}`;
    drawCharts();
    if (fk) { const el = fk.map((s) => $(s)).find(Boolean); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); }
  }
  function requestRender() { if ($("#mealDialog").open) pendingRender = true; else render(); }
  function drawCharts() { for (const c of charts) { try { c(); } catch (e) { /* a chart never breaks the page */ } } }

  function renderNav() {
    for (const a of $$("[data-nav]")) {
      if (a.dataset.nav === route.name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    }
  }

  function renderSidebar() {
    const s = S(), day = dayOf(today), ds = L.dayScore(day, s, today), veg = L.vegTargetFor(s, today);
    const goals = [
      ["steps", `${L.fmtInt(L.stepGoalOf(s))} pasos`, ds.met.steps],
      ["protein", `${L.fmtNum(s.proteinTarget)} ${unit("protein", s.proteinTarget)} de proteína`, ds.met.protein],
      ["veg", `${L.fmtNum(veg)} ${unit("veg", veg)} de verdura`, ds.met.veg],
      ["water", `${L.fmtNum(s.waterGoalMl / 1000, 2)} L de agua`, ds.met.water],
    ];
    $("#sideGoals").innerHTML = goals.map(([k, text, met]) =>
      `<li class="goal${met ? " met" : ""}" data-goal="${k}"><span class="goal-mark" aria-hidden="true">${met ? TICK : ""}</span>` +
      `<span>${esc(text)}</span><span class="sr">${met ? "(cumplido hoy)" : "(pendiente hoy)"}</span></li>`).join("");
    const wm = L.weekMet(state, today, s);
    const dots = L.weekDays(today).map((d, i) => {
      const fut = d > today, on = !fut && L.isDayMet(L.dayScore(dayOf(d), s, d).score, s);
      return `<span><i class="${fut ? "fut" : on ? "on" : ""}"></i>${L.DAY_LETTERS[i]}</span>`;
    }).join("");
    $("#weekMet").innerHTML = `<span class="cap">Objetivo cumplido · semana</span><b>${wm.met} de ${wm.elapsed} días</b>` +
      `<div class="dots7" aria-hidden="true">${dots}</div>`;
  }

  function renderHeader() {
    const r = route.name, d = selDate(), s = S();
    let cap = "", title = "", chip = "";
    if (r === "hoy") {
      if (d === today) { cap = "Así va tu día"; title = `¡Hola, <b>${esc(s.name)}</b>!`; }
      else {
        const t = L.titleParts(d);
        cap = d < today ? "Así fue tu día" : "Día por llegar";
        title = `<b>${t.weekday},</b> ${t.rest}`;
        chip = `<a class="chip accent" href="#/hoy">Volver a hoy</a>`;
      }
    } else if (r === "actividad") { cap = "Pasos, entrenos e importación"; title = "<b>Actividad</b>"; }
    else if (r === "comidas") { cap = "Raciones con la mano, sin contar calorías"; title = "<b>Comidas</b>"; }
    else if (r === "historial") { cap = "Tu mes de un vistazo"; title = "<b>Historial</b>"; }
    else { cap = "Objetivos, importación y copias"; title = "<b>Ajustes</b> y datos"; }
    const active = { hoy: "hoy", actividad: "semana", historial: "mes" }[r] || "";
    const seg = r === "ajustes" ? "" : `<div class="seg" role="group" aria-label="Periodo">${[["hoy", "Hoy"], ["semana", "Semana"], ["mes", "Mes"]]
      .map(([k, l]) => `<button type="button" data-range="${k}" aria-pressed="${active === k}">${l}</button>`).join("")}</div>`;
    const items = L.pendingItems(dayOf(today), s, today);
    const pending = items.length
      ? `<p>Te faltan ${items.map((i) => esc(i.text)).join(" · ")}</p>`
      : "<p>Todo cumplido hoy ✓</p>";
    $("#pageHead").innerHTML = `
      <div class="head-text"><p class="caption">${cap}</p><div class="row"><h1 class="title">${title}</h1>${chip}</div></div>
      ${seg}
      <div class="bell-wrap">
        <button type="button" id="bellBtn" class="icon-btn" aria-label="Lo que falta hoy${items.length ? ` (${items.length})` : ""}" aria-expanded="false" aria-controls="pendingPopover">${icon("i-bell")}${items.length ? "<span class=\"bell-dot\"></span>" : ""}</button>
        <div id="pendingPopover" class="popover" hidden><h2>Lo que falta hoy</h2>${pending}</div>
      </div>`;
  }
  function closePopover() {
    const p = $("#pendingPopover"), b = $("#bellBtn");
    if (p && !p.hidden) { p.hidden = true; if (b) b.setAttribute("aria-expanded", "false"); return true; }
    return false;
  }

  function renderBanner() {
    const msgs = [];
    if (corruptRaw !== null) msgs.push(`<div class="banner" role="alert">Los datos guardados de Paso no se pueden leer: estás viendo una libreta vacía y se sobrescribirán con el próximo cambio. <button type="button" class="btn sm" id="dlCorrupt">Descargar copia del texto dañado</button></div>`);
    if (storageBroken) msgs.push("<div class=\"banner\" role=\"alert\">Este navegador no deja guardar: los cambios solo duran mientras la pestaña esté abierta. Exporta tus datos en Ajustes.</div>");
    $("#banner").innerHTML = msgs.join("");
  }

  // ───────────────────────── shared builders
  function ringSVG(pct) {
    const r = 54, c = 2 * Math.PI * r;
    const prog = pct > 0 ? `<circle class="ring-prog" cx="60" cy="60" r="${r}" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}" transform="rotate(-90 60 60)"/>` : "";
    return `<svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="${r}" fill="none" stroke-width="12"/>${prog}</svg>`;
  }
  const miniPortions = (m) => `<span>🥩${L.fmtNum(m.protein)}</span> <span>🥦${L.fmtNum(m.veg)}</span> <span>🍚${L.fmtNum(m.carbs)}</span> <span>🥑${L.fmtNum(m.fat)}</span>`;
  const slotDot = (slot) => `<span class="slot-dot" style="background:${L.SLOT_COLOR[slot] || "#CFCFCB"}" aria-hidden="true"></span>`;
  function vegSubline(s, d) {
    const v = s.veg, target = L.vegTargetFor(s, d);
    if (v.mode === "fija") return `Meta fija: ${L.fmtNum(v.fixed)} ${unit("veg", v.fixed)} al día`;
    if (target >= v.final) return `Rampa completada: mantén ${L.fmtNum(v.final)}-${L.fmtNum(v.final + 1)} puños al día`;
    return `Meta final ${L.fmtNum(v.final)}-${L.fmtNum(v.final + 1)} puños · sube cada ${v.weeksPerStep} ${v.weeksPerStep === 1 ? "semana" : "semanas"}`;
  }
  function portionRows(p, tg, s, d) {
    const bar = (v, t, cls = "") => `<div class="pbar ${cls}" aria-hidden="true"><i style="width:${(Math.min(1, t ? v / t : 0) * 100).toFixed(1)}%"></i></div>`;
    const rangeBar = (v, [lo, hi]) => {
      const max = Math.max(hi + 2, v + 1);
      return `<div class="pbar range-bar" aria-hidden="true"><span class="range" style="left:${(lo / max * 100).toFixed(1)}%;width:${((hi - lo) / max * 100).toFixed(1)}%"></span><i style="width:${(Math.min(1, v / max) * 100).toFixed(1)}%"></i></div>`;
    };
    const ok = (b) => (b ? " <span class=\"met-tag\">✓ cumplido</span>" : "");
    const rangeNote = (v, [lo, hi]) => (v < lo ? "por debajo" : v > hi ? "por encima" : "dentro de la guía");
    return `
      <div class="por-row">
        <div class="por-line"><span class="por-name">🥩 Proteína</span><span class="por-val"><b>${L.fmtNum(p.protein)}</b> / ${L.fmtNum(tg.protein)} ${unit("protein", tg.protein)}${ok(p.protein >= tg.protein)}</span></div>
        ${bar(p.protein, tg.protein)}
      </div>
      <div class="por-row">
        <div class="por-line"><span class="por-name">🥦 Verdura <span class="chip badge-weak">Punto débil</span></span><span class="por-val"><b>${L.fmtNum(p.veg)}</b> / ${L.fmtNum(tg.veg)} ${unit("veg", tg.veg)}${ok(p.veg >= tg.veg)}</span></div>
        ${bar(p.veg, tg.veg, "veg")}
        <span class="por-sub">${esc(vegSubline(s, d))}</span>
      </div>
      <div class="por-row">
        <div class="por-line"><span class="por-name">🍚 Hidratos</span><span class="por-val"><b>${L.fmtNum(p.carbs)}</b> ${unit("carbs", p.carbs)} · guía de hoy ${tg.carbs[0]}–${tg.carbs[1]}</span></div>
        ${rangeBar(p.carbs, tg.carbs)}
        <span class="sr">${rangeNote(p.carbs, tg.carbs)}</span>
      </div>
      <div class="por-row">
        <div class="por-line"><span class="por-name">🥑 Grasa</span><span class="por-val"><b>${L.fmtNum(p.fat)}</b> ${unit("fat", p.fat)} · guía ${tg.fat[0]}–${tg.fat[1]}</span></div>
        ${rangeBar(p.fat, tg.fat)}
        <span class="sr">${rangeNote(p.fat, tg.fat)}</span>
      </div>`;
  }
  function heatLabel(c) {
    const base = L.fmtDayMonth(c.date);
    if (c.future) return `${base}: aún no ha llegado`;
    if (!c.registered) return `${base}: sin registros`;
    const m = c.met, mk = (b) => (b ? "✓" : "✗");
    const n = [m.steps, m.protein, m.veg, m.water].filter(Boolean).length;
    return `${base}: ${n} de 4 objetivos (pasos ${mk(m.steps)}, proteína ${mk(m.protein)}, verdura ${mk(m.veg)}, agua ${mk(m.water)})`;
  }
  function heatCell(c, selected) {
    const lbl = heatLabel(c);
    const cls = ["heat-cell", c.level === "none" ? "" : `lv${c.level}`, c.future ? "future" : "", c.date === today ? "today" : "", c.date === selected ? "sel" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" data-date="${c.date}" data-level="${c.level}" aria-label="${esc(lbl)}" title="${esc(lbl)}"${c.future ? " disabled" : ""}>${Number(c.date.slice(8))}</button>`;
  }
  const legendHTML = () => `<span class="heat-legend" aria-label="Leyenda: de menos a más objetivos cumplidos">Menos <i class="lv0"></i><i class="lv1"></i><i class="lv2"></i><i class="lv3"></i><i class="lv4"></i> Más <i class="none" style="margin-left:8px"></i> Sin registro</span>`;
  const fmtK = (v) => (v >= 1000 ? `${L.fmtNum(v / 1000, 1)}k` : String(v));

  /** Bar chart in SVG, sized to its container (re-drawn on resize). */
  function barChart(el, { bars, goal, height = 150, dark = false, values = false, goalLabel = true }) {
    if (!el) return;
    const w = Math.max(220, Math.floor(el.clientWidth));
    const h = height, top = values ? 20 : 10, bottom = 22, n = bars.length;
    const labelW = goalLabel ? 46 : 0, plotW = w - labelW; // goal label lives in its own right-hand gutter
    const gap = Math.max(5, Math.min(14, plotW * 0.035));
    const bw = (plotW - gap * (n - 1)) / n;
    const max = Math.max(goal * 1.15, ...bars.map((b) => b.value || 0)) || 1;
    const base = h - bottom, y = (v) => top + (base - top) * (1 - v / max);
    const bar = (x, yTop, cls) => {
      const r = Math.min(6, bw / 2, base - yTop);
      return `<path class="${cls}" d="M${x.toFixed(1)},${base} V${(yTop + r).toFixed(1)} Q${x.toFixed(1)},${yTop.toFixed(1)} ${(x + r).toFixed(1)},${yTop.toFixed(1)} H${(x + bw - r).toFixed(1)} Q${(x + bw).toFixed(1)},${yTop.toFixed(1)} ${(x + bw).toFixed(1)},${(yTop + r).toFixed(1)} V${base} Z"/>`;
    };
    let out = `<svg class="chart${dark ? " on-dark" : ""}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">`;
    bars.forEach((b, i) => {
      const x = i * (bw + gap), cx = x + bw / 2;
      if (b.future) out += bar(x + 1, y(goal * 0.35), "bar fut");
      else {
        const v = b.value || 0, yt = Math.min(base - 3, y(v));
        out += bar(x, yt, `bar${b.hi ? " hi" : ""}`);
        if (values && v) out += `<text class="val${b.hi ? " hi" : ""}" x="${cx.toFixed(1)}" y="${(yt - 6).toFixed(1)}" text-anchor="middle">${bw >= 46 ? L.fmtInt(v) : fmtK(v)}</text>`;
      }
      out += `<text class="axis${b.hi ? " hi" : ""}" x="${cx.toFixed(1)}" y="${h - 5}" text-anchor="middle">${esc(bw < 46 && b.short ? b.short : b.label)}</text>`;
    });
    const gy = y(goal);
    const goalSvg = `<line class="goal-line" x1="0" x2="${(plotW + 4).toFixed(1)}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}"/>` +
      (goalLabel ? `<text class="goal-label" x="${w}" y="${(gy + 4).toFixed(1)}" text-anchor="end">${fmtK(goal)}</text>` : "");
    out = out.replace("focusable=\"false\">", `focusable="false">${goalSvg}`); // goal line behind bars and labels
    out += "</svg>";
    el.innerHTML = out;
  }

  // ───────────────────────── Hoy
  function renderHoy() {
    const d = selDate(), s = S(), day = dayOf(d), isToday = d === today;
    const gym = gymSessions();
    const sug = L.suggestDayType(d, state, gym);
    const dt = L.effectiveDayType(day, sug, s);
    const tg = L.targetsFor(s, dt, d);
    const p = L.portions(day);
    const sp = L.stepsProgress(day.steps, s);
    const ws = L.weekStats(state, d);
    const hm = isToday ? L.nowHM() : "23:59";
    const next = L.nextSlot(day, hm);
    const showVeg = p.veg < tg.veg;

    // steps
    const srcChip = day.steps > 0 && day.stepsSource ? `<span class="chip">${esc(L.STEP_SOURCE_LABEL[day.stepsSource])}</span>` : "";
    const future = d > today, off = future ? " disabled" : ""; // steps and water only for days that have come
    const left = future ? "<div id=\"stepsLeft\">Día por llegar: los pasos y el agua se apuntan cuando llegue.</div>"
      : day.steps > 0
      ? `<div id="stepsLeft"${sp.met ? " class=\"met\"" : ""}>${esc(L.stepsLabel(sp))}</div>`
      : "<div id=\"stepsLeft\">Sin pasos registrados · añádelos o <a href=\"#/actividad\">impórtalos</a></div>";
    const stepsCard = `
      <section class="card" id="stepsCard" aria-labelledby="stepsTitle">
        <div class="steps-top">
          <div class="left">
            <div class="label"><span id="stepsTitle">${isToday ? "Pasos hoy" : "Pasos del día"}</span>${srcChip}</div>
            <div class="kpi" id="stepsValue">${L.fmtInt(sp.steps)}</div>
            ${left}
            ${day.steps > 0 ? `<div class="steps-meta">≈ ${L.fmtDec(L.kmFromSteps(day.steps, s), 1)} km recorridos</div>` : ""}
          </div>
          <div class="ring-wrap" role="img" aria-label="${sp.pctLabel} % del objetivo de ${L.fmtInt(sp.goal)} pasos">${ringSVG(sp.pct)}<div id="stepsPct" aria-hidden="true">${pctTxt(sp.pctLabel)}</div></div>
        </div>
        <form class="steps-form" id="stepsForm" autocomplete="off">
          <label class="sr" for="stepsInput">Pasos totales del día</label>
          <input type="number" id="stepsInput" inputmode="numeric" min="0" max="200000" step="1" placeholder="${day.steps ? "Corregir total" : isToday ? "Pasos de hoy" : "Pasos del día"}"${off}>
          <button class="btn primary" id="stepsSave" type="submit"${off}>Guardar</button>
          <div class="quick"><span>Suma rápida</span><button class="btn" type="button" data-add-steps="500" aria-label="Sumar 500 pasos"${off}>+500</button><button class="btn" type="button" data-add-steps="1000" aria-label="Sumar 1.000 pasos"${off}>+1.000</button></div>
        </form>
      </section>`;

    // week (dark hero)
    const dayNames = ws.days.map((x) => `${L.DAY_NAMES[L.dow(x.date) - 1]} ${x.future ? "sin datos todavía" : x.steps ? L.fmtInt(x.steps) : "sin datos"}`).join(", ");
    const change = ws.changePct === null ? "" : `${ws.changePct >= 0 ? "↑" : "↓"} ${pctTxt(Math.abs(ws.changePct))}`;
    const weekCard = `
      <section class="card hero" id="weekCard" aria-labelledby="weekTitle">
        <div class="card-head">
          <div><div class="label" id="weekTitle">Media semanal</div><div class="avg-line"><span id="weekAvg">${ws.avg ? L.fmtInt(ws.avg) : "—"}</span><small>pasos/día</small></div></div>
          <span class="chip" id="weekChange"${ws.changePct === null ? " hidden" : ""} title="Semana anterior: ${L.fmtInt(ws.prevAvg)} pasos/día">${change}</span>
        </div>
        <div class="week-bars" id="weekBars" role="img" aria-label="Pasos de la semana: ${esc(dayNames)}. Objetivo ${L.fmtInt(sp.goal)}."></div>
      </section>`;
    charts.push(() => barChart($("#weekBars"), {
      dark: true, height: 132, goal: L.stepGoalOf(s), goalLabel: true,
      bars: ws.days.map((x, i) => ({ label: L.DAY_LETTERS[i], value: x.steps, hi: x.isToday, future: x.future })),
    }));

    // meals
    const rows = day.meals.map((m) => `
      <button type="button" class="meal-row" data-meal-id="${esc(m.id)}" aria-label="Editar ${esc(L.SLOT_LABEL[m.slot])}${m.desc ? ": " + esc(m.desc) : ""}">
        ${slotDot(m.slot)}
        <span class="meal-main"><b>${esc(L.SLOT_LABEL[m.slot])}</b><span class="meal-desc">${esc(m.desc || "Sin descripción")}</span></span>
        <span class="meal-side"><span class="meal-time">${esc(m.time || "—")}</span><span class="mini-por">${miniPortions(m)}</span></span>
      </button>`).join("");
    const mealsCard = `
      <section class="card" id="mealsCard" aria-labelledby="mealsTitle">
        <div class="card-head"><h2 class="card-title" id="mealsTitle">Comidas</h2><span id="mealsCount">${L.mealsCount(day)} / 4</span></div>
        <div class="meal-list">
          ${rows || "<p class=\"empty\">Aún no hay comidas. Apunta las raciones con la mano: palma, puño, mano ahuecada y pulgar.</p>"}
          <button type="button" class="meal-row add-row" id="addMeal"><span class="slot-dot plus" aria-hidden="true">+</span><span class="meal-main"><b>Añadir ${esc(L.SLOT_LABEL[next].toLowerCase())}</b></span></button>
        </div>
      </section>`;

    // portions + water
    const dtButtons = L.DAY_TYPES.map((t) => `<button type="button" data-daytype="${t}" aria-pressed="${dt === t}">${L.DAY_TYPE_SHORT[t]}</button>`).join("");
    let hint;
    if (day.dayType) hint = `Elegido a mano${sug ? ` (sugerido: ${L.DAY_TYPE_SHORT[sug.type]})` : ""} · <button type="button" class="btn-link" data-daytype="auto">Volver a automático</button>`;
    else if (sug) hint = `Sugerido: ${L.DAY_TYPE_SHORT[sug.type]} (${esc(sug.reason)})`;
    else hint = `Automático: ${esc(L.DAY_TYPE_LABEL[s.defaultDayType])} (sin entreno registrado)`;
    const nGlass = Math.max(1, Math.min(24, Math.ceil(s.waterGoalMl / s.glassMl)));
    const per = s.waterGoalMl / nGlass, filled = Math.min(nGlass, Math.floor(day.waterMl / per + 1e-9));
    const glasses = Array.from({ length: nGlass }, (_, i) => `<span class="glass${i < filled ? " on" : ""}"></span>`).join("");
    const nut = L.readHabitsNutrition(store.get(HAB_KEY), d);
    const habitLine = nut === null ? "" : `<p class="habit-line"><span>${nut.idx === null ? "🥗 Nutrición en Hábitos: Sin vincular" : `🥗 Nutrición en Hábitos: <b>${nut.ticked ? "marcado ✓" : "sin marcar"}</b>`}</span><a href="../26-ritmo/index.html">Abrir Ritmo →</a></p>`;
    const portionsCard = `
      <section class="card${showVeg ? "" : " wide"}" id="portionsCard" aria-labelledby="porTitle">
        <div class="card-head"><h2 class="card-title" id="porTitle">${isToday ? "Raciones de hoy" : "Raciones del día"} · método de la mano</h2></div>
        <div class="por-grid">
          <div>
            <div class="daytype">
              <div class="seg" id="dayType" role="group" aria-label="Tipo de día">${dtButtons}</div>
              <p id="dayTypeHint">${hint}</p>
            </div>
            <div class="por-rows">${portionRows(p, tg, s, d)}</div>
          </div>
          <div id="water" aria-labelledby="waterTitle">
            <div class="water-head"><span class="por-name" id="waterTitle">💧 Agua</span><span class="water-kpi">${L.fmtNum(day.waterMl / 1000, 2)} <span class="den">/ ${L.fmtNum(s.waterGoalMl / 1000, 2)} L</span></span></div>
            <div class="glasses" role="img" aria-label="${filled} de ${nGlass} vasos">${glasses}</div>
            <div class="water-btns">
              <button type="button" class="btn sm" data-water="${s.glassMl}" aria-label="Añadir un vaso (${s.glassMl} ml)"${off}>+ vaso</button>
              <button type="button" class="btn sm" data-water="${s.bottleMl}" aria-label="Añadir una botella (${s.bottleMl} ml)"${off}>+ botella</button>
              <button type="button" class="btn sm minus" data-water="-${s.glassMl}" aria-label="Quitar un vaso (${s.glassMl} ml)"${off}>−</button>
            </div>
            <p class="hint">${day.waterMl >= s.waterGoalMl ? "✓ Agua cumplida." : `Te faltan ${L.fmtNum((s.waterGoalMl - day.waterMl) / 1000, 2)} L · 1 vaso = ${s.glassMl} ml.`}</p>
            ${habitLine}
          </div>
        </div>
      </section>`;

    // veg ideas
    let vegCard = "";
    if (showVeg) {
      const miss = tg.veg - p.veg;
      const ideas = L.suggestRecipes(next, d, 3).map((r) => `
        <div class="idea">
          <b>${r.id} · ${esc(r.name)}</b>
          <span class="meta">⏱ ${r.minutes}' · 🥩 ${L.fmtNum(r.protein)} · 🥦 ${L.fmtNum(r.veg)}</span>
          <span class="hid">escondida: ${esc(r.hidden)}</span>
          <button type="button" class="btn sm" data-use-recipe="${r.id}" aria-label="Usar ${esc(r.name)}">Usar</button>
        </div>`).join("");
      vegCard = `
        <section class="card" id="vegIdeas" aria-labelledby="vegTitle">
          <div><h2 class="card-title" id="vegTitle">Te faltan ${L.fmtNum(miss)} ${unit("veg", miss)} de verdura</h2>
          <p class="card-sub">Ideas con verdura escondida para ${L.SLOT_FOR[next]}</p></div>
          ${ideas}
          <a class="btn-link small" href="${href("comidas", { d: d === today ? null : d, ver: "recetas" })}">Ver las 20 recetas →</a>
        </section>`;
    }

    // heat strip: previous + current month (compact)
    const ym = d.slice(0, 7), pym = L.addMonths(ym, -1);
    const hCur = L.monthHeat(state, ym, today, s), hPrev = L.monthHeat(state, pym, today, s);
    const strip = (h, m) => `<div><div class="strip-title"><span>${L.monthName(m).replace(/^./, (c) => c.toUpperCase())}</span><span>${h.metDays} de ${h.elapsedDays} días</span></div>
      <div class="strip">${h.cells.map((c) => heatCell(c, d)).join("")}</div></div>`;
    const heatCard = `
      <section class="card" id="heatCard" aria-labelledby="heatTitle">
        <div class="card-head"><h2 class="card-title" id="heatTitle">Historial · ${L.monthName(pym)} y ${L.monthName(ym)}</h2>${legendHTML()}</div>
        <div class="heat-strips">${strip(hPrev, pym)}${strip(hCur, ym)}</div>
        <div class="heat-foot"><span>Objetivo cumplido <b>${hCur.metDays} de ${hCur.elapsedDays} días</b> en ${L.monthName(ym)} · un día cuenta si cumples ${Math.round(s.dayMetThreshold * 4)} de 4 objetivos</span><a class="btn-link" href="${href("historial", { m: ym })}">Ver historial →</a></div>
      </section>`;

    $("#view").innerHTML = `<div class="grid-hoy">${stepsCard}${weekCard}${mealsCard}${portionsCard}${vegCard}${heatCard}</div>`;
  }

  // ───────────────────────── Actividad
  function renderActividad() {
    const d = selDate(), s = S(), ws = L.weekStart(d), dates = L.weekDays(d);
    const curWs = L.weekStart(today), isCur = ws === curWs, isPast = ws < curWs;
    const ref = isCur ? today : isPast ? L.addDays(ws, 6) : ws;
    const st = L.weekStats(state, ref);
    const gym = gymSessions();
    const hab = L.readHabitsSport(store.get(HAB_KEY));
    const ctx = { habits: hab ? hab.data : null, sportIdx: hab ? hab.sportIdx : null, gymSessions: gym, runs: state.runs, ritmoDone: null };
    const sport = L.sportByDay(dates.filter((x) => x <= today), ctx);
    const fs = L.floorStatus(sport.total, ref);
    let stateText = L.floorText(fs);
    if (isPast && sport.total < 3) stateText = `Semana cerrada: suelo no alcanzado (${sport.total} de 3)`;
    const lines = L.sportWeekLines(dates.filter((x) => x <= today), { ...ctx, habitName: hab && hab.habitName });
    const srcNames = [sport.sources.gym && "Gym Tracker", sport.sources.runs && "carreras de Paso", sport.sources.habit && "Hábitos"].filter(Boolean);
    const pastDays = st.days.filter((x) => !x.future);
    const kmWeek = L.kmFromSteps(st.total, s);
    const daysMet = pastDays.filter((x) => x.steps >= L.stepGoalOf(s)).length;
    const weekLabel = L.fmtWeekRange(ws);

    const nav = `
      <div class="week-nav">
        <a class="icon-btn" href="${dateHref("actividad", L.addDays(ws, -7))}" aria-label="Semana anterior">${icon("i-prev")}</a>
        <span class="lbl">Semana del ${esc(weekLabel)}</span>
        ${isCur ? "" : `<a class="icon-btn" href="${dateHref("actividad", L.addDays(ws, 7) > today ? today : L.addDays(ws, 7))}" aria-label="Semana siguiente">${icon("i-next")}</a><a class="chip accent" href="#/actividad">Esta semana</a>`}
      </div>`;
    const weekCard = `
      <section class="card" aria-labelledby="wcTitle">
        <div class="card-head"><h2 class="card-title" id="wcTitle">Pasos de la semana</h2><span class="chip">${st.changePct === null ? "sin comparación" : `${st.changePct >= 0 ? "↑" : "↓"} ${pctTxt(Math.abs(st.changePct))} vs. semana anterior`}</span></div>
        <div id="weekChart" role="img" aria-label="Pasos por día: ${esc(st.days.map((x) => `${L.DAY_NAMES[L.dow(x.date) - 1]} ${x.future ? "—" : L.fmtInt(x.steps)}`).join(", "))}"></div>
        <div class="stats-row">
          <span>Media<b>${L.fmtInt(st.avg)}</b></span>
          <span>Total<b>${L.fmtInt(st.total)}</b></span>
          <span>Distancia<b>${L.fmtDec(kmWeek, 1)} km</b></span>
          <span>Días ≥ ${L.fmtInt(L.stepGoalOf(s))}<b>${daysMet} de ${pastDays.length}</b></span>
        </div>
      </section>`;
    charts.push(() => barChart($("#weekChart"), {
      height: 190, values: true, goal: L.stepGoalOf(s),
      bars: st.days.map((x, i) => ({ label: L.fmtShortDay(x.date), short: `${L.DAY_LETTERS[i]} ${Number(x.date.slice(8))}`, value: x.steps, hi: x.date === today, future: x.future })),
    }));
    const avgs = L.weeklyAverages(state, ref, 8);
    const avgCard = `
      <section class="card" aria-labelledby="w8Title">
        <div class="card-head"><h2 class="card-title" id="w8Title">Media de pasos · 8 semanas</h2></div>
        <div id="avgChart" role="img" aria-label="Media semanal de pasos: ${esc(avgs.map((a) => `semana del ${L.fmtDateShort(a.weekStart)} ${L.fmtInt(a.avg)}`).join(", "))}"></div>
        <p class="hint" style="margin-top:8px">Media de los días con pasos registrados. Línea discontinua: objetivo de ${L.fmtInt(L.stepGoalOf(s))}.</p>
      </section>`;
    charts.push(() => barChart($("#avgChart"), {
      height: 190, values: true, goal: L.stepGoalOf(s),
      bars: avgs.map((a) => ({ label: L.fmtDateShort(a.weekStart), short: `${Number(a.weekStart.slice(8))}/${Number(a.weekStart.slice(5, 7))}`, value: a.avg, hi: a.weekStart === ws })),
    }));

    const pctFloor = Math.min(1, sport.total / 6) * 100;
    const sportCard = `
      <section class="card" id="sportWeek" aria-labelledby="spTitle">
        <h2 class="card-title" id="spTitle">Sesiones ${isCur ? "esta semana" : "de la semana"}: ${sport.total} · suelo 3 · estándar 5</h2>
        <p class="state ${fs.state}">${esc(stateText)}</p>
        <div class="floor-bar" role="img" aria-label="${sport.total} sesiones de 3 (suelo) y 5 (estándar)"><i style="width:${pctFloor.toFixed(1)}%"></i><span class="mk" style="left:50%"><span>suelo 3</span></span><span class="mk" style="left:83.3%"><span>estándar 5</span></span></div>
        <ul class="day-lines">${lines.length ? lines.map((l) => `<li><span class="d">${esc(L.fmtShortDay(l.date))}</span><span class="items">${l.items.map((t) => `<span>${esc(t)}</span>`).join("")}</span><span class="chip">${l.n} ${l.n === 1 ? "sesión" : "sesiones"}</span></li>`).join("") : "<li><span></span><span class=\"muted\">Sin sesiones registradas todavía.</span></li>"}</ul>
        <p class="hint" style="margin-top:10px">${srcNames.length ? `Fuentes: ${esc(srcNames.join(" · "))}.` : "Fuentes: ninguna todavía."} Una sesión apuntada en dos sitios cuenta una vez; gimnasio + carrera el mismo día cuentan 2.${hab && hab.sportIdx === null ? " Hábito Deporte: Sin vincular." : ""}</p>
        <p class="hint">El gimnasio se lee de <a href="../10-gym-tracker/index.html">Gym Tracker</a> (solo lectura).</p>
      </section>`;

    const runList = state.runs.slice().reverse().slice(0, 6).map((r) => `
      <li><span class="grow"><b>${esc(L.fmtShortDay(r.date))} ${esc(L.fmtDateShort(r.date).split(" ")[1])}</b> · ${esc(L.RUN_SHORT[r.type])}${r.minutes ? ` ${r.minutes}'` : ""}${r.km ? ` · ${L.fmtNum(r.km, 2)} km` : ""}${r.notes ? ` · <span class="muted">${esc(r.notes)}</span>` : ""}</span>
      <button type="button" class="x" data-del-run="${esc(r.id)}" aria-label="Borrar carrera del ${esc(L.fmtDayMonth(r.date))}">✕</button></li>`).join("");
    const runDate = d > today ? today : d;
    const runCard = `
      <section class="card" aria-labelledby="runTitle">
        <h2 class="card-title" id="runTitle" style="margin-bottom:12px">Añadir carrera o nado</h2>
        <form id="runForm" class="form-grid" autocomplete="off">
          <label class="field">Fecha<input type="date" id="rDate" value="${runDate}" max="${today}" required></label>
          <label class="field">Tipo<select id="rType">${L.RUN_TYPES.map((t) => `<option value="${t}">${esc(L.RUN_LABEL[t])}</option>`).join("")}</select></label>
          <label class="field">Minutos<input type="number" id="rMinutes" inputmode="numeric" min="0" max="1440" step="1" placeholder="p. ej. 40"></label>
          <label class="field">Km<input type="text" id="rKm" inputmode="decimal" placeholder="p. ej. 6,2"></label>
          <label class="field full">Notas<input type="text" id="rNotes" maxlength="280" placeholder="p. ej. 6×800 m a ritmo 10K"></label>
          <div class="full row"><button class="btn primary" id="rSave" type="submit">Guardar carrera</button><span class="hint">Cuenta como sesión para el suelo de deporte.</span></div>
        </form>
        <h3 class="card-sub" style="margin:16px 0 4px">Últimas carreras</h3>
        <ul class="list" id="runList">${runList || "<li class=\"muted\">Aún no hay carreras.</li>"}</ul>
      </section>`;

    const importCard = `
      <section class="card span-2" id="importPanel" aria-labelledby="impTitle">
        <h2 class="card-title" id="impTitle">Importar pasos</h2>
        <p class="card-sub" style="margin:2px 0 14px">Para no apuntar dos veces: trae el histórico de Apple Health o de un CSV. Se sustituye el total de cada día; los días que escribiste a mano se respetan salvo que marques la casilla.</p>
        <div class="grid-2">
          <div class="import-box" id="healthBox">
            <h3>Apple Health</h3>
            <p class="hint">En el iPhone: Salud → tu foto → Exportar todos los datos de salud → descomprime export.zip y elige apple_health_export/export.xml</p>
            <div class="row">
              <span class="file-btn"><input type="file" id="healthFile" accept=".xml,text/xml" aria-label="Elegir export.xml de Apple Health"><span class="btn" aria-hidden="true">Elegir export.xml</span></span>
              <button type="button" class="btn" id="healthCancel" hidden>Cancelar</button>
            </div>
            <div id="healthProgressWrap" hidden><progress id="healthProgress" max="1" value="0"></progress><p class="hint" id="healthProgressText"></p></div>
            <div id="healthSources"></div>
            <button type="button" class="btn primary" id="healthApply" hidden>Importar 0 días</button>
          </div>
          <div class="import-box">
            <h3>CSV (fecha,pasos)</h3>
            <p class="hint">Una fila por día, p. ej. <code>2026-11-02,9420</code> o <code>02/11/2026;9.420</code>. La primera fila puede ser cabecera.</p>
            <span class="file-btn"><input type="file" id="csvFile" accept=".csv,.txt,text/csv,text/plain" aria-label="Elegir CSV de pasos"><span class="btn" aria-hidden="true">Elegir CSV</span></span>
            <h3 style="margin-top:6px">Pasos de cualquier día</h3>
            <form class="row" id="manualForm" autocomplete="off">
              <label class="sr" for="manualDate">Fecha</label><input type="date" id="manualDate" value="${d > today ? today : d}" max="${today}" required>
              <label class="sr" for="manualSteps">Pasos</label><input type="number" id="manualSteps" inputmode="numeric" min="0" max="200000" placeholder="Pasos" style="width:110px">
              <button class="btn" type="submit">Guardar</button>
            </form>
          </div>
        </div>
        <label class="check small" style="margin-top:12px"><input type="checkbox" id="overwriteManual"${overwriteManual ? " checked" : ""}> Sobrescribir también los días que escribí a mano</label>
        <div id="importSummary" role="status" style="margin-top:12px">${importMsg}</div>
      </section>`;

    $("#view").innerHTML = `${nav}<div class="grid-2">${weekCard}${avgCard}${sportCard}${runCard}${importCard}</div>`;
    renderHealthBox();
  }

  function renderHealthBox() {
    const box = $("#healthSources");
    if (!box) return;
    const running = !!health.job;
    $("#healthCancel").hidden = !running;
    $("#healthProgressWrap").hidden = !running && !health.status;
    $("#healthProgress").value = health.progress;
    $("#healthProgressText").textContent = health.status;
    const apply = $("#healthApply");
    const r = health.result;
    if (!r || running) { box.innerHTML = ""; apply.hidden = true; return; }
    if (!r.records) {
      box.innerHTML = "<p class=\"err-list\" style=\"padding:0;list-style:none\">No se encontraron registros de pasos (¿es export.xml de Apple Health?)</p>";
      apply.hidden = true;
      return;
    }
    const names = Object.keys(r.sources).sort((a, b) => r.sources[b].steps - r.sources[a].steps);
    if (!health.selected) {
      const known = names.filter((n) => Object.prototype.hasOwnProperty.call(S().healthSources, n));
      health.selected = new Set(names.filter((n) => !known.includes(n) || S().healthSources[n]));
    }
    const agg = L.aggregateHealth(r.perDay, health.selected);
    const days = Object.keys(agg);
    const last7 = days.slice(-7);
    box.innerHTML = `
      <p class="small">${L.fmtInt(r.records)} registros de pasos${r.skipped ? ` · ${L.fmtInt(r.skipped)} omitidos por no ser válidos` : ""}. Elige las fuentes (de cada día se toma la mayor, así el iPhone y el reloj no se suman dos veces):</p>
      ${names.map((n) => `<label class="src-row"><input type="checkbox" data-src="${esc(n)}"${health.selected.has(n) ? " checked" : ""}><b>${esc(n)}</b><span>${L.fmtInt(r.sources[n].steps)} pasos · ${L.fmtInt(r.sources[n].days)} días</span></label>`).join("")}
      ${last7.length ? `<p class="hint">Vista previa (últimos días del archivo):</p><div class="preview">${last7.map((x) => `<div>${esc(L.fmtShortDay(x))}<b>${L.fmtInt(agg[x])}</b></div>`).join("")}</div>` : ""}`;
    apply.hidden = false;
    apply.disabled = !days.length;
    apply.textContent = `Importar ${L.fmtInt(days.length)} ${days.length === 1 ? "día" : "días"}`;
  }

  async function readHealthFile(file) {
    if (health.job) health.job.cancelled = true;
    const job = { cancelled: false, reader: null };
    Object.assign(health, { job, result: null, selected: null, fileName: file.name, progress: 0, status: "Leyendo… 0 %" });
    renderHealthBox();
    const parser = L.createHealthStepParser();
    let chars = 0;
    const tick = () => {
      health.progress = file.size ? Math.min(1, chars / file.size) : 1;
      health.status = `Leyendo ${file.name}… ${Math.floor(health.progress * 100)} %`;
      const pr = $("#healthProgress"), tx = $("#healthProgressText");
      if (pr) pr.value = health.progress;
      if (tx) tx.textContent = health.status;
    };
    try {
      if (typeof file.stream === "function" && typeof TextDecoderStream === "function") {
        const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
        job.reader = reader;
        for (;;) {
          const { value, done } = await reader.read();
          if (done || job.cancelled) break;
          parser.push(value); chars += value.length; tick();
        }
      } else {
        const dec = new TextDecoder(), CH = 4 * MB;
        for (let off = 0; off < file.size && !job.cancelled; off += CH) {
          const text = dec.decode(await file.slice(off, off + CH).arrayBuffer(), { stream: true });
          parser.push(text); chars += text.length; tick();
        }
        if (!job.cancelled) parser.push(dec.decode());
      }
    } catch (e) {
      if (!job.cancelled) {
        Object.assign(health, { job: null, result: null, status: "" });
        renderHealthBox();
        toast({ title: "Archivo no válido: no se pudo leer", body: String((e && e.message) || e).slice(0, 120) });
        return;
      }
    }
    if (health.job !== job) return; // a newer file replaced this one
    if (job.cancelled) {
      Object.assign(health, { job: null, result: null, status: "Importación cancelada: no se ha cambiado nada." });
      renderHealthBox();
      return;
    }
    const result = parser.finish();
    Object.assign(health, { job: null, result, progress: 1, status: `Leído ${file.name} · ${L.fmtInt(Object.keys(result.perDay).length)} días con pasos` });
    renderHealthBox();
  }

  function applyHealth() {
    const r = health.result;
    if (!r || !health.selected) return;
    const agg = L.aggregateHealth(r.perDay, health.selected);
    const rows = Object.entries(agg).map(([date, steps]) => ({ date, steps }));
    if (!rows.length) return;
    const m = L.mergeSteps(state, rows, "health", { overwriteManual });
    const next = m.data;
    const remembered = { ...next.settings.healthSources };
    for (const n of Object.keys(r.sources)) remembered[n] = health.selected.has(n);
    next.settings = L.normSettings({ ...next.settings, healthSources: remembered }, today);
    next.imports.push({ at: new Date().toISOString(), kind: "health", days: rows.length, sources: Object.keys(r.sources).filter((n) => health.selected.has(n)) });
    next.imports = next.imports.slice(-50);
    state = next;
    save();
    importMsg = `<b>Apple Health:</b> ${esc(L.importSummaryText(m))}.`;
    Object.assign(health, { job: null, result: null, selected: null, status: "", progress: 0 });
    render();
    toast({ title: "Importación de Apple Health", body: L.importSummaryText(m) });
  }

  async function importCSV(file) {
    if (file.size > 20 * MB) { toast({ title: "Archivo no válido: demasiado grande para un CSV de pasos" }); return; }
    let text;
    try { text = await file.text(); } catch { toast({ title: "Archivo no válido: no se pudo leer" }); return; }
    const res = L.parseStepsCSV(text);
    const errs = res.errors.slice(0, 6).map(([ln, msg]) => `<li>Línea ${ln}: ${esc(msg)}</li>`).join("") + (res.errors.length > 6 ? `<li>… y ${res.errors.length - 6} más</li>` : "");
    if (!res.rows.length) {
      importMsg = `<b>CSV:</b> no hay filas con fecha y pasos válidos.${errs ? `<ul class="err-list">${errs}</ul>` : ""}`;
      const box = $("#importSummary"); if (box) box.innerHTML = importMsg;
      toast({ title: "Archivo no válido: ninguna fila con fecha y pasos" });
      return;
    }
    if (res.errors.length && !confirm(`Hay ${res.errors.length} líneas con errores que se ignorarán. ¿Importar las ${res.rows.length} filas válidas?`)) return;
    const m = L.mergeSteps(state, res.rows, "csv", { overwriteManual });
    state = m.data;
    state.imports.push({ at: new Date().toISOString(), kind: "csv", days: m.added + m.updated, sources: [String(file.name).slice(0, 80)] });
    state.imports = state.imports.slice(-50);
    save();
    importMsg = `<b>CSV:</b> ${esc(L.importSummaryText(m))}${res.duplicates ? ` · ${res.duplicates} fechas repetidas (se tomó el mayor)` : ""}.${errs ? `<ul class="err-list">${errs}</ul>` : ""}`;
    render();
    toast({ title: "Importación CSV", body: L.importSummaryText(m) });
  }

  // ───────────────────────── Comidas
  function renderComidas() {
    const d = selDate(), s = S(), day = dayOf(d);
    const sug = L.suggestDayType(d, state, gymSessions());
    const dt = L.effectiveDayType(day, sug, s);
    const tg = L.targetsFor(s, dt, d);
    const p = L.portions(day);
    const t = L.titleParts(d);
    const nav = `
      <div class="day-nav">
        <a class="icon-btn" href="${dateHref("comidas", L.addDays(d, -1))}" aria-label="Día anterior">${icon("i-prev")}</a>
        <span class="lbl">${esc(t.weekday)}, ${esc(t.rest)}</span>
        <a class="icon-btn" href="${dateHref("comidas", L.addDays(d, 1))}" aria-label="Día siguiente">${icon("i-next")}</a>
        ${d === today ? "" : "<a class=\"chip accent\" href=\"#/comidas\">Hoy</a>"}
      </div>`;
    const items = day.meals.map((m) => `
      <div class="meal-item">
        ${slotDot(m.slot)}
        <div class="meal-main"><b>${esc(L.SLOT_LABEL[m.slot])}${m.time ? ` · ${esc(m.time)}` : ""}</b><span class="meal-desc">${esc(m.desc || "Sin descripción")}</span><span class="mini-por">${miniPortions(m)}</span></div>
        <div class="acts"><button type="button" class="btn sm" data-edit-meal="${esc(m.id)}">Editar</button><button type="button" class="btn sm ghost danger" data-del-meal="${esc(m.id)}" aria-label="Borrar ${esc(L.SLOT_LABEL[m.slot])}">✕</button></div>
      </div>`).join("");
    const mealsCard = `
      <section class="card" aria-labelledby="cmTitle">
        <div class="card-head"><h2 class="card-title" id="cmTitle">Comidas del día</h2><span class="chip">${L.mealsCount(day)} / 4 principales</span></div>
        <div>${items || "<p class=\"empty\">Sin comidas este día.</p>"}</div>
        <div class="row" style="margin-top:12px"><button type="button" class="btn primary" data-add-meal>+ Añadir comida</button></div>
      </section>`;
    const sumCard = `
      <section class="card" aria-labelledby="csTitle">
        <div class="card-head"><h2 class="card-title" id="csTitle">Raciones del día</h2><span class="chip">${esc(L.DAY_TYPE_SHORT[dt])}</span></div>
        <div class="por-rows">${portionRows(p, tg, s, d)}</div>
        <p class="small muted" style="margin-top:12px">💧 Agua: <b>${L.fmtNum(day.waterMl / 1000, 2)} / ${L.fmtNum(s.waterGoalMl / 1000, 2)} L</b>${day.waterMl >= s.waterGoalMl ? " ✓" : ""} · Hidratos y grasa son orientativos (no puntúan).</p>
      </section>`;
    // last 7 days table
    const rows7 = [];
    for (let k = 6; k >= 0; k--) {
      const x = L.addDays(d, -k), dy = dayOf(x), px = L.portions(dy);
      const tx = L.targetsFor(s, L.effectiveDayType(dy, L.suggestDayType(x, state, gymSessions()), s), x);
      const reg = dy.steps > 0 || dy.meals.length > 0 || dy.waterMl > 0;
      const yn = (v, t, txt) => (reg ? `<td class="${v >= t ? "y" : "n"}">${txt} ${v >= t ? "✓" : "✗"}</td>` : "<td class=\"g\">—</td>");
      const rg = (v, [lo, hi]) => (reg ? `<td class="${v >= lo && v <= hi ? "y" : "g"}">${L.fmtNum(v)} ${v < lo ? "↓" : v > hi ? "↑" : "✓"}</td>` : "<td class=\"g\">—</td>");
      rows7.push(`<tr${x === d ? " class=\"sel\"" : ""}><td><a href="${dateHref("comidas", x)}">${esc(L.fmtShortDay(x))}</a></td>${yn(px.protein, tx.protein, L.fmtNum(px.protein))}${yn(px.veg, tx.veg, L.fmtNum(px.veg))}${rg(px.carbs, tx.carbs)}${rg(px.fat, tx.fat)}${yn(dy.waterMl, tx.waterMl, L.fmtNum(dy.waterMl / 1000, 2) + " L")}</tr>`);
    }
    const th = (e, label) => `<th scope="col" title="${label}"><span aria-hidden="true">${e}</span><span class="sr">${label}</span></th>`;
    const tableCard = `
      <section class="card span-2" aria-labelledby="t7Title">
        <div class="card-head"><h2 class="card-title" id="t7Title">Últimos 7 días</h2><span class="card-sub">✓/✗ frente a tu objetivo · 🍚 y 🥑: ↓ ↑ frente a la guía</span></div>
        <div class="table-wrap"><table class="t7"><thead><tr><th scope="col">Día</th>${th("🥩", "Proteína (palmas)")}${th("🥦", "Verdura (puños)")}${th("🍚", "Hidratos (manos)")}${th("🥑", "Grasa (pulgares)")}${th("💧", "Agua")}</tr></thead><tbody>${rows7.join("")}</tbody></table></div>
      </section>`;
    // recipes
    const FILTERS = [["all", "Todas"], ["d", "Desayunos y batidos"], ["c", "Comidas y cenas"], ["t", "Tentempiés"], ["veg", "Más verdura (≥ 1,5)"], ["india", "🇮🇳 India (Woxsen)"]];
    const list = recipeFilter === "india" ? L.INDIA : L.RECIPES.filter((r) => recipeFilter === "all" || (recipeFilter === "veg" ? r.veg >= 1.5 : r.group === recipeFilter));
    const recCard = `
      <section class="card span-2" id="recetas" aria-labelledby="recTitle">
        <div class="card-head"><h2 class="card-title" id="recTitle">Recetas con verdura escondida</h2><span class="card-sub">De 16-nutricion/recetas.md · 1 persona</span></div>
        <div class="filters" role="group" aria-label="Filtrar recetas">${FILTERS.map(([k, l]) => `<button type="button" class="chip" data-filter="${k}" aria-pressed="${recipeFilter === k}">${l}</button>`).join("")}</div>
        <ul id="recipeList">${list.map((r) => `
          <li class="recipe">
            <b>${r.id} · ${esc(r.name)}</b>
            <span class="meta">${r.minutes ? `⏱ ${r.minutes}' · ` : ""}🥩 ${L.fmtNum(r.protein)} · 🥦 ${L.fmtNum(r.veg)}${r.carbs !== undefined ? ` · 🍚 ${L.fmtNum(r.carbs)} · 🥑 ${L.fmtNum(r.fat)}` : ""}</span>
            <span class="hid">${r.hidden ? `escondida: ${esc(r.hidden)}` : "sin verdura (tentempié de proteína)"}</span>
            <button type="button" class="btn sm" data-use-recipe="${r.id}" aria-label="Usar ${esc(r.name)}">Usar</button>
          </li>`).join("")}</ul>
      </section>`;
    $("#view").innerHTML = `${nav}<div class="grid-2">${mealsCard}${sumCard}${tableCard}${recCard}</div>`;
    if (route.params.get("ver") === "recetas") requestAnimationFrame(() => { const el = $("#recetas"); if (el) el.scrollIntoView({ block: "start" }); });
  }

  // ───────────────────────── Historial
  function renderHistorial() {
    const ym = selMonth(), s = S(), h = L.monthHeat(state, ym, today, s);
    const curYm = today.slice(0, 7);
    const title = `${L.monthName(ym).replace(/^./, (c) => c.toUpperCase())} ${ym.slice(0, 4)}`;
    const nav = `
      <div class="month-nav">
        <a class="icon-btn" href="${href("historial", { m: L.addMonths(ym, -1) })}" aria-label="Mes anterior">${icon("i-prev")}</a>
        <h2>${esc(title)}</h2>
        ${ym < curYm ? `<a class="icon-btn" href="${href("historial", { m: L.addMonths(ym, 1) })}" aria-label="Mes siguiente">${icon("i-next")}</a><a class="chip accent" href="#/historial">Este mes</a>` : ""}
      </div>`;
    const blanks = Array.from({ length: h.offset }, () => "<span aria-hidden=\"true\"></span>").join("");
    const calCard = `
      <section class="card" aria-labelledby="calTitle">
        <div class="card-head"><h2 class="card-title" id="calTitle">Cada día, cuántos objetivos cumpliste</h2>${legendHTML()}</div>
        <div class="cal" id="calendar">
          ${L.DAY_LETTERS.map((l, i) => `<span class="dh" aria-hidden="true" title="${L.DAY_NAMES[i]}">${l}</span>`).join("")}
          ${blanks}${h.cells.map((c) => heatCell(c, null)).join("")}
        </div>
        <p style="margin-top:16px"><span id="metCount">Objetivo cumplido ${h.metDays} de ${h.elapsedDays} días</span></p>
        <p class="hint">Un día cuenta como cumplido con ${Math.round(s.dayMetThreshold * 4)} de 4 objetivos: pasos, proteína, verdura y agua. Toca un día para verlo.</p>
      </section>`;
    const objs = [["steps", "👟 Pasos", `≥ ${L.fmtInt(L.stepGoalOf(s))}`], ["protein", "🥩 Proteína", `≥ ${L.fmtNum(s.proteinTarget)} palmas`], ["veg", "🥦 Verdura", "según tu rampa"], ["water", "💧 Agua", `≥ ${L.fmtNum(s.waterGoalMl / 1000, 2)} L`]];
    const weakest = objs.reduce((a, o) => (h.perObjectivePct[o[0]] < h.perObjectivePct[a[0]] ? o : a), objs[0])[0];
    const dates = h.cells.filter((c) => !c.future).map((c) => c.date);
    const mAvg = dates.length ? Math.round(dates.map((x) => dayOf(x).steps).filter((v) => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0)) : 0;
    const registered = h.cells.filter((c) => c.registered).length;
    const objCard = `
      <section class="card" aria-labelledby="objTitle">
        <h2 class="card-title" id="objTitle" style="margin-bottom:14px">Objetivos del mes</h2>
        <div class="obj-list">${objs.map(([k, label, goal]) => `
          <div class="obj-row${k === "veg" ? " weak" : ""}">
            <div class="por-line"><span class="por-name">${label}${k === "veg" ? " <span class=\"chip badge-weak\">Punto débil</span>" : ""}</span><span class="por-val"><b>${pctTxt(h.perObjectivePct[k])}</b> de los días · ${esc(goal)}</span></div>
            <div class="pbar${k === "veg" ? " veg" : ""}" aria-hidden="true"><i style="width:${h.perObjectivePct[k]}%"></i></div>
          </div>`).join("")}</div>
        <div class="stats-row" style="margin-top:18px">
          <span>Días registrados<b>${registered} de ${h.elapsedDays}</b></span>
          <span>Media de pasos<b>${mAvg ? L.fmtInt(mAvg) : "—"}</b></span>
          <span>Lo más flojo<b>${esc(objs.find((o) => o[0] === weakest)[1].replace(/^\S+\s/, ""))}</b></span>
        </div>
      </section>`;
    $("#view").innerHTML = `${nav}<div class="hist-grid" style="margin-top:16px">${calCard}${objCard}</div>`;
  }

  // ───────────────────────── Ajustes
  function renderAjustes() {
    const s = S();
    const num = (path, label, attrs, val) => `<label class="field">${label}<input type="number" data-set="${path}" value="${val}" ${attrs}></label>`;
    const sel = (path, label, opts, val) => `<label class="field">${label}<select data-set="${path}">${opts.map(([v, l]) => `<option value="${v}"${String(v) === String(val) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
    const known = Object.entries(s.healthSources);
    $("#view").innerHTML = `
      <div class="settings">
        <section class="card" aria-labelledby="stA">
          <h2 id="stA">Tú y tus pasos</h2>
          <div class="form-grid">
            <label class="field full">Nombre<input type="text" data-set="name" value="${esc(s.name)}" maxlength="40"></label>
            ${num("stepGoal", "Objetivo de pasos", "min=\"1000\" max=\"50000\" step=\"500\" inputmode=\"numeric\"", s.stepGoal)}
            ${num("heightCm", "Altura (cm)", "min=\"120\" max=\"230\" step=\"1\" inputmode=\"numeric\"", s.heightCm)}
            <label class="field">Zancada manual (m)<input type="text" data-set="strideM" value="${s.strideM === null ? "" : L.fmtNum(s.strideM, 3)}" inputmode="decimal" placeholder="automática"></label>
            <p class="field hint" id="strideInfo" style="align-self:end">${strideInfo()}</p>
          </div>
        </section>
        <section class="card" aria-labelledby="stB">
          <h2 id="stB">Raciones con la mano</h2>
          <div class="form-grid">
            ${num("proteinTarget", "Proteína (palmas/día)", "min=\"1\" max=\"10\" step=\"0.5\" inputmode=\"decimal\"", s.proteinTarget)}
            ${sel("defaultDayType", "Tipo de día por defecto", L.DAY_TYPES.map((t) => [t, L.DAY_TYPE_LABEL[t]]), s.defaultDayType)}
            ${sel("veg.mode", "Verdura: modo", [["rampa", "Rampa progresiva"], ["fija", "Meta fija"]], s.veg.mode)}
            ${num("veg.fixed", "Meta fija (puños)", "min=\"0\" max=\"10\" step=\"0.5\" inputmode=\"decimal\"", s.veg.fixed)}
            ${num("veg.start", "Rampa: empieza en (puños)", "min=\"0\" max=\"10\" step=\"0.5\" inputmode=\"decimal\"", s.veg.start)}
            ${num("veg.final", "Rampa: meta final (puños)", "min=\"0\" max=\"10\" step=\"0.5\" inputmode=\"decimal\"", s.veg.final)}
            <label class="field">Rampa: fecha de inicio<input type="date" data-set="veg.rampStart" value="${s.veg.rampStart}"></label>
            ${num("veg.weeksPerStep", "Semanas por escalón", "min=\"1\" max=\"12\" step=\"1\" inputmode=\"numeric\"", s.veg.weeksPerStep)}
            <p class="full hint" id="vegInfo">${vegInfo()}</p>
          </div>
        </section>
        <section class="card" aria-labelledby="stC">
          <h2 id="stC">Agua y día cumplido</h2>
          <div class="form-grid">
            ${num("waterGoalL", "Agua al día (L)", "min=\"0.5\" max=\"8\" step=\"0.25\" inputmode=\"decimal\"", s.waterGoalMl / 1000)}
            ${num("glassMl", "Vaso (ml)", "min=\"50\" max=\"1000\" step=\"50\" inputmode=\"numeric\"", s.glassMl)}
            ${num("bottleMl", "Botella (ml)", "min=\"100\" max=\"2000\" step=\"50\" inputmode=\"numeric\"", s.bottleMl)}
            ${sel("dayMetThreshold", "Un día está cumplido con…", [[0.5, "2 de 4 objetivos"], [0.75, "3 de 4 objetivos"], [1, "4 de 4 objetivos"]], s.dayMetThreshold)}
          </div>
          <p class="hint" style="margin-top:10px">Fuentes de Apple Health recordadas: ${known.length ? known.map(([n, v]) => `${esc(n)} ${v ? "✓" : "✗"}`).join(" · ") : "ninguna"}.</p>
        </section>
        <section class="card" aria-labelledby="stD">
          <h2 id="stD">Datos</h2>
          <div class="btn-col">
            <a class="btn" href="../28-panel-vida/#/ajustes" style="text-decoration:none;text-align:center">Copia de TODAS tus apps (Panel) →</a>
            <button type="button" class="btn" id="exportJson">Exportar JSON</button>
            <button type="button" class="btn" id="importBtn">Importar JSON</button>
            <input type="file" id="importFile" accept=".json,application/json" hidden>
            <button type="button" class="btn" id="demoBtn">Cargar datos de ejemplo</button>
            <button type="button" class="btn danger" id="wipeBtn">Borrar datos de Paso</button>
          </div>
          <p class="note" style="margin-top:14px">Todo se guarda en este navegador (clave <code>paso.v1</code>). Exporta el JSON de vez en cuando. Paso solo <b>lee</b> Gym Tracker y Hábitos, nunca los modifica. La lectura entre apps funciona cuando comparten origen (p. ej. GitHub Pages); en file:// Chrome y Edge la comparten, Firefox no.</p>
          <p class="hint" style="margin-top:10px">Atajos: <b>n</b> nueva comida · <b>t</b> hoy · <b>←</b>/<b>→</b> día (semana o mes) anterior/siguiente · <b>Esc</b> cierra avisos.</p>
          <p class="hint" style="margin-top:6px">Otras apps: <a href="../26-ritmo/index.html">Ritmo</a> · <a href="../10-gym-tracker/index.html">Gym Tracker</a> · <a href="../15-habitos/app/index.html">Hábitos</a></p>
          <p class="hint" style="margin-top:6px">Información general, no consejo médico ni dietético.</p>
        </section>
      </div>`;
  }
  function strideInfo() {
    const s = S();
    return `Zancada: ${L.fmtDec(L.strideM(s), 2)} m ${s.strideM === null ? "(0,415 × altura)" : "(manual)"} · 1.000 pasos ≈ ${L.fmtDec(L.kmFromSteps(1000, s), 2)} km`;
  }
  function vegInfo() {
    const s = S(), t = L.vegTargetFor(s, today);
    return `Hoy tu meta de verdura es <b>${L.fmtNum(t)} ${unit("veg", t)}</b>. La guía: empezar con 2 puños durante 2 semanas, luego 3, luego 4.`;
  }
  function onSettingChange(el) {
    let path = el.dataset.set;
    let v = el.value;
    const draft = JSON.parse(JSON.stringify(state.settings));
    if (path === "waterGoalL") { path = "waterGoalMl"; v = L.num(v, draft.waterGoalMl / 1000) * 1000; }
    if (path === "dayMetThreshold") v = Number(v);
    if (path === "strideM" && String(v).trim() === "") v = null;
    const parts = path.split(".");
    let o = draft;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = v;
    state.settings = L.normSettings(draft, today);
    save();
    // show the normalised value (clamped) without a full re-render, so keyboard focus stays put
    const cur = parts.reduce((a, k) => a[k], state.settings);
    if (el.dataset.set === "waterGoalL") el.value = state.settings.waterGoalMl / 1000;
    else if (path === "strideM") el.value = cur === null ? "" : L.fmtNum(cur, 3);
    else if (el.tagName !== "SELECT") el.value = cur;
    $("#strideInfo").textContent = strideInfo();
    $("#vegInfo").innerHTML = vegInfo();
    renderSidebar();
    renderHeader();
  }

  // ───────────────────────── meal dialog
  const dlg = $("#mealDialog");
  function initMealDialog() {
    $("#mSlot").innerHTML = L.SLOTS.map((s) => `<option value="${s}">${L.SLOT_LABEL[s]}</option>`).join("");
    const groups = [["d", "Desayunos y batidos"], ["c", "Comidas y cenas"], ["t", "Tentempiés"]];
    $("#mRecipe").innerHTML = "<option value=\"\">Usar receta…</option>" + groups.map(([g, l]) => `<optgroup label="${l}">${L.RECIPES.filter((r) => r.group === g)
      .map((r) => `<option value="${r.id}">${r.id} · ${esc(r.name)} (🥩 ${L.fmtNum(r.protein)} · 🥦 ${L.fmtNum(r.veg)})</option>`).join("")}</optgroup>`).join("");
    $("#mSteppers").innerHTML = L.PORTIONS.map((k) => {
      const info = L.PORTION_INFO[k], out = { protein: "mProtein", veg: "mVeg", carbs: "mCarbs", fat: "mFat" }[k];
      return `<div class="stepper${k === "veg" ? " veg" : ""}">
        <div class="st-head"><span>${info.emoji} ${info.label}</span><span class="unit">${info.many}</span></div>
        <div class="st-ctrl">
          <button type="button" data-step="${k}" data-dir="-1" aria-label="Quitar media ración de ${info.label.toLowerCase()}">−</button>
          <output id="${out}" aria-live="polite" aria-label="${info.label}">0</output>
          <button type="button" data-step="${k}" data-dir="1" aria-label="Añadir media ración de ${info.label.toLowerCase()}">+</button>
        </div>
        <p class="help">${esc(info.help)}</p>
      </div>`;
    }).join("");
  }
  function updateOutputs() {
    $("#mProtein").textContent = L.fmtNum(mealCtx.values.protein);
    $("#mVeg").textContent = L.fmtNum(mealCtx.values.veg);
    $("#mCarbs").textContent = L.fmtNum(mealCtx.values.carbs);
    $("#mFat").textContent = L.fmtNum(mealCtx.values.fat);
  }
  function applyRecipe(id) {
    const r = L.RECIPES.find((x) => x.id === Number(id)) || L.INDIA.find((x) => x.id === Number(id));
    if (!r) return;
    $("#mDesc").value = r.name;
    mealCtx.values.protein = r.protein;
    mealCtx.values.veg = r.veg;
    if (r.carbs !== undefined) { mealCtx.values.carbs = r.carbs; mealCtx.values.fat = r.fat; }
    $("#mRecipe").value = r.id <= 20 ? String(r.id) : ""; // India dishes are not one of the 20 recipes
    updateOutputs();
  }
  function openMeal({ date, id = null, recipe = null }) {
    closePopover();
    const day = dayOf(date), m = id ? day.meals.find((x) => x.id === id) : null;
    const isToday = date === today;
    const slot = m ? m.slot : L.nextSlot(day, isToday ? L.nowHM() : "23:59");
    Object.assign(mealCtx, { date, id: m ? m.id : null, values: m ? { protein: m.protein, veg: m.veg, carbs: m.carbs, fat: m.fat } : { protein: 0, veg: 0, carbs: 0, fat: 0 } });
    $("#mealDialogTitle").textContent = m ? `Editar ${L.SLOT_LABEL[m.slot].toLowerCase()}` : "Añadir comida";
    $("#mSlot").value = slot;
    $("#mTime").value = m ? m.time : isToday ? L.nowHM() : L.SLOT_TIME[slot] || "";
    $("#mDesc").value = m ? m.desc : "";
    $("#mRecipe").value = "";
    $("#mDelete").hidden = !m;
    $("#mDateHint").textContent = isToday ? "" : `Para el ${L.titleParts(date).weekday.toLowerCase()}, ${L.titleParts(date).rest}.`;
    if (recipe) applyRecipe(recipe);
    updateOutputs();
    dlg.showModal();
    $("#mDesc").focus();
  }
  function closeMeal() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", () => { if (pendingRender) render(); });
  function saveMealFromDialog() {
    const date = mealCtx.date;
    const m = L.saveMeal(state, date, {
      id: mealCtx.id || undefined, slot: $("#mSlot").value, time: $("#mTime").value, desc: $("#mDesc").value, ...mealCtx.values,
    });
    save();
    closeMeal();
    render();
    const sp = L.stepsProgress(dayOf(date).steps, S());
    const [title, body] = L.mealSavedText(m.slot, sp.remaining, sp.met).split(" · ");
    toast({ title, body: body + (!sp.met && date === today ? " hoy" : "") });
  }

  // ───────────────────────── toasts
  function toast({ title, body = "", action = null }) {
    const box = $("#toasts");
    while (box.children.length >= 3) box.firstElementChild.remove();
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="logo" aria-hidden="true">P</span>
      <div><div class="toast-cap">Paso · ${L.nowHM()}</div><div class="toast-title">${esc(title)}</div>${body ? `<div class="toast-text">${esc(body)}</div>` : ""}${action ? `<button type="button" class="btn-link toast-action">${esc(action.label)}</button>` : ""}</div>
      <button type="button" class="toast-x" aria-label="Cerrar aviso">✕</button>`;
    const kill = () => { clearTimeout(timer); el.remove(); };
    const timer = setTimeout(kill, action ? 8000 : 4000);
    el.querySelector(".toast-x").addEventListener("click", kill);
    if (action) el.querySelector(".toast-action").addEventListener("click", () => { kill(); action.run(); });
    box.appendChild(el);
  }

  // ───────────────────────── actions
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function parseStepsInput(v) {
    const t = String(v || "").trim().replace(/[.\s']/g, "");
    if (!/^\d+$/.test(t)) return null;
    const n = Number(t);
    return n <= 200000 ? n : null;
  }
  function saveSteps(date, n, verb = "Pasos guardados") {
    L.setSteps(state, date, n, "manual");
    save();
    render();
    const sp = L.stepsProgress(n, S());
    toast(sp.met ? { title: "¡Objetivo de pasos cumplido! 🎉", body: `${L.fmtInt(n)} pasos${sp.surplus ? ` · +${L.fmtInt(sp.surplus)}` : ""}` }
      : { title: verb, body: `${L.fmtInt(n)} pasos · te faltan ${L.fmtInt(sp.remaining)}` });
  }
  function shift(dir) {
    const r = route.name;
    if (r === "hoy" || r === "comidas") go(dateHref(r, L.addDays(selDate(), dir)));
    else if (r === "actividad") { const n = L.addDays(selDate(), 7 * dir); go(dateHref(r, n > today ? today : n)); }
    else if (r === "historial") { const m = L.addMonths(selMonth(), dir); if (m <= today.slice(0, 7)) go(href(r, { m })); }
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a, .heat-cell");
    const pop = $("#pendingPopover");
    if (pop && !pop.hidden && !e.target.closest(".bell-wrap")) closePopover();
    if (!t) return;
    const ds = t.dataset;
    if (t.id === "bellBtn") {
      const open = pop.hidden;
      pop.hidden = !open;
      t.setAttribute("aria-expanded", String(open));
      return;
    }
    if (ds.range) {
      const d = selDate();
      if (ds.range === "hoy") go(dateHref("hoy", d));
      else if (ds.range === "semana") go(dateHref("actividad", d));
      else go(href("historial", { m: route.name === "historial" ? selMonth() : d.slice(0, 7) }));
      return;
    }
    if (t.classList.contains("heat-cell") && ds.date && !t.disabled) { go(dateHref("hoy", ds.date)); return; }
    if ((ds.addSteps || ds.water) && (t.disabled || selDate() > today)) return;
    if (ds.addSteps) { const d = selDate(); L.setSteps(state, d, dayOf(d).steps + Number(ds.addSteps), "manual"); save(); render(); return; }
    if (ds.water) { L.addWater(state, selDate(), Number(ds.water)); save(); render(); return; }
    if (ds.daytype) { L.setDayType(state, selDate(), ds.daytype === "auto" ? null : ds.daytype); save(); render(); return; }
    if (ds.mealId) { openMeal({ date: selDate(), id: ds.mealId }); return; }
    if (ds.editMeal) { openMeal({ date: selDate(), id: ds.editMeal }); return; }
    if (t.id === "addMeal" || ds.addMeal !== undefined) { openMeal({ date: selDate() }); return; }
    if (ds.useRecipe) { openMeal({ date: selDate(), recipe: Number(ds.useRecipe) }); return; }
    if (ds.delMeal) {
      if (confirm("¿Borrar esta comida?")) { L.deleteMeal(state, selDate(), ds.delMeal); save(); render(); toast({ title: "Comida borrada" }); }
      return;
    }
    if (ds.delRun) {
      if (confirm("¿Borrar esta carrera?")) { L.deleteRun(state, ds.delRun); save(); render(); toast({ title: "Carrera borrada" }); }
      return;
    }
    if (ds.filter) { recipeFilter = ds.filter; render(); return; }
    if (ds.step) {
      const k = ds.step;
      mealCtx.values[k] = L.clamp(Math.round((mealCtx.values[k] + 0.5 * Number(ds.dir)) * 2) / 2, 0, 10);
      updateOutputs();
      return;
    }
    if (ds.close !== undefined) { closeMeal(); return; }
    switch (t.id) {
      case "mDelete":
        if (mealCtx.id && confirm("¿Borrar esta comida?")) { L.deleteMeal(state, mealCtx.date, mealCtx.id); save(); closeMeal(); render(); toast({ title: "Comida borrada" }); }
        return;
      case "healthCancel":
        if (health.job) { health.job.cancelled = true; try { health.job.reader && health.job.reader.cancel(); } catch { /* ignore */ } }
        return;
      case "healthApply": applyHealth(); return;
      case "exportJson":
        download(`paso-${today}.json`, JSON.stringify(L.exportBundle(state, new Date().toISOString()), null, 2), "application/json");
        toast({ title: "Copia exportada", body: `paso-${today}.json` });
        return;
      case "importBtn": $("#importFile").click(); return;
      case "demoBtn":
        if (!confirm("¿Cargar datos de ejemplo? Se sustituyen los datos actuales de Paso (las otras apps no se tocan).")) return;
        state = L.demoData(today);
        save();
        go("#/hoy");
        toast({ title: "Datos de ejemplo cargados", body: "45 días de pasos, comidas y carreras" });
        return;
      case "wipeBtn":
        if (!confirm("¿Borrar todos los datos de Paso de este navegador? Las otras apps no se tocan.")) return;
        store.remove(KEY);
        state = L.emptyState(today);
        render();
        toast({ title: "Datos de Paso borrados" });
        return;
      case "dlCorrupt":
        if (corruptRaw !== null) download(`paso-danado-${today}.txt`, corruptRaw, "text/plain");
        return;
      default:
    }
  });

  document.addEventListener("submit", (e) => {
    const f = e.target;
    e.preventDefault();
    if (f.id === "mealForm") { saveMealFromDialog(); return; }
    if (f.id === "stepsForm") {
      if (selDate() > today) return;
      const n = parseStepsInput($("#stepsInput").value);
      if (n === null) { toast({ title: "Escribe un número de pasos válido", body: "Entre 0 y 200.000" }); return; }
      saveSteps(selDate(), n);
      return;
    }
    if (f.id === "manualForm") {
      const date = $("#manualDate").value, n = parseStepsInput($("#manualSteps").value);
      if (!L.isISO(date)) { toast({ title: "Elige una fecha" }); return; }
      if (n === null) { toast({ title: "Escribe un número de pasos válido", body: "Entre 0 y 200.000" }); return; }
      saveSteps(date, n, `Pasos del ${L.fmtDayMonth(date)} guardados`);
      return;
    }
    if (f.id === "runForm") {
      const date = $("#rDate").value, type = $("#rType").value;
      const minutes = L.num($("#rMinutes").value, 0), km = L.num($("#rKm").value, NaN);
      if (!L.isISO(date)) { toast({ title: "Elige una fecha válida" }); return; }
      if (Number.isNaN(km) && $("#rKm").value.trim()) { toast({ title: "Km no válidos", body: "Usa coma o punto decimal, p. ej. 6,2" }); return; }
      if (!(minutes > 0) && !(km > 0)) { toast({ title: "Indica los minutos o los km" }); return; }
      const r = L.addRun(state, { date, type, minutes, km: Number.isNaN(km) ? 0 : km, notes: $("#rNotes").value });
      save();
      render();
      toast({ title: "Carrera guardada", body: `${L.RUN_SHORT[r.type]}${r.minutes ? ` ${r.minutes}'` : ""}${r.km ? ` · ${L.fmtNum(r.km, 2)} km` : ""} · cuenta para el suelo` });
    }
  });

  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.dataset.set) { onSettingChange(t); return; }
    if (t.dataset.src !== undefined) {
      if (!health.selected) return;
      if (t.checked) health.selected.add(t.dataset.src); else health.selected.delete(t.dataset.src);
      renderHealthBox();
      return;
    }
    switch (t.id) {
      case "overwriteManual": overwriteManual = t.checked; return;
      case "mRecipe": if (t.value) applyRecipe(t.value); return;
      case "healthFile": { const f = t.files && t.files[0]; t.value = ""; if (f) await readHealthFile(f); return; }
      case "csvFile": { const f = t.files && t.files[0]; t.value = ""; if (f) await importCSV(f); return; }
      case "importFile": {
        const f = t.files && t.files[0];
        t.value = "";
        if (!f) return;
        if (f.size > 50 * MB) { toast({ title: "Archivo no válido: demasiado grande" }); return; }
        let text;
        try { text = await f.text(); } catch { toast({ title: "Archivo no válido: no se pudo leer" }); return; }
        const res = L.parseImport(text, today);
        if (!res.ok) { toast({ title: `Archivo no válido: ${res.error}` }); return; }
        if (!confirm(`¿Sustituir los datos actuales de Paso por los del archivo (${Object.keys(res.data.days).length} días, ${res.data.runs.length} carreras)?`)) return;
        state = res.data;
        save();
        render();
        toast({ title: "Datos importados", body: `${L.fmtInt(Object.keys(state.days).length)} días · ${state.runs.length} carreras` });
        return;
      }
      default:
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (closePopover()) { $("#bellBtn").focus(); return; }
      if (!dlg.open) { const last = $("#toasts").lastElementChild; if (last) last.remove(); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || dlg.open) return;
    const tag = (e.target && e.target.tagName) || "";
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if (e.key === "n") { e.preventDefault(); openMeal({ date: route.name === "hoy" || route.name === "comidas" ? selDate() : today }); }
    else if (e.key === "t") { e.preventDefault(); go(route.name === "historial" ? "#/historial" : `#/${route.name === "ajustes" ? "hoy" : route.name}`); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); shift(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); shift(1); }
  });

  let lastRoute = route.name;
  window.addEventListener("hashchange", () => {
    if (dlg.open) { pendingRender = true; return; }
    render();
    if (route.name !== lastRoute) window.scrollTo(0, 0);
    lastRoute = route.name;
  });
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key === KEY) state = loadState();
    if (e.key === null || e.key === KEY || e.key === GYM_KEY || e.key === HAB_KEY) requestRender();
  });
  let resizeT = null;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(drawCharts, 120); });

  // 20 s tick: only live labels; full re-render when the local date changes.
  setInterval(() => {
    const t = L.todayISO();
    if (t !== today) { today = t; requestRender(); return; }
    const add = $("#addMeal");
    if (add && route.name === "hoy" && selDate() === today) {
      const b = add.querySelector("b"), next = L.nextSlot(dayOf(today), L.nowHM());
      const txt = `Añadir ${L.SLOT_LABEL[next].toLowerCase()}`;
      if (b && b.textContent !== txt) b.textContent = txt;
    }
  }, 20000);

  initMealDialog();
  render();
  lastRoute = route.name;
})();
