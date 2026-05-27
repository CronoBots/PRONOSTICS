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
from urllib.parse import quote_plus


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
from picks_translations_en import translate_pick  # noqa: E402


# =============================================================================
# Config
# =============================================================================

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()

PUBLIC_BASE = "https://cronobots.github.io/PRONOSTICS"
# telegram-banner.png = bannière custom uploadée par user pour le canal
# (overrides logo-banner.png qui était le default du site)
LOGO_BANNER_URL = f"{PUBLIC_BASE}/telegram-banner.png"
LOGO_SQUARE_URL = f"{PUBLIC_BASE}/logo-square.png"

# Sport icons (1 emoji per sport — used as visual anchor in headers)
SPORT_ICON = {
    "football": "⚽",
    "tennis": "🎾",
    "basketball": "🏀",
    "combo": "🎯",
}

# Sport label fallback (used when no icon needed)
SPORT_LABEL = {
    "football": "Football",
    "tennis": "Tennis",
    "basketball": "Basketball",
    "combo": "Multi-sport parlay",
}

# Channel invite link for "Subscribe" button (user's NEXBET channel)
CHANNEL_INVITE_URL = "https://t.me/+gOuk4FABejgwNTk0"

# Footer — minimal, compliance only
FOOTER = (
    "—\n"
    "*NEXBET* — _Bet • Win • Repeat_\n"
    "21+ · [BeGambleAware.org](https://www.begambleaware.org) · "
    "Entertainment only"
)


