/* Typing & shortcuts trainer — pure logic (browser: window.TypeLogic · Node: module.exports). */
(function (root) {
  const TEXTS = {
    es: [
      "Quiero ser un ingeniero capaz de convertir ideas difíciles en sistemas reales que funcionen.",
      "El deporte no compite con mi carrera, la sostiene: me despeja y me entrena para las semanas duras.",
      "Cada euro tiene un trabajo: gastos del mes, colchón, metas o inversión a largo plazo.",
      "La base primero: los modelos de lenguaje son herramientas, pero mi base es el aprendizaje profundo de verdad.",
    ],
    en: [
      "The bias-variance trade-off explains why a model can fit the training data perfectly and still fail on new data.",
      "To avoid data leakage, normalise the features with statistics computed on the training set only.",
      "A neural surrogate can replace an expensive solver once its error has been measured on unseen geometries.",
    ],
    fr: [
      "J'apprends le français tous les jours parce que je voudrais travailler en Suisse ou en France.",
      "Hier, je suis allé courir au bord de la mer et j'ai battu mon record sur cinq kilomètres.",
      "À mon avis, l'intelligence artificielle est une opportunité, à condition de bien la comprendre.",
    ],
    code: [
      "def sigmoid(z):\n    return 1 / (1 + np.exp(-z))",
      "loss = criterion(model(x), y)\noptimizer.zero_grad()\nloss.backward()\noptimizer.step()",
      "df = laps[laps['Compound'] == 'SOFT'].groupby('Driver')['LapTime'].median()",
    ],
  };

  const SHORTCUTS = [
    { app: "VS Code", key: "Ctrl/Cmd + P", action: "Abrir archivo por nombre" },
    { app: "VS Code", key: "Ctrl/Cmd + Shift + P", action: "Paleta de comandos" },
    { app: "VS Code", key: "Ctrl/Cmd + D", action: "Seleccionar la siguiente coincidencia (multicursor)" },
    { app: "VS Code", key: "Alt/Option + ↑/↓", action: "Mover la línea arriba/abajo" },
    { app: "VS Code", key: "Ctrl/Cmd + /", action: "Comentar/descomentar línea" },
    { app: "VS Code", key: "Ctrl + `", action: "Abrir/cerrar terminal integrado" },
    { app: "VS Code", key: "F2", action: "Renombrar símbolo en todo el proyecto" },
    { app: "VS Code", key: "F12", action: "Ir a la definición" },
    { app: "Jupyter", key: "Shift + Enter", action: "Ejecutar celda y pasar a la siguiente" },
    { app: "Jupyter", key: "Esc, luego A / B", action: "Insertar celda encima / debajo" },
    { app: "Jupyter", key: "Esc, luego D D", action: "Borrar celda" },
    { app: "Obsidian", key: "Ctrl/Cmd + O", action: "Abrir nota rápida (quick switcher)" },
    { app: "Obsidian", key: "Ctrl/Cmd + P", action: "Paleta de comandos" },
    { app: "Obsidian", key: "Ctrl/Cmd + E", action: "Cambiar entre edición y lectura" },
    { app: "Obsidian", key: "[[", action: "Insertar enlace a otra nota" },
    { app: "Navegador", key: "Ctrl/Cmd + L", action: "Ir a la barra de direcciones" },
    { app: "Navegador", key: "Ctrl/Cmd + Shift + T", action: "Reabrir la última pestaña cerrada" },
    { app: "Navegador", key: "Ctrl + Tab", action: "Siguiente pestaña" },
    { app: "Sistema (Windows)", key: "Win + Shift + S", action: "Captura de una zona" },
    { app: "Sistema (Windows)", key: "Win + ← / →", action: "Ajustar ventana a media pantalla" },
    { app: "Sistema (macOS)", key: "Cmd + Shift + 4", action: "Captura de una zona" },
    { app: "Sistema (macOS)", key: "Cmd + Espacio", action: "Spotlight (abrir apps y buscar)" },
    { app: "Terminal", key: "Ctrl + R", action: "Buscar en el historial de comandos" },
    { app: "Terminal", key: "Ctrl + A / Ctrl + E", action: "Ir al principio / final de la línea" },
    { app: "Git", key: "git switch -", action: "Volver a la rama anterior" },
  ];

  /** Compare typed text with target. WPM uses the standard 5-characters-per-word convention. */
  function score(target, typed, ms) {
    let correct = 0;
    const errors = {};
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === target[i]) correct++;
      else if (target[i] !== undefined) errors[target[i]] = (errors[target[i]] || 0) + 1;
    }
    const minutes = Math.max(ms, 1) / 60000;
    return {
      wpm: typed.length / 5 / minutes,
      netWpm: Math.max(0, (typed.length / 5 - (typed.length - correct)) / minutes),
      accuracy: typed.length ? correct / typed.length : 0,
      errors,
      done: typed.length >= target.length,
    };
  }

  /** Aggregate history: best/avg net WPM and the 5 keys with most errors. */
  function summary(history) {
    if (!history.length) return { sessions: 0, bestWpm: 0, avgWpm: 0, avgAcc: 0, weakKeys: [] };
    const err = {};
    for (const h of history) for (const [k, v] of Object.entries(h.errors || {})) err[k] = (err[k] || 0) + v;
    const last = history.slice(-10);
    return {
      sessions: history.length,
      bestWpm: Math.max(...history.map((h) => h.netWpm)),
      avgWpm: last.reduce((a, h) => a + h.netWpm, 0) / last.length,
      avgAcc: last.reduce((a, h) => a + h.accuracy, 0) / last.length,
      weakKeys: Object.entries(err).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => [k === " " ? "espacio" : k === "\n" ? "intro" : k, v]),
    };
  }

  /** Spaced practice for shortcuts: pick the card with the lowest (correct - 2·wrong) score, ties by index. */
  function nextCard(stats) {
    let best = 0, bestScore = Infinity;
    SHORTCUTS.forEach((_, i) => {
      const s = stats[i] || { ok: 0, ko: 0 };
      const v = s.ok - 2 * s.ko;
      if (v < bestScore) { bestScore = v; best = i; }
    });
    return best;
  }

  const api = { TEXTS, SHORTCUTS, score, summary, nextCard };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TypeLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
