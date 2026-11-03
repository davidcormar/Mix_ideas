from __future__ import annotations


def parse_time(s: str) -> float:
    """'27:58' -> 1678.0 s; '1:55:00' -> 6900.0 s; '95' -> 95.0 s."""
    parts = [float(p) for p in s.strip().split(":")]
    secs = 0.0
    for p in parts:
        secs = secs * 60 + p
    return secs


def fmt_time(seconds: float) -> str:
    seconds = int(round(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def fmt_pace(sec_per_km: float | None) -> str:
    if sec_per_km is None or sec_per_km != sec_per_km or sec_per_km <= 0:
        return "-"
    return fmt_time(sec_per_km) + "/km"


def table(headers: list[str], rows: list[list], markdown: bool = False) -> str:
    """Tiny table formatter (plain text or Markdown) without external deps."""
    srows = [[str(c) for c in r] for r in rows]
    if markdown:
        out = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
        out += ["| " + " | ".join(r) + " |" for r in srows]
        return "\n".join(out)
    widths = [max(len(h), *(len(r[i]) for r in srows)) if srows else len(h) for i, h in enumerate(headers)]
    line = "  ".join(h.ljust(w) for h, w in zip(headers, widths))
    sep = "  ".join("-" * w for w in widths)
    body = ["  ".join(c.ljust(w) for c, w in zip(r, widths)) for r in srows]
    return "\n".join([line, sep, *body])
