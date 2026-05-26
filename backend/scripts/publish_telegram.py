#!/usr/bin/env python3
"""NEXBET Telegram publisher — v3 professional English layout.

Publishes daily picks, settled results, and weekly recaps to a Telegram
channel. Inspired by professional bookmaker newsletters (Pinnacle style):
data-dense, monospace alignment, minimal decoration, clear hierarchy.

Reads credentials from environment:
  - TELEGRAM_BOT_TOKEN  : bot token (BotFather)
  - TELEGRAM_CHANNEL_ID : numeric channel ID (starts with -100…)

Usage:
    python scripts/publish_telegram.py --test
    python scripts/publish_telegram.py --pick today
    python scripts/publish_telegram.py --result 2026-05-26
    python scripts/publish_telegram.py --recap weekly
    python scripts/publish_telegram.py --pick today --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError


# =============================================================================
# Env loading
# =============================================================================


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


ROOT = Path(__file__).resolve().parent.parent.parent
_load_env_file(ROOT / ".env")

sys.path.insert(0, str(Path(__file__).parent))
import picks_data  # noqa: E402


# =============================================================================
# Config
# =============================================================================

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()

PUBLIC_BASE = "https://cronobots.github.io/PRONOSTICS"
LOGO_BANNER_URL = f"{PUBLIC_BASE}/logo-banner.png"
LOGO_SQUARE_URL = f"{PUBLIC_BASE}/logo-square.png"

# Sport label mapping (English, no emoji)
SPORT_LABEL = {
    "football": "Football",
    "tennis": "Tennis",
    "basketball": "Basketball",
    "combo": "Multi-sport parlay",
}

# Footer — minimal, compliance only
FOOTER = (
    "—\n"
    "*NEXBET* — _Trust the Algorithm_\n"
    "21+ · [BeGambleAware.org](https://www.begambleaware.org) · "
    "Entertainment only"
)


# Inline buttons (concise, action-oriented)
def _buttons_pick() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "Full analysis →", "url": f"{PUBLIC_BASE}/"},
                {"text": "Track record →", "url": f"{PUBLIC_BASE}/paris"},
            ],
        ]
    }


def _buttons_result() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "Today's pick →", "url": f"{PUBLIC_BASE}/today"},
                {"text": "Bankroll →", "url": f"{PUBLIC_BASE}/stats"},
            ],
        ]
    }


def _buttons_recap() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "Detailed picks →", "url": f"{PUBLIC_BASE}/paris"},
                {"text": "Statistics →", "url": f"{PUBLIC_BASE}/stats"},
            ],
            [
                {"text": "Subscribe Premium →", "url": f"{PUBLIC_BASE}/premium"},
            ],
        ]
    }


# =============================================================================
# Telegram API
# =============================================================================


def _api_post(method: str, payload: dict) -> dict | None:
    if not BOT_TOKEN or not CHANNEL_ID:
        print(
            "ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID missing.\n"
            "Configure these in .env (local) or GitHub Secrets (CI)."
        )
        return None
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    body = json.dumps(payload).encode("utf-8")
    req = urlrequest.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("ok"):
                return data
            print(f"ERROR Telegram API ({method}): {data}")
            return None
    except HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")[:300]
        print(f"ERROR HTTP {e.code} ({method}): {body_text}")
        return None
    except URLError as e:
        print(f"ERROR network ({method}): {e}")
        return None


def send_message(text: str, reply_markup: dict | None = None) -> bool:
    payload = {
        "chat_id": CHANNEL_ID,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    data = _api_post("sendMessage", payload)
    if data:
        print(f"Message sent (id={data.get('result', {}).get('message_id')})")
        return True
    return False


def send_photo(
    photo_url: str,
    caption: str,
    reply_markup: dict | None = None,
) -> bool:
    if len(caption) > 1024:
        print(f"Caption {len(caption)} chars > 1024 → fallback to sendMessage")
        return send_message(caption, reply_markup)
    payload = {
        "chat_id": CHANNEL_ID,
        "photo": photo_url,
        "caption": caption,
        "parse_mode": "Markdown",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    data = _api_post("sendPhoto", payload)
    if data:
        print(f"Photo sent (id={data.get('result', {}).get('message_id')})")
        return True
    return False


def send_poll(question: str, options: list[str]) -> bool:
    payload = {
        "chat_id": CHANNEL_ID,
        "question": question[:300],
        "options": [opt[:100] for opt in options],
        "is_anonymous": True,
        "type": "regular",
        "allows_multiple_answers": False,
    }
    data = _api_post("sendPoll", payload)
    if data:
        print(f"Poll sent (id={data.get('result', {}).get('message_id')})")
        return True
    return False


# =============================================================================
# Formatting helpers (English locale)
# =============================================================================

WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTHS_EN = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def fmt_date_long(date_str: str) -> str:
    """2026-05-26 → 'Tuesday, May 26, 2026'."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{WEEKDAYS_EN[d.weekday()]}, {MONTHS_EN[d.month]} {d.day}, {d.year}"


