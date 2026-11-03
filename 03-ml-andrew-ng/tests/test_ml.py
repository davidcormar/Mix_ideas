import subprocess
import sys
from pathlib import Path

import nbformat

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ejercicios"))
import comprobar  # noqa: E402


def test_solutions_pass_all_checks():
    assert comprobar.run(solutions=True) == len(comprobar.checks(comprobar.load(True)))


def test_exercises_are_unsolved_stubs():
    # The exercise file must stay WITHOUT solutions
    assert comprobar.run(solutions=False) == 0


def test_notebooks_executed_without_errors():
    nbs = sorted((ROOT / "notebooks").glob("*.ipynb"))
    assert len(nbs) == 4
    for p in nbs:
        nb = nbformat.read(p, 4)
        for c in nb.cells:
            if c.cell_type == "code":
                assert c.get("outputs") is not None
                assert not any(o.output_type == "error" for o in c.outputs), p.name
