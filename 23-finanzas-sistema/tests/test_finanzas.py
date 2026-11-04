import copy
import json
import sys
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import ratios  # noqa: E402
import simulador as sim  # noqa: E402

CFG = yaml.safe_load((ROOT / "supuestos.yaml").read_text())


def test_months_helpers():
    assert list(sim.ym_range("2028-11", "2029-02")) == ["2028-11", "2028-12", "2029-01", "2029-02"]
    assert sim.months_between("2028-01", "2029-07") == 18


def test_emergency_fund_before_investing():
    res = sim.simulate(CFG)
    ef_month = res.events["fondo_emergencia"]
    for r in res.rows:
        if r["mes"] < ef_month:
            assert r["activa"] + r["pasiva"] == 0


def test_car_paid_cash_on_date():
    assert sim.simulate(CFG).events["coche"] == "2029-07"


def test_conservation_with_zero_returns():
    c = copy.deepcopy(CFG)
    c["cuenta_remunerada_tae"] = 0
    c["inversion"]["rentabilidad_anual"] = 0
    res = sim.simulate(c)
    surplus = sum(r["ingreso"] - r["gasto"] for r in res.rows)
    assert res.rows[-1]["total"] == pytest.approx(surplus - c["metas"]["coche"]["precio"])


def test_higher_return_more_money():
    t = [sim.simulate(CFG, R).rows[-1]["total"] for R in (0.0, 0.05, 0.07)]
    assert t[0] < t[1] < t[2]


def test_extra_needed_reaches_house():
    need = sim.extra_needed_for_house(CFG)
    assert need is not None and need > 0
    assert sim.simulate(CFG, extra_month=need + 1).events.get("entrada_casa", "9999") <= "2036-06"


def test_ratios_example():
    d = json.loads((ROOT / "ejemplos" / "empresa-ficticia.json").read_text())["datos"]
    r = ratios.ratios(d)
    assert r["margen_bruto"] == pytest.approx(0.45)
    assert r["deuda_neta_ebitda"] == pytest.approx(1.5)
    assert r["fcf"] == 170 and r["per"] == pytest.approx(20)
    assert "ROIC" in ratios.report(d)


def test_ratios_missing_fields_do_not_crash():
    assert ratios.ratios({"ingresos": 100})["margen_bruto"] == 1.0