def fmt_date_short(date_str: str) -> str:
    """2026-05-26 → 'May 26'."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{MONTHS_EN[d.month]} {d.day}"


def fmt_time_cet(kickoff_iso: str) -> str:
    """'2026-05-26T11:00:00+00:00' → '11:00 CET' (UTC is shown; CET = UTC+1/2)."""
    if not kickoff_iso:
        return ""
    try:
        dt = datetime.fromisoformat(kickoff_iso.replace("Z", "+00:00"))
        # Display as UTC for international clarity
        return f"{dt.strftime('%H:%M')} UTC"
    except Exception:
        return ""


def find_pick(date_iso: str) -> dict | None:
    for p in picks_data.PICKS:
        if p.get("date") == date_iso:
            return p
    return None


def aligned_data(rows: list[tuple[str, str]]) -> str:
    """Format a list of (label, value) into aligned monospace lines.

    Output wrapped in triple backticks for Telegram code block (monospace).
    """
    if not rows:
        return ""
    max_label = max(len(r[0]) for r in rows)
    lines = [f"{r[0]:<{max_label + 2}}{r[1]}" for r in rows]
    return "```\n" + "\n".join(lines) + "\n```"


# =============================================================================
# Track record helper (used as footer in picks/results)
# =============================================================================


def compute_track_record(days: int = 7) -> str:
    """Compute last-N-days performance as a one-line summary."""
    today = date.today()
    start = today - timedelta(days=days)
    recent = [
        p for p in picks_data.PICKS
        if datetime.strptime(p["date"], "%Y-%m-%d").date() >= start
        and p.get("outcome") in {"win", "loss"}
    ]
    if not recent:
        return ""
    wins = sum(1 for p in recent if p.get("outcome") == "win")
    losses = sum(1 for p in recent if p.get("outcome") == "loss")
    settled = wins + losses
    win_rate = (wins / settled * 100) if settled else 0
    total_staked = sum(p.get("stake", 0) for p in recent)
    total_profit = sum(
        (p.get("profit") or (p["stake"] * (p["odds"] - 1) if p.get("outcome") == "win" else -p["stake"]))
        for p in recent
    )
    roi = (total_profit / total_staked * 100) if total_staked else 0
    sign = "+" if roi >= 0 else ""
    return (
        f"*Track record · last {days} days*\n"
        f"{wins}W — {losses}L — {win_rate:.0f}% — ROI {sign}{roi:.1f}%"
    )


# =============================================================================
# Message formats
# =============================================================================


def format_test() -> str:
    return (
        "*NEXBET BOT — Connection test*\n\n"
        "Connection established\n"
        f"_{datetime.now().strftime('%B %d, %Y · %H:%M UTC')}_\n\n"
        "Setup verified:\n"
        "• Logo banner\n"
        "• Inline buttons\n"
        "• Engagement polls (recap only)\n"
        "• Channel signature\n\n"
        + FOOTER
    )


def format_pick_simple(pick: dict) -> str:
    sport = SPORT_LABEL.get(pick["sport"], pick["sport"].title())
    potential = pick["stake"] * (pick["odds"] - 1)
    total_return = pick["stake"] * pick["odds"]

    data_rows = [
        ("Market price", f"{pick['odds']:.2f}"),
        ("Stake", f"{pick['stake']:.2f} EUR"),
        ("Potential return", f"{total_return:.2f} EUR (+{potential:.2f})"),
    ]
    if pick.get("model_probability"):
        edge = pick["model_probability"] * pick["odds"] - 1
        if edge > 0:
            data_rows.append(("Edge (model)", f"+{edge * 100:.1f}%"))

    msg = (
        "*BET OF THE DAY*\n"
        f"{fmt_date_long(pick['date'])}\n\n"
        f"{pick['league']}\n"
        f"*{pick['home_team']}* vs *{pick['away_team']}*\n"
        f"{fmt_time_cet(pick.get('kickoff', ''))} · {sport}\n\n"
        f"*PICK*\n"
        f"{pick['pick']}\n\n"
        f"{aligned_data(data_rows)}\n"
    )
    if pick.get("headline"):
        msg += f"\n_{pick['headline']}_\n"

    tr = compute_track_record(7)
    if tr:
        msg += f"\n{tr}\n"

    msg += "\n" + FOOTER
    return msg


def format_pick_combo(pick: dict) -> str:
    legs = pick.get("legs", [])
    potential = pick["stake"] * (pick["odds"] - 1)
    total_return = pick["stake"] * pick["odds"]

    msg = (
        f"*BET OF THE DAY · {len(legs)}-leg parlay*\n"
        f"{fmt_date_long(pick['date'])}\n\n"
        f"{pick['league']}\n\n"
        "*LEGS*\n"
    )

    # Aligned legs : "1. Pick name @ 1.28"
    leg_rows = []
    for i, leg in enumerate(legs, 1):
        # Truncate pick name if too long for one line
        leg_pick = leg['pick']
        if len(leg_pick) > 32:
            leg_pick = leg_pick[:30] + "…"
        leg_rows.append((f"{i}. {leg_pick}", f"{leg['odds']:.2f}"))
    msg += aligned_data(leg_rows) + "\n"

    data_rows = [
        ("Total odds", f"{pick['odds']:.2f}"),
        ("Stake", f"{pick['stake']:.2f} EUR"),
        ("Potential return", f"{total_return:.2f} EUR (+{potential:.2f})"),
    ]
    msg += f"\n{aligned_data(data_rows)}\n"

    if pick.get("headline"):
        msg += f"\n_{pick['headline']}_\n"

    tr = compute_track_record(7)
    if tr:
        msg += f"\n{tr}\n"

    msg += "\n" + FOOTER
    return msg


def format_result(pick: dict) -> str:
    is_win = pick.get("outcome") == "win"
    is_loss = pick.get("outcome") == "loss"
    is_void = pick.get("outcome") == "void"

    if is_win:
        status = "WON"
        profit_value = pick.get("profit") or (pick["stake"] * (pick["odds"] - 1))
        profit_str = f"+{profit_value:.2f} EUR"
    elif is_loss:
        status = "LOST"
        profit_value = pick.get("profit") or -pick["stake"]
        profit_str = f"{profit_value:.2f} EUR"
    elif is_void:
        status = "VOIDED"
        profit_str = "Stake refunded"
    else:
        status = "PENDING"
        profit_str = "—"

    msg = (
        "*RESULT*\n"
        f"{fmt_date_long(pick['date'])}\n\n"
        f"{pick['pick']}\n"
        f"Odds {pick['odds']:.2f} · Stake {pick['stake']:.2f} EUR\n\n"
        f"*{status}* — {profit_str}\n"
    )

    result = pick.get("result", {}) or {}
    score_text = result.get("score_text", "").strip()
    summary = result.get("summary", "").strip()
    if score_text:
        msg += f"\n_{score_text}_\n"
    if summary:
        msg += f"{summary}\n"

    tr = compute_track_record(7)
    if tr:
        msg += f"\n{tr}\n"

    msg += "\n" + FOOTER
    return msg


def format_recap_weekly() -> str:
    today = date.today()
    week_ago = today - timedelta(days=7)
    recent = [
        p for p in picks_data.PICKS
        if datetime.strptime(p["date"], "%Y-%m-%d").date() >= week_ago
        and p.get("outcome") in {"win", "loss"}
    ]
    if not recent:
        return (
            "*WEEKLY REPORT*\n\n"
            "No bets settled this week.\n\n"
            + FOOTER
        )

    wins = sum(1 for p in recent if p.get("outcome") == "win")
    losses = sum(1 for p in recent if p.get("outcome") == "loss")
    settled = wins + losses
    total_staked = sum(p.get("stake", 0) for p in recent)
    total_profit = sum(
        (p.get("profit") or (p["stake"] * (p["odds"] - 1) if p.get("outcome") == "win" else -p["stake"]))
        for p in recent
    )
    win_rate = (wins / settled * 100) if settled else 0
    roi = (total_profit / total_staked * 100) if total_staked else 0
    profit_sign = "+" if total_profit >= 0 else ""

    # Find best and worst picks
    won_picks = [p for p in recent if p.get("outcome") == "win"]
    best_pick = max(
        won_picks,
        key=lambda p: (p.get("profit") or (p["stake"] * (p["odds"] - 1))),
        default=None,
    )
    lost_picks = [p for p in recent if p.get("outcome") == "loss"]

    data_rows = [
        ("Bets settled", str(settled)),
        ("Wins", str(wins)),
        ("Losses", str(losses)),
        ("Win rate", f"{win_rate:.1f}%"),
        ("Total staked", f"{total_staked:.2f} EUR"),
        ("Net profit", f"{profit_sign}{total_profit:.2f} EUR"),
        ("ROI", f"{profit_sign}{roi:.1f}%"),
    ]

    msg = (
        "*WEEKLY REPORT*\n"
        f"{fmt_date_short(week_ago.isoformat())} — {fmt_date_short(today.isoformat())}\n\n"
        f"{aligned_data(data_rows)}\n"
    )

    if best_pick:
        best_profit = best_pick.get("profit") or (best_pick["stake"] * (best_pick["odds"] - 1))
        msg += (
            f"\n*Best pick:* {best_pick['pick']} @ {best_pick['odds']:.2f}"
            f" (+{best_profit:.2f} EUR)\n"
        )

    if lost_picks:
        worst = lost_picks[0]
        msg += f"*Worst day:* {worst['pick']} @ {worst['odds']:.2f}\n"

    msg += "\n" + FOOTER
    return msg


# =============================================================================
# Workflows
# =============================================================================


def publish_test(dry_run: bool = False) -> bool:
    msg = format_test()
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        return True
    return send_photo(LOGO_SQUARE_URL, msg)


def publish_pick(pick: dict, dry_run: bool = False) -> bool:
    is_combo = pick.get("sport") == "combo"
    msg = format_pick_combo(pick) if is_combo else format_pick_simple(pick)
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print("\n[+ logo banner + 2 inline buttons]")
        return True
    return send_photo(LOGO_BANNER_URL, msg, _buttons_pick())


def publish_result(pick: dict, dry_run: bool = False) -> bool:
    msg = format_result(pick)
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print("\n[+ logo banner + 2 inline buttons]")
        return True
    return send_photo(LOGO_BANNER_URL, msg, _buttons_result())


def publish_recap(dry_run: bool = False) -> bool:
    msg = format_recap_weekly()
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print("\n[+ logo banner + 3 inline buttons + 1 engagement poll]")
        return True

    ok = send_photo(LOGO_BANNER_URL, msg, _buttons_recap())
    if not ok:
        return False

    # Single engagement poll on recap only (not on every pick — too pushy)
    send_poll(
        "Was this week's selection useful to you?",
        ["Yes — keep going", "Mixed feelings", "No"],
    )
    return True


# =============================================================================
# Main
# =============================================================================


def main() -> int:
    parser = argparse.ArgumentParser(description="NEXBET Telegram publisher")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--test", action="store_true")
    group.add_argument("--pick", choices=["today", "yesterday"])
    group.add_argument("--result", metavar="YYYY-MM-DD")
    group.add_argument("--recap", choices=["weekly"])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.test:
        return 0 if publish_test(args.dry_run) else 1

    if args.pick:
        target = date.today() if args.pick == "today" else date.today() - timedelta(days=1)
        pick = find_pick(target.isoformat())
        if not pick:
            print(f"No pick found for {target.isoformat()}")
            return 1
        return 0 if publish_pick(pick, args.dry_run) else 1

    if args.result:
        pick = find_pick(args.result)
        if not pick:
            print(f"No pick found for {args.result}")
            return 1
        return 0 if publish_result(pick, args.dry_run) else 1

    if args.recap == "weekly":
        return 0 if publish_recap(args.dry_run) else 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
