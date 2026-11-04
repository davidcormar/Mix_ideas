/* Travel map — pure logic. Browser: window.MapLogic · Node: module.exports */
(function (root) {
  const SEED = {
    places: [
      { id: "coruna", name: "A Coruña", lat: 43.3623, lon: -8.4115, status: "visitado", notes: "Casa 🏠" },
      { id: "birmingham", name: "Birmingham", lat: 52.4862, lon: -1.8904, status: "por visitar", notes: "19-20 nov 2026" },
      { id: "londres", name: "Londres", lat: 51.5074, lon: -0.1278, status: "por visitar", notes: "20-22 nov 2026 · ruta de 7 km el sábado 21" },
      { id: "hyderabad", name: "Hyderabad", lat: 17.385, lon: 78.4867, status: "por visitar", notes: "Ciudad más cercana a Woxsen" },
      { id: "woxsen", name: "Woxsen University (ubicación aproximada)", lat: 17.57, lon: 78.05, status: "por visitar", notes: "Intercambio ene-may 2027. ⚠️ Arrastra el marcador a la posición exacta del campus." },
    ],
    trips: [
      { id: "uk2026", name: "Birmingham + Londres", start: "2026-11-19", end: "2026-11-22", route: ["coruna", "birmingham", "londres", "coruna"], photos: [] },
      { id: "woxsen2027", name: "Intercambio Woxsen", start: "2027-01-06", end: "2027-05-30", route: ["coruna", "hyderabad", "woxsen"], photos: [] },
    ],
  };

  function haversineKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function routeKm(trip, places) {
    const byId = Object.fromEntries(places.map((p) => [p.id, p]));
    const pts = trip.route.map((id) => byId[id]).filter(Boolean);
    let km = 0;
    for (let i = 1; i < pts.length; i++) km += haversineKm(pts[i - 1], pts[i]);
    return km;
  }

  function stats(db) {
    const visited = db.places.filter((p) => p.status === "visitado").length;
    const done = db.trips.filter((t) => t.end && t.end < new Date().toISOString().slice(0, 10));
    return { places: db.places.length, visited, wishlist: db.places.length - visited, trips: db.trips.length, kmDone: done.reduce((a, t) => a + routeKm(t, db.places), 0), kmPlanned: db.trips.reduce((a, t) => a + routeKm(t, db.places), 0) };
  }

  function validate(db) {
    if (!db || !Array.isArray(db.places) || !Array.isArray(db.trips)) throw new Error("JSON sin 'places' y 'trips'");
    for (const p of db.places) {
      if (typeof p.name !== "string" || !(Math.abs(p.lat) <= 90) || !(Math.abs(p.lon) <= 180)) throw new Error("lugar no válido: " + JSON.stringify(p).slice(0, 80));
    }
    const ids = new Set(db.places.map((p) => p.id));
    for (const t of db.trips) for (const id of t.route || []) if (!ids.has(id)) throw new Error(`el viaje "${t.name}" usa un lugar inexistente: ${id}`);
    return db;
  }

  function slug(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lugar";
  }

  function uniqueId(name, places) {
    const base = slug(name); let id = base, k = 2;
    while (places.some((p) => p.id === id)) id = `${base}-${k++}`;
    return id;
  }

  const api = { SEED, haversineKm, routeKm, stats, validate, slug, uniqueId };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MapLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
