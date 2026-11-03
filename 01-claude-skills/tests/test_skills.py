from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import validar_skills as v  # noqa: E402


def test_all_skills_valid():
    skills = v.find_skills(ROOT)
    assert len(skills) >= 10
    errors = [e for s in skills for e in v.validate(s)]
    assert errors == []


def test_detects_bad_name(tmp_path):
    d = tmp_path / "mala"
    d.mkdir()
    (d / "SKILL.md").write_text("---\nname: Mala_Skill\ndescription: x\n---\nbody\n")
    errs = v.validate(d)
    assert any("lowercase" in e for e in errs)
    assert any("folder" in e for e in errs)


def test_detects_broken_link(tmp_path):
    d = tmp_path / "ok-skill"
    d.mkdir()
    (d / "SKILL.md").write_text("---\nname: ok-skill\ndescription: d\n---\nver [x](no.md)\n")
    assert any("broken link" in e for e in v.validate(d))


def test_package(tmp_path):
    skill = v.find_skills(ROOT)[0]
    z = v.package(skill, tmp_path)
    assert z.exists() and z.stat().st_size > 0


def test_detects_unquoted_colon_in_description(tmp_path):
    d = tmp_path / "colon"
    d.mkdir()
    (d / "SKILL.md").write_text("---\nname: colon\ndescription: hace esto: y aquello\n---\nb\n")
    assert any("invalid YAML" in e for e in v.validate(d))