# Inline buttons (concise, action-oriented)
# All button sets include "🔔 Subscribe" at the bottom — pushes channel
# discovery when messages are forwarded to non-subscribers.
def _buttons_pick() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "💎 Unlock pick · Premium", "url": f"{PUBLIC_BASE}/premium"},
            ],
            [
                {"text": "Track record →", "url": f"{PUBLIC_BASE}/paris"},
                {"text": "🔔 Subscribe", "url": CHANNEL_INVITE_URL},
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
            [
                {"text": "🔔 Subscribe to NEXBET", "url": CHANNEL_INVITE_URL},
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
                {"text": "Premium →", "url": f"{PUBLIC_BASE}/premium"},
                {"text": "🔔 Subscribe", "url": CHANNEL_INVITE_URL},
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
) -> int | None:
    """Send a photo with caption. Returns message_id on success, None on failure."""
    if len(caption) > 1024:
        print(f"Caption {len(caption)} chars > 1024 → fallback to sendMessage")
        ok = send_message(caption, reply_markup)
        return None if not ok else -1  # message_id unknown for fallback
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
        message_id = data.get("result", {}).get("message_id")
        print(f"Photo sent (id={message_id})")
        return message_id
    return None


def unpin_all_messages() -> bool:
    """Unpin all messages in the channel (used before pinning new pick)."""
    data = _api_post("unpinAllChatMessages", {"chat_id": CHANNEL_ID})
    if data:
        print("Previous pins cleared")
        return True
    return False


def pin_message(message_id: int, disable_notification: bool = True) -> bool:
    """Pin a message in the channel. Requires bot admin 'Pin Messages' perm."""
    if message_id < 0:  # fallback case (sendMessage instead of sendPhoto)
        return False
    payload = {
        "chat_id": CHANNEL_ID,
        "message_id": message_id,
        "disable_notification": disable_notification,
    }
    data = _api_post("pinChatMessage", payload)
    if data:
        print(f"Message pinned (id={message_id})")
        return True
    # Pin failure is non-blocking : the message was sent successfully,
    # only the pin permission is missing. User can grant it later.
    print("Pin failed (likely missing 'Pin Messages' admin permission)")
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
    """Locate a pick by date and apply English translation overlay."""
    for p in picks_data.PICKS:
        if p.get("date") == date_iso:
            return translate_pick(p)
    return None


def _team_with_country(team: str, country_code: str) -> str:
    """'Bautista Agut' + 'ESP' → 'Bautista Agut (ESP)'."""
    if not country_code:
        return team
    return f"{team} ({country_code})"


# Premium gating helpers — mask text content while preserving structure
# to give users a "redacted document" feel : they SEE there's content,
# but the actual values are hidden until Premium subscription.


def mask_words(text: str, char: str = "█") -> str:
    """Replace each word in `text` by a block of same length.

    Preserves spaces, punctuation, line breaks → reader sees the shape
    of the sentence (rhythm, length) but cannot read the content.

    Example : "Bencic to win" → "██████ ██ ███"
    """
    out = []
    for c in text:
        if c.isalnum():
            out.append(char)
        else:
            out.append(c)
    return "".join(out)


def aligned_data(rows: list[tuple[str, str]]) -> str:
    """Format a list of (label, value) into aligned monospace lines.

    Output wrapped in triple backticks for Telegram code block (monospace).
    """
    if not rows:
        return ""
    max_label = max(len(r[0]) for r in rows)
    lines = [f"{r[0]:<{max_label + 2}}{r[1]}" for r in rows]
    return "```\n" + "\n".join(lines) + "\n```"


def bankroll_chart_url(days: int = 30) -> str:
    """Generate a QuickChart.io URL with the bankroll evolution.

    Style aligned with home page chart : dark theme, green line (or red
    if down), subtle horizontal grid only, no points, no title, no
    X-axis labels. Returns a permanent image URL.
    """
    starting = 5.0
    sorted_picks = sorted(
        (p for p in picks_data.PICKS if p.get("outcome") in {"win", "loss"}),
        key=lambda p: p["date"],
    )
    labels = ["Start"]
    values = [starting]
    running = starting
    for p in sorted_picks:
        if p["outcome"] == "win":
            running += p["stake"] * (p["odds"] - 1)
        elif p["outcome"] == "loss":
            running -= p["stake"]
        labels.append(datetime.strptime(p["date"], "%Y-%m-%d").strftime("%b %d"))
        values.append(round(running, 2))

    if len(labels) > days + 1:
        labels = labels[-(days + 1):]
        values = values[-(days + 1):]

    final = values[-1] if values else starting
    positive = final >= starting
    # NEXBET green / red exact (from frontend/tailwind.config.js)
    color = "#10d9a3" if positive else "#ff4d6d"
    fill_color = "rgba(16,217,163,0.08)" if positive else "rgba(255,77,109,0.08)"

    config = {
        "type": "line",
        "data": {
            "labels": labels,
            "datasets": [{
                "data": values,
                "borderColor": color,
                "backgroundColor": fill_color,
                "fill": True,
                "tension": 0.4,
                "pointRadius": 0,
                "borderWidth": 4,
            }],
        },
        "options": {
            "responsive": False,
            "plugins": {
                "legend": {"display": False},
                "tooltip": {"enabled": False},
            },
            "scales": {
                "x": {
                    "display": False,
                    "grid": {"display": False},
                },
                "y": {
                    "ticks": {
                        "color": "#ffffff",
                        "font": {"size": 14, "weight": "bold"},
                        "callback": "function(v){return v+'€'}",
                    },
                    "grid": {
                        "color": "rgba(255,255,255,0.06)",
                        "drawBorder": False,
                    },
                    "border": {"display": False},
                },
            },
            "layout": {
                "padding": {"top": 20, "right": 30, "bottom": 20, "left": 10},
            },
        },
    }

    encoded = quote_plus(json.dumps(config, separators=(",", ":")))
    # bkg dark aligné bg-card NEXBET (#12141E from tailwind config)
    return f"https://quickchart.io/chart?bkg=%2312141E&w=800&h=400&c={encoded}"


# Colored status dots — used in result messages for instant visual signal
STATUS_DOT = {
    "win": "🟢",
    "loss": "🔴",
    "void": "🔵",
    "pending": "🟡",
}


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
    """Format a single pending pick — Premium gated with MASKED content.

    Structure entièrement visible (selections, match, rationale) mais
    contenu masqué par blocs █. L'utilisateur voit qu'il y a une analyse
    riche derrière le paywall sans pouvoir la lire.
    """
    icon = SPORT_ICON.get(pick["sport"], "")
    potential = pick["stake"] * (pick["odds"] - 1)
    total_return = pick["stake"] * pick["odds"]

    home_masked = mask_words(pick["home_team"])
    away_masked = mask_words(pick["away_team"])
    pick_masked = mask_words(pick["pick"])

    # Pricing data — publicly visible (builds trust via quanti transparency)
    data_rows = [("Market price", f"{pick['odds']:.2f}")]
    if pick.get("model_probability"):
        fair_value = 1 / pick["model_probability"]
        edge = pick["model_probability"] * pick["odds"] - 1
        data_rows.append(("Fair value", f"{fair_value:.2f}"))
        data_rows.append(("Model probability", f"{pick['model_probability'] * 100:.0f}%"))
        if abs(edge) >= 0.005:
            sign = "+" if edge >= 0 else ""
            data_rows.append(("Edge", f"{sign}{edge * 100:.1f}%"))
    data_rows.extend([
        ("Stake", f"{pick['stake']:.2f} EUR"),
        ("Potential return", f"{total_return:.2f} EUR"),
        ("Net P/L if won", f"+{potential:.2f} EUR"),
    ])

    msg = (
        "🔒 *BET OF THE DAY · Premium pick*\n"
        f"{fmt_date_long(pick['date'])} · {fmt_time_cet(pick.get('kickoff', ''))}\n"
        "\n"
        f"{icon} {pick['league']}\n"
        f"*{home_masked}* vs *{away_masked}*\n"
        "\n"
        f"*SELECTION*\n"
        f"{pick_masked}\n"
        "\n"
        f"*PRICING*\n"
        f"{aligned_data(data_rows)}\n"
    )

    if pick.get("headline"):
        msg += f"\n*RATIONALE*\n_{mask_words(pick['headline'])}_\n"

    msg += "\n💎 *Unlock the actual selection, players and rationale*\n*with Premium.*\n"

    tr = compute_track_record(7)
    if tr:
        msg += "\n" + tr + "\n"

    msg += "\n" + FOOTER
    return msg


def format_pick_combo(pick: dict) -> str:
    """Format a pending combo — Premium gated with MASKED selections.

    Le nombre de jambes est visible, les cotes individuelles aussi
    (data publique), mais les noms des sélections sont masqués par blocs.
    """
    legs = pick.get("legs", [])
    potential = pick["stake"] * (pick["odds"] - 1)
    total_return = pick["stake"] * pick["odds"]

    leg_sports = {leg.get("sport") for leg in legs}
    if len(leg_sports) == 1:
        icon = SPORT_ICON.get(next(iter(leg_sports)), SPORT_ICON["combo"])
    else:
        icon = SPORT_ICON["combo"]

    msg = (
        f"🔒 *BET OF THE DAY · {len(legs)}-leg parlay · Premium pick*\n"
        f"{fmt_date_long(pick['date'])}\n"
        "\n"
        f"{icon} {pick['league']}\n"
        "\n"
        "*SELECTIONS*\n"
    )

    # Aligned legs MASKED : "1. ████████████ ████████ (███)  1.28"
    leg_rows = []
    for i, leg in enumerate(legs, 1):
        leg_pick = leg["pick"]
        away_country = leg.get("away_country", "")
        if away_country:
            leg_pick = f"{leg_pick} ({away_country})"
        if len(leg_pick) > 36:
            leg_pick = leg_pick[:34] + "…"
        masked = mask_words(leg_pick)
        leg_rows.append((f"{i}. {masked}", f"{leg['odds']:.2f}"))
    msg += aligned_data(leg_rows) + "\n"

    # Pricing data — publicly visible
    data_rows = [("Combined price", f"{pick['odds']:.2f}")]
    if pick.get("model_probability"):
        fair_value = 1 / pick["model_probability"]
        edge = pick["model_probability"] * pick["odds"] - 1
        data_rows.append(("Fair value", f"{fair_value:.2f}"))
        data_rows.append(("Model probability", f"{pick['model_probability'] * 100:.0f}%"))
        if abs(edge) >= 0.005:
            sign = "+" if edge >= 0 else ""
            data_rows.append(("Edge", f"{sign}{edge * 100:.1f}%"))
    data_rows.extend([
        ("Stake", f"{pick['stake']:.2f} EUR"),
        ("Potential return", f"{total_return:.2f} EUR"),
        ("Net P/L if won", f"+{potential:.2f} EUR"),
    ])

    msg += f"\n*PRICING*\n{aligned_data(data_rows)}\n"

    if pick.get("headline"):
        msg += f"\n*RATIONALE*\n_{mask_words(pick['headline'])}_\n"

    msg += "\n💎 *Unlock player names and full rationale*\n*with Premium.*\n"

    tr = compute_track_record(7)
    if tr:
        msg += "\n" + tr + "\n"

    msg += "\n" + FOOTER
    return msg


def format_result(pick: dict) -> str:
    outcome = pick.get("outcome") or "pending"
    dot = STATUS_DOT.get(outcome, "🟡")
    icon = SPORT_ICON.get(pick["sport"], "")

    if outcome == "win":
        status = "WON"
        profit_value = pick.get("profit") or (pick["stake"] * (pick["odds"] - 1))
        profit_str = f"+{profit_value:.2f} EUR"
    elif outcome == "loss":
        status = "LOST"
        profit_value = pick.get("profit") or -pick["stake"]
        profit_str = f"{profit_value:.2f} EUR"
    elif outcome == "void":
        status = "VOIDED"
        profit_str = "Stake refunded"
    else:
        status = "PENDING"
        profit_str = "—"

    msg = (
        f"{dot} *RESULT — {status}*\n"
        f"{fmt_date_long(pick['date'])}\n"
        "\n"
        f"{icon} {pick['pick']}\n"
        f"Odds {pick['odds']:.2f} · Stake {pick['stake']:.2f} EUR\n"
        "\n"
        f"*Net P/L*  {dot} *{profit_str}*\n"
    )

    result = pick.get("result", {}) or {}
    score_text = result.get("score_text", "").strip()
    summary = result.get("summary", "").strip()
    if score_text:
        msg += f"\n*Final score*\n_{score_text}_\n"
    if summary:
        msg += f"\n_{summary}_\n"

    tr = compute_track_record(7)
    if tr:
        msg += "\n" + tr + "\n"

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
    profit_dot = "🟢" if total_profit >= 0 else "🔴"

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
        ("Wins", f"{wins}  🟢"),
        ("Losses", f"{losses}  🔴"),
        ("Win rate", f"{win_rate:.1f}%"),
        ("Total staked", f"{total_staked:.2f} EUR"),
        ("Net profit", f"{profit_sign}{total_profit:.2f} EUR"),
        ("ROI", f"{profit_sign}{roi:.1f}%"),
    ]

    msg = (
        f"{profit_dot} *WEEKLY REPORT*\n"
        f"{fmt_date_short(week_ago.isoformat())} — {fmt_date_short(today.isoformat())}\n"
        "\n"
        f"{aligned_data(data_rows)}\n"
    )

    if best_pick:
        best_tr = translate_pick(best_pick)
        best_profit = best_pick.get("profit") or (best_pick["stake"] * (best_pick["odds"] - 1))
        msg += (
            f"\n🟢 *Best pick*\n"
            f"_{best_tr['pick']}_ @ {best_pick['odds']:.2f}  →  +{best_profit:.2f} EUR\n"
        )

    if lost_picks:
        worst_tr = translate_pick(lost_picks[0])
        msg += (
            f"\n🔴 *Worst day*\n"
            f"_{worst_tr['pick']}_ @ {lost_picks[0]['odds']:.2f}  →  −{lost_picks[0]['stake']:.2f} EUR\n"
        )

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
    return send_photo(LOGO_SQUARE_URL, msg) is not None


