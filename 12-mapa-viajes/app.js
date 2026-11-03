(function () {
  const M = window.MapLogic;
  const KEY = "mapaviajes.v1";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const COLORS = ["#7c3aed", "#0ea5e9", "#ef4444", "#10b981", "#f59e0b", "#ec4899"];
  let db = load();
  let map = null, layer = null;

  function load() {
    try { return M.validate(JSON.parse(localStorage.getItem(KEY))); } catch { return JSON.parse(JSON.stringify(M.SEED)); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { alert("No se pudo guardar: " + e.message); } }

  // ---------- map
  if (window.L) {
    map = L.map("map", { worldCopyJump: true }).setView([40, 20], 3);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on("click", (e) => {
      const name = prompt("Nombre del lugar:");
      if (!name) return;
      const visited = confirm("¿Ya lo has visitado? (Aceptar = visitado · Cancelar = por visitar)");
      db.places.push({ id: M.uniqueId(name, db.places), name, lat: +e.latlng.lat.toFixed(5), lon: +e.latlng.lng.toFixed(5), status: visited ? "visitado" : "por visitar", notes: "" });
      save(); render();
    });
  } else {
    $("#map").style.display = "none"; $("#nomap").style.display = "flex";
  }

  function drawMap(fit) {
    if (!map) return;
    layer.clearLayers();
    const byId = Object.fromEntries(db.places.map((p) => [p.id, p]));
    db.trips.forEach((t, i) => {
      const pts = t.route.map((id) => byId[id]).filter(Boolean).map((p) => [p.lat, p.lon]);
      if (pts.length > 1) L.polyline(pts, { color: COLORS[i % COLORS.length], weight: 3, dashArray: "6 6", opacity: 0.8 }).bindTooltip(`${t.name} · ${Math.round(M.routeKm(t, db.places))} km`).addTo(layer);
    });
    db.places.forEach((p) => {
      const color = p.status === "visitado" ? "#16a34a" : "#f59e0b";
      const m = L.circleMarker([p.lat, p.lon], { radius: 8, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 }).addTo(layer);
      m.bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.status)}<br>${esc(p.notes)}`);
      // draggable helper: a transparent marker on top
      const d = L.marker([p.lat, p.lon], { draggable: true, opacity: 0, keyboard: false }).addTo(layer);
      d.on("click", () => m.openPopup());
      d.on("dragend", (e) => { const ll = e.target.getLatLng(); p.lat = +ll.lat.toFixed(5); p.lon = +ll.lng.toFixed(5); save(); render(); });
    });
    if (fit && db.places.length) map.fitBounds(db.places.map((p) => [p.lat, p.lon]), { padding: [30, 30] });
  }

  // ---------- tabs
  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll("main > section").forEach((s) => s.classList.toggle("hidden", s.id !== b.dataset.tab));
  }));

  // ---------- places
  $("#pFilter").addEventListener("change", render);
  function renderPlaces() {
    const s = M.stats(db);
    $("#stats").innerHTML = `<b>${s.visited}</b> visitados · <b>${s.wishlist}</b> por visitar · <b>${s.trips}</b> viajes · ${Math.round(s.kmPlanned).toLocaleString("es-ES")} km en rutas`;
    const f = $("#pFilter").value;
    $("#placeList").innerHTML = db.places.map((p, i) => ({ p, i })).filter(({ p }) => !f || p.status === f).map(({ p, i }) => `
      <div class="card">
        <div class="flex" style="justify-content:space-between"><b><span class="dot" style="background:${p.status === "visitado" ? "var(--vis)" : "var(--want)"}"></span>${esc(p.name)}</b>
          <span class="flex"><button data-go="${i}">📍</button><button data-toggle="${i}">${p.status === "visitado" ? "↩︎ por visitar" : "✔ visitado"}</button><button data-pdel="${i}">✕</button></span></div>
        <input data-notes="${i}" value="${esc(p.notes)}" placeholder="Notas, fechas, enlaces…" style="margin-top:6px">
        <div class="muted">${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}</div>
      </div>`).join("");
  }
  $("#placeList").addEventListener("click", (ev) => {
    const t = ev.target.closest("button"); if (!t) return;
    if (t.dataset.go !== undefined && map) { const p = db.places[t.dataset.go]; map.setView([p.lat, p.lon], 11); window.scrollTo({ top: 0, behavior: "smooth" }); }
    if (t.dataset.toggle !== undefined) { const p = db.places[t.dataset.toggle]; p.status = p.status === "visitado" ? "por visitar" : "visitado"; save(); render(); }
    if (t.dataset.pdel !== undefined) {
      const p = db.places[t.dataset.pdel];
      if (db.trips.some((tr) => tr.route.includes(p.id))) { alert("Este lugar está en la ruta de un viaje. Quítalo primero del viaje."); return; }
      if (confirm(`¿Borrar ${p.name}?`)) { db.places.splice(Number(t.dataset.pdel), 1); save(); render(); }
    }
  });
  $("#placeList").addEventListener("change", (ev) => { const i = ev.target.dataset.notes; if (i !== undefined) { db.places[i].notes = ev.target.value; save(); drawMap(false); } });

  // ---------- trips
  function renderTrips() {
    const byId = Object.fromEntries(db.places.map((p) => [p.id, p]));
    $("#tripList").innerHTML = db.trips.map((t, i) => `
      <div class="card">
        <div class="flex" style="justify-content:space-between"><b><span class="dot" style="background:${COLORS[i % COLORS.length]}"></span>${esc(t.name)}</b><button data-tdel="${i}">✕</button></div>
        <div class="muted">${esc(t.start)} → ${esc(t.end)} · ${Math.round(M.routeKm(t, db.places)).toLocaleString("es-ES")} km</div>
        <div>${t.route.map((id) => esc(byId[id]?.name || id)).join(" → ")}</div>
        <div style="margin-top:6px">${(t.photos || []).map((u, k) => `<a href="${esc(u)}" target="_blank" rel="noopener">📷 foto ${k + 1}</a>`).join(" · ") || '<span class="muted">Sin fotos</span>'}</div>
        <div class="flex" style="margin-top:6px"><input data-photo="${i}" placeholder="Enlace a foto o álbum (Google Fotos, Drive…)"><button data-addphoto="${i}">+ foto</button></div>
      </div>`).join("");
    $("#tRoute").innerHTML = db.places.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  }
  $("#tripList").addEventListener("click", (ev) => {
    const t = ev.target;
    if (t.dataset.tdel !== undefined && confirm("¿Borrar viaje?")) { db.trips.splice(Number(t.dataset.tdel), 1); save(); render(); }
    if (t.dataset.addphoto !== undefined) {
      const inp = document.querySelector(`[data-photo="${t.dataset.addphoto}"]`);
      if (/^https?:\/\//.test(inp.value)) { (db.trips[t.dataset.addphoto].photos ||= []).push(inp.value); save(); render(); } else alert("Pega un enlace que empiece por http(s)://");
    }
  });
  $("#tAdd").addEventListener("click", () => {
    const route = [...$("#tRoute").selectedOptions].map((o) => o.value);
    if (!$("#tName").value || route.length < 2) { alert("Pon un nombre y al menos 2 lugares"); return; }
    db.trips.push({ id: M.uniqueId($("#tName").value, db.trips.map((t) => ({ id: t.id }))), name: $("#tName").value, start: $("#tStart").value, end: $("#tEnd").value, route, photos: [] });
    save(); render();
  });

  // ---------- data
  $("#export").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }));
    a.download = "mapa-viajes.json"; a.click();
  });
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try { db = M.validate(JSON.parse(await f.text())); save(); render(true); } catch (e) { alert("Error: " + e.message); }
    ev.target.value = "";
  });
  $("#reset").addEventListener("click", () => { if (confirm("¿Volver a los datos iniciales? Se perderán los cambios.")) { db = JSON.parse(JSON.stringify(M.SEED)); save(); render(true); } });

  function render(fit) { renderPlaces(); renderTrips(); drawMap(fit); }
  render(true);
})();
