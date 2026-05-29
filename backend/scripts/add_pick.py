#!/usr/bin/env python3
"""Add a new pick to picks_data.py in one command.

Replaces the manual flow of opening picks_data.py, copy-pasting an
existing pick block, and fixing the fields. Reads a minimal YAML/JSON
spec from stdin OR from --file, validates it, then appends.

Usage:
    # Single bet
    python scripts/add_pick.py --file new_pick.yaml

    # Quick combo from CLI (interactive prompts)
    python scripts/add_pick.py --interactive

    # Pipe from another script
    cat j13.json | python scripts/add_pick.py --stdin

Spec format (YAML or JSON, same fields as the Pick TypedDict):

    date: "2026-05-30"
    sport: "combo"  # or tennis / football / basketball
    league: "Roland Garros — 3e tour"
    home_team: "Combiné 2 paris"   # for single bets: actual home team
    away_team: "Roland Garros Jour 7"
    kickoff: "2026-05-30T11:00:00+00:00"
    pick: "Combiné Andreeva 2-0 + Zverev 3-0"
    odds: 2.50
    model_probability: 0.50
    headline: "Short narrative line"
    stake: 5.0
    rationale:
      - "## 🎯 Le contexte"
      - "..."
    sources:
      - "https://..."
    # For combos only:
    legs:
      - sport: tennis
        league: "Roland Garros — 3e tour"
        home_team: "Player A"
        away_team: "Player B"
        pick: "Player A wins"
        kickoff: "2026-05-30T11:00:00+00:00"
        odds: 1.50

After append, automatically runs:
  1. importlib.reload(picks_data) → verifies file still imports
  2. python build_history.py → regenerates history.json
  3. (optional) commits with the standard message

Pass --commit to commit + push the change.
"""
from __future__ import annotations

import argparse
import importlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PICKS_PATH = ROOT / "scripts" / "picks_data.py"

REQUIRED_TOP = {
    "date", "sport", "league", "home_team", "away_team",
    "kickoff", "pick", "odds", "model_probability", "stake",
    "rationale", "sources",
}


def _load_spec(path: str | None, use_stdin: bool) -> dict:
    if use_stdin:
        raw = sys.stdin.read()
    elif path:
        raw = Path(path).read_text(encoding="utf-8")
    else:
        raise SystemExit("Provide --file <path>, --stdin, or --interactive")

    raw = raw.strip()
    # Try JSON first, fall back to YAML (yaml is optional dep).
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    try:
        import yaml  # type: ignore

        return yaml.safe_load(raw)
    except ImportError:
        raise SystemExit(
            "Input is not JSON and PyYAML is not installed. "
            "Either format as JSON or `pip install pyyaml`."
        )


def _validate(spec: dict) -> list[str]:
    """Return list of error strings (empty = OK)."""
    errors: list[str] = []
    missing = REQUIRED_TOP - spec.keys()
    if missing:
        errors.append(f"missing required fields: {sorted(missing)}")
    if spec.get("outcome") and spec["outcome"] != "pending":
        errors.append(
            f"outcome should be 'pending' at creation (got {spec['outcome']!r})"
        )
    if not isinstance(spec.get("rationale"), list) or not spec["rationale"]:
        errors.append("rationale must be a non-empty list of strings")
    if not isinstance(spec.get("sources"), list):
        errors.append("sources must be a list of URLs")
    if spec.get("sport") == "combo":
        legs = spec.get("legs")
        if not isinstance(legs, list) or len(legs) < 2:
            errors.append("combo requires legs[] with ≥ 2 entries")
        else:
            for i, leg in enumerate(legs):
                for f in ("sport", "league", "home_team", "away_team", "pick", "kickoff", "odds"):
                    if f not in leg:
                        errors.append(f"legs[{i}] missing {f!r}")
    if not (1.0 < float(spec.get("odds", 0)) < 50.0):
        errors.append(f"odds out of plausible range: {spec.get('odds')}")
    if not (0.05 < float(spec.get("model_probability", 0)) < 0.99):
        errors.append(
            f"model_probability out of range: {spec.get('model_probability')}"
        )
    return errors


