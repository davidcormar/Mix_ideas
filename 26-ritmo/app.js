/* Ritmo — UI layer: DOM, localStorage, timers. Every rule lives in logic.js (window.RitmoLogic).
   Own key: ritmo.v1. habitos.v1: fresh read-modify-write through applyHabitMutation (setTick/setObjective only).
   idiomas.v1, gymtracker.v1, finanzas.v1, paso.v1: read-only. */
(function () {
  "use strict";
  const L = window.RitmoLogic;
  const KEY = "ritmo.v1", HK = "habitos.v1", GYM = "gymtracker.v1", IDI = "idiomas.v1", FIN = "finanzas.v1", PASO = "paso.v1";
  const WATCHED = new Set([KEY, HK, GYM, IDI, FIN, PASO]);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = L.esc;
  const stampNow = () => new Date().toISOString(); // UTC instants for createdAt/updatedAt only — dates always come from todayISO()
  const minutesNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

  // ───────────────────────────────────────────── icons (inline SVG, 1.75 stroke)
  const svg = (d, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    more: svg('<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>'),
    chevL: svg('<path d="m14.5 6-6 6 6 6"/>'),
    chevR: svg('<path d="m9.5 6 6 6-6 6"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    up: svg('<path d="m6 14 6-6 6 6"/>'),
    down: svg('<path d="m6 10 6 6 6-6"/>'),
    sun: svg('<circle cx="12" cy="12" r="3.6"/><path d="M12 3v1.8M12 19.2V21M4.6 4.6l1.3 1.3M18.1 18.1l1.3 1.3M3 12h1.8M19.2 12H21M4.6 19.4l1.3-1.3M18.1 5.9l1.3-1.3"/>'),
    moon: svg('<path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.7 7.7 0 1 0 10.1 10.1z"/>'),
    tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.4 3.6 3.5L17.5 8.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // ───────────────────────────────────────────── storage wrapper (never throws; in-memory fallback)
  const mem = Object.create(null);
  // Read-only probe: Ritmo never writes any key but ritmo.v1 (and habitos.v1 through applyHabitMutation).
  // A failed write (quota, private mode) flips storageOK in saveFailed().
  let storageOK = true;
  try { void window.localStorage.getItem(KEY); } catch (e) { storageOK = false; }
  const store = {
    get(k) { if (k in mem) return mem[k]; try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); delete mem[k]; return true; } catch (e) { mem[k] = v; return false; } },
    remove(k) { delete mem[k]; try { window.localStorage.removeItem(k); return true; } catch (e) { return false; } },
  };
  let saveWarned = false;
  function saveFailed() {
    storageOK = false; // the "no deja guardar" banner shows from the next render on
    if (saveWarned) return;
    saveWarned = true;
    toast({ title: "No se pudo guardar en este navegador: exporta tus datos", body: "Ritmo sigue funcionando en memoria hasta que cierres la pestaña." });
  }

  // ───────────────────────────────────────────── state
  let today = L.todayISO();
  let ownCorrupt = false, ownCorruptRaw = null;
  let S = loadState();
  function loadState() {
    const raw = store.get(KEY);
    const habits = L.readHabits(store.get(HK)).habits || L.HABITS_DEFAULT;
    if (raw === null) {
      const s = L.emptyState(today, habits);
      if (!store.set(KEY, JSON.stringify(s)) && storageOK) saveFailed(); // persist frenchCountFrom = first run
      return s;
    }
    let obj = null;
    try { obj = JSON.parse(raw); } catch (e) { ownCorrupt = true; ownCorruptRaw = raw; }
    return L.migrate(obj, today, habits);
  }
  function save() { const ok = store.set(KEY, JSON.stringify(S)); if (!ok) saveFailed(); ownCorrupt = false; ownCorruptRaw = null; return ok; }
  const taskById = (id) => S.tasks.find((t) => t.id === id);
  const routineById = (id) => S.routines.find((r) => r.id === id);

  /** Fresh reads of every key for one render. Foreign keys are never written. */
  let R = null;
  function readAll() {
    const hr = L.readHabits(store.get(HK));
    const inv = hr.status === "invalid";
    return {
      hr, inv, hd: hr.status === "ok" ? hr.data : null, habits: inv ? L.HABITS_DEFAULT : hr.habits,
      gym: L.readGym(store.get(GYM), today), idi: L.readIdiomas(store.get(IDI)), fin: L.readFinanzas(store.get(FIN), today), paso: L.readPaso(store.get(PASO), today),
    };
  }
  const linkOf = (kind) => { const h = S.settings.habitLinks[kind]; return Number.isInteger(h) && h < R.habits.length ? h : null; };
  function sportCalc(days, state = S) {
    return L.sportByDay(days, { habits: R.hd, sportIdx: linkOf("sport"), gymSessions: R.gym ? R.gym.sessions : null, runs: R.paso ? R.paso.runs : null, ritmoDone: L.ritmoSportDone(state) });
  }
  const frSrc = (state = S) => ({ idiomas: R.idi, tasks: state.tasks });
  function planCtx(state, day, fromHM) {
    const before = L.weekDays(day).filter((d) => d < day);
    return {
      sportDoneBefore: sportCalc(before, state).total,
      frenchRequired: L.frenchStatus(frSrc(state), day, state.settings).todayRequired,
      frenchNextType: R.idi ? L.frenchNextType(R.idi.log) : null,
      fromHM,
    };
  }

  // ───────────────────────────────────────────── habits.v1 writes (fresh read-modify-write)
  function habitWrite(mutate) {
    const raw = store.get(HK);
    if (L.readHabits(raw).status === "invalid") { toast({ title: "Hábitos en solo lectura", body: "habitos.v1 no es válido: no se escribe nada." }); return false; }
    const r = L.applyHabitMutation(raw, mutate);
    if (!r.ok) { toast({ title: "No se pudo actualizar Hábitos", body: r.error }); return false; }
    if (!store.set(HK, r.json)) saveFailed();
    return true;
  }
  /** Auto-tick a linked habit (never unticks). */
  function autoTick(h, iso) {
    if (!S.settings.autoTickHabits || !Number.isInteger(h) || !L.isISO(iso) || iso > today) return;
    const hr = L.readHabits(store.get(HK));
    if (hr.status === "invalid" || h >= hr.habits.length) return;
    if (hr.data && L.isTicked(hr.data, iso, h)) return;
    if (habitWrite((d) => L.setTick(d, iso, h, true, today))) toast({ title: "También marcado en Hábitos: " + hr.habits[h] });
  }
  function autoTickTask(t) {
    const kind = t.category === "deporte" ? "sport" : t.category === "frances" ? "french" : null;
    if (kind && t.status === "done") autoTick(S.settings.habitLinks[kind], t.doneOn);
  }
  function setTaskDone(t, done) {
    if (done) { t.status = "done"; t.doneAt = stampNow(); t.doneOn = t.date && t.date < today ? t.date : today; }
    else { t.status = "open"; t.doneAt = null; t.doneOn = null; }
    t.updatedAt = stampNow();
  }

  // ───────────────────────────────────────────── toasts
  function toast({ title, body = "", caption = null, action = null, sticky = false } = {}) {
    const box = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="logo logo-sm" aria-hidden="true">R</span><div class="toast-txt"><p class="toast-cap">${esc(caption || "Ritmo · " + L.nowHM())}</p>`
      + `<p class="toast-title">${esc(title)}</p>${body ? `<p class="toast-body">${esc(body)}</p>` : ""}`
      + `${action ? `<button type="button" class="toast-act">${esc(action.label)}</button>` : ""}</div>`
      + `<button type="button" class="toast-x" aria-label="Cerrar aviso">${ICON.close}</button>`;
    let timer = null;
    const close = () => { clearTimeout(timer); el.remove(); };
    el.querySelector(".toast-x").addEventListener("click", close);
    if (action) el.querySelector(".toast-act").addEventListener("click", () => { close(); action.fn(); });
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    if (!sticky) timer = setTimeout(close, action ? 8000 : 4000);
    el._close = close;
    return el;
  }
  const dismissNewestToast = () => { const t = $("#toasts").lastElementChild; if (t) { t._close ? t._close() : t.remove(); return true; } return false; };

  // ───────────────────────────────────────────── routing
  let route = { name: "hoy", sel: today, month: today.slice(0, 7), id: null };
  function parseRoute() {
    const h = location.hash || "#/hoy";
    const m = /^#\/([^?]*)(?:\?(.*))?$/.exec(h);
    const parts = (m ? m[1] : "hoy").split("/").filter(Boolean);
    const q = new URLSearchParams(m && m[2] ? m[2] : "");
    let name = parts[0] || "hoy";
    if (!VIEWS[name]) name = "hoy";
    const d = q.get("d");
    let sel = L.isISO(d) ? d : today;
    const mo = q.get("m");
    let month = L.isYM(mo) ? mo : sel.slice(0, 7);
    if (name === "mes" && L.isYM(mo) && !L.isISO(d)) sel = mo === today.slice(0, 7) ? today : mo + "-01";
    return { name, sel, month, id: parts[1] || null };
  }
  const dayHash = (view, iso) => (iso === today ? `#/${view}` : `#/${view}?d=${iso}`);
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  // ───────────────────────────────────────────── render
  const FOCUS_ATTRS = ["data-habit", "data-check", "data-routine-item", "data-obj-done", "data-obj-text", "data-date", "data-range", "data-week",
    "data-month", "data-open-task", "data-routine-expand", "data-set", "data-ri", "data-fw", "data-action"];
  function focusKey() {
    const a = document.activeElement;
    if (!a || a === document.body || !$("#main").contains(a)) return null;
    if (a.id) return "#" + CSS.escape(a.id);
    for (const at of FOCUS_ATTRS) {
      if (!a.hasAttribute(at)) continue;
      let s = `[${at}="${CSS.escape(a.getAttribute(at))}"]`;
      for (const extra of ["data-routine", "data-id", "data-field"]) if (a.hasAttribute(extra)) s += `[${extra}="${CSS.escape(a.getAttribute(extra))}"]`;
      return s;
    }
    return null;
  }
  function render() {
    today = L.todayISO();
    route = parseRoute();
    R = readAll();
    const fk = focusKey();
    renderShell();
    const v = VIEWS[route.name];
    $("#view").innerHTML = v.html();
    document.title = "Ritmo · " + v.title();
    if (v.after) v.after();
    drawCharts();
    updateReviewButton();
    if (fk) { const el = $(fk); if (el) el.focus({ preventScroll: true }); }
  }
  function renderShell() {
    const navName = route.name === "rutina" ? "rutina-" + route.id : route.name;
    for (const a of $$("[data-nav]")) { if (a.dataset.nav === navName) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }
    for (const a of $$("[data-tab]")) { if (a.dataset.tab === route.name || (route.name === "mes" && a.dataset.tab === "semana") || (route.name === "rutina" && a.dataset.tab === "habitos")) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }
    // routine links
    $("#routineNav").innerHTML = S.routines.map((r) => {
      const p = L.routineProgress(S, r.id, today);
      const cur = navName === "rutina-" + r.id ? ' aria-current="page"' : "";
      return `<a href="#/rutina/${encodeURIComponent(r.id)}" data-nav="rutina-${esc(r.id)}"${cur}>${/noche/i.test(r.name) || r.id === "noche" ? ICON.moon : ICON.sun}<span>${esc(r.name)}</span><span class="rt-meta">${p.done}/${p.total}</span></a>`;
    }).join("");
    // habits badge = habits still unticked today
    const left = R.inv ? 0 : R.habits.length - L.dayScore(R.hd, today, R.habits.length);
    for (const id of ["#navHabitBadge", "#tabHabitBadge"]) { const b = $(id); b.textContent = String(left); b.hidden = R.inv || left === 0; b.setAttribute("aria-label", `${left} sin marcar hoy`); }
    updateReviewButton();
    // banners
    const banners = [];
    if (!storageOK) banners.push(`<div class="banner bad" role="alert"><span>⚠</span><span><b>Este navegador no deja guardar datos.</b> Ritmo funciona en memoria: exporta el JSON antes de cerrar la pestaña.</span></div>`);
    if (R.inv) banners.push(`<div class="banner bad" role="alert"><span>⚠</span><span>Los datos de hábitos (habitos.v1) no son válidos. Ábrelos en 15-hábitos o importa una copia.</span></div>`);
    if (ownCorrupt) banners.push(`<div class="banner"><span>ℹ</span><span>Los datos guardados de Ritmo estaban dañados y se ha empezado de cero. No se sobrescriben hasta que cambies algo; importa una copia si la tienes. <button type="button" class="btn btn-secondary btn-sm" data-action="dl-corrupt">Descargar el texto dañado</button></span></div>`);
    $("#banners").innerHTML = banners.join("");
  }
  function updateReviewButton() {
    const h = new Date().getHours();
    const b = $("#btnReview");
    const evening = h >= 20 || h < 4;
    b.classList.toggle("btn-primary", evening);
    b.classList.toggle("btn-secondary", !evening);
    const cta = $("#reviewCta");
    if (cta) cta.hidden = !(evening && !S.reviews[L.reviewDates(new Date()).reviewDay]);
  }

  // ───────────────────────────────────────────── shared pieces
  function header({ caption = "Un bloque cada vez", titleHTML, range = null, sel = null }) {
    const back = range && sel && sel !== today ? `<a class="chip chip-link" href="#/hoy">Volver a hoy</a>` : "";
    const seg = range ? `<div class="seg" role="group" aria-label="Vista">${[["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"]]
      .map(([k, l]) => `<button type="button" data-range="${k}" aria-pressed="${k === range}">${l}</button>`).join("")}</div>` : "";
    const actions = range ? `<div class="vh-actions"><button type="button" id="btnNewTask" class="btn btn-primary btn-new" aria-label="Nueva tarea">${ICON.plus}<span class="lbl">Tarea</span></button>
      <div class="menu-wrap"><button type="button" class="btn-icon framed" id="btnMenu" aria-haspopup="menu" aria-expanded="false" aria-controls="hdrMenu" aria-label="Más acciones">${ICON.more}</button>
      <div class="menu" id="hdrMenu" role="menu" hidden>
        <button type="button" role="menuitem" data-action="ics-day">Exportar día (.ics)</button>
        <button type="button" role="menuitem" data-action="ics-week">Exportar semana (.ics)</button>
        <button type="button" role="menuitem" data-action="propose">Proponer bloques para este día</button>
        <button type="button" role="menuitem" data-action="review">🌙 Revisión nocturna</button>
      </div></div></div>` : "";
    const right = range ? `<div class="vh-right">${seg}${actions}</div>` : "";
    const demo = L.isDemoState(S) ? ` <a class="chip chip-demo" href="#/ajustes" title="Borra los datos de Ritmo en Ajustes para empezar con los tuyos">Datos de ejemplo</a>` : "";
    return `<header class="vh"><div class="vh-titles"><p class="caption">${esc(caption)}${demo}</p><div class="title-row"><h1 class="title">${titleHTML}</h1>${back}</div></div>${right}</header>`;
  }
  const dayTitle = (iso) => { const tp = L.titleParts(iso); return `<b>${tp.weekday},</b> ${tp.rest}`; };
  const checkBtn = (t, cls = "") => {
    const done = t.status === "done";
    return `<button type="button" class="check ${cls}" data-check="${esc(t.id)}" aria-pressed="${done}" aria-label="Marcar «${esc(t.title)}» como ${done ? "pendiente" : "hecha"}"><span class="ring">${ICON.tick}</span></button>`;
  };
  const blockLabel = (kind) => (kind === "rutina" ? "Rutina" : kind === "fijo" ? "Horario fijo" : L.catLabel(kind));
  const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);
  const mins = (m) => `${L.fmtInt(m)}'`;

  // ───────────────────────────────────────────── view: Hoy
  const expanded = new Set();
  function viewHoy() {
    const sel = route.sel;
    return header({ titleHTML: dayTitle(sel), range: "dia", sel })
      + `<div class="hoy">${weekStrip(sel)}${sel === today ? reviewCta() : ""}<div class="hoy-grid"><div class="col-main">${timelineSection(sel)}${pendingCards(sel)}${minimumsCard(sel)}</div>`
      + `<div class="col-side">${heroCard(sel)}${habitListCard(sel)}${objectivesCard(sel.slice(0, 7))}</div></div></div>`;
  }
  /** Phone-only evening card (the sidebar with #btnReview is hidden below 900 px); updateReviewButton shows it. */
  const reviewCta = () => `<section class="card rv-cta" id="reviewCta" aria-labelledby="rvCtaTitle" hidden><div><p class="review-kicker" id="rvCtaTitle">Cada noche · 5 min</p>`
    + `<p class="review-text">Repasa el día tarea a tarea y deja mañana planificado.</p></div><button type="button" class="btn btn-primary" data-action="review">🌙 Revisión nocturna</button></section>`;
  function weekStrip(sel) {
    const days = L.weekDays(sel);
    const cells = days.map((d, i) => {
      const n = S.tasks.filter((t) => t.date === d && t.status !== "archived").length;
      const isSel = d === sel, isT = d === today;
      return `<button type="button" class="ws-day${isSel ? " is-sel" : ""}${isT ? " is-today" : ""}" data-date="${d}" aria-pressed="${isSel}" aria-label="${esc(L.fmtLong(d))}${isT ? " (hoy)" : ""}: ${n} ${L.plural(n, "tarea", "tareas")}">`
        + `<span class="ws-dn">${L.DAY_SHORT[i]}</span><span class="ws-num">${Number(d.slice(8))}</span><span class="ws-dots" aria-hidden="true">${"<i></i>".repeat(Math.min(n, 4))}</span></button>`;
    }).join("");
    return `<section class="card ws" id="weekStrip" aria-label="Semana"><button type="button" class="ws-nav" data-week="-1" aria-label="Semana anterior">${ICON.chevL}</button>`
      + `<div class="ws-days">${cells}</div><button type="button" class="ws-nav" data-week="1" aria-label="Semana siguiente">${ICON.chevR}</button></section>`;
  }
  function bandsFor() {
    const st = S.settings, P = L.parseHM;
    return [
      { start: P(st.lowFocus[0]), end: P(st.lowFocus[1]), cls: "low", text: `${st.lowFocus[0]} · Poco foco: tareas mecánicas` },
      { start: P(st.bestFocus[0]), end: P(st.bestFocus[1]), cls: "best", text: `${st.bestFocus[0]} · Mejor foco: deep work` },
    ].sort((a, b) => a.start - b.start);
  }
  const nowRow = (m) => `<li id="nowMarker" class="tl-now" data-start="${m}"><span class="tl-now-label">Ahora · ${L.fmtHM(m)}</span></li>`;
  function timelineSection(sel) {
    const { timed, untimed } = L.dayBlocks(S, sel);
    const bands = bandsFor();
    const isT = sel === today;
    const nowMin = isT ? minutesNow() : null;
    const rows = [];
    let bi = 0;
    for (const b of timed) {
      while (bi < bands.length && bands[bi].start <= b.start) { rows.push(bandRow(bands[bi])); bi++; }
      rows.push(blockRow(b, sel, timed, nowMin, bands));
    }
    while (bi < bands.length) rows.push(bandRow(bands[bi++]));
    if (isT) {
      const i = rows.findIndex((r) => Number(/data-start="(\d+)"/.exec(r)[1]) > nowMin);
      rows.splice(i < 0 ? rows.length : i, 0, nowRow(nowMin));
    }
    const hasTasks = timed.some((b) => b.taskId) || untimed.length;
    const planned = L.plannedMinutes(S, sel);
    const empty = hasTasks ? "" : `<p class="tl-empty">Sin bloques. Pulsa «+ Tarea» o haz la revisión nocturna para planificar. <a href="#/ajustes" data-action="goto-demo">¿Ver un día de ejemplo?</a></p>`;
    return `<section class="tl-wrap" aria-labelledby="tlTitle"><div class="sec-h"><h2 id="tlTitle" class="sec-title">Bloques del día</h2>`
      + `<span class="sec-meta">${planned ? L.fmtDur(planned) + " de tareas" : ""}</span></div>${empty}<ol id="timeline" class="timeline">${rows.join("")}</ol></section>`;
  }
  const bandRow = (b) => `<li class="tl-band ${b.cls} band-${b.cls}" data-start="${b.start}"><span class="tl-band-label">${esc(b.text)}</span></li>`;
  function blockRow(b, sel, timed, nowMin, bands) {
    const band = bands.find((x) => b.start < x.end && x.start < b.end);
    const dur = b.end - b.start;
    const isNow = nowMin !== null && b.start <= nowMin && nowMin < b.end;
    const subNormal = `${L.fmtDur(dur)} · ${blockLabel(b.kind)}${b.clipped ? " · sigue tras medianoche" : ""}`;
    const subNow = `Ahora · ${L.fmtDur(dur)}`;
    const sub = `<p class="tl-sub" data-sub="${esc(subNormal)}" data-sub-now="${esc(subNow)}">${esc(isNow ? subNow : subNormal)}</p>`;
    const base = `class="tl-item${band ? " band-" + band.cls : ""}${b.done ? " is-done" : ""}${b.kind === "fijo" ? " tl-fixed" : ""}${b.kind === "rutina" ? " tl-routine" : ""}" data-start="${b.start}" data-end="${b.end}"`;
    const time = `<span class="tl-time">${L.fmtHM(b.start)}</span>`;
    const cardCls = `tl-card cat-${b.kind}${isNow ? " is-now" : ""}`;
    if (b.taskId) {
      const t = taskById(b.taskId);
      const warns = b.done ? [] : L.slotWarnings(b, S.settings, timed);
      return `<li ${base} data-task-id="${esc(t.id)}">${time}<div class="${cardCls}"><div class="tl-main">`
        + `<h3 class="tl-title"><span class="dot" aria-hidden="true"></span><button type="button" class="tl-open" data-open-task="${esc(t.id)}">${esc(t.title)}</button></h3>${sub}`
        + (t.notes ? `<p class="tl-notes">${esc(t.notes)}</p>` : "")
        + (warns.length ? `<div class="tl-warns">${warns.map((w) => `<span class="chip chip-warn">⚠ ${esc(w.text)}</span>`).join("")}</div>` : "")
        + `</div>${checkBtn(t, "tl-check")}</div></li>`;
    }
    if (b.kind === "rutina") {
      const r = routineById(b.routineId);
      const p = L.routineProgress(S, r.id, sel);
      const open = expanded.has(r.id + "|" + sel);
      const future = sel > today;
      const list = open ? `<ul class="rt-list">${r.items.map((it) => {
        const on = ((S.routineLog[sel] || {})[r.id] || []).includes(it.id);
        return `<li><label><input type="checkbox" class="cbx" data-routine="${esc(r.id)}" data-routine-item="${esc(it.id)}" data-iso="${sel}"${on ? " checked" : ""}${future ? " disabled" : ""}><span>${esc(it.text)}</span></label></li>`;
      }).join("")}</ul>` : "";
      return `<li ${base} data-key="${esc(b.key)}">${time}<div class="${cardCls}${open ? " open" : ""}"><div class="tl-main">`
        + `<h3 class="tl-title"><span class="dot" aria-hidden="true"></span><button type="button" class="tl-open" data-routine-expand="${esc(r.id)}" aria-expanded="${open}">${esc(b.title)} · ${p.done}/${p.total}</button>`
        + `${p.complete ? '<span class="chip chip-ok rt-done">✓ completa</span>' : ""}</h3>${sub}${list}</div>`
        + `<span class="tl-chev" aria-hidden="true">${ICON.chevR}</span></div></li>`;
    }
    return `<li ${base} data-key="${esc(b.key)}">${time}<div class="${cardCls}"><div class="tl-main"><h3 class="tl-title"><span class="dot" aria-hidden="true"></span><span>${esc(b.title)}</span></h3>${sub}</div></div></li>`;
  }
  function pendingCards(sel) {
    const { untimed } = L.dayBlocks(S, sel);
    const od = sel === today ? L.overdue(S, today) : [];
    if (!untimed.length && !od.length) return "";
    const un = untimed.length ? `<section class="card" id="untimedCard" aria-labelledby="unTitle"><h2 id="unTitle" class="card-title">Sin hora<span class="count">${untimed.length}</span></h2><ul class="mini-list">${untimed.map((t) =>
      `<li class="cat-${t.category}${t.status === "done" ? " is-done" : ""}">${checkBtn(t)}<span class="mt"><button type="button" class="link-btn" data-open-task="${esc(t.id)}">${esc(t.title)}</button><small><span class="dot cat-${t.category}"></span> ${esc(L.catLabel(t.category))} · ${L.fmtDur(t.durationMin)}</small></span>`
      + (t.status === "done" ? "" : `<span class="acts"><button type="button" class="btn btn-secondary btn-sm" data-action="set-time" data-id="${esc(t.id)}">Poner hora</button></span>`) + `</li>`).join("")}</ul></section>` : "";
    const ov = od.length ? `<section class="card" id="overdueCard" aria-labelledby="odTitle"><h2 id="odTitle" class="card-title">Atrasadas<span class="count">${od.length}</span></h2><ul class="mini-list">${od.map((t) =>
      `<li><span class="mt"><button type="button" class="link-btn" data-open-task="${esc(t.id)}">${esc(t.title)}</button><small><span class="dot cat-${t.category}"></span> ${esc(L.catLabel(t.category))} · ${esc(L.fmtShort(t.date))}</small></span>`
      + `<span class="acts"><button type="button" class="btn btn-secondary btn-sm" data-action="to-today" data-id="${esc(t.id)}">Pasar a hoy</button><button type="button" class="btn btn-ghost btn-sm" data-action="archive" data-id="${esc(t.id)}">Archivar</button></span></li>`).join("")}</ul></section>` : "";
    return `<div class="pair">${un}${ov}</div>`;
  }
  function heroCard(sel) {
    const n = R.habits.length, goal = S.settings.habitGoal;
    const score = R.inv ? 0 : L.dayScore(R.hd, sel, n);
    const wp = R.inv ? null : L.weekPct(R.hd, sel, n);
    const mean = R.inv ? 0 : L.weekMean(R.hd, sel, n);
    const label = sel === today ? "Hábitos de hoy" : `Hábitos del ${L.fmtShort(sel)}`;
    return `<section class="hero" id="habitsCard" aria-labelledby="heroLbl"><div class="hero-top"><h2 id="heroLbl" class="hero-lbl">${esc(label)}</h2>`
      + `<span class="chip chip-dark">${wp === null ? "sin datos válidos" : `${wp} % esta semana`}</span></div>`
      + `<p class="hero-kpi" id="habitsToday">${R.inv ? "—" : score}<span class="den"> / ${n}</span></p>`
      + `<div class="hero-bar" role="progressbar" aria-label="Hábitos hechos" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${score}"><span style="width:${pct(score, n)}%"></span><i class="goal" style="left:${pct(goal, n)}%" title="Objetivo"></i></div>`
      + `<p class="hero-sub">Objetivo ${L.fmtDec(goal, 1)} · media de la semana ${L.fmtDec(mean, 1)}</p></section>`;
  }
  function habitListCard(sel) {
    const future = sel > today;
    const rows = R.habits.map((name, h) => {
      const on = !R.inv && L.isTicked(R.hd, sel, h);
      const l7 = R.inv ? [0, 0, 0, 0, 0, 0, 0].map(() => false) : L.last7(R.hd, sel, h);
      const n7 = l7.filter(Boolean).length;
      return `<li class="hb-row"><div class="hb-main"><span class="hb-name">${esc(name)}</span><span class="seg7" role="img" aria-label="Últimos 7 días: ${n7} de 7">${l7.map((x) => `<i${x ? ' class="on"' : ""}></i>`).join("")}</span></div>`
        + `<button type="button" class="check" data-habit="${h}" aria-pressed="${on}" aria-label="Marcar ${esc(name)}"${future || R.inv ? " disabled" : ""}><span class="ring">${ICON.tick}</span></button></li>`;
    }).join("");
    const score = R.inv ? 0 : L.dayScore(R.hd, sel, R.habits.length);
    return `<section class="card" id="habitListCard" aria-labelledby="hbTitle"><div class="card-h"><h2 id="hbTitle" class="card-title">${sel === today ? "Tus hábitos" : "Hábitos del " + esc(L.fmtShort(sel))}</h2>`
      + `<span class="muted num">${future ? "día futuro" : `${score} de ${R.habits.length}`}</span></div><ul id="habitList" class="hb-list">${rows}</ul>`
      + `<a class="card-foot-link" href="../15-habitos/app/index.html">Abrir hoja completa en 15-hábitos →</a></section>`;
  }
  function sportStatusFor(sel) {
    const st = S.settings, days = L.weekDays(sel);
    const sp = sportCalc(days.filter((d) => d <= today));
    const total = sp.total;
    let cls, text;
    if (days[6] < today) {
      cls = total >= st.sportFloor ? "st-suelo" : "st-riesgo";
      text = total >= st.sportStandard ? "Estándar cumplido 💪" : total >= st.sportFloor ? "Suelo cumplido" : `Semana cerrada: ${total} de ${st.sportFloor}`;
    } else {
      const ref = days[0] > today ? days[0] : today;
      const fs = L.floorStatus(total, ref, st.sportFloor, st.sportStandard);
      cls = "st-" + fs.state;
      text = fs.state === "estandar" ? "Estándar cumplido 💪" : fs.state === "suelo" ? "Suelo cumplido"
        : fs.state === "falta" ? `${L.plural(fs.need, "Falta 1", `Faltan ${fs.need}`)} para el suelo` : `⚠ Suelo en riesgo: ${L.plural(fs.daysLeft, "queda 1 día", `quedan ${fs.daysLeft} días`)}`;
    }
    return { sp, total, cls, text };
  }
  function minimumsCard(sel) {
    const st = S.settings;
    const { sp, total, cls, text } = sportStatusFor(sel);
    const max = Math.max(st.sportStandard + 1, total);
    const srcNames = [sp.sources.habit && "Hábitos", sp.sources.gym && "Gym Tracker", sp.sources.runs && "Paso", sp.sources.ritmo && "Ritmo"].filter(Boolean);
    const fr = L.frenchStatus(frSrc(), sel, st);
    const need = sel < fr.start ? fr.floor : fr.floor + fr.owed;
    const frDone = fr.doneToday >= need;
    const frText = frDone ? (fr.doneToday >= Math.max(need, fr.standard) ? "Estándar cumplido 💪" : "✓ Suelo cumplido") : `Te quedan ${mins(need - fr.doneToday)}`;
    return `<section class="card" id="minimums" aria-labelledby="minTitle"><div class="card-h"><h2 id="minTitle" class="card-title">Mínimos innegociables</h2></div><div class="min-grid">`
      + `<div class="min-block"><p id="sportCount" class="min-title">Deporte esta semana: <b>${total} de ${st.sportFloor}</b> (suelo) · ${st.sportStandard} estándar</p>`
      + `<div class="meter" role="img" aria-label="${total} sesiones; suelo ${st.sportFloor}, estándar ${st.sportStandard}"><span style="width:${pct(total, max)}%"></span>`
      + `<i class="mark" style="left:${pct(st.sportFloor, max)}%"><b>${st.sportFloor}</b></i><i class="mark" style="left:${pct(st.sportStandard, max)}%"><b>${st.sportStandard}</b></i></div>`
      + `<p class="status ${cls}">${esc(text)}</p><p class="src">Fuentes: ${srcNames.join(" · ")}</p></div>`
      + `<div class="min-block"><p id="frenchToday" class="min-title">Francés ${sel === today ? "hoy" : "el " + esc(L.fmtShort(sel))}: <b>${mins(need)}</b> (${fr.floor} suelo + ${sel < fr.start ? 0 : fr.owed} pendientes) · hecho ${mins(fr.doneToday)}</p>`
      + `<div class="meter" role="img" aria-label="Hecho ${fr.doneToday} de ${need} minutos"><span style="width:${pct(fr.doneToday, need || 1)}%"></span></div>`
      + `<p class="status ${frDone ? "st-ok" : "st-falta"}">${esc(frText)}</p>`
      + `<p class="src">Fuente: ${fr.source === "idiomas" ? "21-idiomas" : "tareas de Ritmo"} · <a href="../21-idiomas-plan/index.html">Registrar en Idiomas</a></p></div></div></section>`;
  }
  function objectivesCard(ym) {
    const ob = L.objectivesOf(R.hd, ym);
    const n = ob.filter((o) => o.done).length;
    const dis = R.inv ? " disabled" : "";
    return `<section class="card" id="monthObjectives" aria-labelledby="objTitle"><h2 id="objTitle" class="card-title">🎯 3 objetivos del mes (${n}/3)</h2>`
      + (ym !== today.slice(0, 7) ? `<p class="card-sub">${esc(L.fmtMonth(ym))}</p>` : "")
      + ob.map((o, i) => `<div class="obj-row${o.done ? " is-done" : ""}"><input type="checkbox" class="cbx" data-obj-done="${i}" data-ym="${ym}"${o.done ? " checked" : ""} aria-label="Objetivo ${i + 1} cumplido"${dis}>`
        + `<input type="text" data-obj-text="${i}" data-ym="${ym}" value="${esc(o.text)}" placeholder="Objetivo ${i + 1}" aria-label="Objetivo ${i + 1}" maxlength="300"${dis}></div>`).join("")
      + `</section>`;
  }
  function positionNow() {
    const tl = $("#timeline"), mk = $("#nowMarker");
    if (!tl) return;
    if (!mk) { markBandRuns(tl); return; }
    const m = minutesNow();
    mk.dataset.start = String(m);
    mk.querySelector(".tl-now-label").textContent = "Ahora · " + L.fmtHM(m);
    const next = $$(":scope > li:not(#nowMarker)", tl).find((li) => Number(li.dataset.start) > m);
    if (next) { if (mk.nextElementSibling !== next) tl.insertBefore(mk, next); } else if (tl.lastElementChild !== mk) tl.appendChild(mk);
    for (const li of $$(":scope > li.tl-item", tl)) {
      const s = Number(li.dataset.start), e = Number(li.dataset.end), now = s <= m && m < e;
      const card = li.querySelector(".tl-card"), sub = li.querySelector(".tl-sub");
      if (card) card.classList.toggle("is-now", now);
      if (sub) sub.textContent = now ? sub.dataset.subNow : sub.dataset.sub;
    }
    const inBand = bandsFor().find((x) => m >= x.start && m < x.end);
    mk.classList.remove("band-low", "band-best");
    if (inBand) mk.classList.add("band-" + inBand.cls);
    markBandRuns(tl);
  }
  /** Rounds the first/last row of each contiguous focus-band region. */
  function markBandRuns(tl) {
    const lis = $$(":scope > li", tl);
    const bandOf = (el) => (!el ? null : el.classList.contains("band-best") ? "best" : el.classList.contains("band-low") ? "low" : null);
    lis.forEach((li, i) => {
      const b = bandOf(li);
      li.classList.toggle("band-first", !!b && bandOf(lis[i - 1]) !== b);
      li.classList.toggle("band-last", !!b && bandOf(lis[i + 1]) !== b);
    });
  }

  // ───────────────────────────────────────────── view: Semana
  function viewSemana() {
    const sel = route.sel, days = L.weekDays(sel), mon = days[0], sun = days[6], st = S.settings;
    const sameMonth = mon.slice(0, 7) === sun.slice(0, 7);
    const titleHTML = `<b>Semana,</b> ${sameMonth ? `${Number(mon.slice(8))}–${L.fmtDayMonth(sun)}` : `${L.fmtShort(mon)} – ${L.fmtShort(sun)}`}`;
    const { total, text } = sportStatusFor(sel);
    const frMin = L.frenchMinutesInRange(frSrc(), st, mon, sun);
    const frGoal = st.frenchFloorMin * 7;
    const hDays = days.filter((d) => d <= today);
    const hMean = !R.inv && hDays.length ? hDays.reduce((a, d) => a + L.dayScore(R.hd, d, R.habits.length), 0) / hDays.length : 0;
    const wk = S.tasks.filter((t) => t.date && t.date >= mon && t.date <= sun && t.status !== "archived");
    const done = wk.filter((t) => t.status === "done").length;
    const kpi = (label, value, den, note) => `<div class="card kpi-card"><span class="kpi-label">${label}</span><span class="kpi">${value}<span class="den">${den}</span></span><span class="kpi-note">${esc(note)}</span></div>`;
    const cols = days.map((d, i) => {
      const blocks = L.dayBlocks(S, d);
      const items = blocks.timed.filter((b) => b.kind !== "rutina").map((b) => `<li class="${b.done ? "done" : ""}${b.kind === "fijo" ? " fixed" : ""}"><span class="wt">${L.fmtHM(b.start)}–${L.fmtHM(b.end)}</span>`
        + `<span class="wn"><span class="dot cat-${b.kind}" aria-hidden="true"></span>${b.done ? '<span aria-label="hecha">✓</span>' : ""}<span>${esc(b.title)}</span></span></li>`)
        .concat(blocks.untimed.map((t) => `<li class="${t.status === "done" ? "done" : ""}"><span class="wt">sin hora</span><span class="wn"><span class="dot cat-${t.category}" aria-hidden="true"></span>${t.status === "done" ? "<span>✓</span>" : ""}<span>${esc(t.title)}</span></span></li>`));
      const score = R.inv || d > today ? null : L.dayScore(R.hd, d, R.habits.length);
      const planned = L.plannedMinutes(S, d);
      return `<section class="card week-col${d === today ? " is-today" : ""}" aria-label="${esc(L.fmtLong(d))}"><button type="button" class="wc-h" data-date="${d}" aria-label="Abrir ${esc(L.fmtLong(d))}">`
        + `<span class="wc-day">${L.DAY_SHORT[i]} ${Number(d.slice(8))}</span>${score === null ? "" : `<span class="chip${score >= st.habitGoal ? " chip-ok" : ""}">${score}/${R.habits.length}</span>`}</button>`
        + (items.length ? `<ul class="wc-blocks">${items.join("")}</ul>` : `<p class="wc-empty">Sin tareas</p>`)
        + `<p class="wc-foot">${planned ? L.fmtDur(planned) + " planificadas" : "Nada planificado"}</p></section>`;
    }).join("");
    return header({ titleHTML, range: "semana", sel })
      + `<div class="kpis">${kpi("Deporte", total, ` / ${st.sportFloor}·${st.sportStandard}`, text)}${kpi("Francés", L.fmtInt(frMin), "' / " + L.fmtInt(frGoal) + "'", `Suelo semanal ${frGoal}' (${st.frenchFloorMin}' × 7)`)}`
      + `${kpi("Hábitos", R.inv ? "—" : L.fmtDec(hMean, 1), " / " + L.fmtDec(st.habitGoal, 1), "Media diaria de la semana")}${kpi("Tareas", done, " / " + wk.length, "Hechas esta semana")}</div>`
      + `<div class="toolbar"><button type="button" class="btn btn-secondary btn-sm" data-week="-1">‹ Semana anterior</button><button type="button" class="btn btn-secondary btn-sm" data-action="this-week">Esta semana</button>`
      + `<button type="button" class="btn btn-secondary btn-sm" data-week="1">Siguiente ›</button><span class="grow"></span><button type="button" class="btn btn-ghost btn-sm" data-action="ics-week">Exportar semana (.ics)</button></div>`
      + `<div class="week-grid">${cols}</div>`;
  }

  // ───────────────────────────────────────────── view: Mes
  function viewMes() {
    const ym = route.month, g = L.monthGrid(ym), n = R.habits.length, goal = S.settings.habitGoal;
    const y = ym.slice(0, 4);
    const ms = R.inv ? null : L.monthStats(R.hd, ym, today, goal);
    const cells = [];
    for (let i = 0; i < g.offset; i++) cells.push(`<div class="cal-blank" aria-hidden="true"></div>`);
    for (let d = 1; d <= g.days; d++) {
      const iso = `${ym}-${String(d).padStart(2, "0")}`;
      const future = iso > today;
      const score = R.inv ? 0 : L.dayScore(R.hd, iso, n);
      const lvl = future || R.inv ? null : L.heatLevel(score, n, goal);
      const tasks = S.tasks.filter((t) => t.date === iso && t.status !== "archived");
      const due = S.tasks.some((t) => t.category === "entrega" && t.due === iso && t.status !== "archived");
      const cats = [...new Set(tasks.map((t) => t.category))];
      const dots = tasks.slice(0, 3).map((t) => `<span class="dot cat-${t.category}"></span>`).join("") + (tasks.length > 3 ? `<span>+${tasks.length - 3}</span>` : "");
      const aria = `${L.fmtDayMonth(iso)}: ${future ? "día futuro" : `${score} de ${n} hábitos`}, ${tasks.length} ${L.plural(tasks.length, "tarea", "tareas")}${due ? ", entrega" : ""}`;
      cells.push(`<button type="button" class="cal-cell${lvl === null ? " future" : " h" + lvl}${iso === today ? " is-today" : ""}" data-date="${iso}" aria-label="${esc(aria)}" data-cats="${cats.join(" ")}">`
        + `<span class="cd">${d}</span>${due ? '<span class="flag" aria-hidden="true">⚑</span>' : ""}<span class="cdots" aria-hidden="true">${dots}</span></button>`);
    }
    const legend = `<div class="legend" aria-hidden="true">Menos <i style="background:var(--heat-0)"></i><i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i> Más · ⚑ entrega</div>`;
    const stat = ms ? `<p class="stat-line">Media <b>${L.fmtDec(ms.mean, 1)}</b> · <b>${ms.daysOnGoal}</b> de ${ms.days} días ≥ ${L.fmtDec(goal, 1)}</p>` : `<p class="stat-line">Sin datos de hábitos válidos.</p>`;
    return header({ titleHTML: `<b>${esc(L.fmtMonth(ym).split(" ")[0])}</b> ${y}`, range: "mes", sel: route.sel })
      + `<div class="mes-top">${objectivesCard(ym)}`
      + `<section class="card"><h2 class="card-title">Hábitos del mes</h2>${stat}<div class="toolbar" style="margin:14px 0 0"><button type="button" class="btn btn-secondary btn-sm" data-month="-1">‹ Mes anterior</button>`
      + `<button type="button" class="btn btn-secondary btn-sm" data-month="0">Este mes</button><button type="button" class="btn btn-secondary btn-sm" data-month="1">Siguiente ›</button></div>${legend}</section></div>`
      + `<section class="card cal" aria-label="Calendario de ${esc(L.fmtMonth(ym))}"><div class="cal-head" aria-hidden="true">${L.DAY_LETTERS.map((x) => `<span>${x}</span>`).join("")}</div><div class="cal-grid" id="calGrid">${cells.join("")}</div></section>`;
  }

  // ───────────────────────────────────────────── charts (hand-drawn SVG)
  /* Charts are drawn at the measured width of their slot, so text keeps its real size on every screen. */
  const chartSpecs = new Map();
  function barChart(spec) {
    chartSpecs.set(spec.id, spec);
    return `<div class="chart-slot" data-slot="${spec.id}">${chartSVG(spec, 320)}</div>`;
  }
  function chartSVG({ id, values, labels, refs = [], aria, highlight = null, showValues = false, fmt = (v) => String(v) }, width) {
    const W = Math.max(240, Math.round(width)), H = W < 420 ? 150 : 170;
    const padL = 2, padR = refs.length ? 46 : 4, padT = showValues ? 18 : 10, padB = 22;
    const max = Math.max(1, ...values, ...refs.map((r) => r.v)) * 1.06;
    const iw = W - padL - padR, ih = H - padT - padB, n = values.length;
    const bw = iw / n, gap = Math.max(2, Math.min(10, bw * 0.3));
    const every = Math.max(1, Math.ceil((Math.max(1, ...labels.map((l) => String(l || "").length)) * 6.6 + 12) / bw));
    const y = (v) => padT + ih - (v / max) * ih;
    let out = `<line class="ch-axis" x1="${padL}" x2="${W - padR}" y1="${padT + ih}" y2="${padT + ih}"/>`;
    values.forEach((v, i) => {
      const x = padL + i * bw + gap / 2, w = bw - gap, h = Math.max(v > 0 ? 2 : 0, (v / max) * ih), cx = (x + w / 2).toFixed(1);
      const cls = i === highlight ? "ch-bar cur" : refs.length && v >= refs[0].v ? "ch-bar hit" : "ch-bar";
      out += `<rect class="${cls}" x="${x.toFixed(1)}" y="${(padT + ih - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, w / 3).toFixed(1)}"/>`;
      if (showValues && v > 0 && w >= 14) out += `<text class="ch-v" x="${cx}" y="${(padT + ih - h - 4).toFixed(1)}" text-anchor="middle">${esc(fmt(v))}</text>`;
      if (labels[i] && (n - 1 - i) % every === 0) out += `<text class="ch-t" x="${cx}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text>`;
    });
    for (const r of refs) {
      const yy = y(r.v).toFixed(1);
      out += `<line class="ch-ref${r.strong ? " strong" : ""}" x1="${padL}" x2="${W - padR + 2}" y1="${yy}" y2="${yy}"/><text class="ch-rl${r.strong ? " strong" : ""}" x="${W - padR + 6}" y="${(Number(yy) + 3.5).toFixed(1)}">${esc(r.label)}</text>`;
    }
    return `<svg data-chart="${id}" role="img" aria-label="${esc(aria)}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out}</svg>`;
  }
  function drawCharts() {
    for (const slot of $$(".chart-slot")) {
      const spec = chartSpecs.get(slot.dataset.slot);
      const w = slot.clientWidth;
      if (spec && w && Math.abs(w - Number(slot.dataset.w || 0)) > 1) { slot.innerHTML = chartSVG(spec, w); slot.dataset.w = String(w); }
    }
  }
  let resizeRaf = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(drawCharts); });
  function last8Weeks() { const w0 = L.weekStart(today); return [7, 6, 5, 4, 3, 2, 1, 0].map((k) => L.addDays(w0, -7 * k)); }
  function habitScoreChart(nDays, id) {
    const goal = S.settings.habitGoal, n = R.habits.length;
    const days = []; for (let i = nDays - 1; i >= 0; i--) days.push(L.addDays(today, -i));
    const vals = days.map((d) => (R.inv ? 0 : L.dayScore(R.hd, d, n)));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length, hits = vals.filter((v) => v >= goal).length;
    const summary = `Media ${L.fmtDec(mean, 1)} · ${hits}/${nDays} días ≥ ${L.fmtDec(goal, 1)}`;
    const labels = days.map((d) => String(Number(d.slice(8))));
    return { svg: barChart({ id, values: vals, labels, refs: [{ v: goal, label: L.fmtDec(goal, 1), strong: true }], aria: `Puntuación diaria de hábitos, últimos ${nDays} días. ${summary}`, highlight: nDays - 1 }), summary };
  }

  // ───────────────────────────────────────────── view: Hábitos
  function viewHabitos() {
    const n = R.habits.length;
    const rows = R.habits.map((name, h) => {
      const on = !R.inv && L.isTicked(R.hd, today, h);
      const l7 = R.inv ? Array(7).fill(false) : L.last7(R.hd, today, h);
      const s = R.inv ? 0 : L.streak(R.hd, today, h), p30 = R.inv ? 0 : L.habitPct(R.hd, today, h, 30);
      return `<tr><td class="name"><span class="hb-name">${esc(name)}</span><span class="seg7" role="img" aria-label="Últimos 7 días: ${l7.filter(Boolean).length} de 7">${l7.map((x) => `<i${x ? ' class="on"' : ""}></i>`).join("")}</span></td>`
        + `<td class="n"><span aria-hidden="true">🔥</span> ${s} <span class="sr">días seguidos</span></td><td class="n">${p30} %</td><td class="c"><button type="button" class="check" data-habit="${h}" aria-pressed="${on}" aria-label="Marcar ${esc(name)}"${R.inv ? " disabled" : ""}><span class="ring">${ICON.tick}</span></button></td></tr>`;
    }).join("");
    const weak = R.inv ? null : L.weakest(R.hd, today, 1)[0];
    const chart = habitScoreChart(14, "habitos14");
    const routines = S.routines.map((r) => routineCard(r, today)).join("");
    return header({ caption: "Rutinas y progreso, sin saltar entre apps", titleHTML: "<b>Hábitos</b>" })
      + `<div class="grid-hab"><div class="stack"><section class="card" aria-labelledby="htTitle"><div class="card-h"><h2 id="htTitle" class="card-title">Hoy · ${L.dayScore(R.hd, today, n)} de ${n}</h2><a class="text-link" href="../15-habitos/app/index.html">Hoja completa →</a></div>`
      + `<div class="table-wrap"><table class="ht"><thead><tr><th>Hábito · últimos 7 días</th><th>Racha</th><th>30 días</th><th class="c"><span class="sr">Hoy</span></th></tr></thead><tbody id="habitList">${rows}</tbody></table></div></section>`
      + `<section class="card chart-card"><figure><h2 class="card-title">Últimos 14 días</h2><figcaption>${esc(chart.summary)}</figcaption>${chart.svg}</figure></section></div>`
      + `<div class="stack">${heroCard(today)}<section class="card" aria-labelledby="wkTitle"><h2 id="wkTitle" class="card-title">Hábito más flojo (últimos 7 días)</h2>`
      + (weak ? `<p class="weak-name">${esc(weak.name)} <span class="muted num">· ${weak.pct} %</span></p><p class="tip">💡 ${esc(L.tipFor(weak.name))}</p>` : `<p class="tip">Sin datos válidos.</p>`)
      + `</section>${routines}</div></div>`;
  }
  function routineCard(r, iso) {
    const p = L.routineProgress(S, r.id, iso), s = L.routineStreak(S, r.id, iso);
    const log = (S.routineLog[iso] || {})[r.id] || [];
    return `<section class="card rt-card" aria-labelledby="rt-${esc(r.id)}"><div class="card-h"><h2 id="rt-${esc(r.id)}" class="card-title">${/noche/i.test(r.name) ? "🌙" : "☀️"} ${esc(r.name)} · ${esc(r.time)}</h2>`
      + `<span class="rt-progress${p.complete ? " complete" : ""}">${p.complete ? "✓ " : ""}${p.done}/${p.total}</span></div>`
      + `<ul class="rt-list" style="margin-left:0">${r.items.map((it) => `<li><label><input type="checkbox" class="cbx" data-routine="${esc(r.id)}" data-routine-item="${esc(it.id)}" data-iso="${iso}"${log.includes(it.id) ? " checked" : ""}><span>${esc(it.text)}</span></label></li>`).join("")}</ul>`
      + `<p class="rt-streak">Racha actual <b>${s.current}</b> · mejor ${s.best}</p><a class="card-foot-link" href="#/rutina/${encodeURIComponent(r.id)}">Editar rutina →</a></section>`;
  }

  // ───────────────────────────────────────────── view: Rutina
  function viewRutina() {
    const r = routineById(route.id);
    if (!r) return header({ caption: "Rutinas", titleHTML: "<b>Rutina</b> no encontrada" }) + `<section class="card"><p>Esa rutina no existe. <a class="text-link" href="#/habitos">Volver a Hábitos</a></p></section>`;
    const p = L.routineProgress(S, r.id, today), s = L.routineStreak(S, r.id, today);
    const log = (S.routineLog[today] || {})[r.id] || [];
    const days = []; for (let i = 13; i >= 0; i--) days.push(L.addDays(today, -i));
    const dots = days.map((d) => { const q = L.routineProgress(S, r.id, d); return `<span class="${q.complete ? "full" : q.done ? "part" : ""}" title="${esc(L.fmtShort(d))}: ${q.done}/${q.total}"></span>`; }).join("");
    const habitOpts = `<option value="">No marcar ningún hábito</option>` + R.habits.map((h, i) => `<option value="${i}"${r.habitIndex === i ? " selected" : ""}>${esc(h)}</option>`).join("");
    const n = r.items.length;
    return header({ caption: "Rutina", titleHTML: `<b>${esc(r.name)}</b> · ${esc(r.time)}` })
      + `<div class="grid-hab even"><div class="stack"><section class="card" aria-labelledby="rtToday"><div class="card-h"><h2 id="rtToday" class="card-title">Hoy · ${p.done}/${p.total}</h2>${p.complete ? '<span class="chip chip-ok">✓ Completa</span>' : ""}</div>`
      + `<ul class="rt-list" style="margin-left:0">${r.items.map((it) => `<li><label><input type="checkbox" class="cbx" data-routine="${esc(r.id)}" data-routine-item="${esc(it.id)}" data-iso="${today}"${log.includes(it.id) ? " checked" : ""}><span>${esc(it.text)}</span></label></li>`).join("") || '<li class="muted">Añade el primer paso abajo.</li>'}</ul>`
      + `<p class="rt-streak" style="margin-top:12px">Racha actual <b>${s.current}</b> · mejor ${s.best}</p><div class="days14" role="img" aria-label="Últimos 14 días: ${days.filter((d) => L.routineProgress(S, r.id, d).complete).length} completos">${dots}</div>`
      + `<div class="days14-l" aria-hidden="true"><span>${esc(L.fmtShort(days[0]))}</span><span>hoy</span></div></section></div>`
      + `<div class="stack"><section class="card" aria-labelledby="rtEdit"><h2 id="rtEdit" class="card-title">Editar</h2><p class="card-sub" style="margin-bottom:12px">Los cambios se guardan solos.</p>`
      + `<ul class="ed-list">${r.items.map((it, i) => `<li><input type="text" data-ri="${esc(it.id)}" data-routine="${esc(r.id)}" value="${esc(it.text)}" aria-label="Paso ${i + 1}" maxlength="200">`
        + `<button type="button" class="btn-icon" data-action="ri-up" data-routine="${esc(r.id)}" data-id="${esc(it.id)}" aria-label="Subir «${esc(it.text)}»"${i === 0 ? " disabled" : ""}>${ICON.up}</button>`
        + `<button type="button" class="btn-icon" data-action="ri-down" data-routine="${esc(r.id)}" data-id="${esc(it.id)}" aria-label="Bajar «${esc(it.text)}»"${i === n - 1 ? " disabled" : ""}>${ICON.down}</button>`
        + `<button type="button" class="btn-icon" data-action="ri-del" data-routine="${esc(r.id)}" data-id="${esc(it.id)}" aria-label="Quitar «${esc(it.text)}»">${ICON.close}</button></li>`).join("")}</ul>`
      + `<form class="ed-add" data-form="ri-add" data-routine="${esc(r.id)}"><input type="text" id="riNew" placeholder="Nuevo paso…" aria-label="Nuevo paso" maxlength="200"><button type="submit" class="btn btn-secondary">Añadir</button></form>`
      + `<div class="form-grid" style="margin-top:16px"><label class="field"><span class="field-l">Hora</span><input type="time" data-rt-field="time" data-routine="${esc(r.id)}" value="${esc(r.time)}"></label>`
      + `<label class="field"><span class="field-l">Duración (min)</span><input type="number" min="5" max="240" step="5" data-rt-field="durationMin" data-routine="${esc(r.id)}" value="${r.durationMin}"></label>`
      + `<label class="field" style="grid-column:1/-1"><span class="field-l">Marca también el hábito</span><select data-rt-field="habitIndex" data-routine="${esc(r.id)}">${habitOpts}</select></label></div>`
      + `<p class="inline-err" id="rtErr" hidden></p></section></div></div>`;
  }

  // ───────────────────────────────────────────── view: Progreso (+ Mis apps)
  function viewProgreso() {
    const st = S.settings, weeks = last8Weeks();
    const wl = weeks.map((w) => `${Number(w.slice(8))} ${L.MONTH_SHORT[Number(w.slice(5, 7)) - 1]}`);
    const hab = habitScoreChart(30, "habitos");
    const sport = weeks.map((w) => sportCalc(L.weekDays(w).filter((d) => d <= today)).total);
    const fr = weeks.map((w) => L.frenchMinutesInRange(frSrc(), st, w, L.addDays(w, 6)));
    const tasks = weeks.map((w) => S.tasks.filter((t) => t.status === "done" && t.doneOn && t.doneOn >= w && t.doneOn <= L.addDays(w, 6)).length);
    const sportHits = sport.filter((v) => v >= st.sportFloor).length;
    const frGoal = st.frenchFloorMin * 7, frStd = st.frenchStandardMin * 7;
    const chartCard = (title, sub, svgHTML) => `<section class="card chart-card"><figure><h2 class="card-title">${title}</h2><figcaption>${esc(sub)}</figcaption>${svgHTML}</figure></section>`;
    return header({ caption: "Las últimas semanas de un vistazo", titleHTML: "<b>Progreso</b>" })
      + `<div class="charts">`
      + chartCard("Hábitos · 30 días", hab.summary, hab.svg)
      + chartCard("Deporte por semana", `${sportHits}/8 semanas con el suelo (${st.sportFloor}) · estándar ${st.sportStandard}`,
        barChart({ id: "deporte", values: sport, labels: wl, refs: [{ v: st.sportFloor, label: "suelo" }, { v: st.sportStandard, label: "estánd.", strong: true }], aria: `Sesiones de deporte por semana, 8 semanas: ${sport.join(", ")}. ${sportHits} de 8 semanas llegan al suelo de ${st.sportFloor}.`, highlight: 7, showValues: true }))
      + chartCard("Francés por semana (min)", `Suelo ${L.fmtInt(frGoal)}' · estándar ${L.fmtInt(frStd)}' · fuente: ${R.idi ? "21-idiomas" : "tareas de Ritmo"}`,
        barChart({ id: "frances", values: fr, labels: wl, refs: [{ v: frGoal, label: L.fmtInt(frGoal) }, { v: frStd, label: L.fmtInt(frStd), strong: true }], aria: `Minutos de francés por semana, 8 semanas: ${fr.join(", ")}. Suelo ${frGoal}, estándar ${frStd}.`, highlight: 7, showValues: true, fmt: (v) => L.fmtInt(v) }))
      + chartCard("Tareas hechas por semana", `${tasks.reduce((a, b) => a + b, 0)} en 8 semanas · esta semana ${tasks[7]}`,
        barChart({ id: "tareas", values: tasks, labels: wl, aria: `Tareas hechas por semana, 8 semanas: ${tasks.join(", ")}.`, highlight: 7, showValues: true }))
      + `</div>` + appsPanel();
  }
  function appsPanel() {
    const card = (app, icon, name, href, inner) => `<section class="card app-card${inner ? "" : " missing"}" data-app="${app}"><div class="app-h"><span class="app-ic" aria-hidden="true">${icon}</span><h3 class="app-name">${name}</h3></div>`
      + (inner || `<p class="app-line">Sin datos en este navegador</p>`) + `<a class="btn btn-secondary btn-sm open" href="${href}">Abrir</a></section>`;
    const st = S.settings;
    let gym = "";
    if (R.gym) gym = `<p class="app-main">${R.gym.thisWeek} ${L.plural(R.gym.thisWeek, "sesión", "sesiones")} esta semana</p><p class="app-line">${R.gym.last ? `Última: ${esc(L.fmtShort(R.gym.last.date))} · ${esc(R.gym.last.name)}` : "Aún sin sesiones"}</p>`;
    let idi = "";
    if (R.idi) {
      const fs = L.frenchStatus({ idiomas: R.idi, tasks: [] }, today, st);
      const w = L.frenchMinutesInRange({ idiomas: R.idi }, st, L.weekStart(today), today);
      const totalMin = R.idi.log.filter((e) => e.lang === "fr" && e.type !== "extra").reduce((a, e) => a + (Number(e.minutes) || 0), 0);
      const base = Number(R.idi.base.fr) || 0;
      idi = `<p class="app-main">${L.fmtInt(w)}' de francés esta semana</p><p class="app-line">Hoy toca ${fs.todayRequired}' · ${L.fmtDec(totalMin / 60 + base, 1)} h en total${base ? ` (incl. ${L.fmtDec(base, 0)} h previas)` : ""}</p>`;
    }
    let fin = "";
    if (R.fin) fin = R.fin.goals.length ? R.fin.goals.map((g) => `<div class="app-goal"><p class="app-line"><b>${esc(g.name)}</b> · ${Math.round(g.pct * 100)} %</p><div class="meter" role="img" aria-label="${Math.round(g.pct * 100)} %"><span style="width:${g.pct * 100}%"></span></div><p class="app-line">${L.fmtInt(g.saved)} € de ${L.fmtInt(g.target)} €</p></div>`).join("") : `<p class="app-line">Sin metas de ahorro</p>`;
    let paso = "";
    if (R.paso) paso = `<p class="app-main">${L.fmtInt(R.paso.stepsToday)} / ${L.fmtInt(R.paso.goal)} pasos</p><p class="app-line">${R.paso.pct} % del objetivo · comidas ${R.paso.meals}/4</p>`;
    let hab = "";
    if (R.hr.status === "ok") { const ms = L.monthStats(R.hd, today.slice(0, 7), today, st.habitGoal); hab = `<p class="app-main">Media del mes ${L.fmtDec(ms.mean, 1)} / ${L.fmtDec(st.habitGoal, 1)}</p><p class="app-line">${ms.daysOnGoal} de ${ms.days} días en objetivo</p>`; }
    return `<section id="appsPanel" aria-labelledby="appsTitle"><div class="sec-h" style="margin-top:8px"><h2 id="appsTitle" class="sec-title">Mis apps</h2></div><div class="apps">`
      + card("gym", "🏋️", "Gym Tracker", "../10-gym-tracker/index.html", gym)
      + card("idiomas", "🇫🇷", "Idiomas", "../21-idiomas-plan/index.html", idi)
      + card("finanzas", "💶", "Finanzas", "../11-finanzas/index.html", fin)
      + card("paso", "👟", "Paso", "../27-paso/index.html", paso)
      + card("habitos", "✅", "Hábitos", "../15-habitos/app/index.html", hab)
      + `</div><p class="note">La lectura entre apps funciona cuando comparten origen (p. ej. GitHub Pages). En file:// depende del navegador.</p></section>`;
  }

  // ───────────────────────────────────────────── view: Ajustes
  let icsOpts = { includeRoutines: false, includeFixed: false };
  function viewAjustes() {
    const st = S.settings;
    const t = (key, label, val) => `<label class="field"><span class="field-l">${label}</span><input type="time" data-set="${key}" value="${esc(val)}"></label>`;
    const num = (key, label, val, min, max, step = 1) => `<label class="field"><span class="field-l">${label}</span><input type="number" data-set="${key}" value="${val}" min="${min}" max="${max}" step="${step}" inputmode="numeric"></label>`;
    const linkSel = (kind, label) => `<label class="field"><span class="field-l">${label}</span><select data-set="habitLinks.${kind}"><option value="">Sin vincular</option>${R.habits.map((h, i) => `<option value="${i}"${st.habitLinks[kind] === i ? " selected" : ""}>${esc(h)}</option>`).join("")}</select></label>`;
    const fw = st.fixedWeekly.map((f) => `<div class="fw-row" data-fw-row="${esc(f.id)}"><div class="fw-top"><input type="text" data-fw="${esc(f.id)}" data-field="title" value="${esc(f.title)}" aria-label="Nombre del bloque" maxlength="120">`
      + `<button type="button" class="btn-icon" data-action="fw-del" data-id="${esc(f.id)}" aria-label="Borrar «${esc(f.title)}»">${ICON.close}</button></div>`
      + `<div class="fw-days" role="group" aria-label="Días">${L.DAY_LETTERS.map((l, i) => `<label><input type="checkbox" data-fw="${esc(f.id)}" data-field="day" data-day="${i + 1}"${f.days.includes(i + 1) ? " checked" : ""} aria-label="${L.DAY_NAMES[i]}"><span aria-hidden="true">${l}</span></label>`).join("")}</div>`
      + `<div class="fw-times"><label class="field"><span class="field-l">Empieza</span><input type="time" data-fw="${esc(f.id)}" data-field="start" value="${esc(f.start)}"></label><label class="field"><span class="field-l">Termina</span><input type="time" data-fw="${esc(f.id)}" data-field="end" value="${esc(f.end)}"></label></div></div>`).join("");
    const notif = notifState();
    return header({ caption: "Tus franjas, mínimos y datos", titleHTML: "<b>Ajustes</b> y datos" })
      + `<div class="settings">`
      + `<section class="card" data-sec="franjas"><h2>Franjas</h2><p class="card-sub">Tu jornada y las franjas de energía del organizador.</p><div class="sgrid">`
      + t("dayStart", "Empiezo el día", st.dayStart) + t("dayEnd", "Termino el día", st.dayEnd)
      + t("morningTrainEnd", "Entreno de mañana hasta", st.morningTrainEnd) + t("eveningTrainStart", "Entreno de tarde desde", st.eveningTrainStart)
      + t("latestTrainStart", "Última hora para empezar a entrenar", st.latestTrainStart) + `<span></span>`
      + t("bestFocus.0", "Mejor foco desde", st.bestFocus[0]) + t("bestFocus.1", "Mejor foco hasta", st.bestFocus[1])
      + t("lowFocus.0", "Poco foco desde", st.lowFocus[0]) + t("lowFocus.1", "Poco foco hasta", st.lowFocus[1])
      + `</div><p class="inline-err" data-err="franjas" role="alert" hidden></p></section>`
      + `<section class="card" data-sec="minimos"><h2>Mínimos</h2><p class="card-sub">Suelo innegociable y estándar.</p><div class="sgrid">`
      + num("sportFloor", "Deporte: suelo (sesiones/semana)", st.sportFloor, 0, 14) + num("sportStandard", "Deporte: estándar", st.sportStandard, 0, 14)
      + num("sportDurationMin", "Duración de una sesión (min)", st.sportDurationMin, 5, 240, 5)
      + `<label class="field"><span class="field-l">Prefiero entrenar</span><select data-set="trainingPreference"><option value="tarde"${st.trainingPreference === "tarde" ? " selected" : ""}>Tarde (desde ${esc(L.hmHuman(st.eveningTrainStart))})</option><option value="manana"${st.trainingPreference === "manana" ? " selected" : ""}>Mañana (antes de ${esc(L.hmHuman(st.morningTrainEnd))})</option></select></label>`
      + num("frenchFloorMin", "Francés: suelo diario (min)", st.frenchFloorMin, 0, 600, 5) + num("frenchStandardMin", "Francés: estándar (min)", st.frenchStandardMin, 0, 600, 5)
      + t("frenchPreferredTime", "Hora preferida de francés", st.frenchPreferredTime) + num("frenchMaxBlockMin", "Bloque máximo de francés (min)", st.frenchMaxBlockMin, 15, 600, 5)
      + `</div><p class="inline-err" data-err="minimos" role="alert" hidden></p></section>`
      + `<section class="card" data-sec="plan"><h2>Planificación</h2><p class="card-sub">Límites de la propuesta de bloques.</p><div class="sgrid">`
      + num("maxFocusMin", "Máximo de foco al día (min)", st.maxFocusMin, 30, 1440, 15) + num("marginMin", "Margen libre (min)", st.marginMin, 0, 240, 5)
      + `</div><p class="inline-err" data-err="plan" role="alert" hidden></p></section>`
      + `<section class="card" data-sec="fijo"><h2>Horario fijo semanal</h2><p class="card-sub">Clases, trabajo… Ocupan su hueco cada semana.</p>${fw || '<p class="muted" style="margin-bottom:10px">Sin bloques fijos.</p>'}`
      + `<button type="button" class="btn btn-secondary btn-sm" data-action="fw-add">+ Añadir bloque fijo</button><p class="inline-err" data-err="fijo" role="alert" hidden></p></section>`
      + `<section class="card" data-sec="habitos"><h2>Hábitos</h2><p class="card-sub">Qué hábito de 15-hábitos se marca al terminar una tarea.</p><div class="sgrid">${linkSel("sport", "Deporte")}${linkSel("french", "Francés")}</div>`
      + `<label class="switch-row" style="margin-top:10px"><span>Marcar el hábito al completar tareas y rutinas</span><input type="checkbox" class="cbx" data-set="autoTickHabits"${st.autoTickHabits ? " checked" : ""}></label></section>`
      + `<section class="card" data-sec="avisos"><h2>Recordatorios</h2><p class="card-sub">Avisos al empezar cada bloque mientras Ritmo está abierto.</p>`
      + `<label class="switch-row"><span>Recordatorios activados</span><input type="checkbox" class="cbx" data-set="reminders.enabled"${st.reminders.enabled ? " checked" : ""}></label>`
      + `<label class="field" style="margin-top:8px"><span class="field-l">Avisar</span><select data-set="reminders.leadMin">${[0, 5, 10].map((v) => `<option value="${v}"${st.reminders.leadMin === v ? " selected" : ""}>${v ? v + " min antes" : "A la hora de empezar"}</option>`).join("")}</select></label>`
      + `<div class="switch-row" style="margin-top:10px"><button type="button" id="notifBtn" class="btn btn-secondary btn-sm">Permitir notificaciones</button><span id="notifState" class="muted">${esc(notif)}</span></div></section>`
      + `<section class="card" data-sec="datos"><h2>Datos</h2><p class="card-sub">Todo vive en este navegador (localStorage). Exporta el JSON de vez en cuando.</p>`
      + `<div class="btn-row"><button type="button" id="exportJson" class="btn btn-primary btn-sm">Exportar JSON</button><button type="button" id="importBtn" class="btn btn-secondary btn-sm">Importar JSON</button></div>`
      + `<label class="cb-row" style="margin-top:8px"><input type="checkbox" class="cbx" id="importHabits"><span>Importar también hábitos (sobrescribe habitos.v1)</span></label>`
      + `<div class="btn-row" style="margin-top:12px"><button type="button" id="icsDay" class="btn btn-secondary btn-sm">Calendario de hoy (.ics)</button><button type="button" id="icsWeek" class="btn btn-secondary btn-sm">Calendario de la semana (.ics)</button></div>`
      + `<label class="cb-row"><input type="checkbox" class="cbx" id="icsRoutines"${icsOpts.includeRoutines ? " checked" : ""}><span>Incluir rutinas en el .ics</span></label>`
      + `<label class="cb-row"><input type="checkbox" class="cbx" id="icsFixed"${icsOpts.includeFixed ? " checked" : ""}><span>Incluir horario fijo en el .ics</span></label>`
      + `<div class="danger-zone btn-row"><button type="button" id="demoBtn" class="btn btn-secondary btn-sm">Cargar datos de ejemplo</button>`
      + (S.demoHabits ? `<button type="button" id="demoTicksBtn" class="btn btn-secondary btn-sm">Quitar ticks de ejemplo de Hábitos (${L.fmtInt(L.demoTickCount(S.demoHabits))})</button>` : "")
      + `<button type="button" id="wipeBtn" class="btn btn-ghost btn-danger btn-sm">Borrar datos de Ritmo</button></div></section>`
      + `</div><p class="kbd-help">Atajos: <kbd>n</kbd> nueva tarea · <kbd>r</kbd> revisión nocturna · <kbd>t</kbd> hoy · <kbd>←</kbd>/<kbd>→</kbd> día anterior/siguiente · <kbd>Esc</kbd> cierra avisos y diálogos</p>`;
  }
  function notifState() {
    if (!("Notification" in window)) return "No disponibles";
    return Notification.permission === "granted" ? "Permitidas" : Notification.permission === "denied" ? "Bloqueadas por el navegador" : "Sin decidir";
  }

  const VIEWS = {
    hoy: { html: viewHoy, title: () => "Hoy", after: positionNow },
    semana: { html: viewSemana, title: () => "Semana" },
    mes: { html: viewMes, title: () => "Mes" },
    habitos: { html: viewHabitos, title: () => "Hábitos" },
    rutina: { html: viewRutina, title: () => { const r = routineById(route.id); return r ? "Rutina " + r.name.toLowerCase() : "Rutina"; } },
    progreso: { html: viewProgreso, title: () => "Progreso" },
    ajustes: { html: viewAjustes, title: () => "Ajustes" },
  };

  // ───────────────────────────────────────────── settings writes
  const PAIRS = [
    ["dayStart", "dayEnd", "La jornada debe empezar antes de terminar."],
    ["morningTrainEnd", "eveningTrainStart", "La franja de entreno de mañana debe acabar antes de la de tarde."],
    ["eveningTrainStart", "latestTrainStart", "La última hora para entrenar debe ser posterior al inicio de la franja de tarde.", true],
    ["bestFocus.0", "bestFocus.1", "La franja de mejor foco debe empezar antes de terminar."],
    ["lowFocus.0", "lowFocus.1", "La franja de poco foco debe empezar antes de terminar."],
  ];
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, p, v) { const ks = p.split("."); const last = ks.pop(); const tgt = ks.reduce((a, k) => a[k], o); tgt[Array.isArray(tgt) ? Number(last) : last] = v; }
  const NUM_RULES = { sportFloor: [0, 14], sportStandard: [0, 14], sportDurationMin: [5, 240], frenchFloorMin: [0, 600], frenchStandardMin: [0, 600], frenchMaxBlockMin: [15, 600], maxFocusMin: [30, 1440], marginMin: [0, 240] };
  function applySetting(el) {
    const key = el.dataset.set, sec = el.closest("[data-sec]")?.dataset.sec;
    const errEl = sec ? $(`[data-err="${sec}"]`) : null;
    const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.hidden = !msg; } };
    const next = L.clone(S.settings);
    let v;
    if (el.type === "checkbox") v = el.checked;
    else if (el.type === "time") { if (!L.isHM(el.value)) return showErr("Hora no válida."); v = el.value; }
    else if (key.startsWith("habitLinks.")) v = el.value === "" ? null : Number(el.value);
    else if (key === "reminders.leadMin") v = Number(el.value);
    else if (key === "trainingPreference") v = el.value === "manana" ? "manana" : "tarde";
    else if (NUM_RULES[key]) {
      const n = Number(el.value), [lo, hi] = NUM_RULES[key];
      if (el.value === "" || !Number.isFinite(n) || n < lo || n > hi) return showErr(`Valor fuera de rango (${lo}–${hi}).`);
      v = Math.round(n);
    } else v = el.value;
    setPath(next, key, v);
    for (const [a, b, msg, allowEq] of PAIRS) {
      const x = L.parseHM(getPath(next, a)), y = L.parseHM(getPath(next, b));
      if (x === null || y === null || (allowEq ? x > y : x >= y)) return showErr(msg);
    }
    if (next.sportFloor > next.sportStandard) return showErr("El suelo de deporte no puede ser mayor que el estándar.");
    if (next.frenchFloorMin > next.frenchStandardMin) return showErr("El suelo de francés no puede ser mayor que el estándar.");
    showErr("");
    S.settings = next;
    save();
    if (key === "autoTickHabits" || key.startsWith("habitLinks")) renderShell();
  }
  function applyFixed(el) {
    const f = S.settings.fixedWeekly.find((x) => x.id === el.dataset.fw);
    if (!f) return;
    const err = $('[data-err="fijo"]');
    const field = el.dataset.field;
    const next = { ...f, days: f.days.slice() };
    if (field === "title") { if (!el.value.trim()) { err.textContent = "El bloque necesita un nombre."; err.hidden = false; return; } next.title = el.value.trim().slice(0, 120); }
    else if (field === "day") { const d = Number(el.dataset.day); next.days = el.checked ? [...new Set([...next.days, d])].sort() : next.days.filter((x) => x !== d); }
    else if (field === "start" || field === "end") { if (!L.isHM(el.value)) return; next[field] = el.value; }
    if (L.parseHM(next.start) >= L.parseHM(next.end)) { err.textContent = `«${next.title}»: la hora de inicio debe ser anterior a la de fin.`; err.hidden = false; return; }
    err.hidden = true;
    Object.assign(f, next);
    save();
  }

  // ───────────────────────────────────────────── task dialog
  const tDlg = $("#taskDialog");
  let editingId = null, dlgDefaults = null;
  $("#tCategory").innerHTML = L.CATEGORY_KEYS.map((k) => `<option value="${k}">${esc(L.CATEGORIES[k].label)}</option>`).join("");
  function openTask(id = null, { focusTime = false, date = null } = {}) {
    closeMenu();
    editingId = id;
    const t = id ? taskById(id) : null;
    $("#taskDlgTitle").textContent = t ? "Editar tarea" : "Nueva tarea";
    $("#tTitle").value = t ? t.title : "";
    $("#tCategory").value = t ? t.category : "resto";
    $("#tDate").value = t ? t.date || "" : date || (route.name === "hoy" || route.name === "semana" ? route.sel : today);
    $("#tTime").value = t && t.time ? t.time : "";
    $("#tDuration").value = t ? t.durationMin : 60;
    $("#tDue").value = t && t.due ? t.due : "";
    $("#tWeight").value = t && t.weight != null ? t.weight : 10;
    $("#tNotes").value = t ? t.notes : "";
    $("#tError").hidden = true;
    $("#tDelete").hidden = !t; $("#tArchive").hidden = !t;
    $("#tArchive").textContent = t && t.status === "archived" ? "Recuperar" : "Archivar";
    $("#tDone").textContent = t && t.status === "done" ? "Reabrir" : "Marcar hecha";
    dlgDefaults = t ? null : { date: $("#tDate").value };
    syncTaskForm();
    tDlg.showModal();
    (focusTime ? $("#tTime") : $("#tTitle")).focus();
  }
  function readTaskForm() {
    return {
      title: $("#tTitle").value.trim(), category: $("#tCategory").value, date: $("#tDate").value || null, time: $("#tTime").value || null,
      durationMin: Number($("#tDuration").value), due: $("#tDue").value || null, weight: $("#tWeight").value === "" ? null : Number($("#tWeight").value), notes: $("#tNotes").value,
    };
  }
  function syncTaskForm() {
    const f = readTaskForm();
    $("#tEntregaRow").hidden = f.category !== "entrega";
    for (const b of $$("[data-dur]", tDlg)) b.setAttribute("aria-pressed", String(Number(b.dataset.dur) === f.durationMin));
    $("#tHint").hidden = !(f.durationMin > 120);
    let warns = [];
    if (f.date && L.isHM(f.time) && f.durationMin >= 5) {
      const s = L.parseHM(f.time);
      const block = { key: editingId ? "task:" + editingId : "task:__new", kind: f.category, title: f.title, start: s, end: Math.min(1440, s + Math.min(720, f.durationMin)) };
      warns = L.slotWarnings(block, S.settings, L.dayBlocks(S, f.date).timed);
    }
    $("#tWarnings").innerHTML = warns.map((w) => `<span class="chip chip-warn">⚠ ${esc(w.text)}</span>`).join("");
  }
  function taskFormError(msg) { const e = $("#tError"); e.textContent = msg; e.hidden = false; }
  function saveTaskForm({ markDone = null } = {}) {
    const f = readTaskForm();
    if (!f.title) { taskFormError("Pon un título a la tarea."); $("#tTitle").focus(); return false; }
    if (f.date && !L.isISO(f.date)) { taskFormError("Fecha no válida."); return false; }
    if (f.time && !L.isHM(f.time)) { taskFormError("Hora no válida."); return false; }
    if (!Number.isFinite(f.durationMin) || f.durationMin < 5 || f.durationMin > 720) { taskFormError("La duración va de 5 a 720 minutos."); $("#tDuration").focus(); return false; }
    if (f.category === "entrega" && f.weight !== null && (!(f.weight >= 0) || f.weight > 100)) { taskFormError("El peso va de 0 a 100 %."); return false; }
    let t;
    if (editingId) {
      t = taskById(editingId);
      if (!t) return false;
      const fresh = L.newTask({ ...f, title: f.title }, { id: t.id, nowIso: t.createdAt });
      Object.assign(t, { title: fresh.title, category: fresh.category, date: fresh.date, time: fresh.time, durationMin: fresh.durationMin, due: fresh.due, weight: fresh.weight, notes: fresh.notes, updatedAt: stampNow() });
    } else {
      t = L.newTask(f, { nowIso: stampNow() });
      S.tasks.push(t);
    }
    if (markDone !== null) setTaskDone(t, markDone);
    save();
    if (markDone) autoTickTask(t);
    return true;
  }
  $("#taskForm").addEventListener("submit", (e) => { e.preventDefault(); if (saveTaskForm()) { tDlg.close(); render(); } });
  $("#taskForm").addEventListener("input", syncTaskForm);
  $("#taskForm").addEventListener("change", syncTaskForm);
  tDlg.addEventListener("click", (e) => {
    const d = e.target.closest("[data-dur]");
    if (d) { $("#tDuration").value = d.dataset.dur; syncTaskForm(); return; }
    if (e.target.closest("[data-close-dialog]")) tDlg.close();
    if (e.target === tDlg) tDlg.close(); // backdrop
  });
  $("#tDone").addEventListener("click", () => {
    const t = editingId ? taskById(editingId) : null;
    if (saveTaskForm({ markDone: !(t && t.status === "done") })) { tDlg.close(); render(); }
  });
  $("#tArchive").addEventListener("click", () => {
    const t = taskById(editingId); if (!t) return;
    if (!saveTaskForm()) return;
    t.status = t.status === "archived" ? "open" : "archived"; t.updatedAt = stampNow(); save();
    tDlg.close(); render();
    if (t.status === "archived") toast({ title: "Tarea archivada", body: t.title, action: { label: "Deshacer", fn: () => { t.status = "open"; save(); render(); } } });
  });
  $("#tDelete").addEventListener("click", () => {
    const t = taskById(editingId); if (!t) return;
    if (!confirm(`¿Borrar «${t.title}»? No se puede deshacer.`)) return;
    S.tasks = S.tasks.filter((x) => x.id !== t.id); save(); tDlg.close(); render();
  });

  // ───────────────────────────────────────────── review wizard (works on a draft until "Guardar y terminar")
  const rDlg = $("#reviewDialog");
  let RV = null;
  const STEP_NAMES = ["Tarea por tarea", "¿Algo nuevo?", "Mañana", "Listo"];
  function openReview() {
    closeMenu();
    if (tDlg.open) tDlg.close();
    R = readAll();
    const { reviewDay, tomorrow } = L.reviewDates(new Date());
    const draft = L.clone(S);
    const q = L.reviewQueue(draft, reviewDay);
    RV = { mode: "review", draft, snapshot: L.clone(S), reviewDay, tomorrow, planDay: tomorrow, fromHM: null, queue: q.items.map((t) => t.id), tableMode: q.tableMode,
      idx: 0, history: [], counts: { done: 0, tomorrow: 0, redated: 0, archived: 0, kept: 0, accepted: 0 }, step: q.items.length ? 1 : 2, skipped: !q.items.length, dateOpen: false, proposal: null };
    renderReview();
    rDlg.showModal();
    focusReview();
  }
  function openPropose() {
    closeMenu();
    R = readAll();
    const day = route.sel;
    const fromHM = day === today ? L.ceil15(minutesNow()) : null;
    RV = { mode: "propose", draft: L.clone(S), snapshot: L.clone(S), reviewDay: day, tomorrow: day, planDay: day, fromHM, queue: [], idx: 0, history: [],
      counts: { done: 0, tomorrow: 0, redated: 0, archived: 0, kept: 0, accepted: 0 }, step: 3, proposal: null };
    renderReview();
    rDlg.showModal();
    focusReview();
  }
  function focusReview() { const f = $("#reviewBody [data-review-action], #reviewBody input, #reviewFoot .btn-primary", rDlg) || $("#reviewClose"); if (f) f.focus(); }
  function renderReview() {
    const steps = RV.mode === "propose" ? [3] : [1, 2, 3, 4];
    $("#reviewTitle").textContent = RV.mode === "propose" ? `Proponer bloques · ${L.fmtLong(RV.planDay)}` : "🌙 Revisión nocturna";
    $("#reviewSteps").innerHTML = RV.mode === "propose" ? "" : steps.map((s) => `<li class="${s === RV.step ? "cur" : s < RV.step ? "done" : ""}"${s === RV.step ? ' aria-current="step"' : ""}>${s} · ${STEP_NAMES[s - 1]}</li>`).join("");
    const body = $("#reviewBody"), foot = $("#reviewFoot");
    const cancel = `<button type="button" class="btn btn-ghost" data-rv="cancel">Cancelar</button><span class="grow"></span>`;
    if (RV.step === 1) {
      if (RV.tableMode) {
        body.innerHTML = `<p class="muted">Tienes ${RV.queue.length} tareas abiertas: revísalas en tabla y cambia solo las dudosas.</p><div class="prop-wrap"><table class="rv-table"><thead><tr><th>Tarea</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>`
          + RV.queue.map((id) => { const t = RV.draft.tasks.find((x) => x.id === id); return `<tr><td><span class="dot cat-${t.category}"></span> ${esc(t.title)}</td><td class="num">${t.date < RV.reviewDay ? '<span class="chip late">atrasada</span>' : esc(L.fmtShort(t.date))}</td>`
            + `<td><select data-rv-select="${esc(id)}" aria-label="Acción para ${esc(t.title)}"><option value="keep">Mantener</option><option value="done">Hecha</option><option value="tomorrow">Mañana</option><option value="archive">Archivar</option></select></td></tr>`; }).join("")
          + `</tbody></table></div>`;
        foot.innerHTML = cancel + `<button type="button" class="btn btn-primary" data-rv="apply-table">Aplicar</button>`;
      } else {
        const id = RV.queue[RV.idx], t = RV.draft.tasks.find((x) => x.id === id);
        const late = t.date < RV.reviewDay;
        body.innerHTML = `<div class="rv-bar" aria-hidden="true"><span style="width:${pct(RV.idx, RV.queue.length)}%"></span></div>`
          + `<article class="rv-card" aria-live="polite"><div class="rv-top"><span>Tarea <b class="num">${RV.idx + 1} / ${RV.queue.length}</b></span><span>${esc(L.fmtLong(RV.reviewDay))}</span></div>`
          + `<h3 class="rv-title">${esc(t.title)}</h3><div class="rv-meta"><span class="chip"><span class="dot cat-${t.category}"></span> ${esc(L.catLabel(t.category))}</span>`
          + `<span class="chip${late ? " late" : ""}">${late ? "atrasada · " + esc(L.fmtShort(t.date)) : esc(L.fmtShort(t.date))}${t.time ? " · " + esc(t.time) : ""}</span><span class="chip">${L.fmtDur(t.durationMin)}</span>`
          + (t.category === "entrega" && t.due ? `<span class="chip">entrega ${esc(L.fmtShort(t.due))} · ${t.weight} %</span>` : "") + `</div>`
          + (t.notes ? `<p class="tl-notes" style="margin-left:0">${esc(t.notes)}</p>` : "")
          + `<div class="rv-actions" role="group" aria-label="¿Qué hacemos con esta tarea?">`
          + `<button type="button" class="btn btn-primary" data-review-action="done">Hecha <small>H</small></button>`
          + `<button type="button" class="btn btn-secondary" data-review-action="tomorrow">Mañana <small>M</small></button>`
          + `<button type="button" class="btn btn-secondary" data-review-action="date" aria-expanded="${RV.dateOpen}">Nueva fecha <small>F</small></button>`
          + `<button type="button" class="btn btn-secondary" data-review-action="archive">Archivar <small>A</small></button>`
          + `<button type="button" class="btn btn-secondary" data-review-action="keep">Mantener <small>S</small></button></div>`
          + (RV.dateOpen ? `<div class="rv-date"><label class="sr" for="rvDate">Nueva fecha</label><input type="date" id="rvDate" value="${L.addDays(RV.tomorrow, 1)}" min="${today}"><button type="button" class="btn btn-primary btn-sm" data-rv="date-ok">OK</button></div>` : "")
          + `</article>`;
        foot.innerHTML = cancel + `<button type="button" class="btn btn-ghost" data-rv="back"${RV.idx === 0 ? " disabled" : ""}>← Atrás</button><button type="button" class="btn btn-secondary" data-rv="to-2">Saltar al paso 2 →</button>`;
      }
    } else if (RV.step === 2) {
      const backlog = RV.draft.tasks.filter((t) => t.status === "open" && !t.date);
      body.innerHTML = (RV.skipped ? `<p class="hint">No hay tareas abiertas para revisar.</p>` : "")
        + `<section class="rv-sec"><h3>Barre tus fuentes</h3><div class="prompt-list"><span class="chip">📅 Calendario</span><span class="chip">✉️ Correo</span><span class="chip">🎓 Campus/entregas</span><span class="chip">🗒 Notas de Obsidian</span></div>`
        + `<p class="muted" style="margin-top:6px;font-size:13px">Calendario · Correo · Campus/entregas · Notas de Obsidian: saca cada cosa nueva como tarea con fecha.</p></section>`
        + `<form class="qa" data-form="quick-add"><label class="field qa-title"><span class="field-l">Nueva tarea</span><input type="text" id="qaTitle" maxlength="200" placeholder="Título" autocomplete="off"></label>`
        + `<label class="field"><span class="field-l">Categoría</span><select id="qaCategory">${L.CATEGORY_KEYS.map((k) => `<option value="${k}"${k === "resto" ? " selected" : ""}>${esc(L.CATEGORIES[k].label)}</option>`).join("")}</select></label>`
        + `<label class="field"><span class="field-l">Fecha</span><input type="date" id="qaDate" value="${RV.tomorrow}"></label><button type="submit" class="btn btn-secondary">Añadir</button></form>`
        + `<div class="qa-entrega" id="qaEntrega" hidden><label class="field"><span class="field-l">Entrega</span><input type="date" id="qaDue"></label><label class="field"><span class="field-l">Peso (%)</span><input type="number" id="qaWeight" min="0" max="100" value="10"></label></div>`
        + `<section class="rv-sec"><h3>Sin fecha (backlog): ${backlog.length}</h3>${backlog.length ? `<ul class="mini-list">${backlog.map((t) => `<li><span class="mt"><span>${esc(t.title)}</span><small><span class="dot cat-${t.category}"></span> ${esc(L.catLabel(t.category))}${t.due ? " · entrega " + esc(L.fmtShort(t.due)) : ""}</small></span><button type="button" class="btn btn-secondary btn-sm" data-backlog="${esc(t.id)}">Añadir a mañana</button></li>`).join("")}</ul>` : '<p class="muted">Nada en el backlog.</p>'}</section>`;
      foot.innerHTML = cancel + `<button type="button" class="btn btn-primary" data-rv="to-3" id="reviewNext">Proponer mañana →</button>`;
    } else if (RV.step === 3) {
      const p = (RV.proposal = L.proposeDay(RV.draft, RV.planDay, planCtx(RV.draft, RV.planDay, RV.fromHM)));
      const rows = [...p.busy.map((b) => ({ b, busy: true })), ...p.blocks.map((b) => ({ b, busy: false }))].sort((x, y) => x.b.start - y.b.start || (x.busy ? -1 : 1));
      const prio = (b) => (b.kind === "margen" ? "—" : b.kind === "rutina" ? "Rutina" : b.kind === "fijo" ? "P1 · Fijo" : `P${L.CATEGORIES[b.kind] ? L.CATEGORIES[b.kind].rank : 5}`);
      const titleOf = (key) => { const b = p.blocks.find((x) => x.key === key); return b ? b.title : key; };
      const wk = R.inv ? [] : L.weakest(R.hd, RV.planDay, 3);
      body.innerHTML = (p.overflow ? `<p class="warn-box bad" role="alert">${esc(p.warnings[0])}</p>` : "")
        + `<div class="prop-wrap"><table id="proposalTable"><thead><tr><th>Hora</th><th class="col-b">Bloque</th><th>Tarea</th><th>Prioridad</th></tr></thead><tbody>`
        + rows.map(({ b, busy }) => busy
          ? `<tr class="busy" data-busy="${esc(b.key)}"><td class="h">${L.fmtHM(b.start)}–${L.fmtHM(b.end)}</td><td class="col-b"><span class="dot cat-${b.kind}"></span> ${esc(blockLabel(b.kind))}</td><td><span class="dot m-only cat-${b.kind}"></span>${esc(b.title)}${b.done ? " ✓" : ""}<span class="why">ocupado</span></td><td>${esc(prio(b))}</td></tr>`
          : `<tr data-block="${esc(b.key)}"><td class="h"><label><input type="checkbox" class="cbx" data-block-check="${esc(b.key)}" checked aria-label="Incluir ${esc(b.title)}">${L.fmtHM(b.start)}–${L.fmtHM(b.end)}</label></td>`
            + `<td class="col-b"><span class="dot cat-${b.kind}"></span> ${esc(b.kind === "margen" ? "Margen" : L.catLabel(b.kind))}</td><td><span class="dot m-only cat-${b.kind}"></span>${esc(b.title)}${b.key.startsWith("new:") ? ' <span class="chip">nueva</span>' : ""}${b.reason ? `<span class="why">${esc(b.reason)}</span>` : ""}${(b.warnings || []).map((w) => `<span class="why">⚠ ${esc(w.text)}</span>`).join("")}</td><td>${esc(prio(b))}</td></tr>`).join("")
        + `</tbody></table></div>`
        + `<section class="rv-sec"><h3>Top 3 de ${RV.planDay === today ? "hoy" : RV.planDay === L.addDays(today, 1) ? "mañana" : esc(L.fmtShort(RV.planDay))}</h3>${p.top3.length ? `<ol style="margin:0;padding-left:20px">${p.top3.map((k) => `<li>${esc(titleOf(k))}</li>`).join("")}</ol>` : '<p class="muted">Nada que colocar.</p>'}</section>`
        + `<section class="rv-sec"><h3>Lo que se mueve</h3>${p.moved.length ? `<ul>${p.moved.map((m) => `<li>${esc(m.title)} → ${esc(L.fmtLong(m.toDate))} <span class="muted">(${esc(m.reason)})</span></li>`).join("")}</ul>` : '<p class="muted">Nada: todo cabe.</p>'}</section>`
        + (p.warnings.filter((w, i) => !(p.overflow && i === 0)).length ? `<section class="rv-sec"><h3>Avisos</h3><ul>${p.warnings.filter((w, i) => !(p.overflow && i === 0)).map((w) => `<li>${esc(w)}</li>`).join("")}</ul></section>` : "")
        + `<section class="rv-sec"><h3>Hábitos en riesgo</h3>${wk.length ? `<ul>${wk.map((w) => `<li><b>${esc(w.name)}</b> · ${w.pct} % en 7 días — ${esc(L.tipFor(w.name))}</li>`).join("")}</ul>` : '<p class="muted">Sin datos de hábitos.</p>'}</section>`;
      foot.innerHTML = cancel + (RV.mode === "review" ? `<button type="button" class="btn btn-ghost" data-rv="to-2">← Atrás</button>` : "") + `<button type="button" class="btn btn-primary" id="acceptPlan">Aceptar plan</button>`;
    } else {
      const c = RV.counts;
      body.innerHTML = `<p>Todo listo. Esto es lo que se guardará:</p><div class="summary-grid">`
        + [[c.done, "hechas"], [c.tomorrow, "a mañana"], [c.redated, "con nueva fecha"], [c.archived, "archivadas"], [c.kept, "mantenidas"], [c.accepted, "bloques aceptados"]]
          .map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("") + `</div><p class="muted">Nada se ha guardado todavía: puedes cancelar.</p>`;
      foot.innerHTML = cancel + `<button type="button" class="btn btn-primary" id="reviewFinish">Guardar y terminar</button>`;
    }
  }
  function reviewAct(action, date = null) {
    const id = RV.queue[RV.idx];
    const prev = L.clone(RV.draft.tasks.find((t) => t.id === id));
    if (!L.applyReviewAction(RV.draft, id, action, { date, today: RV.reviewDay, nowIso: stampNow() })) return;
    const map = { done: "done", tomorrow: "tomorrow", date: "redated", archive: "archived", keep: "kept" };
    RV.counts[map[action]]++;
    RV.history.push({ id, prev, counter: map[action] });
    RV.dateOpen = false;
    RV.idx++;
    if (RV.idx >= RV.queue.length) RV.step = 2;
    renderReview(); focusReview();
  }
  function reviewBack() {
    const h = RV.history.pop(); if (!h) return;
    const i = RV.draft.tasks.findIndex((t) => t.id === h.id);
    RV.draft.tasks[i] = h.prev;
    RV.counts[h.counter]--;
    RV.idx = Math.max(0, RV.idx - 1);
    RV.step = 1;
    renderReview(); focusReview();
  }
  function acceptPlan() {
    const keys = $$("[data-block-check]", rDlg).filter((c) => c.checked).map((c) => c.dataset.blockCheck);
    const r = L.acceptProposal(RV.draft, RV.proposal, keys, { nowIso: stampNow() });
    RV.counts.accepted += r.accepted;
    if (RV.mode === "propose") { commitDraft(`Bloques añadidos a ${RV.planDay === today ? "hoy" : L.fmtShort(RV.planDay)}`); return; }
    RV.step = 4; renderReview(); focusReview();
  }
  function commitDraft(message) {
    const snapshot = RV.snapshot, draft = RV.draft, mode = RV.mode, reviewDay = RV.reviewDay, counts = RV.counts;
    const before = new Map(snapshot.tasks.map((t) => [t.id, t.status]));
    if (mode === "review") {
      draft.reviews[reviewDay] = { at: stampNow(), ...counts };
      const noche = draft.routines.find((r) => r.id === "noche");
      let completed = null;
      if (noche && noche.items.some((i) => i.id === "rev") && !((draft.routineLog[reviewDay] || {}).noche || []).includes("rev")) {
        const res = L.toggleRoutineItem(draft, "noche", "rev", reviewDay);
        if (res && res.becameComplete) completed = noche;
      }
      S = draft; save();
      if (completed && Number.isInteger(completed.habitIndex)) autoTick(completed.habitIndex, reviewDay);
    } else { S = draft; save(); }
    for (const t of S.tasks) if (t.status === "done" && before.get(t.id) !== "done") autoTickTask(t);
    RV = null;
    rDlg.close();
    render();
    toast({ title: message, body: mode === "review" ? "Revisión guardada. Mañana empieza con un plan." : "", action: { label: "Deshacer", fn: () => { S = snapshot; save(); render(); toast({ title: "Cambios deshechos" }); } } });
  }
  rDlg.addEventListener("click", (e) => {
    if (!RV) return;
    const a = e.target.closest("[data-review-action]");
    if (a) { const act = a.dataset.reviewAction; if (act === "date") { RV.dateOpen = !RV.dateOpen; renderReview(); const d = $("#rvDate"); if (d) d.focus(); } else reviewAct(act); return; }
    const b = e.target.closest("[data-rv], #acceptPlan, #reviewFinish, [data-backlog]");
    if (!b) { if (e.target === rDlg) cancelReview(); return; }
    if (b.id === "acceptPlan") return acceptPlan();
    if (b.id === "reviewFinish") return commitDraft("Plan de mañana guardado");
    if (b.dataset.backlog) { const t = RV.draft.tasks.find((x) => x.id === b.dataset.backlog); if (t) { t.date = RV.tomorrow; t.updatedAt = stampNow(); } renderReview(); return; }
    switch (b.dataset.rv) {
      case "cancel": cancelReview(); break;
      case "back": reviewBack(); break;
      case "to-2": RV.step = 2; renderReview(); focusReview(); break;
      case "to-3": RV.step = 3; renderReview(); focusReview(); break;
      case "date-ok": { const v = $("#rvDate").value; if (L.isISO(v)) reviewAct("date", v); break; }
      case "apply-table": {
        for (const sel of $$("[data-rv-select]", rDlg)) {
          const act = sel.value, map = { done: "done", tomorrow: "tomorrow", archive: "archived", keep: "kept" };
          if (L.applyReviewAction(RV.draft, sel.dataset.rvSelect, act, { today: RV.reviewDay, nowIso: stampNow() })) RV.counts[map[act]]++;
        }
        RV.step = 2; renderReview(); focusReview(); break;
      }
    }
  });
  rDlg.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-form='quick-add']"); if (!f || !RV) return;
    e.preventDefault();
    const title = $("#qaTitle").value.trim(); if (!title) { $("#qaTitle").focus(); return; }
    const category = $("#qaCategory").value;
    const fields = { title, category, date: $("#qaDate").value || null };
    if (category === "entrega") { fields.due = $("#qaDue").value || null; fields.weight = Number($("#qaWeight").value); }
    RV.draft.tasks.push(L.newTask(fields, { nowIso: stampNow() }));
    renderReview(); $("#qaTitle").focus();
  });
  rDlg.addEventListener("change", (e) => { if (e.target.id === "qaCategory") $("#qaEntrega").hidden = e.target.value !== "entrega"; });
  rDlg.addEventListener("keydown", (e) => {
    if (!RV || RV.step !== 1 || RV.tableMode || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) { if (e.key === "Enter" && e.target.id === "rvDate") { e.preventDefault(); const v = e.target.value; if (L.isISO(v)) reviewAct("date", v); } return; }
    const k = e.key.toLowerCase();
    const map = { h: "done", m: "tomorrow", a: "archive", s: "keep" };
    if (map[k]) { e.preventDefault(); reviewAct(map[k]); }
    else if (k === "f") { e.preventDefault(); RV.dateOpen = true; renderReview(); $("#rvDate").focus(); }
  });
  function cancelReview() { RV = null; if (rDlg.open) rDlg.close(); }
  rDlg.addEventListener("cancel", () => { RV = null; });
  $("#reviewClose").addEventListener("click", cancelReview);

  // ───────────────────────────────────────────── downloads, import, demo, wipe
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  /** Times are wall-clock times where David is (Madrid, or India from January): export them in the browser's zone. */
  const browserTZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid"; } catch (e) { return "Europe/Madrid"; } })();
  function exportICS(dates, name) {
    const ev = L.blocksToEvents(S, dates, icsOpts);
    const zone = L.icsZone(browserTZ);
    download(name, L.toICS(ev, { calName: "Ritmo", dtstamp: stampNow(), tzid: browserTZ }), "text/calendar;charset=utf-8");
    toast({ title: `Calendario exportado (${ev.length} ${L.plural(ev.length, "evento", "eventos")})`, body: `${name} · ${zone ? "zona " + zone : "hora local"}` });
  }
  const icsDay = (iso) => exportICS([iso], `ritmo-${iso}.ics`);
  const icsWeek = (iso) => { const days = L.weekDays(iso); exportICS(days, `ritmo-semana-${days[0]}.ics`); };
  function exportJSON() {
    download(`ritmo-${today}.json`, JSON.stringify(L.exportBundle(S, store.get(HK), stampNow()), null, 2), "application/json");
  }
  async function importJSON(file) {
    let text;
    try { text = await file.text(); } catch (e) { toast({ title: "Archivo no válido: no se pudo leer" }); return; }
    const r = L.parseImport(text, today);
    if (!r.ok) { toast({ title: "Archivo no válido: " + r.error }); return; }
    const withHabits = $("#importHabits") && $("#importHabits").checked && r.habitos;
    if (!confirm(`¿Sustituir los datos actuales de Ritmo por los del archivo (${r.ritmo.tasks.length} tareas)?${withHabits ? "\nTambién se sobrescribirán tus hábitos (habitos.v1)." : ""}`)) return;
    S = r.ritmo; save();
    if (withHabits) {
      const rep = L.applyHabitMutation(JSON.stringify(r.habitos), () => true); // only repairs a missing habits list
      if (rep.ok && !store.set(HK, rep.json)) saveFailed();
    }
    render();
    toast({ title: "Datos importados", body: r.warnings.join(" · ") || `${r.ritmo.tasks.length} tareas` });
  }
  function loadDemo() {
    const hr = L.readHabits(store.get(HK));
    const fillHabits = hr.status === "missing" || (hr.status === "ok" && !L.hasAnyTicks(hr.data));
    const msg = fillHabits
      ? "¿Cargar datos de ejemplo? Sustituye los datos de Ritmo y, como aún no tienes hábitos marcados, rellena también Hábitos (15-hábitos) con ticks de ejemplo. Podrás quitarlos en Ajustes → «Quitar ticks de ejemplo». Las demás apps no se tocan."
      : "¿Cargar datos de ejemplo? Sustituye los datos de Ritmo (tus hábitos y las demás apps no se tocan).";
    if (!confirm(msg)) return;
    const prevRecord = S.demoHabits || null;
    S = L.demoState(today, hr.status === "invalid" ? L.HABITS_DEFAULT : hr.habits);
    let rec = null;
    if (fillHabits) habitWrite((d) => { rec = L.applyDemoHabits(d, L.demoHabits(today), today); return true; });
    else toast({ title: hr.status === "invalid" ? "Los hábitos no son válidos: no se tocan" : "Hay hábitos reales: no se tocan" });
    const record = L.normDemoRecord(rec) || prevRecord; // remember exactly what the demo added to habitos.v1
    if (record) S.demoHabits = record;
    save();
    go("#/hoy");
    toast({ title: "Datos de ejemplo cargados", body: "Un día completo para probar Ritmo." });
  }
  /** Takes out of habitos.v1 exactly the ticks (and untouched objectives) the demo added; real ticks stay. */
  function removeDemoTicks() {
    const rec = S.demoHabits;
    if (!rec) return;
    const n = L.demoTickCount(rec);
    if (!confirm(`¿Quitar de Hábitos los ${L.fmtInt(n)} ticks de ejemplo que puso Ritmo? Solo se quitan esos; lo que hayas marcado tú no se toca.`)) return;
    let removed = 0;
    if (!habitWrite((d) => { removed = L.removeDemoHabits(d, rec, today); return true; })) return;
    delete S.demoHabits;
    save();
    render();
    toast({ title: "Ticks de ejemplo quitados de Hábitos", body: `${L.fmtInt(removed)} ${L.plural(removed, "tick", "ticks")}` });
  }
  function wipe() {
    const extra = S.demoHabits ? "\n\nOjo: los ticks de ejemplo que Ritmo puso en Hábitos se quedan. Si quieres quitarlos, cancela y usa antes «Quitar ticks de ejemplo de Hábitos»." : "";
    if (!confirm("¿Borrar todos los datos de Ritmo? Tus hábitos y las demás apps no se tocan." + extra)) return;
    store.remove(KEY);
    S = L.emptyState(today, R.habits);
    render();
    toast({ title: "Datos de Ritmo borrados" });
  }

  // ───────────────────────────────────────────── menu
  function closeMenu() { const m = $("#hdrMenu"); if (m && !m.hidden) { m.hidden = true; $("#btnMenu").setAttribute("aria-expanded", "false"); } }
  function toggleMenu() {
    const m = $("#hdrMenu"); if (!m) return;
    m.hidden = !m.hidden;
    $("#btnMenu").setAttribute("aria-expanded", String(!m.hidden));
    if (!m.hidden) m.querySelector("button").focus();
  }

  // ───────────────────────────────────────────── global events
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t.closest("#hdrMenu") && !t.closest("#btnMenu")) closeMenu();
    if (t.closest("dialog")) return;
    const el = t.closest("button, a[data-action]");
    if (!el || el.disabled) return;
    if (el.id === "btnNewTask") return openTask(null);
    if (el.id === "btnMenu") return toggleMenu();
    if (el.id === "btnReview") return openReview();
    if (el.id === "exportJson") return exportJSON();
    if (el.id === "importBtn") return $("#importFile").click();
    if (el.id === "icsDay") return icsDay(today);
    if (el.id === "icsWeek") return icsWeek(today);
    if (el.id === "demoBtn") return loadDemo();
    if (el.id === "wipeBtn") return wipe();
    if (el.id === "demoTicksBtn") return removeDemoTicks();
    if (el.id === "notifBtn") return askNotifications();
    const d = el.dataset;
    if (d.habit !== undefined) return toggleHabit(Number(d.habit));
    if (d.check !== undefined) { const task = taskById(d.check); if (!task) return; setTaskDone(task, task.status !== "done"); save(); if (task.status === "done") autoTickTask(task); return render(); }
    if (d.openTask !== undefined) return openTask(d.openTask);
    if (d.routineExpand !== undefined) { const k = d.routineExpand + "|" + route.sel; if (expanded.has(k)) expanded.delete(k); else expanded.add(k); return render(); }
    if (d.date !== undefined && L.isISO(d.date)) return go(dayHash("hoy", d.date));
    if (d.range !== undefined) { const sel = route.sel; return go(d.range === "dia" ? dayHash("hoy", sel) : d.range === "semana" ? dayHash("semana", sel) : `#/mes${sel.slice(0, 7) === today.slice(0, 7) ? "" : "?m=" + sel.slice(0, 7)}`); }
    if (d.week !== undefined) { const v = route.name === "semana" ? "semana" : "hoy"; return go(dayHash(v, L.addDays(route.sel, 7 * Number(d.week)))); }
    if (d.month !== undefined) { const ym = Number(d.month) === 0 ? today.slice(0, 7) : L.addMonths(route.month, Number(d.month)); return go(ym === today.slice(0, 7) ? "#/mes" : `#/mes?m=${ym}`); }
    switch (d.action) {
      case "ics-day": closeMenu(); return icsDay(route.sel);
      case "ics-week": closeMenu(); return icsWeek(route.sel);
      case "propose": return openPropose();
      case "review": return openReview();
      case "this-week": return go("#/semana");
      case "goto-demo": e.preventDefault(); return go("#/ajustes");
      case "dl-corrupt": if (ownCorruptRaw !== null) download(`ritmo-danado-${today}.txt`, ownCorruptRaw, "text/plain"); return;
      case "set-time": return openTask(d.id, { focusTime: true });
      case "to-today": { const task = taskById(d.id); if (task) { task.date = today; task.time = null; task.updatedAt = stampNow(); save(); render(); } return; }
      case "archive": { const task = taskById(d.id); if (task) { task.status = "archived"; task.updatedAt = stampNow(); save(); render(); toast({ title: "Tarea archivada", body: task.title, action: { label: "Deshacer", fn: () => { task.status = "open"; save(); render(); } } }); } return; }
      case "fw-add": S.settings.fixedWeekly.push({ id: "fw_" + Date.now().toString(36), title: "Nuevo bloque", days: [1, 2, 3, 4, 5], start: "09:00", end: "14:00" }); save(); return render();
      case "fw-del": S.settings.fixedWeekly = S.settings.fixedWeekly.filter((f) => f.id !== d.id); save(); return render();
      case "ri-up": case "ri-down": case "ri-del": {
        const r = routineById(d.routine); if (!r) return;
        const i = r.items.findIndex((x) => x.id === d.id); if (i < 0) return;
        if (d.action === "ri-del") r.items.splice(i, 1);
        else { const j = d.action === "ri-up" ? i - 1 : i + 1; if (j < 0 || j >= r.items.length) return; [r.items[i], r.items[j]] = [r.items[j], r.items[i]]; }
        save(); return render();
      }
    }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.closest("dialog")) return;
    const d = t.dataset;
    if (d.routineItem !== undefined) return toggleRoutine(d.routine, d.routineItem, d.iso);
    if (d.objDone !== undefined) { habitWrite((x) => L.setObjective(x, d.ym, Number(d.objDone), { done: t.checked })); return render(); }
    if (d.objText !== undefined) { habitWrite((x) => L.setObjective(x, d.ym, Number(d.objText), { text: t.value })); return; }
    if (d.set !== undefined) return applySetting(t);
    if (d.fw !== undefined) return applyFixed(t);
    if (d.ri !== undefined) { const r = routineById(d.routine), it = r && r.items.find((x) => x.id === d.ri); if (it && t.value.trim()) { it.text = t.value.trim().slice(0, 200); save(); } return; }
    if (d.rtField !== undefined) {
      const r = routineById(d.routine); if (!r) return;
      const err = $("#rtErr");
      if (d.rtField === "time") { if (!L.isHM(t.value)) { err.textContent = "Hora no válida."; err.hidden = false; return; } r.time = t.value; }
      else if (d.rtField === "durationMin") { const n = Math.round(Number(t.value)); if (!(n >= 5 && n <= 240)) { err.textContent = "La duración va de 5 a 240 min."; err.hidden = false; return; } r.durationMin = n; }
      else if (d.rtField === "habitIndex") r.habitIndex = t.value === "" ? null : Number(t.value);
      err.hidden = true; save(); return;
    }
    if (t.id === "icsRoutines") icsOpts.includeRoutines = t.checked;
    if (t.id === "icsFixed") icsOpts.includeFixed = t.checked;
  });
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.dataset.form === "ri-add") {
      e.preventDefault();
      const r = routineById(f.dataset.routine), inp = $("#riNew");
      if (!r || !inp.value.trim()) return;
      r.items.push({ id: "ri_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: inp.value.trim().slice(0, 200) });
      save(); render(); const again = $("#riNew"); if (again) again.focus();
    }
  });
  $("#importFile").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importJSON(f); });

  function toggleHabit(h) {
    const iso = route.name === "hoy" ? route.sel : today;
    if (iso > today) return;
    const hr = L.readHabits(store.get(HK)); // fresh read
    if (hr.status === "invalid") return render();
    const on = hr.data ? L.isTicked(hr.data, iso, h) : false;
    habitWrite((d) => L.setTick(d, iso, h, !on, today));
    render();
  }
  function toggleRoutine(rid, itemId, iso) {
    if (!L.isISO(iso) || iso > today) return render();
    const res = L.toggleRoutineItem(S, rid, itemId, iso);
    if (!res) return;
    save();
    const r = routineById(rid);
    if (res.becameComplete) {
      if (Number.isInteger(r.habitIndex)) autoTick(r.habitIndex, iso);
      else toast({ title: `Rutina de ${r.name.toLowerCase()} completa ✓` });
    }
    render();
  }
  function askNotifications() {
    const st = $("#notifState");
    if (!("Notification" in window)) { st.textContent = "No disponibles"; return; }
    try {
      Promise.resolve(Notification.requestPermission()).then(() => { st.textContent = notifState(); }).catch(() => { st.textContent = notifState(); });
    } catch (e) { st.textContent = notifState(); }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (document.querySelector("dialog[open]")) return;
      const m = $("#hdrMenu");
      if (m && !m.hidden) { closeMenu(); $("#btnMenu").focus(); return; }
      if (dismissNewestToast()) e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
    const tg = e.target;
    if (tg && (/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName) || tg.isContentEditable)) return;
    if (e.key === "n") { e.preventDefault(); openTask(null); }
    else if (e.key === "r") { e.preventDefault(); openReview(); }
    else if (e.key === "t") { e.preventDefault(); go(route.name === "semana" ? "#/semana" : route.name === "mes" ? "#/mes" : "#/hoy"); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const k = e.key === "ArrowLeft" ? -1 : 1;
      if (route.name === "hoy") { e.preventDefault(); go(dayHash("hoy", L.addDays(route.sel, k))); }
      else if (route.name === "semana") { e.preventDefault(); go(dayHash("semana", L.addDays(route.sel, 7 * k))); }
      else if (route.name === "mes") { e.preventDefault(); const ym = L.addMonths(route.month, k); go(ym === today.slice(0, 7) ? "#/mes" : `#/mes?m=${ym}`); }
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const m = $("#hdrMenu");
      if (m && !m.hidden && m.contains(tg)) { e.preventDefault(); const items = $$("button", m); const i = items.indexOf(tg); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
    }
  });

  let lastRoute = null;
  window.addEventListener("hashchange", () => {
    const prev = lastRoute;
    render();
    lastRoute = route.name;
    if (prev !== route.name) { window.scrollTo(0, 0); }
  });
  window.addEventListener("storage", (e) => {
    if (e.key !== null && !WATCHED.has(e.key)) return;
    if (e.key === KEY || e.key === null) { S = loadState(); }
    if (!document.querySelector("dialog[open]")) render();
    else { R = readAll(); renderShell(); }
  });

  // ───────────────────────────────────────────── 20 s tick: live labels, reminders, day change (no full re-render)
  let lastTick = Date.now();
  const sent = new Set(); // block keys already announced on sentDay (routine:/fixed: keys repeat every day)
  let sentDay = today;
  const MAX_LATE_MS = 15 * 60000; // after sleep or a throttled tab, skip reminders that are long past
  function tick() {
    const now = Date.now();
    const t = L.todayISO();
    if (t !== sentDay) { sent.clear(); sentDay = t; lastTick = Math.max(lastTick, L.toEpoch(t, "00:00") - 1); }
    if (t !== today) render(); // new day: full re-render (render() updates `today`)
    else if (route.name === "hoy" && route.sel === today) positionNow();
    updateReviewButton();
    if (S.settings.reminders.enabled) {
      const blocks = L.dayBlocks(S, today).timed;
      const due = L.dueReminders(blocks, today, Math.max(lastTick, now - MAX_LATE_MS), now, S.settings.reminders.leadMin, sent);
      for (const b of due) {
        sent.add(b.key);
        let body;
        if (b.kind === "rutina") { const s = L.routineStreak(S, b.routineId, today); body = `Tu racha sigue en ${s.current} ${L.plural(s.current, "día", "días")}`; }
        else { const task = b.taskId ? taskById(b.taskId) : null; body = `${L.fmtDur(b.end - b.start)} · ${blockLabel(b.kind)}` + (task && task.notes ? " — " + task.notes.slice(0, 60) : ""); }
        toast({ caption: "Ritmo · " + L.nowHM(), title: b.title, body, sticky: true });
        if ("Notification" in window && Notification.permission === "granted") {
          try { new Notification(b.title, { body, tag: b.key }); } catch (err) { /* toasts only */ }
        }
      }
    }
    lastTick = now;
  }
  setInterval(tick, 20000);

  // ───────────────────────────────────────────── boot
  render();
  lastRoute = route.name;
})();
