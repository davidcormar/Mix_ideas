"""Render an Analysis as terminal text or Markdown."""
from __future__ import annotations

from .gpx import Analysis
from .util import fmt_pace, fmt_time, table


def _hr(x) -> str:
    return f"{x:.0f}" if x else "-"


def render(a: Analysis, title: str = "Análisis de la actividad", markdown: bool = False) -> str:
    h = (lambda s: f"\n## {s}\n") if markdown else (lambda s: f"\n=== {s} ===")
    out = [f"# {title}" if markdown else title.upper()]
    out.append(h("Resumen"))
    out.append(table(["Métrica", "Valor"], [
        ["Distancia", f"{a.distance_m / 1000:.2f} km"],
        ["Tiempo total", fmt_time(a.elapsed_s)],
        ["Tiempo en movimiento", fmt_time(a.moving_s)],
        ["Ritmo medio", fmt_pace(a.avg_pace)],
        ["FC media / máx", f"{_hr(a.avg_hr)} / {_hr(a.max_hr)} ppm"],
        ["Desnivel + / -", f"{a.elev_gain:.0f} m / {a.elev_loss:.0f} m"],
    ], markdown))
    out.append(h("Parciales por km"))
    out.append(table(["Km", "Tiempo", "Ritmo", "FC"],
                     [[s["km"], fmt_time(s["time"]), fmt_pace(s["pace"]), _hr(s["hr"])] for s in a.splits], markdown))
    out.append(h("Bloques de 5 minutos"))
    out.append(table(["Bloque", "Inicio", "Distancia", "Ritmo", "FC"],
                     [[b["block"], fmt_time(b["start"]), f"{b['dist']:.0f} m", fmt_pace(b["pace"]), _hr(b["hr"])]
                      for b in a.blocks], markdown))
    if a.zones:
        tot = sum(a.zones.values()) or 1
        out.append(h("Tiempo en zonas de FC"))
        out.append(table(["Zona", "Tiempo", "%", ""],
                         [[z, fmt_time(t), f"{t / tot * 100:.0f}%", "█" * round(t / tot * 30)]
                          for z, t in a.zones.items()], markdown))
    if a.drift and "decoupling_pct" in a.drift:
        d = a.drift
        out.append(h("Deriva cardiaca (1.ª mitad vs 2.ª)"))
        out.append(table(["Mitad", "Ritmo", "FC media"], [
            ["1.ª", fmt_pace(d["h1"]["pace"]), _hr(d["h1"]["hr"])],
            ["2.ª", fmt_pace(d["h2"]["pace"]), _hr(d["h2"]["hr"])],
        ], markdown))
        verdict = ("buena base aeróbica (<5 %)" if d["decoupling_pct"] < 5 else
                   "deriva notable (≥5 %): calor, deshidratación o ritmo por encima de tu Z2")
        out.append(f"\nΔFC = {d['hr_diff']:+.1f} ppm · desacoplamiento Pa:FC = {d['decoupling_pct']:.1f} % → {verdict}"
                   "\n(Solo es significativo en rodajes continuos; en series no aplica.)")
    out.append(h("Series detectadas"))
    if a.intervals:
        out.append(table(["#", "Inicio", "Duración", "Distancia", "Ritmo", "FC"],
                         [[r["n"], fmt_time(r["start"]), fmt_time(r["time"]), f"{r['dist']:.0f} m",
                           fmt_pace(r["pace"]), _hr(r["hr"])] for r in a.intervals], markdown))
    else:
        out.append("No se detectan series (ritmo continuo).")
    return "\n".join(out) + "\n"
