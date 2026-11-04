"""Half-marathon plan generator (default: autumn 2027, goal < 1:55), reusing 02-running-tools (VDOT + .ics).

Periodisation (16 weeks): base 5 → build 5 → specific 4 → taper 2, with a deload every 4th week.
4 runs/week (Mon intervals, Wed easy, Thu tempo/HM pace, Sun long run) + 2 strength reminders, so the
hybrid-athlete rule holds: strength is never dropped.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "02-running-tools"))
from runtools import vdot as vd  # noqa: E402
from runtools.plan import Session, to_ics  # noqa: E402
from runtools.util import fmt_pace, fmt_time, parse_time  # noqa: E402

HM = 21097.5
PHASES = ["base"] * 5 + ["construcción"] * 5 + ["específico"] * 4 + ["afinado"] * 2
LONG_KM = [8, 9, 10, 8, 11, 12, 13, 10, 14, 15, 16, 12, 17, 18, 12, 0]   # week 16 = race week
DELOAD = {3, 7, 11}


def build(race: date, current_5k_s: float, goal_s: float) -> list[Session]:
    v_now, v_goal = vd.vdot(5000, current_5k_s), vd.vdot(HM, goal_s)
    pn, pg = vd.training_paces(v_now), vd.training_paces(v_goal)
    e = f"{fmt_pace(pn['E'][0])}-{fmt_pace(pn['E'][1])} (Z2)"
    hm_pace = goal_s / 21.0975
    start = race - timedelta(days=race.weekday()) - timedelta(weeks=15)   # Monday of week 1
    S: list[Session] = []
    for w in range(16):
        mon = start + timedelta(weeks=w)
        ph, dl = PHASES[w], w in DELOAD
        tag = " (descarga)" if dl else ""
        if w == 15:   # race week
            S.append(Session(mon, "series", "Activación 4×400 m", f"4×400 m a {fmt_time(pg['I'] * 0.4)} rec. 2'", 35))
            S.append(Session(mon + timedelta(2), "rodaje", "Rodaje 25' + 4 rectas", f"25' a {e}", 30))
            S.append(Session(race, "test", f"🎯 Media maratón < {fmt_time(goal_s)}", f"Salir a {fmt_pace(hm_pace + 3)} los 5 primeros km, luego {fmt_pace(hm_pace)}; geles en km 7 y 14", 120, hour=9))
            continue
        reps = {"base": f"8×200 m a {fmt_time(pg['R'] * 0.2)} rec. 200 m trote",
                "construcción": f"{5 if not dl else 3}×1 km a {fmt_pace(pg['I'])} rec. 2'30\"",
                "específico": f"{3 if not dl else 2}×2 km a {fmt_pace(pg['T'][0])} rec. 2'",
                "afinado": f"3×1 km a {fmt_pace(pg['T'][0])} rec. 2'"}[ph]
        S.append(Session(mon, "series", f"Series · {ph}{tag}", f"Calentar 15' · {reps} · enfriar 10'", 55))
        S.append(Session(mon + timedelta(1), "fuerza", "Fuerza (tren superior)", "Rutina de gimnasio de tren superior", 60))
        S.append(Session(mon + timedelta(2), "rodaje", f"Rodaje {35 if not dl else 30}'", f"a {e}", 35 if not dl else 30))
        tempo = {"base": f"20' progresivos terminando a {fmt_pace(pn['T'][1])}",
                 "construcción": f"{3 if not dl else 2}×8' a {fmt_pace(pg['T'][0])} rec. 2'",
                 "específico": f"{6 if w < 13 else 8} km a ritmo de media ({fmt_pace(hm_pace)})" if not dl else f"4 km a ritmo de media ({fmt_pace(hm_pace)})",
                 "afinado": f"5 km a ritmo de media ({fmt_pace(hm_pace)})"}[ph]
        S.append(Session(mon + timedelta(3), "tempo", f"Calidad · {ph}", tempo, 50))
        S.append(Session(mon + timedelta(4), "fuerza", "Fuerza (pierna ligera + prevención)", "Pierna sin llegar al fallo, core, tobillo y cadera (prevención)", 50))
        S.append(Session(mon + timedelta(6), "tirada", f"Tirada larga {LONG_KM[w]} km{tag}", f"{LONG_KM[w]} km a {e}" + (" con los 3 últimos a ritmo de media" if ph == "específico" and not dl else ""), int(LONG_KM[w] * 6.8), hour=10))
    return S


def to_markdown(S: list[Session], race: date, current_5k_s: float, goal_s: float) -> str:
    v_now, v_goal = vd.vdot(5000, current_5k_s), vd.vdot(HM, goal_s)
    pred = vd.predict_time(v_now, HM)
    out = [f"# Plan media maratón < {fmt_time(goal_s)} · {race:%d/%m/%Y}", "",
           f"- 5K actual **{fmt_time(current_5k_s)}** → VDOT {v_now:.1f} → media prevista hoy **{fmt_time(pred)}**",
           f"- Objetivo **{fmt_time(goal_s)}** → VDOT {v_goal:.1f} (ritmo {fmt_pace(goal_s / 21.0975)})",
           "- 4 carreras + 2 de fuerza por semana. **Suelo: 3 sesiones** (si la semana se complica: series, tirada y una de fuerza).", ""]
    week = None
    start = S[0].day
    for s in S:
        w = (s.day - start).days // 7
        if w != week:
            week = w
            out += ["", f"## Semana {w + 1} · {PHASES[w] if w < 16 else ''}{' · descarga' if w in DELOAD else ''}", "",
                    "| Día | Sesión | Detalle | Min |", "|---|---|---|---|"]
        out.append(f"| {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][s.day.weekday()]} {s.day:%d/%m} | **{s.title}** | {s.detail} | {s.minutes} |")
    return "\n".join(out) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--carrera", default="2027-10-17", help="fecha de la media (AAAA-MM-DD); 2027-10-17 es un ejemplo, pon la real")
    ap.add_argument("--actual", default="26:47", help="5K actual")
    ap.add_argument("--objetivo", default="1:55:00")
    ap.add_argument("--out", default=str(HERE / "salida"))
    a = ap.parse_args()
    race = date.fromisoformat(a.carrera)
    cur, goal = parse_time(a.actual), parse_time(a.objetivo)
    S = build(race, cur, goal)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "plan-media.md").write_text(to_markdown(S, race, cur, goal), encoding="utf-8")
    (out / "plan-media.ics").write_text(to_ics(S, goal), encoding="utf-8", newline="")
    print(f"{len(S)} sesiones desde {S[0].day} → {out}/plan-media.md / .ics")


if __name__ == "__main__":
    main()
