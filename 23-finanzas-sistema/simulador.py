"""Monthly simulation of David's 4-account system (Visión Finanzas) from the first salary.

Accounts: 1 current (month) · 2 savings (emergency fund + goals < 3-5 years: car, house down payment)
3 active investment (his lab) · 4 passive investment (retirement, never touched).
Order each month: pay yourself first → emergency fund → goal savings (car, house) → invest the rest.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from pathlib import Path

import yaml


def ym_range(a: str, b: str):
    y, m = map(int, a.split("-"))
    ye, me = map(int, b.split("-"))
    while (y, m) <= (ye, me):
        yield f"{y:04d}-{m:02d}"
        m += 1
        if m == 13:
            y, m = y + 1, 1


def months_between(a: str, b: str) -> int:
    ya, ma = map(int, a.split("-"))
    yb, mb = map(int, b.split("-"))
    return (yb - ya) * 12 + (mb - ma)


@dataclass
class Result:
    rows: list[dict] = field(default_factory=list)
    events: dict = field(default_factory=dict)


def simulate(cfg: dict, annual_return: float | None = None, extra_month: float = 0.0) -> Result:
    R = cfg["inversion"]["rentabilidad_anual"] if annual_return is None else annual_return
    r_inv = (1 + R) ** (1 / 12) - 1
    r_sav = cfg["cuenta_remunerada_tae"] / 12
    act_share = cfg["inversion"]["parte_activa"]
    g, pr, job = cfg["gastos"], cfg["practicas"], cfg["primer_trabajo"]
    car, house = cfg["metas"]["coche"], cfg["metas"]["casa"]
    down = house["precio"] * house["entrada"]
    savings = active = passive = 0.0
    car_bought = house_ready = False
    extra_spend = 0.0          # lifestyle growth from raises (half of each raise)
    salary = None
    res = Result()
    for ym in ym_range(cfg["inicio"], cfg["fin"]):
        indep = ym >= g["independizarse"]
        # income
        if ym <= pr["hasta"]:
            income = pr["neto_mes"]
        else:
            years = max(0, months_between(job["desde"], ym)) // 12
            new_salary = job["neto_mes"] * (1 + job["subida_anual"]) ** years
            if salary is not None and new_salary > salary:
                extra_spend += g["parte_subida_a_gasto"] * (new_salary - salary)
            salary = new_salary
            income = salary
        base = g["independiente"] if indep else g["con_padres"]
        spend = base + cfg["caprichos_viajes_mes"] + (extra_spend if ym > pr["hasta"] else 0)
        surplus = income - spend + (extra_month if ym > pr["hasta"] else 0.0)
        # interest / returns
        savings *= 1 + r_sav
        active *= 1 + r_inv
        passive *= 1 + r_inv
        # emergency fund target (months of base spending)
        ef_months = cfg["fondo_emergencia_meses"]["independiente" if indep else "con_padres"]
        ef_target = ef_months * (base + extra_spend)
        goal_need = 0.0
        if not car_bought:
            left = max(1, months_between(ym, car["fecha"]))
            goal_need += max(0.0, car["precio"] - max(0.0, savings - ef_target)) / left
        horizon = 12 * house.get("empezar_anios_antes", 5)
        if not house_ready and months_between(ym, house["fecha"]) <= horizon:
            left = max(1, months_between(ym, house["fecha"]))
            committed = ef_target + (0 if car_bought else car["precio"])
            goal_need += max(0.0, down - max(0.0, savings - committed)) / left
        to_sav = 0.0
        if surplus > 0:
            gap_ef = max(0.0, ef_target - savings)
            to_sav = min(surplus, gap_ef + goal_need)
            invest = surplus - to_sav
            savings += to_sav
            active += invest * act_share
            passive += invest * (1 - act_share)
        else:
            savings += surplus  # covered by savings (never by passive investment)
        if savings >= ef_target and "fondo_emergencia" not in res.events:
            res.events["fondo_emergencia"] = ym
        if not car_bought and ym >= car["fecha"] and savings - car["precio"] >= ef_target:
            savings -= car["precio"]
            car_bought = True
            res.events["coche"] = ym
        if not house_ready and ym >= house["fecha"] and savings - down >= ef_target:
            house_ready = True
            res.events["entrada_casa"] = ym
        res.rows.append({"mes": ym, "ingreso": income, "gasto": spend, "remunerada": savings,
                         "activa": active, "pasiva": passive, "total": savings + active + passive})
    return res


def extra_needed_for_house(cfg: dict, hi: float = 3000.0) -> float | None:
    """Smallest extra monthly saving (from the first job on) that reaches the house down payment by its date."""
    target = cfg["metas"]["casa"]["fecha"]
    ok = lambda x: simulate(cfg, extra_month=x).events.get("entrada_casa", "9999") <= target[:7] + "-99"  # noqa: E731
    if ok(0.0):
        return 0.0
    if not ok(hi):
        return None
    lo = 0.0
    for _ in range(40):
        mid = (lo + hi) / 2
        lo, hi = (lo, mid) if ok(mid) else (mid, hi)
    return hi


def eur(x: float) -> str:
    return f"{x:,.0f} €".replace(",", ".")


def report(cfg: dict) -> str:
    base = simulate(cfg)
    last = base.rows[-1]
    out = ["# Simulación del sistema de 4 cuentas", "",
           "> Supuestos editables en `supuestos.yaml`. **No es una previsión ni asesoramiento financiero**: sirve para ver qué palancas importan.", "",
           "## Hitos", "", "| Hito | Mes |", "|---|---|"]
    for k, label in [("fondo_emergencia", "Fondo de emergencia completo"), ("coche", "Coche al contado"), ("entrada_casa", "Entrada de la casa (30 %)")]:
        out.append(f"| {label} | {base.events.get(k, '❌ no se alcanza')} |")
    out += ["", "## Saldo a final de cada año", "", "| Año | Remunerada | Activa | Pasiva | Total |", "|---|---|---|---|---|"]
    for r in base.rows:
        if r["mes"].endswith("-12"):
            out.append(f"| {r['mes'][:4]} | {eur(r['remunerada'])} | {eur(r['activa'])} | {eur(r['pasiva'])} | **{eur(r['total'])}** |")
    out += ["", "## Sensibilidad a la rentabilidad de la inversión", "", "| Rentabilidad anual | Total en " + last["mes"][:4] + " |", "|---|---|"]
    for R in (0.0, 0.03, 0.05, 0.07):
        t = simulate(cfg, R).rows[-1]["total"]
        out.append(f"| {R:.0%} | {eur(t)} |")
    need = extra_needed_for_house(cfg)
    inv_2036 = next(r for r in base.rows if r["mes"] == "2036-12")
    out += ["", "## Lectura", "",
            f"- **Entrada de la casa ({cfg['metas']['casa']['fecha']}):** " + ("se alcanza a tiempo." if need == 0 else
              (f"faltan unos **{eur(need)} al mes** de ahorro extra desde el primer trabajo (o más sueldo, casa más barata o retrasar la fecha)." if need else "no se alcanza ni con 3.000 €/mes extra: revisa precio o fecha.")),
            f"- **Tensión entre metas:** con estos supuestos casi todo el excedente va a la cuenta remunerada (fondo, coche y entrada < 3-5 años, tu principio 4) y la inversión pasiva llega a ~{eur(inv_2036['pasiva'])} en 2036. Si quieres aportar a la jubilación **todos los meses** desde el primer trabajo, fija una aportación mínima y acepta retrasar la casa.",
            ""]
    out += ["Sobre la rentabilidad: cambia el final, pero los hitos de los próximos años (fondo, coche, entrada) dependen sobre todo de **cuánto ahorras**, porque ese dinero está en la cuenta remunerada, no en bolsa (tu principio 4)."]
    return "\n".join(out) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--config", type=Path, default=Path(__file__).with_name("supuestos.yaml"))
    ap.add_argument("--out", type=Path, default=Path(__file__).with_name("salida") / "simulacion.md")
    a = ap.parse_args()
    cfg = yaml.safe_load(a.config.read_text(encoding="utf-8"))
    txt = report(cfg)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(txt, encoding="utf-8")
    print(txt)


if __name__ == "__main__":
    main()
