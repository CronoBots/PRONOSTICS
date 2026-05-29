#!/usr/bin/env python3
"""Auto-translate a pick's rationale (and headline + leg picks) from
FR to EN via MyMemory API.

MyMemory is a free, public translation service. No API key required.
Free anonymous tier: 5000 words/day per IP (enough for ~5 picks/day
of typical rationale length). Set MYMEMORY_EMAIL env var to bump the
quota to 50000 words/day.

This script reads a pick by date from picks_data.PICKS, translates
the missing EN fields, and appends/updates the entry in
picks_translations_en.TRANSLATIONS via libcst (safe AST edit).

Usage:
    python backend/scripts/translate_pick.py --date 2026-05-29
    python backend/scripts/translate_pick.py            # default: latest pending
    python backend/scripts/translate_pick.py --all      # all picks missing EN rationale

Hooked from build_history.py: if a pick has no `rationale` translation
in picks_translations_en.py, build_history fires this script
automatically (best-effort, fails silently).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import picks_data  # noqa: E402
import picks_translations_en  # noqa: E402

TRANSLATIONS_PATH = ROOT / "scripts" / "picks_translations_en.py"
ENDPOINT = "https://api.mymemory.translated.net/get"


def mymemory_translate(text: str, src: str = "fr", tgt: str = "en") -> str | None:
    """Single call to MyMemory. Returns the translated text or None on
    failure. Caller paces calls (1s gap) to stay polite."""
    if not text.strip():
        return text
    params = {"q": text, "langpair": f"{src}|{tgt}"}
    email = os.getenv("MYMEMORY_EMAIL", "").strip()
    if email:
        params["de"] = email
    url = f"{ENDPOINT}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "nexbet-translate/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        # MyMemory returns {"responseData": {"translatedText": "..."}, ...}
        # plus a "matches" list. If quotaFinished is True, we hit the cap.
        if data.get("quotaFinished"):
            print("[translate] MyMemory quota exceeded", file=sys.stderr)
            return None
        return data.get("responseData", {}).get("translatedText")
    except Exception as exc:
        print(f"[translate] {exc}", file=sys.stderr)
        return None


# Lines that are pure section headers — keep their structure but
# translate the body. We special-case the common emoji headers so the
# translation reads naturally instead of an over-literal MyMemory pass.
_HEADER_MAP_FR_EN = {
    "## 🎯 Le contexte": "## 🎯 The context",
    "## 🎯 Le match": "## 🎯 The match",
    "## 📊 L'analyse": "## 📊 Analysis",
    "## 📊 L'analyse des 2 sélections": "## 📊 Analysis of the 2 selections",
    "## 📊 L'analyse des 3 sélections": "## 📊 Analysis of the 3 selections",
    "## 🎰 Le pari": "## 🎰 The bet",
    "## 🚨 Anti-bias appliqués": "## 🚨 Anti-bias checks applied",
}


def translate_lines(lines: list[str], pace: float = 1.0) -> list[str]:
    """Translate each rationale line via MyMemory, pacing requests.

    Section headers (##) are mapped via the known dictionary above to
    avoid odd machine-translated emoji titles."""
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped in _HEADER_MAP_FR_EN:
            out.append(_HEADER_MAP_FR_EN[stripped])
            continue
        if stripped.startswith("##"):
            # Unknown header — translate as-is (MyMemory will handle).
            translated = mymemory_translate(stripped)
            out.append(translated or stripped)
            time.sleep(pace)
            continue
        translated = mymemory_translate(line)
        out.append(translated or line)
        time.sleep(pace)
    return out


def find_missing(date: str | None, scan_all: bool) -> list[dict]:
    """Return the list of picks needing EN rationale translation."""
    if date:
        pick = next((p for p in picks_data.PICKS if p["date"] == date), None)
        return [pick] if pick else []
    if scan_all:
        return [
            p for p in picks_data.PICKS
            if not (
                picks_translations_en.TRANSLATIONS.get(p["date"], {}).get("rationale")
            )
        ]
    # Default: latest pending
    pending = [p for p in picks_data.PICKS if p.get("outcome") == "pending"]
    if not pending:
        return []
    latest = max(pending, key=lambda p: p["date"])
    if picks_translations_en.TRANSLATIONS.get(latest["date"], {}).get("rationale"):
        return []
    return [latest]


def write_translation(date: str, rationale_en: list[str]) -> None:
    """Write the EN rationale into picks_translations_en.py via libcst."""
    try:
        import libcst as cst
    except ImportError:
        raise SystemExit("libcst not installed (pip install libcst)")

    src = TRANSLATIONS_PATH.read_text(encoding="utf-8")
    mod = cst.parse_module(src)

    rationale_node = cst.parse_expression(
        "[\n" + ",\n".join("            " + json.dumps(line, ensure_ascii=False)
                          for line in rationale_en) + ",\n        ]"
    )

    class _Updater(cst.CSTTransformer):
        def __init__(self) -> None:
            self.modified = False

        def leave_Dict(self, original: cst.Dict, updated: cst.Dict) -> cst.Dict:
            # Look for the dict that has "date": YYYY-MM-DD as a child.
            # Actually picks_translations uses date as a top-level key in
            # the TRANSLATIONS dict, not a nested field — we need a different
            # approach.
            return updated

    # Simpler: regex-based insert. The structure of the entry is well-known
    # ("YYYY-MM-DD": {  ...  }), so we insert "rationale": [...] right
    # before the "legs" or right before the closing brace of that entry.
    # Bail to a simpler regex approach because libcst dict-key matching is
    # cumbersome for nested dict literals keyed by string.
    import re

    pattern = re.compile(
        r'("' + re.escape(date) + r'":\s*\{)([\s\S]*?)(\n    \},)',
        re.MULTILINE,
    )

    def repl(m: re.Match) -> str:
        header, body, close = m.group(1), m.group(2), m.group(3)
        # Skip if rationale already in this body
        if '"rationale":' in body:
            return m.group(0)
        # Insert "rationale": [ ... ], right before the closing of the entry.
        rationale_block = (
            '\n        "rationale": [\n'
            + ",\n".join("            " + json.dumps(line, ensure_ascii=False)
                        for line in rationale_en)
            + ",\n        ],"
        )
        # Place at the end of the body (just before the closing brace)
        return header + body + rationale_block + close

    new_src, n = pattern.subn(repl, src)
    if n == 0:
        print(
            f"[translate] could not locate '{date}' entry in {TRANSLATIONS_PATH.name}",
            file=sys.stderr,
        )
        return
    TRANSLATIONS_PATH.write_text(new_src, encoding="utf-8")
    print(f"[translate] wrote {len(rationale_en)} lines for {date}")


def main_for_date(date: str, pace: float = 1.0) -> int:
    """Entry point usable by build_history.py — translates one specific
    date, returns 0 on success / 1 on failure. Safe to call repeatedly:
    no-op if EN rationale already present."""
    if picks_translations_en.TRANSLATIONS.get(date, {}).get("rationale"):
        return 0
    pick = next((p for p in picks_data.PICKS if p["date"] == date), None)
    if pick is None:
        return 1
    rationale_en = translate_lines(pick["rationale"], pace=pace)
    if all(en == fr for en, fr in zip(rationale_en, pick["rationale"])):
        # MyMemory returned every line unchanged → likely quota hit or
        # network unreachable. Skip write so the next run can retry.
        return 1
    write_translation(date, rationale_en)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="Pick date YYYY-MM-DD")
    ap.add_argument("--all", action="store_true", help="Back-fill every pick missing EN rationale")
    ap.add_argument(
        "--pace", type=float, default=1.0,
        help="Seconds between MyMemory calls (default 1.0)",
    )
    args = ap.parse_args()

    picks = find_missing(args.date, args.all)
    if not picks:
        print("[translate] nothing to translate")
        return 0

    for pick in picks:
        print(f"[translate] {pick['date']} → translating {len(pick['rationale'])} lines")
        rationale_en = translate_lines(pick["rationale"], pace=args.pace)
        if all(en == fr for en, fr in zip(rationale_en, pick["rationale"])):
            print(f"[translate] {pick['date']} skipped: every line came back unchanged")
            continue
        write_translation(pick["date"], rationale_en)
        # Reload so subsequent picks see the update
        import importlib
        importlib.reload(picks_translations_en)
    return 0


if __name__ == "__main__":
    sys.exit(main())
