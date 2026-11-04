import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import generar_hoja as g  # noqa: E402


def test_month_days():
    d = g.month_days(2026, 11)
    assert len(d) == 30 and d[0] == (1, "D")  # 1 Nov 2026 is a Sunday
    assert len(g.month_days(2027, 2)) == 28


def test_strip_emoji():
    assert g.strip_emoji("⏰ Levantarse") == "Levantarse"
    assert g.strip_emoji("🇫🇷 Francés") == "Francés"


def test_build_pdf(tmp_path):
    out = g.build(2026, 12, ["a", "b"], 7.5, tmp_path / "x.pdf", ["Correr 3x/semana"])
    assert out.read_bytes()[:4] == b"%PDF"
