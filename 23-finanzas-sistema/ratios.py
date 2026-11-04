"""Read a company's results: key ratios from the income statement, balance sheet and cash-flow statement.

Input: JSON with the figures (same currency/units). Output: table of ratios with a plain-language
reading and *heuristic* reference ranges (they vary a lot by sector — compare with peers, not with these).
Educational tool, not investment advice.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

FIELDS = ["ingresos", "coste_ventas", "ebitda", "ebit", "beneficio_neto", "intereses",
          "activo_total", "activo_corriente", "pasivo_corriente", "patrimonio_neto", "deuda_financiera", "caja",
          "flujo_operativo", "capex", "acciones", "precio_accion"]


def ratios(d: dict) -> dict:
    g = lambda k: float(d.get(k, 0) or 0)  # noqa: E731
    r = {}
    if g("ingresos"):
        r["margen_bruto"] = (g("ingresos") - g("coste_ventas")) / g("ingresos")
        r["margen_ebitda"] = g("ebitda") / g("ingresos")
        r["margen_operativo"] = g("ebit") / g("ingresos")
        r["margen_neto"] = g("beneficio_neto") / g("ingresos")
    if g("patrimonio_neto"):
        r["roe"] = g("beneficio_neto") / g("patrimonio_neto")
        r["deuda_patrimonio"] = g("deuda_financiera") / g("patrimonio_neto")
    if g("activo_total"):
        r["roa"] = g("beneficio_neto") / g("activo_total")
    capital = g("patrimonio_neto") + g("deuda_financiera") - g("caja")
    if capital > 0:
        r["roic_aprox"] = g("ebit") * (1 - 0.25) / capital   # 25 % tax assumption
    net_debt = g("deuda_financiera") - g("caja")
    r["deuda_neta"] = net_debt
    if g("ebitda"):
        r["deuda_neta_ebitda"] = net_debt / g("ebitda")
    if g("intereses"):
        r["cobertura_intereses"] = g("ebit") / g("intereses")
    if g("pasivo_corriente"):
        r["liquidez_corriente"] = g("activo_corriente") / g("pasivo_corriente")
    fcf = g("flujo_operativo") - g("capex")
    r["fcf"] = fcf
    if g("ingresos"):
        r["margen_fcf"] = fcf / g("ingresos")
    if g("beneficio_neto"):
        r["conversion_caja"] = fcf / g("beneficio_neto")
    if g("acciones") and g("precio_accion"):
        mcap = g("acciones") * g("precio_accion")
        ev = mcap + net_debt
        r["capitalizacion"], r["ev"] = mcap, ev
        if g("beneficio_neto") > 0:
            r["per"] = mcap / g("beneficio_neto")
        if g("ebitda") > 0:
            r["ev_ebitda"] = ev / g("ebitda")
        r["fcf_yield"] = fcf / mcap
    return r


GUIDE = [  # key, label, format, reading, heuristic check
    ("margen_bruto", "Margen bruto", "%", "cuánto queda de cada euro vendido tras el coste directo", lambda x: x > 0.4),
    ("margen_operativo", "Margen operativo (EBIT)", "%", "rentabilidad del negocio antes de intereses e impuestos", lambda x: x > 0.15),
    ("margen_neto", "Margen neto", "%", "lo que acaba siendo beneficio", lambda x: x > 0.10),
    ("roe", "ROE", "%", "rentabilidad para el accionista (ojo: la deuda la infla)", lambda x: x > 0.15),
    ("roic_aprox", "ROIC (aprox.)", "%", "rentabilidad del capital invertido; la mejor señal de calidad", lambda x: x > 0.12),
    ("deuda_neta_ebitda", "Deuda neta / EBITDA", "x", "años de EBITDA para pagar la deuda", lambda x: x < 2.5),
    ("cobertura_intereses", "Cobertura de intereses", "x", "veces que el EBIT paga los intereses", lambda x: x > 5),
    ("liquidez_corriente", "Liquidez corriente", "x", "activo corriente / pasivo corriente", lambda x: x > 1.0),
    ("margen_fcf", "Margen de flujo de caja libre", "%", "caja real que genera por euro vendido", lambda x: x > 0.08),
    ("conversion_caja", "Conversión a caja (FCF / beneficio)", "x", "¿el beneficio se convierte en caja?", lambda x: x > 0.8),
    ("per", "PER", "x", "años de beneficio que pagas al precio actual", lambda x: x < 20),
    ("ev_ebitda", "EV / EBITDA", "x", "valoración de toda la empresa (incluida la deuda)", lambda x: x < 12),
    ("fcf_yield", "Rentabilidad por FCF", "%", "FCF / capitalización: el 'interés' que da el negocio al precio actual", lambda x: x > 0.05),
]


def report(d: dict, name: str = "Empresa") -> str:
    r = ratios(d)
    rows = []
    for k, label, f, reading, ok in GUIDE:
        if k in r:
            v = f"{r[k]:.1%}" if f == "%" else f"{r[k]:.1f}x"
            rows.append(f"| {label} | {v.replace('.', ',')} | {'🟢' if ok(r[k]) else '🟠'} | {reading} |")
    return (f"# Lectura rápida de resultados · {name}\n\n> Semáforos **orientativos**: cambian mucho según el sector (una eléctrica y una de software no se comparan). "
            "Compara siempre con la propia empresa en años anteriores y con 2-3 competidores. Herramienta educativa, no recomendación de inversión.\n\n"
            "| Ratio | Valor | | Qué te dice |\n|---|---|---|---|\n" + "\n".join(rows) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("json", type=Path)
    a = ap.parse_args()
    d = json.loads(a.json.read_text(encoding="utf-8"))
    print(report(d.get("datos", d), d.get("nombre", a.json.stem)))


if __name__ == "__main__":
    main()