def publish_pick(pick: dict, dry_run: bool = False) -> bool:
    is_combo = pick.get("sport") == "combo"
    msg = format_pick_combo(pick) if is_combo else format_pick_simple(pick)
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print("\n[+ logo banner + 3 inline buttons + auto-pin]")
        return True

    # Clear previous pinned messages so only the latest pick stays pinned
    unpin_all_messages()

    message_id = send_photo(LOGO_BANNER_URL, msg, _buttons_pick())
    if message_id is None:
        return False

    # Pin the new pick at the top of the channel (silent — no notification spam)
    if message_id > 0:
        pin_message(message_id, disable_notification=True)
    return True


def publish_result(pick: dict, dry_run: bool = False) -> bool:
    msg = format_result(pick)
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print("\n[+ logo banner + 3 inline buttons]")
        return True
    return send_photo(LOGO_BANNER_URL, msg, _buttons_result()) is not None


def publish_recap(dry_run: bool = False) -> bool:
    msg = format_recap_weekly()
    chart_url = bankroll_chart_url(days=30)
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print(f"\n[+ bankroll chart : {chart_url[:80]}…]")
        print("[+ 4 inline buttons + 1 engagement poll]")
        return True

    # Chart bankroll en image — plus engageant que le logo pour un recap
    message_id = send_photo(chart_url, msg, _buttons_recap())
    if message_id is None:
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
