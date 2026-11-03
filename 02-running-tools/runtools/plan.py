"""Training plan 9 Nov -> 28 Dec 2026 towards a sub-27:00 5K, exported to Markdown and iCalendar."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from . import vdot as vd
from .util import fmt_pace, fmt_time

START = date(2026, 11, 9)   # Monday
RACE = date(2026, 12, 28)   # Monday: 5K test/race


@dataclass
class Session:
    day: date
    kind: str        # series | rodaje | tirada | test | tempo
    title: str
    detail: str
    minutes: int
    hour: int = 19


def _p(sec: float) -> str:
    return fmt_pace(sec)


def build_plan(current_5k_s: float = 1678, goal_5k_s: float = 1620) -> list[Session]:
    v_now = vd.vdot(5000, current_5k_s)
    v_goal = vd.vdot(5000, goal_5k_s)
    pn = vd.training_paces(v_now)
    pg = vd.training_paces(v_goal)
    e = f"{_p(pn['E'][0])}-{_p(pn['E'][1])} (Z2, 139-152 ppm)"
    t_now = f"{_p(pn['T'][0])}"
    i_goal = pg["I"]
    goal_pace = goal_5k_s / 5
    rep400 = fmt_time(i_goal * 0.4)
    rep1k = fmt_time(i_goal)

    def W(n: int) -> date:
        return START + timedelta(weeks=n)

    S: list[Session] = []
    add = S.append
    # --- Week 1 (9-15 Nov): build
    add(Session(W(0), "series", "Series 8×400 m", f"Calentar 15' Z2 + 4 rectas · 8×400 m a {rep400} (ritmo I objetivo) rec. 90\" trote · enfriar 10'", 50))
    add(Session(W(0) + timedelta(2), "rodaje", "Rodaje 35'", f"35' a {e}", 35))
    add(Session(W(0) + timedelta(3), "tempo", "Umbral 3×6'", f"Calentar 15' · 3×6' a {t_now} rec. 2' · enfriar 10'", 50))
    add(Session(W(0) + timedelta(6), "tirada", "Tirada larga 8 km", f"8 km a {e}", 50, hour=10))
    # --- Week 2 (16-22 Nov): DELOAD + trip Birmingham/London 19-22
    add(Session(W(1), "series", "Series 6×400 m (descarga)", f"Calentar 15' · 6×400 m a {rep400} rec. 2' · enfriar 10'", 45))
    add(Session(W(1) + timedelta(2), "rodaje", "Rodaje 30' (antes del viaje)", f"30' a {e}", 30))
    add(Session(W(1) + timedelta(5), "rodaje", "Rodaje en Londres 7 km", f"Ruta de 19-londres/ · 7 km suaves a {e}, disfrutar", 45, hour=8))
    # --- Week 3 (23-29 Nov): build
    add(Session(W(2), "series", "Series 5×1 km", f"Calentar 15' · 5×1 km a {rep1k} rec. 2'30\" · enfriar 10'", 60))
    add(Session(W(2) + timedelta(2), "rodaje", "Rodaje 40' + 6 rectas", f"40' a {e} + 6×80 m progresivos", 45))
    add(Session(W(2) + timedelta(3), "tempo", "Umbral 2×10'", f"Calentar 15' · 2×10' a {t_now} rec. 3' · enfriar 10'", 55))
    add(Session(W(2) + timedelta(6), "tirada", "Tirada larga 10 km", f"10 km a {e}", 62, hour=10))
    # --- Week 4 (30 Nov-6 Dec): DELOAD
    add(Session(W(3), "series", "Series 6×400 m (descarga)", f"6×400 m a {rep400} rec. 2'", 45))
    add(Session(W(3) + timedelta(3), "rodaje", "Rodaje 30'", f"30' a {e}", 30))
    add(Session(W(3) + timedelta(6), "tirada", "Tirada 7 km", f"7 km a {e}", 45, hour=10))
    # --- Week 5 (7-13 Dec): peak
    add(Session(W(4), "series", "Series 10×400 m", f"Calentar 15' · 10×400 m a {rep400} rec. 75\" · enfriar 10'", 55))
    add(Session(W(4) + timedelta(2), "rodaje", "Rodaje 40'", f"40' a {e}", 40))
    add(Session(W(4) + timedelta(3), "tempo", "Ritmo de carrera 3×1,6 km", f"3×1600 m a {_p(goal_pace)} (ritmo 5K objetivo) rec. 3'", 55))
    add(Session(W(4) + timedelta(5), "test", "Test 3 km", f"Calentar 15' · 3 km a tope controlado (objetivo ≤ {fmt_time(goal_pace * 3)}) · enfriar", 40, hour=10))
    add(Session(W(4) + timedelta(6), "tirada", "Tirada larga 11 km", f"11 km a {e}", 70, hour=10))
    # --- Week 6 (14-20 Dec): peak
    add(Session(W(5), "series", "Series 6×1 km", f"6×1 km a {rep1k} rec. 2'", 65))
    add(Session(W(5) + timedelta(2), "rodaje", "Rodaje 40' + rectas", f"40' a {e} + 6 rectas", 45))
    add(Session(W(5) + timedelta(3), "tempo", "Umbral 20' continuo", f"20' a {t_now}", 50))
    add(Session(W(5) + timedelta(6), "tirada", "Tirada larga 10 km", f"10 km a {e}", 62, hour=10))
    # --- Week 7 (21-27 Dec): taper
    add(Session(W(6), "series", "Afinado 5×400 m", f"5×400 m a {rep400} rec. 2' (piernas frescas)", 40))
    add(Session(W(6) + timedelta(2), "rodaje", "Rodaje 30'", f"30' a {e}", 30))
    add(Session(W(6) + timedelta(4), "rodaje", "Activación 20' + 4 rectas", f"20' muy suave + 4×100 m a ritmo 5K ({_p(goal_pace)})", 25, hour=10))
    add(Session(W(6) + timedelta(6), "rodaje", "Rodaje 25' suave", f"25' a {e}", 25, hour=10))
    # --- Race day
    add(Session(RACE, "test", "🎯 5K < 27:00", f"Calentar 15' + 4 rectas · salir a {_p(goal_pace)} los 2 primeros km, apretar desde el 3", 45, hour=10))
    return sorted(S, key=lambda s: s.day)


WEEK_NOTES = {
    0: "Construcción", 1: "**Descarga** (viaje a Birmingham/Londres 19-22)", 2: "Construcción",
    3: "**Descarga**", 4: "Pico", 5: "Pico", 6: "Afinado (taper)", 7: "Carrera",
}
DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]


def to_markdown(plan: list[Session], current_5k_s: float = 1678, goal_5k_s: float = 1620) -> str:
    v_now, v_goal = vd.vdot(5000, current_5k_s), vd.vdot(5000, goal_5k_s)
    out = [
        "# Plan 5K < 27:00 · 9 nov → 28 dic 2026", "",
        f"- Marca actual: **{fmt_time(current_5k_s)}** → VDOT {v_now:.1f}",
        f"- Objetivo: **{fmt_time(goal_5k_s)}** → VDOT {v_goal:.1f} (ritmo {fmt_pace(goal_5k_s / 5)})",
        "- Ritmos fáciles con el VDOT actual; series al ritmo del VDOT objetivo.",
        "- El gimnasio sigue: evita pierna pesada el día antes de series o tirada.", "",
    ]
    week = -1
    for s in plan:
        w = (s.day - START).days // 7
        if w != week:
            week = w
            ws = START + timedelta(weeks=w)
            out += ["", f"## Semana {w + 1} · {ws:%d/%m}–{ws + timedelta(6):%d/%m} · {WEEK_NOTES.get(w, '')}", "",
                    "| Día | Sesión | Detalle | Min |", "|---|---|---|---|"]
        out.append(f"| {DAYS[s.day.weekday()]} {s.day:%d/%m} | **{s.title}** | {s.detail} | {s.minutes} |")
    km_note = "\n> Ajusta según sensaciones: si una sesión de calidad sale muy por encima de la FC esperada, conviértela en rodaje.\n"
    return "\n".join(out) + "\n" + km_note


def _ics_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def to_ics(plan: list[Session]) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mix_ideas//runtools//ES", "CALSCALE:GREGORIAN",
             "X-WR-CALNAME:Plan 5K sub-27", "X-WR-TIMEZONE:Europe/Madrid"]
    for i, s in enumerate(plan):
        start = datetime(s.day.year, s.day.month, s.day.day, s.hour, 0)
        end = start + timedelta(minutes=s.minutes)
        lines += ["BEGIN:VEVENT", f"UID:plan5k-{s.day:%Y%m%d}-{i}@mix-ideas", f"DTSTAMP:{stamp}",
                  f"DTSTART;TZID=Europe/Madrid:{start:%Y%m%dT%H%M%S}",
                  f"DTEND;TZID=Europe/Madrid:{end:%Y%m%dT%H%M%S}",
                  f"SUMMARY:🏃 {_ics_escape(s.title)}", f"DESCRIPTION:{_ics_escape(s.detail)}",
                  f"CATEGORIES:{s.kind}", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"
