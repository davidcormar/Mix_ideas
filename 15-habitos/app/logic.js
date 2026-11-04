/* Habit tracker — pure logic. data.months["2026-11"][habitIndex] = array of day numbers done. */
(function (root) {
  const HABITS = ["📵 Móvil (0 redes <14:00, máx 1 h)", "🧠 Deep work", "🇫🇷 Francés", "🏃 Deporte", "🥗 Nutrición + 3 L agua",
    "🌙 Rutina de noche + leer", "🤖 ML (plan del día)", "⏰ Levantarse a su hora", "🇬🇧 Inglés", "🧘 Meditar (prueba)"];

  const daysIn = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };

  /** Days considered: whole month if past, up to `today` if current, none if future. */
  function elapsedDays(ym, today) {
    const cur = today.slice(0, 7);
    if (ym < cur) return daysIn(ym);
    if (ym > cur) return 0;
    return Number(today.slice(8, 10));
  }

  function isDone(month, h, d) { return (month[h] || []).includes(d); }

  function toggle(month, h, d) {
    const arr = (month[h] ||= []);
    const i = arr.indexOf(d);
    if (i >= 0) arr.splice(i, 1); else { arr.push(d); arr.sort((a, b) => a - b); }
    return month;
  }

  function stats(month, nHabits, ym, today, goal = 7.5) {
    const n = elapsedDays(ym, today);
    const daily = Array.from({ length: n }, (_, i) => { let c = 0; for (let h = 0; h < nHabits; h++) if (isDone(month, h, i + 1)) c++; return c; });
    const mean = n ? daily.reduce((a, b) => a + b, 0) / n : 0;
    const perHabit = Array.from({ length: nHabits }, (_, h) => {
      let best = 0, run = 0;
      for (let d = 1; d <= n; d++) { run = isDone(month, h, d) ? run + 1 : 0; best = Math.max(best, run); }
      // current streak counts back from the last elapsed day (today not yet ticked doesn't break it)
      let cur = 0, d = n;
      if (d >= 1 && !isDone(month, h, d)) d--;
      while (d >= 1 && isDone(month, h, d)) { cur++; d--; }
      const done = (month[h] || []).filter((x) => x <= n).length;
      return { h, done, pct: n ? done / n : 0, best, current: cur };
    });
    const weakest = perHabit.slice().sort((a, b) => a.pct - b.pct || a.h - b.h)[0];
    return { days: n, daily, mean, daysOnGoal: daily.filter((x) => x >= goal).length, perHabit, weakest };
  }

  function validate(data) {
    if (!data || typeof data.months !== "object") throw new Error("JSON sin 'months'");
    return data;
  }

  const api = { HABITS, daysIn, elapsedDays, isDone, toggle, stats, validate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HabitLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
