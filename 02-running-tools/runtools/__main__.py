"""CLI: python -m runtools {gpx,ritmos,plan} ..."""
from __future__ import annotations

import argparse
from pathlib import Path

import yaml

from . import plan as pl
from . import vdot as vd
from .gpx import analyze, parse_gpx
from .report import render
from .util import fmt_pace, fmt_time, parse_time, table

DEFAULT_CFG = Path(__file__).resolve().parents[1] / "config.yaml"


def cmd_gpx(args) -> None:
    cfg = yaml.safe_load(Path(args.config).read_text(encoding="utf-8"))
    a = analyze(parse_gpx(args.file), cfg)
    print(render(a, f"Análisis de {Path(args.file).name}"))
    if args.md:
        Path(args.md).parent.mkdir(parents=True, exist_ok=True)
        Path(args.md).write_text(render(a, f"Análisis de {Path(args.file).name}", markdown=True), encoding="utf-8")
        print(f"Informe Markdown → {args.md}")


def cmd_ritmos(args) -> None:
    t = parse_time(args.tiempo)
    d = vd.RACES.get(args.distancia, None) or float(args.distancia)
    v = vd.vdot(d, t)
    print(f"Marca: {fmt_time(t)} en {args.distancia} → VDOT {v:.1f}\n")
    p = vd.training_paces(v)
    print(table(["Tipo", "Ritmo", "Para qué"], [
        ["E fácil (Z2)", f"{fmt_pace(p['E'][0])} – {fmt_pace(p['E'][1])}", "rodajes, tirada larga, calentar"],
        ["M maratón", fmt_pace(p["M"]), "bloques largos a ritmo de maratón"],
        ["T umbral", f"{fmt_pace(p['T'][0])} – {fmt_pace(p['T'][1])}", "tempo 20', 3×6', cruceros"],
        ["I intervalos", f"{fmt_pace(p['I'])} (400 m en {fmt_time(p['I'] * 0.4)})", "series 400-1200 m (VO2máx)"],
        ["R repeticiones", f"{fmt_pace(p['R'])} (400 m en {fmt_time(p['R'] * 0.4)})", "200-400 m rápidos, economía"],
    ]))
    print("\nPredicciones (mismo VDOT, con entrenamiento específico):")
    print(table(["Prueba", "Tiempo", "Ritmo"],
                [[n, fmt_time(vd.predict_time(v, m)), fmt_pace(vd.predict_time(v, m) / m * 1000)]
                 for n, m in vd.RACES.items()]))
    if args.objetivo:
        g = parse_time(args.objetivo)
        vg = vd.vdot(d, g)
        print(f"\nObjetivo {fmt_time(g)} → VDOT {vg:.1f} (+{vg - v:.1f} sobre el actual)")


def cmd_plan(args) -> None:
    cur, goal = parse_time(args.actual), parse_time(args.objetivo)
    p = pl.build_plan(cur, goal)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "plan-5k.md").write_text(pl.to_markdown(p, cur, goal), encoding="utf-8")
    (out / "plan-5k.ics").write_text(pl.to_ics(p, goal), encoding="utf-8", newline="")
    print(f"{len(p)} sesiones → {out / 'plan-5k.md'} y {out / 'plan-5k.ics'}")


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(prog="runtools", description="Herramientas de running de David")
    sub = ap.add_subparsers(required=True)
    g = sub.add_parser("gpx", help="analiza un .gpx")
    g.add_argument("file")
    g.add_argument("--md", help="ruta del informe Markdown")
    g.add_argument("--config", default=str(DEFAULT_CFG))
    g.set_defaults(fn=cmd_gpx)
    r = sub.add_parser("ritmos", help="VDOT y ritmos de entrenamiento")
    r.add_argument("tiempo", help="p. ej. 26:47")
    r.add_argument("--distancia", default="5K", help="5K, 10K, Media, Maratón o metros")
    r.add_argument("--objetivo", help="tiempo objetivo en la misma distancia, p. ej. 26:00")
    r.set_defaults(fn=cmd_ritmos)
    p = sub.add_parser("plan", help="genera el plan 9-nov → 28-dic (Markdown + .ics)")
    p.add_argument("--actual", default="26:47")
    p.add_argument("--objetivo", default="26:00")
    p.add_argument("--out", default="salida")
    p.set_defaults(fn=cmd_plan)
    args = ap.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()