def _format_pick_block(spec: dict) -> str:
    """Render the spec as a multi-line Python dict literal matching the
    house style of picks_data.py."""
    date = spec["date"]
    day_marker = f"    # ──────────────────────────────────────────────────────────────────\n"
    day_marker += f"    # J? — {date} — {spec.get('headline', spec['pick'])[:60]}\n"
    day_marker += f"    # ──────────────────────────────────────────────────────────────────\n"

    lines = ["    {"]
    lines.append(f'        "date": "{date}",')
    lines.append(f'        "sport": "{spec["sport"]}",')
    lines.append(f'        "league": "{spec["league"]}",')
    lines.append(f'        "home_team": "{spec["home_team"]}",')
    lines.append(f'        "away_team": "{spec["away_team"]}",')
    lines.append(f'        "kickoff": "{spec["kickoff"]}",')
    lines.append(f'        "pick": {json.dumps(spec["pick"], ensure_ascii=False)},')
    lines.append(f'        "odds": {float(spec["odds"])},')
    if "odds_unboosted" in spec:
        lines.append(f'        "odds_unboosted": {float(spec["odds_unboosted"])},')
    lines.append(f'        "model_probability": {float(spec["model_probability"])},')
    if "headline" in spec:
        lines.append(f'        "headline": {json.dumps(spec["headline"], ensure_ascii=False)},')
    lines.append(f'        "rationale": [')
    for r in spec["rationale"]:
        lines.append(f"            {json.dumps(r, ensure_ascii=False)},")
    lines.append(f'        ],')
    lines.append(f'        "sources": [')
    for s in spec["sources"]:
        lines.append(f'            "{s}",')
    lines.append(f'        ],')
    lines.append(f'        "stake": {float(spec["stake"])},')
    lines.append(f'        "outcome": "pending",')
    if spec.get("sport") == "combo":
        lines.append(f'        "legs": [')
        for leg in spec["legs"]:
            lines.append(f'            {{')
            for f in ("sport", "league", "home_team", "away_team", "pick"):
                lines.append(f'                "{f}": {json.dumps(leg[f], ensure_ascii=False)},')
            lines.append(f'                "kickoff": "{leg["kickoff"]}",')
            lines.append(f'                "odds": {float(leg["odds"])},')
            lines.append(f'                "outcome": "pending",')
            lines.append(f'            }},')
        lines.append(f'        ],')
    lines.append(f'    }},')
    return day_marker + "\n".join(lines) + "\n"


def _append_pick(block: str) -> None:
    """Insert block right before the closing `]` of PICKS."""
    txt = PICKS_PATH.read_text(encoding="utf-8")
    # Find the last `]` that closes PICKS (the file ends with `]\n`).
    closing = txt.rfind("]")
    if closing == -1:
        raise SystemExit("Could not find closing ] of PICKS — file format unexpected")
    new_txt = txt[:closing] + block + txt[closing:]
    PICKS_PATH.write_text(new_txt, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Add a pick to picks_data.py")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="YAML or JSON file with the pick spec")
    src.add_argument("--stdin", action="store_true", help="Read spec from stdin")
    ap.add_argument("--commit", action="store_true", help="git commit + push after")
    ap.add_argument(
        "--dry-run", action="store_true",
        help="Print the formatted block but don't modify picks_data.py",
    )
    args = ap.parse_args()

    spec = _load_spec(args.file, args.stdin)
    errors = _validate(spec)
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 2

    block = _format_pick_block(spec)
    if args.dry_run:
        print(block)
        return 0

    _append_pick(block)
    print(f"Appended pick {spec['date']} to picks_data.py")

    # Verify import safety
    sys.path.insert(0, str(ROOT / "scripts"))
    import picks_data
    importlib.reload(picks_data)
    print(f"picks_data.py reloads OK ({len(picks_data.PICKS)} picks total)")

    # Regenerate history.json
    subprocess.run(
        ["python", "scripts/build_history.py"],
        cwd=str(ROOT), check=True,
    )

    if args.commit:
        subprocess.run(
            ["git", "add",
             "backend/scripts/picks_data.py",
             "backend/data/history.json",
             "backend/data/predictions/"],
            cwd=str(ROOT.parent), check=True,
        )
        subprocess.run(
            ["git", "commit", "-m", f"add pick {spec['date']}"],
            cwd=str(ROOT.parent), check=True,
        )
        subprocess.run(
            ["git", "push", "origin", "HEAD"],
            cwd=str(ROOT.parent), check=True,
        )
        print("Committed and pushed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
