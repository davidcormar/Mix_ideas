"""Printable monthly habit sheet (A4 landscape PDF) for paper tracking.

Usage: python generar_hoja.py 2026 11   → hojas/habitos-2026-11.pdf (+ .png preview)
"""
from __future__ import annotations

import argparse
import calendar
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import yaml

HERE = Path(__file__).parent
MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre",
         "octubre", "noviembre", "diciembre"]
DIAS = ["L", "M", "X", "J", "V", "S", "D"]
EMOJI = re.compile(r"[\U0001F000-\U0001FFFF\u2300-\u23FF\u2600-\u27BF\uFE0F]+\s*")


def strip_emoji(s: str) -> str:
    """Matplotlib's default font has no colour emoji: drop them on paper."""
    return EMOJI.sub("", s).strip()


def month_days(year: int, month: int) -> list[tuple[int, str]]:
    n = calendar.monthrange(year, month)[1]
    return [(d, DIAS[calendar.weekday(year, month, d)]) for d in range(1, n + 1)]


def build(year: int, month: int, habits: list[str], goal: float, out: Path, objectives: list[str] | None = None) -> Path:
    days = month_days(year, month)
    nd, nh = len(days), len(habits)
    fig = plt.figure(figsize=(11.69, 8.27))  # A4 landscape (inches)
    ax = fig.add_axes([0.02, 0.06, 0.96, 0.84])
    label_w = 10.0
    W = label_w + nd + 2  # +2: "total" column spacing
    H = nh + 3            # header + habits + total row
    ax.set_xlim(0, W)
    ax.set_ylim(H, 0)
    ax.axis("off")
    fig.text(0.02, 0.94, f"Hábitos · {MESES[month]} {year}", fontsize=20, weight="bold")
    objs = (list(objectives or []) + ["", "", ""])[:3]
    fig.text(0.40, 0.955, "3 objetivos del mes:", fontsize=9, weight="bold")
    for k, o in enumerate(objs):
        txt = strip_emoji(o) if o else "_" * 34
        fig.text(0.52, 0.955 - k * 0.022, f"{k + 1}. ☐ {txt}", fontsize=8.5, color="#333")
    fig.text(0.98, 0.94, f"Objetivo: media ≥ {str(goal).replace('.', ',')}/{nh} al día", fontsize=11, ha="right", color="#555")
    # header
    for i, (d, wd) in enumerate(days):
        x = label_w + i
        weekend = wd in "SD"
        if weekend:
            ax.add_patch(plt.Rectangle((x, 0), 1, H, color="#f1f1f1", zorder=0))
        ax.text(x + 0.5, 0.35, wd, ha="center", va="center", fontsize=7, color="#888")
        ax.text(x + 0.5, 0.8, str(d), ha="center", va="center", fontsize=8, weight="bold")
    # rows
    for r, h in enumerate(habits):
        y = 1.2 + r
        ax.text(0.1, y + 0.5, strip_emoji(h), va="center", fontsize=9)
        for i in range(nd):
            ax.add_patch(plt.Rectangle((label_w + i + 0.12, y + 0.12), 0.76, 0.76, fill=False, lw=0.6, ec="#999"))
        ax.text(label_w + nd + 1, y + 0.5, "___", ha="center", va="center", fontsize=8, color="#999")
    # total row
    y = 1.2 + nh + 0.3
    ax.text(0.1, y + 0.5, "TOTAL del día (/10)", va="center", fontsize=9, weight="bold")
    for i in range(nd):
        ax.add_patch(plt.Rectangle((label_w + i + 0.05, y + 0.05), 0.9, 0.9, fill=False, lw=1.0, ec="#333"))
    ax.text(label_w + nd + 1, 0.8, "Σ", ha="center", va="center", fontsize=9, weight="bold")
    fig.text(0.02, 0.025, "Media del mes: ______   ·   Mejor racha: ______   ·   Hábito más flojo: ____________   ·   Ajuste para el mes que viene: ______________________________",
             fontsize=9, color="#333")
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, format="pdf")
    fig.savefig(out.with_suffix(".png"), dpi=70)
    plt.close(fig)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("year", type=int)
    ap.add_argument("month", type=int)
    ap.add_argument("--config", type=Path, default=HERE / "habitos.yaml")
    a = ap.parse_args()
    cfg = yaml.safe_load(a.config.read_text(encoding="utf-8"))
    out = build(a.year, a.month, cfg["habitos"], cfg.get("objetivo_media", 7.5),
                HERE / "hojas" / f"habitos-{a.year}-{a.month:02d}.pdf", cfg.get("objetivos_mes"))
    print("→", out)


if __name__ == "__main__":
    main()
