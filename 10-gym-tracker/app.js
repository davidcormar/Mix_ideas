/* Gym tracker UI. Data: localStorage["gymtracker.v1"] = { sessions: [...], draft: {...} } */
(function () {
  const L = window.GymLogic;
  const KEY = "gymtracker.v1";
  const $ = (s) => document.querySelector(s);
  let db = load();
  let metric = "e1rm";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { sessions: [], draft: null }; }
    catch { return { sessions: [], draft: null }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast("No se pudo guardar: " + e.message); }
  }
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1800);
  }
  const today = () => new Date().toISOString().slice(0, 10);
  const fmt = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- tabs
  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll("main > section").forEach((s) => s.classList.toggle("hidden", s.id !== b.dataset.tab));
    if (b.dataset.tab === "historial") renderHistory();
    if (b.dataset.tab === "progreso") renderProgress();
  }));

  // ---------- workout
  $("#routine").innerHTML = L.ROUTINES.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
  $("#date").value = today();

  function lastSets(exId) {
    const h = L.exerciseHistory(db.sessions, exId);
    return h.length ? h[h.length - 1].sets : [];
  }

  $("#start").addEventListener("click", () => {
    if (db.draft && !confirm("Hay un entrenamiento sin guardar. ¿Descartarlo?")) return;
    const r = L.ROUTINES.find((x) => x.id === $("#routine").value);
    db.draft = {
      date: $("#date").value || today(), routine: r.id,
      exercises: r.items.map(([id, n]) => {
        const prev = lastSets(id);
        return { id, sets: Array.from({ length: n }, (_, i) => ({ weight: prev[i]?.weight ?? prev[0]?.weight ?? "", reps: "", done: false })) };
      }),
    };
    save(); renderWorkout();
  });

  function renderWorkout() {
    const w = $("#workout");
    if (!db.draft) { w.innerHTML = `<p class="muted">Elige rutina y pulsa <b>Empezar</b>. Los pesos se rellenan con los de tu última sesión.</p>`; return; }
    const r = L.ROUTINES.find((x) => x.id === db.draft.routine);
    w.innerHTML = db.draft.exercises.map((e, ei) => {
      const ex = L.EXERCISES[e.id];
      const sg = L.suggestion(db.sessions, e.id);
      const prev = lastSets(e.id).map((s) => `${fmt(s.weight)}×${s.reps}`).join(" · ");
      const altId = r.alt && (r.alt[e.id] || Object.keys(r.alt).find((k) => r.alt[k] === e.id));
      return `<div class="card">
        <h2>${esc(ex.name)} <span class="pill">${ex.type} ${L.REP_RANGE[ex.type].join("-")}</span></h2>
        ${altId ? `<button data-swap="${ei}" data-alt="${altId}" style="padding:4px 8px;font-size:13px">↔ cambiar por ${esc(L.EXERCISES[altId].name)}</button>` : ""}
        <p class="hint">Última vez: ${prev || "—"}</p>
        <p class="hint ${sg.action || ""}">💡 ${esc(sg.text)}</p>
        ${e.sets.map((s, si) => `<div class="row ${s.done ? "done" : ""}">
          <span class="n">${si + 1}</span>
          <input inputmode="decimal" placeholder="kg" value="${s.weight}" data-e="${ei}" data-s="${si}" data-f="weight">
          <input inputmode="numeric" placeholder="reps" value="${s.reps}" data-e="${ei}" data-s="${si}" data-f="reps">
          <button data-done="${ei},${si}">${s.done ? "✅" : "✓"}</button>
        </div>`).join("")}
        <button data-add="${ei}" style="padding:4px 10px;font-size:13px">+ serie</button>
      </div>`;
    }).join("") + `<div class="flex"><button class="primary" id="finish" style="flex:1">Guardar entrenamiento</button><button id="cancel">Descartar</button></div>`;
  }

  $("#workout").addEventListener("input", (ev) => {
    const t = ev.target; if (!t.dataset.f) return;
    const v = t.value.replace(",", ".");
    db.draft.exercises[t.dataset.e].sets[t.dataset.s][t.dataset.f] = v === "" ? "" : Number(v);
    save();
  });
  $("#workout").addEventListener("click", (ev) => {
    const t = ev.target;
    if (t.dataset.done) {
      const [e, s] = t.dataset.done.split(",").map(Number);
      const set = db.draft.exercises[e].sets[s]; set.done = !set.done; save(); renderWorkout();
    } else if (t.dataset.add) {
      const sets = db.draft.exercises[t.dataset.add].sets;
      sets.push({ weight: sets.at(-1)?.weight ?? "", reps: "", done: false }); save(); renderWorkout();
    } else if (t.dataset.swap) {
      db.draft.exercises[t.dataset.swap].id = t.dataset.alt; save(); renderWorkout();
    } else if (t.id === "finish") {
      const clean = { date: db.draft.date, routine: db.draft.routine, exercises: db.draft.exercises.map((e) => ({ id: e.id, sets: e.sets.filter((s) => s.weight > 0 && s.reps > 0).map((s) => ({ weight: s.weight, reps: s.reps })) })).filter((e) => e.sets.length) };
      if (!clean.exercises.length) { toast("No hay series con peso y reps"); return; }
      const newPR = clean.exercises.filter((e) => { const before = L.personalRecords(db.sessions, e.id); return !before || L.sessionStats(e.sets).best_e1rm > before.e1rm; });
      db.sessions.push(clean); db.draft = null; save(); renderWorkout();
      toast(newPR.length && db.sessions.length > 1 ? `¡Guardado! 🏆 Récord en ${newPR.length} ejercicio(s)` : "¡Entrenamiento guardado!");
    } else if (t.id === "cancel") {
      if (confirm("¿Descartar este entrenamiento?")) { db.draft = null; save(); renderWorkout(); }
    }
  });

  // ---------- history
  function renderHistory() {
    const h = db.sessions.map((s, i) => ({ s, i })).sort((a, b) => b.s.date.localeCompare(a.s.date));
    $("#history").innerHTML = h.length ? h.map(({ s, i }) => {
      const r = L.ROUTINES.find((x) => x.id === s.routine);
      const vol = s.exercises.reduce((a, e) => a + L.sessionStats(e.sets).volume, 0);
      return `<div class="card"><h2>${s.date} · ${esc(r ? r.name : s.routine)}</h2>
        <p class="muted">${s.exercises.length} ejercicios · volumen ${Math.round(vol)} kg</p>
        <table>${s.exercises.map((e) => `<tr><td>${esc(L.EXERCISES[e.id]?.name || e.id)}</td><td>${e.sets.map((x) => `${fmt(x.weight)}×${x.reps}`).join(" · ")}</td></tr>`).join("")}</table>
        <button data-del="${i}" style="margin-top:8px;font-size:13px;padding:4px 10px">Borrar</button></div>`;
    }).join("") : `<p class="muted">Aún no hay entrenamientos.</p>`;
  }
  $("#history").addEventListener("click", (ev) => {
    const i = ev.target.dataset.del; if (i === undefined) return;
    if (confirm("¿Borrar esta sesión?")) { db.sessions.splice(Number(i), 1); save(); renderHistory(); }
  });

  // ---------- progress
  $("#exSel").innerHTML = Object.entries(L.EXERCISES).map(([id, e]) => `<option value="${id}">${e.name}</option>`).join("");
  $("#exSel").addEventListener("change", renderProgress);
  document.querySelectorAll("[data-metric]").forEach((b) => b.addEventListener("click", () => {
    metric = b.dataset.metric;
    document.querySelectorAll("[data-metric]").forEach((x) => x.classList.toggle("on", x === b));
    renderProgress();
  }));

  function renderProgress() {
    const id = $("#exSel").value;
    const h = L.exerciseHistory(db.sessions, id);
    const pts = h.map(({ date, sets }) => { const st = L.sessionStats(sets); return { date, y: metric === "e1rm" ? st.best_e1rm : metric === "top" ? st.top_weight : st.volume }; });
    drawChart($("#chart"), pts, metric === "volume" ? "kg·reps" : "kg");
    $("#sugg").textContent = "💡 " + L.suggestion(db.sessions, id).text;
    const rows = Object.keys(L.EXERCISES).map((k) => [k, L.personalRecords(db.sessions, k)]).filter(([, p]) => p);
    $("#prs").innerHTML = rows.length ? `<table><tr><th>Ejercicio</th><th>Peso máx.</th><th>1RM est.</th></tr>${rows.map(([k, p]) => `<tr><td>${esc(L.EXERCISES[k].name)}</td><td>${fmt(p.weight)} kg × ${p.weight_reps}<br><span class="muted">${p.weight_date}</span></td><td>${fmt(p.e1rm)} kg<br><span class="muted">${p.e1rm_date}</span></td></tr>`).join("")}</table>` : `<p class="muted">Sin datos todavía.</p>`;
  }

  function drawChart(cv, pts, unit) {
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth || 680, H = cv.clientHeight || 220;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext("2d"); c.scale(dpr, dpr); c.clearRect(0, 0, W, H);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--mute"), acc = css.getPropertyValue("--acc"), line = css.getPropertyValue("--line");
    c.font = "12px system-ui"; c.fillStyle = ink;
    if (!pts.length) { c.fillText("Sin datos para este ejercicio", 12, H / 2); return; }
    const pad = { l: 44, r: 12, t: 12, b: 28 };
    const ys = pts.map((p) => p.y); let lo = Math.min(...ys), hi = Math.max(...ys);
    if (hi === lo) { lo -= 1; hi += 1; } const m = (hi - lo) * 0.1; lo -= m; hi += m;
    const X = (i) => pad.l + (pts.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (pts.length - 1)) * (W - pad.l - pad.r));
    const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
    c.strokeStyle = line; c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const v = lo + (k / 4) * (hi - lo); c.beginPath(); c.moveTo(pad.l, Y(v)); c.lineTo(W - pad.r, Y(v)); c.stroke(); c.fillText(Math.round(v), 4, Y(v) + 4); }
    c.fillText(unit, W - pad.r - 50, 10);
    c.strokeStyle = acc; c.lineWidth = 2; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(X(i), Y(p.y)) : c.moveTo(X(i), Y(p.y)))); c.stroke();
    c.fillStyle = acc; pts.forEach((p, i) => { c.beginPath(); c.arc(X(i), Y(p.y), 3, 0, 7); c.fill(); });
    c.fillStyle = ink; [0, pts.length - 1].forEach((i) => c.fillText(pts[i].date.slice(5), Math.min(X(i) - 14, W - 40), H - 8));
  }

  // ---------- data
  $("#export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "gymtracker", version: 1, exported: new Date().toISOString(), sessions: db.sessions }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `gym-${today()}.json`; a.click();
  });
  $("#importBtn").addEventListener("click", () => $("#import").click());
  $("#import").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const data = L.validateImport(JSON.parse(await f.text()));
      const mode = confirm(`Importar ${data.sessions.length} sesiones.\nAceptar = AÑADIR a las actuales · Cancelar = SUSTITUIR`);
      db.sessions = mode ? db.sessions.concat(data.sessions) : data.sessions; save(); toast("Importado ✔");
    } catch (e) { toast("Error: " + e.message); }
    ev.target.value = "";
  });
  $("#wipe").addEventListener("click", () => { if (confirm("¿Borrar TODOS los datos?")) { db = { sessions: [], draft: null }; save(); renderWorkout(); toast("Borrado"); } });
  $("#demo").addEventListener("click", () => {
    if (db.sessions.length && !confirm("Se añadirán 8 semanas de datos inventados. ¿Seguir?")) return;
    const start = new Date("2026-09-07");
    for (let w = 0; w < 8; w++) {
      L.ROUTINES.slice(0, 3).forEach((r, k) => {
        const d = new Date(start); d.setDate(d.getDate() + w * 7 + k * 2);
        db.sessions.push({ date: d.toISOString().slice(0, 10), routine: r.id, exercises: r.items.map(([id, n]) => {
          const base = { compuesto: 40, aislamiento: 15 }[L.EXERCISES[id].type] + w * 1.25;
          return { id, sets: Array.from({ length: n }, (_, i) => ({ weight: Math.round(base / 2.5) * 2.5, reps: 10 - i - (w % 3 === 0 ? 1 : 0) })) };
        }) });
      });
    }
    save(); toast("Datos de ejemplo cargados");
  });

  renderWorkout();
})();
