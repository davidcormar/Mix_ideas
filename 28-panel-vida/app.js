/* Panel de vida — UI. Writes only localStorage["panel.v1"] (and, on an explicit "Restaurar copia", the keys inside the backup).
   Every other app is read-only through RitmoLogic (../26-ritmo/logic.js) and LangLogic (../21-idiomas-plan/logic.js). */
(function () {
  "use strict";
  const P = window.PanelLogic, R = window.RitmoLogic || null, LL = window.LangLogic || null;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = P.esc;

  // ───────────── storage
  const store = {
    ok: true,
    get(k) { try { return localStorage.getItem(k); } catch (e) { this.ok = false; return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { this.ok = false; return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  let S, corrupt = null;
  const today = () => P.todayISO(new Date());
  function load() {
    corrupt = null;
    const raw = store.get(P.KEY);
    if (raw == null) { S = P.emptyState(); S.goals = P.starterGoals(today()); save(); return; }
    try { const o = JSON.parse(raw); if (!P.isObj(o)) throw new Error("x"); S = P.migrate(o); }
    catch (e) { corrupt = raw; S = P.emptyState(); }
  }
  function save() { if (corrupt !== null) return false; return store.set(P.KEY, JSON.stringify(S)); }
  function commit(next, msg) { S = next; if (!save() && corrupt === null) toast("No se pudo guardar: el navegador bloquea el almacenamiento."); else if (msg) toast(msg); render(); }

  // ───────────── other apps (read-only)
  function readAll(t) {
    const o = { have: {} };
    if (!R) return o;
    const hr = R.readHabits(store.get("habitos.v1"));
    o.habits = hr.status === "ok" ? hr.data : null;
    o.gym = R.readGym(store.get("gymtracker.v1"), t);
    o.paso = R.readPaso(store.get("paso.v1"), t);
    o.fin = R.readFinanzas(store.get("finanzas.v1"), t);
    o.idi = R.readIdiomas(store.get("idiomas.v1"));
    const rraw = store.get("ritmo.v1");
    if (rraw) { try { const x = JSON.parse(rraw); if (P.isObj(x)) o.ritmo = R.migrate(x, t, o.habits ? R.habitsOf(o.habits) : undefined); } catch (e) { /* ignore */ } }
    try { const p = JSON.parse(store.get("paso.v1")); o.pasoDays = p && P.isObj(p.days) ? p.days : null; } catch (e) { o.pasoDays = null; }
    try { const f = JSON.parse(store.get("finanzas.v1")); o.txs = f && Array.isArray(f.txs) ? f.txs.filter((x) => x && typeof x.date === "string" && Number.isFinite(Number(x.amount))) : null; } catch (e) { o.txs = null; }
    const sportIdx = o.habits ? R.findHabit(R.habitsOf(o.habits), R.HABIT_RE.sport) : null;
    o.hasSport = !!((o.habits && sportIdx !== null) || o.gym || o.paso || o.ritmo);
    o.sportOf = (dates) => R.sportByDay(dates, { habits: o.habits, sportIdx, gymSessions: o.gym ? o.gym.sessions : null, runs: o.paso ? o.paso.runs : null, ritmoDone: o.ritmo ? R.ritmoSportDone(o.ritmo) : null });
    if (o.idi && LL) o.fr = LL.summary(o.idi.log, "fr", t, Number(o.idi.base.fr || 0));
    else if (o.ritmo) o.frR = R.frenchStatus({ idiomas: null, tasks: o.ritmo.tasks }, t, o.ritmo.settings);
    return o;
  }
  const spend = (txs, from, to) => (txs ? txs.filter((x) => x.date >= from && x.date <= to && Number(x.amount) < 0).reduce((a, x) => a - Number(x.amount), 0) : null);
  /** Auto values for one goal: counts run from the goal's «Desde» (or 1 Jan) to min(today, deadline). */
  function goalExt(t, X, g) {
    const from = (g && g.start) || `${t.slice(0, 4)}-01-01`, to = g && g.deadline && g.deadline < t ? g.deadline : t;
    return {
      frHours: X.fr ? X.fr.hours : null,
      booksDone: S.books.filter((b) => b.status === "terminado" && b.finished && b.finished >= from && b.finished <= to).length,
      sportYear: X.hasSport && from <= to ? X.sportOf(P.range(from, to)).total : X.hasSport ? 0 : null,
      habitsMean: X.habits ? Math.round(R.monthStats(X.habits, t.slice(0, 7), t).mean * 10) / 10 : null,
    };
  }
  function weekExt(iso, t, X) {
    const days = P.weekDays(iso).filter((d) => d <= t), to = days.at(-1) || iso, e = {};
    if (!days.length) return e;
    if (X.hasSport) e.sport = X.sportOf(days).total;
    if (X.habits) e.habitsMean = P.mean(days.map((d) => R.dayScore(X.habits, d)));
    if (X.idi && LL) {
      e.frOwed = LL.summary(X.idi.log, "fr", to, Number(X.idi.base.fr || 0)).owed;
      e.frMin = X.idi.log.filter((x) => x.lang === "fr" && x.date >= days[0] && x.date <= to).reduce((a, x) => a + Number(x.minutes), 0);
    }
    if (X.pasoDays) { const st = days.map((d) => X.pasoDays[d] && Number(X.pasoDays[d].steps)).filter((n) => n > 0); if (st.length) e.stepsAvg = P.mean(st); }
    if (X.ritmo) e.tasksDone = X.ritmo.tasks.filter((k) => k.status === "done" && k.doneOn >= days[0] && k.doneOn <= to).length;
    if (X.txs) e.spend = spend(X.txs, days[0], to);
    return e;
  }

  // ───────────── helpers
  const h = (min) => P.fmtHours(min);
  const pctBar = (pct, cls = "", marker = null) => `<div class="bar" role="presentation"><i class="${cls}" style="width:${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%"></i>${marker !== null && marker > 0.01 ? `<u style="left:${Math.round(Math.min(1, marker) * 100)}%"></u>` : ""}</div>`;
  const dot = (l) => `<span class="dot ${l || ""}" aria-hidden="true"></span>`;
  const LIGHT_TXT = { ok: "bien", meh: "justo", bad: "flojo" };
  const chipL = (l, txt) => `<span class="chip ${l || ""}">${esc(txt || LIGHT_TXT[l] || "sin datos")}</span>`;
  const euros = (n) => `${P.fmtInt(n)} €`;
  function toast(msg) {
    const el = document.createElement("div"); el.className = "toast"; el.textContent = msg;
    const box = $("#toasts"); box.append(el); while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => el.remove(), 3500);
  }
  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const greeting = () => { const hr = new Date().getHours(); return hr < 6 ? "Buenas noches" : hr < 14 ? "Buenos días" : hr < 21 ? "Buenas tardes" : "Buenas noches"; };
  function header(eyebrow, title, actions = "") {
    return `<header class="head"><div><p class="eyebrow">${eyebrow}${S.demo ? ' <span class="chip demo">Datos de ejemplo</span>' : ""}</p><h1>${title}</h1></div><div class="head-actions">${actions}</div></header>`;
  }

  // ───────────── routes
  const NAV = [["panel", "Panel", "◎"], ["hoy", "Hoy", "☀︎"], ["lectura", "Lectura", "▤"], ["metas", "Metas", "◆"], ["semana", "Semana", "▦"]];
  function route() {
    const m = location.hash.match(/^#\/(\w+)(?:\?(.*))?$/) || [];
    const name = ["panel", "hoy", "lectura", "metas", "semana", "ajustes"].includes(m[1]) ? m[1] : "panel";
    const q = new URLSearchParams(m[2] || "");
    return { name, d: P.isISO(q.get("d")) ? q.get("d") : null };
  }
  function renderNav(cur) {
    $("#sideNav").innerHTML = NAV.map(([k, label, ico]) => `<a href="#/${k}" data-nav="${k}" ${cur === k ? 'aria-current="page"' : ""}><span class="ico" aria-hidden="true">${ico}</span>${label}</a>`).join("");
    $("#tabbar").innerHTML = NAV.map(([k, label, ico]) => `<a href="#/${k}" data-nav="${k}" ${cur === k ? 'aria-current="page"' : ""}><span class="ico" aria-hidden="true">${ico}</span>${label}</a>`).join("");
    const aj = $(".side-link"); if (cur === "ajustes") aj.setAttribute("aria-current", "page"); else aj.removeAttribute("aria-current");
    const t = today(), wk = P.isoWeek(t), done = !!S.reviews[wk];
    $("#sideCard").innerHTML = `<span class="faint">Revisión semanal · ${wk.slice(5)}</span><b>${done ? "Hecha ✓" : P.dow(t) >= 5 ? "Te toca este finde" : "El domingo, 10 min"}</b><a class="btn small ${done ? "" : "primary"}" href="#/semana" style="text-decoration:none;display:inline-flex;align-items:center">${done ? "Ver" : "Hacer revisión"}</a>`;
  }
  function render() {
    const r = route();
    renderNav(r.name);
    const b = $("#banner");
    if (corrupt !== null) {
      b.hidden = false;
      b.innerHTML = `<span>⚠️ Los datos guardados del Panel están dañados y no se pueden leer. No se guardará nada hasta que decidas.</span><button class="btn small" id="dlBad">Descargar el texto dañado</button><button class="btn small danger" id="resetBad">Empezar de cero</button>`;
    } else if (!store.ok) { b.hidden = false; b.textContent = "⚠️ El navegador bloquea el almacenamiento: lo que apuntes se perderá al cerrar. Exporta antes de salir."; }
    else b.hidden = true;
    const t = today(), X = readAll(t);
    const v = { panel: vPanel, hoy: vHoy, lectura: vLectura, metas: vMetas, semana: vSemana, ajustes: vAjustes }[r.name];
    $("#view").innerHTML = v(t, X, r);
    document.title = `${{ panel: "Panel", hoy: "Hoy", lectura: "Lectura", metas: "Metas", semana: "Semana", ajustes: "Ajustes" }[r.name]} · Panel de vida`;
  }

  // ───────────── PANEL
  const APPS = [
    ["26-ritmo/", "🗓️", "Ritmo", "día y rutinas"], ["27-paso/", "👟", "Paso", "pasos y comidas"], ["15-habitos/app/", "✅", "Hábitos", "10 hábitos"],
    ["10-gym-tracker/", "🏋️", "Gym", "fuerza"], ["21-idiomas-plan/", "🇫🇷", "Idiomas", "horas al B2"], ["11-finanzas/", "💶", "Finanzas", "gastos y metas"],
    ["12-mapa-viajes/", "🗺️", "Viajes", "mapa"], ["25-habilidades/mecanografia/", "⌨️", "Mecanografía", "y atajos"],
  ];
  function vPanel(t, X) {
    const last7 = P.range(P.addDays(t, -6), t), prev7 = P.range(P.addDays(t, -13), P.addDays(t, -7));
    const e = S.days[t] || {}, sl = P.sleepStats(S, last7), slPrev = P.sleepStats(S, prev7), sc = P.screenStats(S, last7), scPrev = P.screenStats(S, prev7);
    const night = P.sleepMinutes(e), wk = P.isoWeek(t), prevWk = P.isoWeek(P.addDays(t, -7));
    const snap = P.weekSnapshot(S, t, t, weekExt(t, t, X)), L = P.lights(snap, S.settings);
    const out = [];
    out.push(header(P.fmtLong(t), `${greeting()}, <b>${esc(S.settings.name)}</b>`, `<a class="btn primary" href="#/hoy" style="text-decoration:none;display:inline-flex;align-items:center">Registrar hoy</a>`));
    // review callout (weekend or Monday) + priorities of this week
    const pri = (S.reviews[prevWk] && S.reviews[prevWk].priorities.filter(Boolean)) || [];
    if (!S.reviews[wk] && P.dow(t) >= 6) out.push(`<div class="callout"><p><b>Toca la revisión semanal.</b> 10 minutos: cómo fue la semana en todas tus áreas y 3 prioridades para la siguiente.</p><a class="btn primary" href="#/semana" style="text-decoration:none">Empezar</a></div>`);
    else if (!S.reviews[prevWk] && P.dow(t) === 1) out.push(`<div class="callout"><p><b>No hiciste la revisión de la semana pasada.</b> Aún estás a tiempo.</p><a class="btn primary" href="#/semana?d=${P.addDays(t, -7)}" style="text-decoration:none">Hacerla ahora</a></div>`);
    out.push('<div class="grid">');
    // hero "tu día"
    const jd = P.journalDone(e);
    out.push(`<section class="card dark c4" aria-label="Tu día"><h2>Tu día <span class="right">${jd ? "Diario ✓" : "Diario pendiente"}</span></h2>
      <div class="kpi" style="margin-top:10px">${night !== null ? h(night) : "—"}<small>de sueño</small></div>
      <div class="rows">
        <div class="row"><span>Energía</span><b>${e.energy ? "●".repeat(e.energy) + "○".repeat(5 - e.energy) : "sin apuntar"}</b></div>
        <div class="row"><span>Móvil hoy</span><b>${e.screenMin !== undefined ? `${e.screenMin} min · objetivo ${S.settings.screenGoalMin}` : "sin apuntar"}</b></div>
        <div class="row"><span>0 redes antes de las 14:00</span><b>${e.noSocialAM === true ? "Sí" : e.noSocialAM === false ? "No" : "—"}</b></div>
      </div>
      ${pri.length ? `<p class="faint" style="margin-top:14px">Prioridades de la semana</p><ol style="margin:6px 0 0;padding-left:18px;font-size:14px">${pri.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>` : ""}
    </section>`);
    // day (Ritmo)
    if (X.ritmo) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const bl = R.dayBlocks(X.ritmo, t), next = bl.timed.find((x) => x.end > nowMin && !x.done), od = R.overdue(X.ritmo, t).length;
      const open = bl.timed.filter((x) => x.taskId && !x.done).length + bl.untimed.filter((x) => x.status === "open").length;
      const rv = !!X.ritmo.reviews[R.reviewDates(new Date()).reviewDay];
      out.push(`<section class="card c4"><h2>${dot(od ? "meh" : "ok")}Día <span class="right">Ritmo</span></h2>
        <div class="kpi" style="margin-top:10px">${open}<small>tareas abiertas hoy</small></div>
        <div class="rows"><div class="row"><span>Siguiente bloque</span><b>${next ? `${R.fmtHM(next.start)} · ${esc(next.title)}` : "nada más hoy"}</b></div>
        <div class="row"><span>Atrasadas</span><b>${od}</b></div><div class="row"><span>Revisión nocturna</span><b>${rv ? "hecha ✓" : "pendiente"}</b></div></div>
        <a class="more" href="../26-ritmo/">Abrir Ritmo →</a></section>`);
    } else out.push(`<section class="card c4"><h2>${dot()}Día</h2><p class="empty">Planifica tus bloques en <a href="../26-ritmo/">Ritmo</a> y aquí verás el siguiente bloque y lo atrasado.</p></section>`);
    // habits
    if (X.habits) {
      const ms = R.monthStats(X.habits, t.slice(0, 7), t), sc0 = R.dayScore(X.habits, t), n = R.habitCount(X.habits), wk1 = R.weakest(X.habits, t, 1)[0];
      const ob = R.objectivesOf(X.habits, t.slice(0, 7)).filter((x) => x.text);
      out.push(`<section class="card c4"><h2>${dot(L.habitos)}Hábitos <span class="right">objetivo 7,5</span></h2>
        <div class="kpi" style="margin-top:10px">${P.fmtDec(ms.mean)}<small>media del mes</small></div>${pctBar(ms.mean / n, L.habitos, 7.5 / n)}
        <div class="rows"><div class="row"><span>Hoy</span><b>${sc0} / ${n}</b></div><div class="row"><span>Más flojo (7 días)</span><b>${esc(wk1 ? wk1.name : "—")}</b></div>
        ${ob.length ? `<div class="row"><span>Objetivos del mes</span><b>${ob.filter((x) => x.done).length}/${ob.length}</b></div>` : ""}</div>
        <a class="more" href="../26-ritmo/#/habitos">Marcar en Ritmo →</a></section>`);
    } else out.push(`<section class="card c4"><h2>${dot()}Hábitos</h2><p class="empty">Marca tus 10 hábitos en <a href="../26-ritmo/#/habitos">Ritmo</a> o en <a href="../15-habitos/app/">Hábitos</a>.</p></section>`);
    // body
    if (X.hasSport || X.paso) {
      const days = P.weekDays(t).filter((d) => d <= t), sp = X.hasSport ? X.sportOf(days).total : null, fs = sp !== null ? R.floorStatus(sp, t) : null;
      const fsTxt = fs ? { estandar: "estándar ✓", suelo: "suelo ✓", falta: `faltan ${fs.need}`, riesgo: `en riesgo · faltan ${fs.need}` }[fs.state] : "";
      out.push(`<section class="card c4"><h2>${dot(L.deporte)}Cuerpo <span class="right">suelo 3 · estándar 5</span></h2>
        <div class="kpi" style="margin-top:10px">${sp ?? "—"}<small>sesiones esta semana</small></div>${pctBar((sp || 0) / 5, L.deporte, 3 / 5)}
        <div class="rows"><div class="row"><span>Estado</span><b>${fsTxt || "—"}</b></div>
        ${X.paso ? `<div class="row"><span>Pasos hoy</span><b>${P.fmtInt(X.paso.stepsToday)} · ${X.paso.pct} %</b></div>` : ""}
        ${X.gym && X.gym.last ? `<div class="row"><span>Último gimnasio</span><b>${esc(X.gym.last.name)} · ${P.fmtDay(X.gym.last.date)}</b></div>` : ""}</div>
        <a class="more" href="../27-paso/">Abrir Paso →</a></section>`);
    } else out.push(`<section class="card c4"><h2>${dot()}Cuerpo</h2><p class="empty">Apunta entrenos en <a href="../10-gym-tracker/">Gym</a> y pasos en <a href="../27-paso/">Paso</a>.</p></section>`);
    // sleep
    const bedLate = sl.bedAvg && P.hm2min(sl.bedAvg) !== null && ((P.hm2min(sl.bedAvg) - P.hm2min(S.settings.bedTarget) + 1440 + 720) % 1440) - 720;
    out.push(`<section class="card c4"><h2>${dot(L.sueno)}Sueño y energía <span class="right">7 días</span></h2>
      ${sl.nights ? `<div class="kpi" style="margin-top:10px">${h(sl.avgMin)}<small>de media</small></div>${pctBar(sl.avgMin / S.settings.sleepGoalMin, L.sueno)}
      <div class="rows"><div class="row"><span>Deuda vs. ${h(S.settings.sleepGoalMin)}</span><b>${h(sl.debtMin)}</b></div>
      <div class="row"><span>Hora media de acostarte</span><b>${sl.bedAvg}${bedLate > 15 ? ` · ${bedLate} min tarde` : ""}</b></div>
      <div class="row"><span>Energía media</span><b>${sl.energyN ? P.fmtDec(sl.energyAvg) + " / 5" : "—"}</b></div>
      ${slPrev.nights ? `<div class="row"><span>vs. semana anterior</span><b>${sl.avgMin >= slPrev.avgMin ? "+" : "−"}${Math.abs(Math.round(sl.avgMin - slPrev.avgMin))} min</b></div>` : ""}</div>
      <a class="more" href="#/semana">Ver tendencia de 8 semanas →</a>`
      : `<p class="empty">Apunta a qué hora te acostaste y te levantaste en <a href="#/hoy">Hoy</a>.</p>`}</section>`);
    // phone
    const ch = P.pctChange(sc.avg, scPrev.avg);
    out.push(`<section class="card c4"><h2>${dot(L.movil)}Móvil <span class="right">máx. ${S.settings.screenGoalMin} min</span></h2>
      ${sc.n ? `<div class="kpi" style="margin-top:10px">${Math.round(sc.avg)}<small>min/día</small></div>${pctBar(sc.avg / (S.settings.screenGoalMin * 2), L.movil, 0.5)}
      <div class="rows"><div class="row"><span>Días dentro del objetivo</span><b>${sc.onGoal} de ${sc.n}</b></div>
      ${sc.noSocialN ? `<div class="row"><span>0 redes antes de las 14:00</span><b>${sc.noSocialAM} de ${sc.noSocialN}</b></div>` : ""}
      ${ch !== null ? `<div class="row"><span>vs. semana anterior</span><b>${ch > 0 ? "↑" : ch < 0 ? "↓" : "="} ${Math.abs(ch)} %</b></div>` : ""}</div>`
      : `<p class="empty">Mira <i>Ajustes → Tiempo de uso</i> en el iPhone y apúntalo en <a href="#/hoy">Hoy</a>.</p>`}</section>`);
    // languages
    if (X.fr) {
      out.push(`<section class="card c4"><h2>${dot(X.fr.owed === 0 ? "ok" : X.fr.owed <= 60 ? "meh" : "bad")}Francés <span class="right">suelo 30'</span></h2>
        <div class="kpi" style="margin-top:10px">${X.fr.todayRequired}<small>min pendientes hoy</small></div>
        <div class="rows"><div class="row"><span>Deuda acumulada</span><b>${X.fr.owed} min</b></div><div class="row"><span>Horas totales</span><b>${P.fmtDec(X.fr.hours)} h</b></div>
        <div class="row"><span>Al ritmo actual</span><b>${X.fr.eta ? (X.fr.onTrack ? "llegas ✓" : "no llegas al B2 a tiempo") : "sin ritmo aún"}</b></div></div>
        <a class="more" href="../21-idiomas-plan/">Abrir Idiomas →</a></section>`);
    } else if (X.frR) out.push(`<section class="card c4"><h2>${dot(X.frR.owed ? "meh" : "ok")}Francés</h2><div class="kpi" style="margin-top:10px">${X.frR.todayRequired}<small>min pendientes hoy</small></div><p class="faint" style="margin-top:8px">Calculado con tus tareas de Ritmo. Apunta en <a href="../21-idiomas-plan/">Idiomas</a> para ver horas y proyección.</p></section>`);
    else out.push(`<section class="card c4"><h2>${dot()}Francés</h2><p class="empty">Apunta tus minutos en <a href="../21-idiomas-plan/">Idiomas</a>.</p></section>`);
    // reading
    const rd = P.readingStats(S, P.weekDays(t).filter((d) => d <= t)), cur = S.books.filter((b) => b.status === "leyendo");
    out.push(`<section class="card c4"><h2>${dot(L.lectura)}Lectura y aprendizaje <span class="right">semana</span></h2>
      <div class="kpi" style="margin-top:10px">${rd.pages}<small>/ ${S.settings.pagesWeekGoal} páginas</small></div>${pctBar(rd.pages / S.settings.pagesWeekGoal, L.lectura)}
      <div class="rows">${cur.slice(0, 2).map((b) => `<div class="row"><span>${esc(b.title)}</span><b>${Math.round((b.progress / b.total) * 100)} %</b></div>`).join("") || '<div class="row"><span>Nada empezado</span><b>—</b></div>'}
      <div class="row"><span>Aprendizaje (cursos)</span><b>${rd.learnMin} / ${S.settings.learnWeekGoalMin} min</b></div></div>
      <a class="more" href="#/lectura">Ver lectura →</a></section>`);
    // money
    if (X.fin || X.txs) {
      const m = spend(X.txs, `${t.slice(0, 7)}-01`, t), g = X.fin ? X.fin.goals.slice(0, 3) : [];
      out.push(`<section class="card c4"><h2>${dot()}Dinero <span class="right">Finanzas</span></h2>
        <div class="kpi" style="margin-top:10px">${m !== null ? euros(m) : "—"}<small>gastado este mes</small></div>
        <div class="rows">${g.map((x) => `<div><div class="row"><span>${esc(x.name)}</span><b>${Math.round(x.pct * 100)} %</b></div>${pctBar(x.pct)}</div>`).join("") || '<div class="row"><span>Sin metas</span><b>—</b></div>'}</div>
        <a class="more" href="../11-finanzas/">Abrir Finanzas →</a></section>`);
    } else out.push(`<section class="card c4"><h2>${dot()}Dinero</h2><p class="empty">Importa el CSV del banco en <a href="../11-finanzas/">Finanzas</a>.</p></section>`);
    // goals
    const gs = S.goals.filter((g) => !g.done).map((g) => ({ g, p: P.goalProgress(g, t, goalExt(t, X, g)) })).filter((x) => x.p.status !== "hecho")
      .sort((a, b) => (a.p.status === "atrasada" ? -1 : 0) - (b.p.status === "atrasada" ? -1 : 0) || (a.p.daysLeft ?? 9e9) - (b.p.daysLeft ?? 9e9)).slice(0, 4);
    out.push(`<section class="card c8"><h2>Metas <span class="right">${S.goals.length} en total</span></h2>
      <div class="list">${gs.map(({ g, p }) => `<div><div class="row"><span style="color:var(--ink)">${esc(g.title)}</span><b>${chipL(p.status === "en-ritmo" ? "ok" : p.status === "atrasada" || p.status === "vencida" ? "bad" : "", P.STATUS_LABEL[p.status])}</b></div>${pctBar(p.pct, p.status === "atrasada" ? "bad" : "", p.expected)}
        <p class="faint" style="margin-top:4px">${esc(p.label)}${p.daysLeft !== null ? ` · ${p.daysLeft >= 0 ? `quedan ${p.daysLeft} días` : `venció hace ${-p.daysLeft} días`}` : ""}</p></div>`).join("") || '<p class="empty">Sin metas abiertas. <a href="#/metas">Añade una</a>.</p>'}</div>
      <a class="more" href="#/metas">Ver todas →</a></section>`);
    // countdowns
    out.push(`<section class="card c4"><h2>Cuenta atrás <span class="right"><a href="#/ajustes" style="text-decoration:none">Editar</a></span></h2><div class="count">${P.countdowns(t, S.settings).map((c) => `<div><b>${P.fmtInt(c.days)}</b><span>días · ${esc(c.label)}</span></div>`).join("")}</div></section>`);
    // apps
    out.push(`<section class="card c12"><h2>Tus apps</h2><div class="apps">${APPS.map(([href, em, n, s]) => `<a class="app" href="../${href}"><span class="em" aria-hidden="true">${em}</span><span>${n}<small>${s}</small></span></a>`).join("")}</div>
      ${R ? "" : '<p class="faint" style="margin-top:10px">No se encuentran los lectores de las otras apps (../26-ritmo/logic.js). Abre el panel desde la carpeta del repo.</p>'}</section>`);
    out.push("</div>");
    return out.join("");
  }

  // ───────────── HOY (registro diario)
  function vHoy(t, X, r) {
    const d = r.d && r.d <= t ? r.d : t, e = S.days[d] || {}, j = e.journal || {}, m = P.sleepMinutes(e);
    const nav = `<div class="seg" role="group" aria-label="Cambiar de día"><button data-go="${P.addDays(d, -1)}" aria-label="Día anterior">‹</button>${d !== t ? `<button data-go="${t}">Hoy</button>` : ""}<button data-go="${P.addDays(d, 1)}" aria-label="Día siguiente" ${d >= t ? "disabled" : ""}>›</button></div>`;
    const reading = S.books.filter((b) => b.status === "leyendo");
    const week = P.range(P.addDays(t, -6), t).reverse();
    return header(d === t ? "Registro de hoy" : "Registro de otro día", `<b>${P.fmtLong(d)}</b>`, nav) + `<div class="grid" data-day="${d}">
      <section class="card c6"><h2>😴 Sueño y energía</h2><p class="sub">La noche que termina esta mañana.</p>
        <div class="fields"><label class="field">Me acosté<input type="time" data-f="bed" value="${e.bed || ""}"></label><label class="field">Me levanté<input type="time" data-f="wake" value="${e.wake || ""}"></label></div>
        <p class="faint" style="margin-top:8px" id="sleepCalc">${m !== null ? `Dormiste <b>${h(m)}</b> · objetivo ${h(S.settings.sleepGoalMin)}` : "Pon las dos horas para calcular cuánto dormiste."}</p>
        <p class="field" style="margin-top:12px">Energía (1 agotado · 5 a tope)</p>
        <div class="energy" role="group" aria-label="Energía">${[1, 2, 3, 4, 5].map((n) => `<button data-energy="${n}" aria-pressed="${e.energy === n}" aria-label="Energía ${n} de 5">${n}</button>`).join("")}</div>
      </section>
      <section class="card c6"><h2>📵 Móvil</h2><p class="sub">Tu hábito: 0 redes antes de las 14:00 y máximo ${S.settings.screenGoalMin} min.</p>
        <div class="fields"><label class="field">Tiempo de pantalla (min)<input type="number" inputmode="numeric" min="0" max="1440" step="5" data-f="screenMin" value="${e.screenMin ?? ""}" placeholder="p. ej. 55"></label></div>
        <label class="check" style="margin-top:12px"><input type="checkbox" data-f="noSocialAM" ${e.noSocialAM ? "checked" : ""}> 0 redes sociales antes de las 14:00</label>
        <details class="help"><summary>¿Dónde lo miro?</summary>iPhone: <i>Ajustes → Tiempo de uso → Ver toda la actividad</i>, pestaña <i>Día</i>. Apunta el total de ayer por la mañana si te resulta más fácil (cambia el día con ‹).</details>
      </section>
      <section class="card c12"><h2>📓 Diario de 3 líneas <span class="right">${P.journalStreak(S, t)} días seguidos</span></h2><p class="sub">Se guarda solo. Te servirá en la revisión semanal.</p>
        <div class="fields" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          <label class="field">Qué salió bien<textarea data-j="good" maxlength="500">${esc(j.good || "")}</textarea></label>
          <label class="field">Qué haría mejor<textarea data-j="better" maxlength="500">${esc(j.better || "")}</textarea></label>
          <label class="field">Agradezco<textarea data-j="grateful" maxlength="500">${esc(j.grateful || "")}</textarea></label>
        </div></section>
      <section class="card c12"><h2>📚 Lectura y aprendizaje</h2>
        ${reading.length ? `<div class="list">${reading.map((b) => `<form class="item" data-read="${b.id}"><div class="item-top"><span class="t">${esc(b.title)}</span><span class="faint">${b.progress} / ${b.total} ${b.unit}</span></div>
          <div class="actions" style="margin-top:0"><label class="field" style="flex:1;min-width:120px">Voy por (${b.unit === "páginas" ? "página" : "lección"})<input type="number" min="0" max="${b.total}" name="p" value="${b.progress}"></label>
          <label class="field" style="flex:1;min-width:100px">Minutos<input type="number" min="0" max="600" name="m" placeholder="30"></label><button class="btn primary" style="align-self:flex-end">Apuntar</button></div></form>`).join("")}</div>`
        : `<p class="empty">No tienes nada en curso. <a href="#/lectura">Añade un libro o curso</a>.</p>`}
      </section>
      <section class="card c12"><h2>Últimos 7 días</h2><div class="table-wrap"><table class="t"><thead><tr><th>Día</th><th>Sueño</th><th>Energía</th><th>Móvil</th><th>Diario</th></tr></thead><tbody>
        ${week.map((x) => { const q = S.days[x] || {}, mm = P.sleepMinutes(q); return `<tr><td><a href="#/hoy?d=${x}">${P.fmtDay(x)}</a></td><td class="n">${mm !== null ? h(mm) : "—"}</td><td class="n">${q.energy || "—"}</td><td class="n">${q.screenMin ?? "—"}</td><td>${P.journalDone(q) ? "✓" : "—"}</td></tr>`; }).join("")}
      </tbody></table></div></section></div>`;
  }

  // ───────────── LECTURA
  function vLectura(t) {
    const days = P.weekDays(t).filter((d) => d <= t), rd = P.readingStats(S, days);
    const group = (st) => S.books.filter((b) => b.status === st);
    const bookItem = (b) => {
      const eta = P.bookEta(S, b.id, t), pct = b.progress / b.total;
      return `<div class="item"><div class="item-top"><span class="t">${esc(b.title)}${b.author ? ` <span class="faint">· ${esc(b.author)}</span>` : ""}</span><span class="chip">${b.kind}</span></div>
        ${pctBar(pct, b.status === "terminado" ? "ok" : "")}
        <div class="meta"><span>${b.progress} / ${b.total} ${b.unit} · ${Math.round(pct * 100)} %</span>${eta ? `<span>Al ritmo de 2 semanas: lo acabas el ${P.fmtDay(eta.date)}</span>` : ""}${b.finished ? `<span>Terminado el ${P.fmtDay(b.finished)}</span>` : ""}</div>
        <div class="actions" style="margin-top:4px">${b.status === "pendiente" ? `<button class="btn small primary" data-bstatus="${b.id}" data-to="leyendo">Empezar</button>` : ""}
        ${b.status === "leyendo" ? `<a class="btn small" href="#/hoy" style="text-decoration:none">Apuntar avance</a><button class="btn small" data-bstatus="${b.id}" data-to="pendiente">Pausar</button>` : ""}
        <button class="btn small danger" data-bdel="${b.id}" aria-label="Borrar ${esc(b.title)}">Borrar</button></div></div>`;
    };
    const last7 = P.range(P.addDays(t, -6), t), maxP = Math.max(10, ...last7.map((d) => P.readingStats(S, [d]).pages));
    return header("Lectura y aprendizaje", "<b>Lo que lees y aprendes</b>") + `<div class="grid">
      <section class="card dark c4"><h2>Esta semana</h2><div class="kpi" style="margin-top:10px">${rd.pages}<small>/ ${S.settings.pagesWeekGoal} páginas</small></div>${pctBar(rd.pages / S.settings.pagesWeekGoal)}
        <div class="spark">${last7.map((d) => { const p = P.readingStats(S, [d]).pages; return `<div><i class="${p ? (d === t ? "today" : "") : "empty-bar"}" style="${p ? `height:${Math.max(6, (p / maxP) * 40)}px` : ""}" title="${p} páginas"></i><span>${"LMXJVSD"[P.dow(d) - 1]}</span></div>`; }).join("")}</div>
        <div class="rows"><div class="row"><span>Cursos</span><b>${rd.lessons} lecciones · ${rd.learnMin} min</b></div><div class="row"><span>Objetivo de aprendizaje</span><b>${S.settings.learnWeekGoalMin} min/semana</b></div></div></section>
      <section class="card c8"><h2>Añadir libro o curso</h2>
        <form id="bookForm" class="fields"><label class="field" style="grid-column:span 2">Título<input name="title" required maxlength="120" placeholder="Meditaciones"></label>
          <label class="field">Autor / plataforma<input name="author" maxlength="80" placeholder="Marco Aurelio"></label>
          <label class="field">Tipo<select name="kind"><option value="libro">Libro (páginas)</option><option value="curso">Curso (lecciones)</option></select></label>
          <label class="field">Total<input name="total" type="number" min="1" required placeholder="250"></label>
          <label class="field">Estado<select name="status"><option value="leyendo">Empezado</option><option value="pendiente">Pendiente</option></select></label>
          <div class="actions" style="grid-column:1/-1;margin-top:0"><button class="btn primary">Añadir</button></div></form>
        <details class="help"><summary>Ideas de tus notas</summary>Estoicismo (<i>Meditaciones</i>, <i>Cartas a Lucilio</i>), retórica clásica (Aristóteles, Cicerón), el curso de ML de Andrew Ng (carpeta 03) y el plan de habilidades (carpeta 25). Las obras clásicas están gratis en dominio público.</details>
      </section>
      <section class="card c12"><h2>En curso <span class="right">${group("leyendo").length}</span></h2><div class="list">${group("leyendo").map(bookItem).join("") || '<p class="empty">Nada en curso.</p>'}</div></section>
      <section class="card c6"><h2>Pendientes <span class="right">${group("pendiente").length}</span></h2><div class="list">${group("pendiente").map(bookItem).join("") || '<p class="empty">Lista vacía.</p>'}</div></section>
      <section class="card c6"><h2>Terminados <span class="right">${group("terminado").length}</span></h2><div class="list">${group("terminado").map(bookItem).join("") || '<p class="empty">Aún ninguno: el primero cuenta doble.</p>'}</div></section>
    </div>`;
  }

  // ───────────── METAS
  let editGoal = null;
  function vMetas(t, X) {
    const g0 = editGoal ? S.goals.find((g) => g.id === editGoal) : null;
    const item = (g) => {
      const ge = goalExt(t, X, g), p = P.goalProgress(g, t, ge), l = p.status === "en-ritmo" || p.status === "hecho" ? "ok" : p.status === "atrasada" || p.status === "vencida" ? "bad" : "";
      return `<div class="item"><div class="item-top"><span class="t">${esc(g.title)}</span>${chipL(l, P.STATUS_LABEL[p.status])}</div>
        ${pctBar(p.pct, l, p.expected)}
        <div class="meta"><span>${esc(p.label)}</span>${g.deadline ? `<span>${p.daysLeft >= 0 ? `quedan ${p.daysLeft} días (${P.fmtDay(g.deadline)} ${g.deadline.slice(0, 4)})` : `venció el ${P.fmtDay(g.deadline)}`}</span>` : ""}${p.expected !== null && p.status !== "hecho" ? `<span>deberías ir por el ${Math.round(p.expected * 100)} %</span>` : ""}${g.auto ? `<span>auto: ${esc(P.AUTO[g.auto])}${ge[g.auto] == null ? " (sin datos)" : ""}</span>` : ""}</div>
        ${g.kind === "hito" ? `<div class="steps">${g.steps.map((s, i) => `<label class="check"><input type="checkbox" data-gstep="${g.id}" data-i="${i}" ${s.done ? "checked" : ""}> ${esc(s.text)}</label>`).join("")}</div>` : ""}
        <div class="actions" style="margin-top:4px">${g.kind === "numero" && !g.auto ? `<label class="field" style="flex-direction:row;display:flex;align-items:center;gap:8px">Llevo<input class="inline" style="width:110px" type="number" step="any" min="0" data-gcur="${g.id}" value="${g.current}" aria-label="Valor actual de ${esc(g.title)}"></label>` : ""}
          ${g.kind === "hito" ? `<button class="btn small ${g.done ? "" : "primary"}" data-gdone="${g.id}">${g.done ? "Reabrir" : "Marcar hecha"}</button>` : ""}
          <button class="btn small" data-gedit="${g.id}">Editar</button><button class="btn small danger" data-gdel="${g.id}" aria-label="Borrar meta ${esc(g.title)}">Borrar</button></div></div>`;
    };
    const areas = Object.keys(P.AREAS).filter((a) => S.goals.some((g) => g.area === a));
    const v = g0 || { title: "", area: "vida", kind: "numero", target: "", unit: "", auto: "", start: t, deadline: "", steps: [] };
    return header("Metas del año y del trimestre", "<b>Tus metas</b>") + `<div class="grid">
      <section class="card c7"><h2>${g0 ? "Editar meta" : "Nueva meta"}</h2>
        <form id="goalForm" class="fields" data-id="${g0 ? g0.id : ""}">
          <label class="field" style="grid-column:1/-1">Meta<input name="title" required maxlength="120" value="${esc(v.title)}" placeholder="Media maratón en menos de 1:55"></label>
          <label class="field">Área<select name="area">${Object.entries(P.AREAS).map(([k, n]) => `<option value="${k}" ${v.area === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="field">Tipo<select name="kind"><option value="numero" ${v.kind === "numero" ? "selected" : ""}>Número (llevo X de Y)</option><option value="hito" ${v.kind === "hito" ? "selected" : ""}>Hito con pasos</option></select></label>
          <label class="field">Objetivo<input name="target" type="number" step="any" min="0" value="${v.target}" placeholder="12"></label>
          <label class="field">Unidad<input name="unit" maxlength="20" value="${esc(v.unit)}" placeholder="libros"></label>
          <label class="field">Se calcula sola con<select name="auto"><option value="">— lo apunto yo —</option>${Object.entries(P.AUTO).map(([k, n]) => `<option value="${k}" ${v.auto === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="field">Desde<input name="start" type="date" value="${v.start || ""}"></label>
          <label class="field">Fecha límite<input name="deadline" type="date" value="${v.deadline || ""}"></label>
          <label class="field" style="grid-column:1/-1">Pasos (solo hitos, uno por línea)<textarea name="steps" placeholder="Inscribirme&#10;Plan de 16 semanas&#10;Carrera">${esc(v.steps.map((s) => s.text).join("\n"))}</textarea></label>
          <div class="actions" style="grid-column:1/-1;margin-top:0"><button class="btn primary">${g0 ? "Guardar cambios" : "Añadir meta"}</button>${g0 ? '<button type="button" class="btn" id="cancelGoal">Cancelar</button>' : ""}</div>
        </form></section>
      <section class="card c5"><h2>Cómo leerlas</h2><div class="rows" style="font-size:14px">
        <p>La barra es lo que llevas; la rayita, <b>dónde deberías ir</b> si avanzas a ritmo constante entre «Desde» y la fecha límite.</p>
        <p>${chipL("ok", "En ritmo")} vas por delante o como mucho 10 puntos por detrás. ${chipL("bad", "Atrasada")} más de 10 puntos por detrás.</p>
        <p>Las metas «se calcula sola» leen tus apps: horas de francés (Idiomas), sesiones de deporte (Gym, Paso, Hábitos y Ritmo, sin contar dos veces), libros terminados y media de hábitos.</p>
        <p class="faint">Las 6 primeras salen de tus visiones; cámbialas o bórralas.</p></div></section>
      ${areas.map((a) => `<section class="card c12"><h2>${P.AREAS[a]} <span class="right">${S.goals.filter((g) => g.area === a).length}</span></h2><div class="list">${S.goals.filter((g) => g.area === a).map(item).join("")}</div></section>`).join("") || '<section class="card c12"><p class="empty">Sin metas todavía.</p></section>'}
    </div>`;
  }

  // ───────────── SEMANA (revisión)
  function vSemana(t, X, r) {
    const ref = r.d && r.d <= t ? r.d : t, ws = P.weekStart(ref), wk = P.isoWeek(ref), days = P.weekDays(ref).filter((d) => d <= t);
    const snap = P.weekSnapshot(S, ref, t, weekExt(ref, t, X)), L = P.lights(snap, S.settings), rv = S.reviews[wk];
    const prevPri = (S.reviews[P.isoWeek(P.addDays(ws, -7))] || {}).priorities || [];
    const rowsA = [
      ["Sueño medio", snap.sleepAvgMin != null ? h(snap.sleepAvgMin) : null, L.sueno],
      ["Energía media", snap.energyAvg != null ? P.fmtDec(snap.energyAvg) + " / 5" : null, null],
      ["Móvil", snap.screenAvg != null ? Math.round(snap.screenAvg) + " min/día" : null, L.movil],
      ["Deporte", snap.sport != null ? `${snap.sport} sesiones` : null, L.deporte],
      ["Hábitos", snap.habitsMean != null ? P.fmtDec(snap.habitsMean) + " / día" : null, L.habitos],
      ["Francés", snap.frMin != null ? `${snap.frMin} min · deuda ${snap.frOwed}` : null, L.frances],
      ["Lectura", `${snap.pages} páginas · ${snap.learnMin} min de cursos`, L.lectura],
      ["Pasos", snap.stepsAvg != null ? P.fmtInt(snap.stepsAvg) + " /día" : null, null],
      ["Tareas hechas (Ritmo)", snap.tasksDone != null ? String(snap.tasksDone) : null, null],
      ["Gasto", snap.spend != null ? euros(snap.spend) : null, null],
      ["Diario", `${snap.journalDays} de ${snap.days} días`, null],
    ];
    const journals = days.filter((d) => P.journalDone(S.days[d])).map((d) => { const j = S.days[d].journal; return `<div class="journal-entry"><b>${P.fmtLong(d)}</b>${j.good ? `✓ ${esc(j.good)}<br>` : ""}${j.better ? `↗ ${esc(j.better)}<br>` : ""}${j.grateful ? `♡ ${esc(j.grateful)}` : ""}</div>`; }).join("");
    const v = rv || { wins: ["", "", ""], lesson: "", priorities: ["", "", ""], score: null };
    const nav = `<div class="seg" role="group" aria-label="Cambiar de semana"><button data-wgo="${P.addDays(ws, -7)}" aria-label="Semana anterior">‹</button>${ws !== P.weekStart(t) ? `<button data-wgo="${t}">Esta</button>` : ""}<button data-wgo="${P.addDays(ws, 7)}" aria-label="Semana siguiente" ${P.addDays(ws, 7) > t ? "disabled" : ""}>›</button></div>`;
    return header(`Semana ${wk.slice(6)} · ${P.fmtDay(ws)} – ${P.fmtDay(P.addDays(ws, 6))}`, `<b>Revisión semanal</b>${rv ? ' <span class="chip ok">hecha</span>' : ""}`, nav) + `<div class="grid">
      <section class="card c5"><h2>Cómo fue la semana <span class="right">${snap.days} días</span></h2>
        <div class="table-wrap"><table class="t"><tbody>${rowsA.map(([k, val, l]) => `<tr><td>${l !== undefined ? dot(val == null ? null : l) : ""} ${k}</td><td class="n">${val == null ? '<span class="faint">sin datos</span>' : esc(val)}</td></tr>`).join("")}</tbody></table></div>
        ${prevPri.filter(Boolean).length ? `<p class="faint" style="margin-top:12px">Tus prioridades para esta semana eran:</p><ol style="margin:6px 0 0;padding-left:18px;font-size:14px">${prevPri.filter(Boolean).map((p) => `<li>${esc(p)}</li>`).join("")}</ol>` : ""}
      </section>
      <section class="card c7"><h2>Tu revisión ${rv && rv.at ? `<span class="right">guardada ${esc(rv.at.slice(0, 16).replace("T", " "))}</span>` : ""}</h2>
        <form id="reviewForm" data-week="${wk}" data-ref="${ref}">
          <p class="field" style="margin-top:12px">Nota de la semana (1-10)</p>
          <div class="energy" role="group" aria-label="Nota de la semana">${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<button type="button" data-score="${n}" aria-pressed="${v.score === n}" style="width:40px;height:40px;font-size:15px">${n}</button>`).join("")}</div>
          <div class="fields" style="grid-template-columns:1fr">
            ${[0, 1, 2].map((i) => `<label class="field">Victoria ${i + 1}<input name="w${i}" maxlength="300" value="${esc(v.wins[i] || "")}"></label>`).join("")}
            <label class="field">Lo que aprendí / cambiaría<textarea name="lesson" maxlength="500">${esc(v.lesson)}</textarea></label>
            ${[0, 1, 2].map((i) => `<label class="field">Prioridad ${i + 1} para la semana que viene<input name="p${i}" maxlength="300" value="${esc(v.priorities[i] || "")}"></label>`).join("")}
          </div>
          <div class="actions"><button class="btn primary">${rv ? "Actualizar revisión" : "Guardar revisión"}</button><span class="faint">Se guarda con la foto de los números de arriba.</span></div>
        </form></section>
      ${trendCard(t)}
      <section class="card c12"><h2>Tu diario de la semana</h2><div class="list">${journals || '<p class="empty">No escribiste el diario esta semana.</p>'}</div></section>
    </div>`;
  }

  // ───────────── trend chart (8 weeks): one row of bars per metric, goal line, current week highlighted
  function trendCard(t) {
    const tr = P.trend(S, t, 8), st = S.settings;
    const row = (label, key, fmt, goal, better, max) => {
      const vals = tr.map((w) => w[key]), have = vals.filter((v) => v != null);
      if (!have.length) return `<div class="trend"><p class="trend-h">${label}</p><p class="faint">Sin datos todavía.</p></div>`;
      const top = Math.max(max, ...have) * 1.05;
      const cls = (v) => (v == null ? "" : (better === "up" ? v >= goal : v <= goal) ? "ok" : "bad");
      const lastTwo = vals.slice(-2);
      const delta = lastTwo[0] != null && lastTwo[1] != null ? lastTwo[1] - lastTwo[0] : null;
      return `<div class="trend"><p class="trend-h">${label}<span>${fmt(have.at(-1))}${delta !== null && Math.abs(delta) > 0.0001 ? ` · ${delta > 0 ? "↑" : "↓"} ${fmt(Math.abs(delta))} vs. semana anterior` : ""}</span></p>
        <div class="tbars" role="img" aria-label="${label}: ${tr.map((w) => `${w.week.slice(5)} ${w[key] == null ? "sin datos" : fmt(w[key])}`).join(", ")}">
          <u style="bottom:calc(18px + ${((goal / top) * 78).toFixed(1)}px)" title="objetivo ${fmt(goal)}"></u>
          ${tr.map((w) => `<div>${w[key] == null ? '<i class="none"></i>' : `<i class="${cls(w[key])}${w.current ? " cur" : ""}" style="height:${Math.max(4, (w[key] / top) * 100)}%"></i>`}<span>${w.week.slice(6)}</span></div>`).join("")}
        </div></div>`;
    };
    return `<section class="card c12"><h2>Tendencia de 8 semanas <span class="right">la raya es tu objetivo · S = semana</span></h2><div class="trends">
      ${row("Sueño medio", "sleepAvgMin", (v) => (v < 60 ? Math.round(v) + " min" : h(v)), st.sleepGoalMin, "up", st.sleepGoalMin)}
      ${row("Energía media", "energyAvg", (v) => P.fmtDec(v) + " / 5", 3.5, "up", 5)}
      ${row("Móvil", "screenAvg", (v) => Math.round(v) + " min", st.screenGoalMin, "down", st.screenGoalMin)}
    </div></section>`;
  }

  // ───────────── AJUSTES
  function vAjustes(t) {
    const st = S.settings, present = P.APP_KEYS.filter(({ key }) => store.get(key) != null);
    return header("Ajustes y datos", "<b>Ajustes</b>") + `<div class="grid">
      <section class="card c6"><h2>Tus objetivos</h2><form id="setForm" class="fields">
        <label class="field">Nombre<input name="name" maxlength="40" value="${esc(st.name)}"></label>
        <label class="field">Sueño (horas)<input name="sleepH" type="number" min="5" max="11" step="0.25" value="${st.sleepGoalMin / 60}"></label>
        <label class="field">Acostarme a las<input name="bedTarget" type="time" value="${st.bedTarget}"></label>
        <label class="field">Móvil máx. (min/día)<input name="screenGoalMin" type="number" min="5" max="600" step="5" value="${st.screenGoalMin}"></label>
        <label class="field">Páginas por semana<input name="pagesWeekGoal" type="number" min="5" max="2000" step="5" value="${st.pagesWeekGoal}"></label>
        <label class="field">Cursos (min/semana)<input name="learnWeekGoalMin" type="number" min="10" max="3000" step="10" value="${st.learnWeekGoalMin}"></label>
        <label class="field" style="grid-column:1/-1">Cuenta atrás (una por línea: AAAA-MM-DD y nombre)<textarea name="countdowns" rows="4" placeholder="2027-01-06 Woxsen (India)">${esc(P.countdownsText(st.countdowns || []))}</textarea></label>
        <div class="actions" style="grid-column:1/-1;margin-top:0"><button class="btn primary">Guardar</button></div></form>
        <p class="faint" style="margin-top:10px">Sobre el sueño: las recomendaciones generales para adultos jóvenes están entre 7 y 9 horas. Es información general, no consejo médico; si duermes mal de forma continuada, consúltalo con tu médico.</p></section>
      <section class="card c6"><h2>Copia de seguridad de TODAS tus apps</h2>
        <p class="sub">Un solo fichero con los datos de ${P.APP_KEYS.length} apps del repo. Hoy hay datos de: ${present.map((x) => esc(x.app)).join(", ") || "ninguna"}.</p>
        <div class="actions"><button class="btn primary" id="backupAll">Descargar copia completa</button><button class="btn" id="restoreAll">Restaurar copia…</button></div>
        <p class="faint" style="margin-top:10px">Haz una copia cada semana (por ejemplo, al terminar la revisión) y guárdala en la nube. Todo vive en este navegador: si borras sus datos o cambias de móvil, se pierde.</p></section>
      <section class="card c12"><h2>Datos del Panel</h2>
        <div class="actions"><button class="btn" id="exportPanel">Exportar solo el Panel (JSON)</button><button class="btn" id="importPanel">Importar Panel…</button>
        ${S.demo ? '<button class="btn" id="clearDemo">Quitar datos de ejemplo</button>' : '<button class="btn" id="loadDemo">Cargar datos de ejemplo</button>'}
        <button class="btn danger" id="wipe">Borrar datos del Panel</button></div>
        <p class="faint" style="margin-top:10px">Los ejemplos solo tocan el Panel (no tus otras apps). «Borrar» elimina solo <code>panel.v1</code>.</p></section>
    </div>`;
  }

  // ───────────── events
  let fileMode = null;
  function onClick(ev) {
    const el = ev.target.closest("button, [data-go], [data-wgo]");
    if (!el) return;
    const t = today();
    if (el.dataset.go) { location.hash = el.dataset.go === t ? "#/hoy" : `#/hoy?d=${el.dataset.go}`; return; }
    if (el.dataset.wgo) { location.hash = P.weekStart(el.dataset.wgo) === P.weekStart(t) ? "#/semana" : `#/semana?d=${el.dataset.wgo}`; return; }
    if (el.dataset.energy) { const d = $("[data-day]").dataset.day, n = Number(el.dataset.energy); commit(P.setDay(S, d, { energy: (S.days[d] || {}).energy === n ? null : n })); return; }
    if (el.dataset.score) { ev.preventDefault(); el.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === el && b.getAttribute("aria-pressed") !== "true"))); return; }
    if (el.dataset.bstatus) { const s = { ...S, books: S.books.map((b) => (b.id === el.dataset.bstatus ? { ...b, status: el.dataset.to } : b)) }; commit(s); return; }
    if (el.dataset.bdel) { const b = S.books.find((x) => x.id === el.dataset.bdel); if (b && confirm(`¿Borrar «${b.title}» y su registro de lectura?`)) commit({ ...S, books: S.books.filter((x) => x !== b), readLog: S.readLog.filter((x) => x.bookId !== b.id) }, "Borrado"); return; }
    if (el.dataset.gdel) { const g = S.goals.find((x) => x.id === el.dataset.gdel); if (g && confirm(`¿Borrar la meta «${g.title}»?`)) { if (editGoal === g.id) editGoal = null; commit({ ...S, goals: S.goals.filter((x) => x !== g) }, "Meta borrada"); } return; }
    if (el.dataset.gdone) { commit({ ...S, goals: S.goals.map((g) => (g.id === el.dataset.gdone ? { ...g, done: !g.done } : g)) }, "Meta actualizada"); return; }
    if (el.dataset.gedit) { editGoal = el.dataset.gedit; render(); $("#goalForm input").focus(); window.scrollTo({ top: 0 }); return; }
    switch (el.id) {
      case "cancelGoal": editGoal = null; render(); return;
      case "dlBad": download(`panel-danado-${today()}.json`, corrupt); return;
      case "resetBad": if (confirm("¿Descartar los datos dañados y empezar de cero? Descarga antes el texto si lo quieres conservar.")) { corrupt = null; S = P.emptyState(); S.goals = P.starterGoals(today()); save(); render(); } return;
      case "backupAll": download(`copia-mix-ideas-${today()}.json`, JSON.stringify(P.buildBackup((k) => store.get(k), new Date().toISOString()), null, 1)); toast("Copia descargada"); return;
      case "restoreAll": fileMode = "all"; $("#fileIn").click(); return;
      case "exportPanel": download(`panel-${today()}.json`, JSON.stringify(S, null, 1)); return;
      case "importPanel": fileMode = "panel"; $("#fileIn").click(); return;
      case "loadDemo": if (confirm("Cargar datos de ejemplo en el Panel. Sustituyen lo que tengas en el Panel (tus otras apps no se tocan). ¿Seguir?")) commit(P.demoState(today()), "Datos de ejemplo cargados"); return;
      case "clearDemo": { const s = P.emptyState(); s.settings = S.settings; s.goals = P.starterGoals(today()); commit(s, "Datos de ejemplo quitados"); return; }
      case "wipe": if (confirm("¿Borrar todos los datos del Panel? Tus otras apps no se tocan.")) { store.del(P.KEY); load(); render(); toast("Panel borrado"); } return;
    }
  }
  let jTimer = null;
  function onInput(ev) {
    const el = ev.target;
    if (el.dataset.j) {
      clearTimeout(jTimer);
      const d = $("[data-day]").dataset.day, k = el.dataset.j, v = el.value;
      jTimer = setTimeout(() => { S = P.setDay(S, d, { journal: { [k]: v } }); save(); }, 400);
    }
  }
  function onChange(ev) {
    const el = ev.target;
    if (el.dataset.f) {
      const d = $("[data-day]").dataset.day, f = el.dataset.f;
      let v = el.type === "checkbox" ? el.checked : el.value;
      if (f === "screenMin") v = el.value === "" ? null : Math.max(0, Math.min(1440, Math.round(Number(el.value))));
      commit(P.setDay(S, d, { [f]: v === "" ? null : v }), f === "screenMin" && v !== null ? `Móvil: ${v} min` : null);
      return;
    }
    if (el.dataset.j) { clearTimeout(jTimer); const d = $("[data-day]").dataset.day; S = P.setDay(S, d, { journal: { [el.dataset.j]: el.value } }); if (save()) toast("Diario guardado"); return; }
    if (el.dataset.gstep) {
      commit({ ...S, goals: S.goals.map((g) => (g.id === el.dataset.gstep ? { ...g, steps: g.steps.map((s, i) => (i === Number(el.dataset.i) ? { ...s, done: el.checked } : s)) } : g)) });
      return;
    }
    if (el.dataset.gcur) { commit({ ...S, goals: S.goals.map((g) => (g.id === el.dataset.gcur ? { ...g, current: Math.max(0, Number(el.value) || 0) } : g)) }, "Meta actualizada"); return; }
    if (el.id === "fileIn") { readFile(el); }
  }
  async function readFile(el) {
    const f = el.files[0]; el.value = ""; if (!f) return;
    const text = await f.text();
    if (fileMode === "panel") {
      let o; try { o = JSON.parse(text); } catch (e) { alert("El fichero no es JSON válido. No se ha cambiado nada."); return; }
      if (!P.isObj(o) || o.version !== 1 || !P.isObj(o.days)) { alert("No es una exportación del Panel de vida. No se ha cambiado nada."); return; }
      if (confirm("Esto sustituye todos los datos del Panel por los del fichero. ¿Seguir?")) commit(P.migrate(o), "Panel importado");
    } else if (fileMode === "all") {
      const p = P.parseBackup(text);
      if (!p.ok) { alert(p.error + " No se ha cambiado nada."); return; }
      if (!confirm(`Copia del ${p.exportedAt.slice(0, 10) || "?"} con datos de: ${p.entries.map((e) => e.app).join(", ")}.\n\nSe SUSTITUIRÁN los datos actuales de esas apps en este navegador. ¿Restaurar?`)) return;
      let ok = 0; for (const e of p.entries) if (store.set(e.key, e.value)) ok++;
      load(); render(); toast(`Restauradas ${ok} de ${p.entries.length} apps`);
    }
  }
  function onSubmit(ev) {
    ev.preventDefault();
    const f = ev.target, fd = new FormData(f), t = today();
    if (f.dataset.read) {
      const b = S.books.find((x) => x.id === f.dataset.read), p = Number(fd.get("p")), m = Number(fd.get("m")) || 0;
      const d = ($("[data-day]") || {}).dataset ? $("[data-day]").dataset.day : t;
      const next = P.logReading(S, f.dataset.read, p, m, d);
      if (next === S) { toast("Nada que apuntar: cambia la página o los minutos"); return; }
      const nb = next.books.find((x) => x.id === b.id), delta = nb.progress - b.progress;
      commit(next, nb.status === "terminado" && b.status !== "terminado" ? `🎉 Terminaste «${b.title}»` : `${delta > 0 ? `+${delta} ${b.unit}` : "Apuntado"}${m ? ` · ${m} min` : ""}`);
      return;
    }
    if (f.id === "bookForm") {
      const b = P.normBook({ title: fd.get("title"), author: fd.get("author"), kind: fd.get("kind"), total: fd.get("total"), status: fd.get("status"), progress: 0 });
      commit({ ...S, books: [...S.books, b] }, `Añadido «${b.title}»`); return;
    }
    if (f.id === "goalForm") {
      const kind = fd.get("kind"), steps = String(fd.get("steps") || "").split("\n").map((x) => x.trim()).filter(Boolean);
      const old = f.dataset.id ? S.goals.find((g) => g.id === f.dataset.id) : null;
      const g = P.normGoal({ id: old ? old.id : undefined, title: fd.get("title"), area: fd.get("area"), kind, target: fd.get("target"), unit: fd.get("unit"), auto: kind === "numero" ? fd.get("auto") : null,
        start: fd.get("start"), deadline: fd.get("deadline"), current: old ? old.current : 0, done: old ? old.done : false,
        steps: steps.map((text) => ({ text, done: !!(old && old.steps.find((s) => s.text === text && s.done)) })) });
      if (g.kind === "numero" && !(g.target > 0)) { alert("Pon un objetivo mayor que 0 (o elige «Hito con pasos»)."); return; }
      if (g.deadline && g.start && g.deadline < g.start) { alert("La fecha límite es anterior a «Desde»."); return; }
      editGoal = null;
      commit({ ...S, goals: old ? S.goals.map((x) => (x.id === old.id ? g : x)) : [...S.goals, g] }, old ? "Meta guardada" : "Meta añadida"); return;
    }
    if (f.id === "reviewForm") {
      const wk = f.dataset.week, ref = f.dataset.ref, X = readAll(t), sc = f.querySelector('[data-score][aria-pressed="true"]');
      const snap = P.weekSnapshot(S, ref, t, weekExt(ref, t, X));
      const rv = P.normReview({ at: new Date().toISOString().slice(0, 16), wins: [0, 1, 2].map((i) => fd.get("w" + i)), lesson: fd.get("lesson"), priorities: [0, 1, 2].map((i) => fd.get("p" + i)), score: sc ? Number(sc.dataset.score) : null, snapshot: snap });
      commit({ ...S, reviews: { ...S.reviews, [wk]: rv } }, "Revisión guardada · buena semana"); return;
    }
    if (f.id === "setForm") {
      const cd = P.parseCountdowns(fd.get("countdowns"));
      if (cd.errors.length) { alert(`Cuenta atrás: revisa la línea ${cd.errors.join(", ")}. Formato: 2027-01-06 Woxsen (India)`); return; }
      const s = P.migrate({ ...S, settings: { countdowns: cd.list, name: fd.get("name"), sleepGoalMin: Math.round(Number(fd.get("sleepH")) * 60), bedTarget: fd.get("bedTarget"), screenGoalMin: fd.get("screenGoalMin"), pagesWeekGoal: fd.get("pagesWeekGoal"), learnWeekGoalMin: fd.get("learnWeekGoalMin") } });
      commit(s, "Ajustes guardados");
    }
  }

  // ───────────── boot
  load();
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  document.addEventListener("submit", onSubmit);
  window.addEventListener("hashchange", () => { editGoal = null; render(); $("#main").focus({ preventScroll: true }); window.scrollTo(0, 0); });
  window.addEventListener("storage", (ev) => { if (ev.key === P.KEY) load(); if (!document.activeElement || !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) render(); });
  let lastDay = today();
  setInterval(() => { if (today() !== lastDay && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) { lastDay = today(); render(); } }, 60000);
  render();
})();
