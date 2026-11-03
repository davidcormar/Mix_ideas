"""Validate Agent Skills (SKILL.md frontmatter) and optionally package them as .zip.

Rules checked (Anthropic Agent Skills spec):
- SKILL.md starts with YAML frontmatter delimited by '---'
- `name`: required, <=64 chars, lowercase letters/digits/hyphens, matches folder name,
  must not contain reserved words "anthropic" or "claude"
- `description`: required, non-empty, <=1024 chars, no XML tags
- body should stay under ~500 lines (warning)
- relative markdown links in the body must point to existing files
"""
from __future__ import annotations

import argparse
import re
import sys
import zipfile
from pathlib import Path

import yaml

NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
LINK_RE = re.compile(r"\]\(([^)#\s]+)\)")


def parse_skill(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError("missing YAML frontmatter")
    end = text.find("\n---", 4)
    if end == -1:
        raise ValueError("unterminated frontmatter")
    try:
        meta = yaml.safe_load(text[4:end]) or {}
    except yaml.YAMLError as exc:
        raise ValueError(f"invalid YAML frontmatter: {exc}") from exc
    body = text[end + 4 :]
    return meta, body


def validate(skill_dir: Path) -> list[str]:
    errors: list[str] = []
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return [f"{skill_dir.name}: no SKILL.md"]
    try:
        meta, body = parse_skill(skill_md)
    except ValueError as exc:
        return [f"{skill_dir.name}: {exc}"]
    name = meta.get("name", "")
    desc = meta.get("description", "")
    if not name:
        errors.append("name missing")
    else:
        if len(name) > 64:
            errors.append("name > 64 chars")
        if not NAME_RE.match(name):
            errors.append("name must be lowercase-hyphen")
        if name != skill_dir.name:
            errors.append(f"name '{name}' != folder '{skill_dir.name}'")
        if "anthropic" in name or "claude" in name:
            errors.append("name contains reserved word")
    if not desc or not str(desc).strip():
        errors.append("description missing")
    elif len(str(desc)) > 1024:
        errors.append(f"description too long ({len(str(desc))})")
    elif re.search(r"<[a-zA-Z/][^>]*>", str(desc)):
        errors.append("description contains XML tags")
    if body.count("\n") > 500:
        errors.append("body > 500 lines (move content to reference files)")
    for link in LINK_RE.findall(body):
        if link.startswith(("http://", "https://", "mailto:")):
            continue
        if not (skill_dir / link).exists():
            errors.append(f"broken link: {link}")
    return [f"{skill_dir.name}: {e}" for e in errors]


def find_skills(root: Path) -> list[Path]:
    return sorted(p.parent for p in root.glob("*/SKILL.md"))


def package(skill_dir: Path, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    zpath = out_dir / f"{skill_dir.name}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(skill_dir.rglob("*")):
            if f.is_file():
                zf.write(f, Path(skill_dir.name) / f.relative_to(skill_dir))
    return zpath


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("root", nargs="?", default=Path(__file__).resolve().parents[1], type=Path)
    ap.add_argument("--zip", type=Path, help="output folder for one .zip per skill (claude.ai upload)")
    args = ap.parse_args()
    skills = find_skills(args.root)
    errors = [e for s in skills for e in validate(s)]
    for s in skills:
        print(f"{'OK ' if not any(e.startswith(s.name + ':') for e in errors) else 'ERR'} {s.name}")
    for e in errors:
        print("  -", e)
    if args.zip and not errors:
        for s in skills:
            print("zip:", package(s, args.zip))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
