/* Importar salud — UI. Writes paso.v1 (steps + sessions) with PasoLogic and panel.v1 (sleep) with PanelLogic,
   always on a fresh copy read right before saving. Nothing else is touched. */
(function () {
  "use strict";
  const S = window.SaludLogic, PA = window.PasoLogic, PL = window.PanelLogic;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => S.localISO(new Date());
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const fmtInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const dayLabel = (iso) => `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}/${iso.slice(2, 4)}`;
  function toast(msg) { const el = document.createElement("div"); el.className = "toast"; el.textContent = msg; $("#toasts").append(el); setTimeout(() => el.remove(), 4500); }

  const src = { health: null, shortcut: null, strava: null };
  let preview = [];

  function render() {
    preview = S.buildPreview(src);
    $("#previewCard").hidden = !preview.length;
    if (!preview.length) return;
    const nW = preview.reduce((a, d) => a + d.workouts.length, 0);
    $("#pvCount").textContent = `${preview.length} días · ${nW} entrenos`;
    $("#pvBody").innerHTML = preview.slice(0, 120).map((d, i) => `<tr><td>${dayLabel(d.date)}</td><td class="n">${d.steps ? fmtInt(d.steps) : "—"}</td>
      <td class="n">${d.bed ? `${d.bed} → ${d.wake}${d.asleepMin ? ` <span class="faint">(${Math.floor(d.asleepMin / 60)} h ${String(d.asleepMin % 60).padStart(2, "0")} dormido)</span>` : ""}` : "—"}</td>
      <td>${d.workouts.map((w, j) => `<label class="wk"><input type="checkbox" data-d="${i}" data-w="${j}" ${w.on ? "checked" : ""}> ${esc(S.KIND_LABEL[w.kind])}${w.start ? " " + w.start : ""} · ${w.minutes} min${w.km ? ` · ${String(w.km).replace(".", ",")} km` : ""} <span class="faint">${esc(w.sources.join(" + "))}</span></label>`).join("") || "—"}</td></tr>`).join("");
    $("#pvNote").textContent = preview.length > 120 ? `Se muestran los 120 días más recientes; se importan los ${preview.length}.` : "";
  }

  // ───── sources
  function readShortcut(text, from) {
    const r = S.parseShortcut(text, today());
    if (!r.ok) { if (from !== "hash") alert(r.error); return; }
    src.shortcut = r.days; render(); toast(`Atajo leído: ${r.days.length} día(s). Revisa y pulsa «Importar».`);
    $("#previewCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("#paste").onclick = async () => {
    try { const t = await navigator.clipboard.readText(); if (!t) throw new Error("vacío"); $("#scText").value = t; readShortcut(t); }
    catch (e) { alert("No se pudo leer el portapapeles. Pega el texto en el cuadro de abajo (mantén pulsado → Pegar)."); $("#scText").focus(); }
  };
  $("#scRead").onclick = () => readShortcut($("#scText").value);
  $("#csvFile").onchange = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const r = S.parseStrava(await f.text()); ev.target.value = "";
    if (!r.ok) { $("#csvInfo").textContent = r.error; return; }
    src.strava = r.workouts; render();
    $("#csvInfo").textContent = `${r.workouts.length} actividades${r.errors ? ` · ${r.errors} filas sin fecha válida omitidas` : ""}`;
  };
  $("#xmlFile").onchange = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const p = S.createHealthParser(), bar = $("#xmlProg"), info = $("#xmlInfo");
    bar.hidden = false; info.textContent = "Leyendo…";
    try {
      if (f.stream) {
        const reader = f.stream().getReader(), dec = new TextDecoder(); let read = 0;
        for (;;) {
          const { done, value } = await reader.read(); if (done) break;
          read += value.length; p.push(dec.decode(value, { stream: true }));
          bar.firstElementChild.style.width = Math.round((read / f.size) * 100) + "%";
        }
        p.push(dec.decode());
      } else p.push(await f.text());
      src.health = p.finish(); render();
      const n = Object.values(src.health.days), sl = n.filter((d) => d.bed).length, st = n.filter((d) => d.steps).length;
      info.textContent = `${st} días con pasos · ${sl} noches · ${src.health.workouts.length} entrenos`;
      if (!st && !sl && !src.health.workouts.length) info.textContent = "No encuentro datos de pasos, sueño ni entrenos: ¿es el export.xml de Salud?";
    } catch (e) { info.textContent = "No se pudo leer el fichero: " + e.message; }
    ev.target.value = ""; bar.hidden = true;
  };
  document.addEventListener("change", (ev) => {
    const el = ev.target; if (el.dataset.w === undefined) return;
    preview[Number(el.dataset.d)].workouts[Number(el.dataset.w)].on = el.checked;
  });
  $("#clear").onclick = () => { src.health = src.shortcut = src.strava = null; render(); };

  // ───── write (fresh read-modify-write of each key)
  $("#doImport").onclick = () => {
    const t = today(), over = $("#overwrite").checked;
    // Paso
    const rawPaso = get("paso.v1");
    let paso; try { const o = rawPaso ? JSON.parse(rawPaso) : {}; if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("x"); paso = PA.migrate(o, t); } catch (e) { alert("Los datos de Paso están dañados: ábrelo y revísalo antes de importar. No se ha cambiado nada."); return; }
    const rows = preview.filter((d) => d.steps).map((d) => ({ date: d.date, steps: d.steps }));
    const ms = PA.mergeSteps(paso, rows, "health", { overwriteManual: over });
    paso = ms.data;
    let added = 0, dup = 0;
    for (const d of preview) for (const w of d.workouts) {
      if (!w.on) continue;
      if (paso.runs.some((r) => S.matchesRun(w, r))) { dup++; continue; }
      if (PA.addRun(paso, { date: w.date, type: w.pasoType, minutes: w.minutes, km: w.km, notes: `${w.sources.join(" + ")}${w.start ? " · " + w.start : ""}${w.name && w.sources.includes("Strava") ? " · " + w.name : ""}` })) added++;
    }
    // Panel
    let panel; const rawP = get("panel.v1");
    try { if (rawP) { const o = JSON.parse(rawP); if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("x"); panel = PL.migrate(o); } else panel = Object.assign(PL.emptyState(), { goals: PL.starterGoals(t) }); } catch (e) { alert("Los datos del Panel están dañados: ábrelo y revísalo antes de importar. No se ha cambiado nada."); return; }
    let nights = 0, keptNights = 0;
    for (const d of preview) {
      if (!d.bed) continue;
      const cur = panel.days[d.date];
      if (cur && cur.bed && cur.wake && !over) { keptNights++; continue; }
      panel = PL.setDay(panel, d.date, { bed: d.bed, wake: d.wake }); nights++;
    }
    const okP = set("paso.v1", JSON.stringify(paso)), okN = set("panel.v1", JSON.stringify(panel));
    if (!okP || !okN) { alert("El navegador no deja guardar. No se ha importado todo."); return; }
    $("#pvNote").innerHTML = `✓ ${ms.added + ms.updated} días de pasos (${ms.skipped} manuales respetados) · ${added} entrenos nuevos (${dup} ya estaban) · ${nights} noches${keptNights ? ` (${keptNights} ya apuntadas a mano)` : ""}. <a href="../28-panel-vida/">Ver el Panel</a> · <a href="../27-paso/">Ver Paso</a>`;
    toast("Importado");
    src.health = src.shortcut = src.strava = null; preview = [];
  };

  // ───── Safari mode: the Shortcut can open …/29-importar-salud/#/atajos?d=…&steps=…&bed=…&wake=…
  function fromHash() { if (/^#\/atajos\?/.test(location.hash)) { $("#pvNote").textContent = ""; readShortcut(location.hash.slice(9), "hash"); history.replaceState(null, "", location.pathname); } }
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
