import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_vocab_csvs_are_anki_ready():
    files = sorted((ROOT / "vocabulario").glob("*.csv"))
    assert len(files) >= 8
    seen = set()
    for f in files:
        lines = f.read_text(encoding="utf-8").splitlines()
        assert lines[0] == "#separator:Semicolon"
        rows = list(csv.reader([l for l in lines if not l.startswith("#")], delimiter=";"))
        assert len(rows) >= 20, f.name
        for r in rows:
            assert len(r) == 3 and all(c.strip() for c in r), (f.name, r)
            assert r[0] not in seen, f"duplicated: {r[0]}"
            seen.add(r[0])


def test_every_grammar_sheet_has_solutions():
    for level in ("a1-a2", "a2-b1"):
        sheet = (ROOT / "gramatica" / f"{level}.md").read_text(encoding="utf-8")
        sol = (ROOT / "soluciones" / f"gramatica-{level}.md").read_text(encoding="utf-8")
        n_sheet = sheet.count("**Ejercicios")
        n_sol = sol.count("\n## ")
        assert n_sheet == n_sol == 6


def test_thirty_writing_topics():
    text = (ROOT / "escritura" / "30-temas.md").read_text(encoding="utf-8")
    nums = [int(l.split(".")[0]) for l in text.splitlines() if l[:2].strip(".").isdigit()]
    assert nums == list(range(1, 31))
