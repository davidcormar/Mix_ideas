/* Gym tracker — pure logic (no DOM). Works in the browser (window.GymLogic) and in Node (module.exports). */
(function (root) {
  const EXERCISES = {
    press_inclinado_smith: { name: "Press inclinado en Smith", type: "compuesto", inc: 2.5 },
    remo_t: { name: "Remo en T", type: "compuesto", inc: 2.5 },
    peck_deck: { name: "Peck deck", type: "aislamiento", inc: 2.5 },
    jalon_pecho: { name: "Jalón al pecho", type: "compuesto", inc: 2.5 },
    laterales_polea: { name: "Elevaciones laterales en polea", type: "aislamiento", inc: 1.25 },
    triceps_polea: { name: "Extensión de tríceps en polea", type: "aislamiento", inc: 2.5 },
    triceps_overhead: { name: "Extensión de tríceps overhead en polea", type: "aislamiento", inc: 2.5 },
    curl_predicador: { name: "Curl predicador en máquina", type: "aislamiento", inc: 2.5 },
    press_plano_maquina: { name: "Press plano en máquina", type: "compuesto", inc: 2.5 },
    press_militar_maquina: { name: "Press militar en máquina", type: "compuesto", inc: 2.5 },
    curl_polea_recto: { name: "Curl de bíceps en polea (agarre recto)", type: "aislamiento", inc: 2.5 },
    curl_martillo: { name: "Curl martillo con mancuernas", type: "aislamiento", inc: 2 },
    remo_unilateral_maquina: { name: "Remo unilateral en máquina", type: "compuesto", inc: 2.5 },
  };

  const ROUTINES = [
    { id: "r1", name: "1 · Tren superior", items: [["press_inclinado_smith", 3], ["remo_t", 3], ["peck_deck", 3], ["jalon_pecho", 3], ["laterales_polea", 3], ["triceps_polea", 3], ["curl_predicador", 3]] },
    { id: "r2", name: "2 · Pecho-espalda", items: [["press_inclinado_smith", 3], ["remo_t", 3], ["peck_deck", 3], ["jalon_pecho", 3], ["press_plano_maquina", 2]] },
    { id: "r3", name: "3 · Brazo-hombro", items: [["press_militar_maquina", 3], ["laterales_polea", 3], ["triceps_polea", 3], ["triceps_overhead", 3], ["curl_predicador", 3], ["curl_polea_recto", 3]], alt: { curl_polea_recto: "curl_martillo" } },
    { id: "r4", name: "4 · Espalda-bíceps", items: [["remo_t", 3], ["remo_unilateral_maquina", 3], ["jalon_pecho", 3], ["curl_predicador", 3], ["curl_martillo", 3]] },
    { id: "r5", name: "5 · Pecho-hombro-tríceps", items: [["press_inclinado_smith", 3], ["press_plano_maquina", 3], ["peck_deck", 3], ["press_militar_maquina", 3], ["laterales_polea", 3], ["triceps_polea", 3], ["triceps_overhead", 3]] },
  ];

  const REP_RANGE = { compuesto: [6, 10], aislamiento: [10, 15] };

  /** Epley estimated 1RM. */
  function e1rm(weight, reps) {
    if (!(weight > 0) || !(reps > 0)) return 0;
    return reps === 1 ? weight : weight * (1 + reps / 30);
  }

  function round(x, step) {
    return Math.round(x / step) * step;
  }

  /** All logged sets of an exercise, grouped by session (chronological). */
  function exerciseHistory(sessions, exId) {
    return sessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ date: s.date, sets: (s.exercises.find((e) => e.id === exId) || { sets: [] }).sets.filter((x) => x.weight > 0 && x.reps > 0) }))
      .filter((h) => h.sets.length);
  }

  function sessionStats(sets) {
    const best = sets.reduce((m, s) => (e1rm(s.weight, s.reps) > e1rm(m.weight, m.reps) ? s : m), sets[0]);
    return {
      best_e1rm: e1rm(best.weight, best.reps),
      top_weight: Math.max(...sets.map((s) => s.weight)),
      volume: sets.reduce((a, s) => a + s.weight * s.reps, 0),
    };
  }

  function personalRecords(sessions, exId) {
    const h = exerciseHistory(sessions, exId);
    if (!h.length) return null;
    let pr = { e1rm: 0, e1rm_date: null, weight: 0, weight_reps: 0, weight_date: null, volume: 0, volume_date: null };
    for (const { date, sets } of h) {
      const st = sessionStats(sets);
      if (st.best_e1rm > pr.e1rm) Object.assign(pr, { e1rm: st.best_e1rm, e1rm_date: date });
      for (const s of sets) {
        if (s.weight > pr.weight || (s.weight === pr.weight && s.reps > pr.weight_reps)) Object.assign(pr, { weight: s.weight, weight_reps: s.reps, weight_date: date });
      }
      if (st.volume > pr.volume) Object.assign(pr, { volume: st.volume, volume_date: date });
    }
    return pr;
  }

  /**
   * Double progression (all sets to failure):
   * - every working set reached the top of the rep range -> add the smallest increment, aim for the bottom of the range
   * - otherwise keep the weight and try to add 1 rep to each set
   * - if the first set fell below the bottom of the range -> weight too heavy, drop ~5 %
   */
  function suggestion(sessions, exId) {
    const ex = EXERCISES[exId];
    const h = exerciseHistory(sessions, exId);
    if (!ex || !h.length) return { text: "Primera vez: elige un peso con el que llegues al fallo dentro del rango.", weight: null, reps: null };
    const [lo, hi] = REP_RANGE[ex.type];
    const last = h[h.length - 1].sets;
    const w = Math.max(...last.map((s) => s.weight));
    const top = last.filter((s) => s.weight === w);
    if (top.every((s) => s.reps >= hi)) {
      const nw = round(w + ex.inc, ex.inc);
      return { text: `Sube a ${nw} kg y busca ${lo}-${lo + 2} reps (llegaste a ${hi}+ en todas las series).`, weight: nw, reps: lo, action: "up" };
    }
    if (top[0].reps < lo) {
      const nw = round(w * 0.95, ex.inc);
      return { text: `Baja a ${nw} kg: la 1.ª serie quedó por debajo de ${lo} reps.`, weight: nw, reps: lo, action: "down" };
    }
    const target = Math.min(hi, top[0].reps + 1);
    return { text: `Mantén ${w} kg e intenta ${target} reps en la 1.ª serie (rango ${lo}-${hi}).`, weight: w, reps: target, action: "same" };
  }

  function validateImport(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.sessions)) throw new Error("JSON sin campo 'sessions'");
    for (const s of data.sessions) {
      if (typeof s.date !== "string" || !Array.isArray(s.exercises)) throw new Error("sesión mal formada");
    }
    return data;
  }

  const api = { EXERCISES, ROUTINES, REP_RANGE, e1rm, exerciseHistory, sessionStats, personalRecords, suggestion, validateImport };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GymLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
