#!/usr/bin/env python3
"""Publication des picks et résultats NEXBET sur Telegram.

v2 — avec logo, boutons inline, polls engagement, signature.

Lit les credentials depuis l'environnement :
  - TELEGRAM_BOT_TOKEN  : token du bot (BotFather)
  - TELEGRAM_CHANNEL_ID : ID numérique du canal (commence par -100…)

Usage :
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

# URLs publiques GitHub Pages (utilisées pour les images Telegram)
PUBLIC_BASE = "https://cronobots.github.io/PRONOSTICS"
LOGO_BANNER_URL = f"{PUBLIC_BASE}/logo-banner.png"
LOGO_SQUARE_URL = f"{PUBLIC_BASE}/logo-square.png"

SPORT_EMOJI = {
    "football": "⚽",
    "tennis": "🎾",
    "basketball": "🏀",
    "combo": "🎰",
}

# Signature canal (apparaît en footer)
NEXBET_SIGNATURE = (
    "🤖 *NEXBET* — _Trust the Algorithm_\n"
    f"[Voir tous les paris]({PUBLIC_BASE}/paris) · "
    f"[Statistiques]({PUBLIC_BASE}/stats)"
)

LEGAL_FOOTER = (
    "━━━━━━━━━━━━━━━━━\n"
    f"{NEXBET_SIGNATURE}\n\n"
    "⚠️ *21+ — Jouer comporte des risques*\n"
    "Aide : [arretezvousatemps.be](https://www.arretezvousatemps.be)\n"
    "_Pronostics fournis à titre informatif. Aucune garantie de gains._"
)


# Boutons inline standards
def _buttons_pick(pick_date: str) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "📊 Analyse complète", "url": f"{PUBLIC_BASE}/"},
                {"text": "📈 Historique", "url": f"{PUBLIC_BASE}/paris"},
            ],
            [
                {"text": "💎 Devenir Premium", "url": f"{PUBLIC_BASE}/premium"},
            ],
        ]
    }


def _buttons_result() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "📊 Voir le pick du jour", "url": f"{PUBLIC_BASE}/today"},
                {"text": "📈 Bankroll", "url": f"{PUBLIC_BASE}/stats"},
            ],
        ]
    }


def _buttons_recap() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "📊 Détail picks", "url": f"{PUBLIC_BASE}/paris"},
                {"text": "📈 Stats complètes", "url": f"{PUBLIC_BASE}/stats"},
            ],
            [
                {"text": "💎 Devenir Premium", "url": f"{PUBLIC_BASE}/premium"},
            ],
        ]
    }


# =============================================================================
# Telegram API
# =============================================================================


def _api_post(method: str, payload: dict) -> dict | None:
    if not BOT_TOKEN or not CHANNEL_ID:
        print(
            "❌ TELEGRAM_BOT_TOKEN ou TELEGRAM_CHANNEL_ID manquant.\n"
            "   Configure ces variables dans .env (local) ou GitHub Secrets (CI)."
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
            print(f"❌ Telegram API error ({method}) : {data}")
            return None
    except HTTPError as e:
        print(f"❌ HTTP {e.code} ({method}) : {e.read().decode('utf-8', errors='replace')[:300]}")
        return None
    except URLError as e:
        print(f"❌ Erreur réseau ({method}) : {e}")
        return None


def send_message(text: str, reply_markup: dict | None = None) -> bool:
    """Envoie un message texte simple (jusqu'à 4096 chars)."""
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
        print(f"✅ Message envoyé (id={data.get('result', {}).get('message_id')})")
        return True
    return False


def send_photo(
    photo_url: str,
    caption: str,
    reply_markup: dict | None = None,
) -> bool:
    """Envoie une photo avec caption (max 1024 chars)."""
    if len(caption) > 1024:
        print(f"⚠️ Caption {len(caption)} chars > 1024 → fallback sendMessage sans photo")
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
        print(f"✅ Photo envoyée (id={data.get('result', {}).get('message_id')})")
        return True
    return False


def send_poll(question: str, options: list[str], anonymous: bool = True) -> bool:
    """Envoie un sondage. Question max 300 chars, options max 100 chars chacune."""
    payload = {
        "chat_id": CHANNEL_ID,
        "question": question[:300],
        "options": [opt[:100] for opt in options],
        "is_anonymous": anonymous,
        "type": "regular",
        "allows_multiple_answers": False,
    }
    data = _api_post("sendPoll", payload)
    if data:
        print(f"✅ Sondage envoyé (id={data.get('result', {}).get('message_id')})")
        return True
    return False


# =============================================================================
# Helpers formatage
# =============================================================================

JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
MOIS = [
    "", "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def fmt_date_long(date_str: str) -> str:
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{JOURS[d.weekday()]} {d.day} {MOIS[d.month]} {d.year}"


def fmt_time(kickoff_iso: str) -> str:
    if not kickoff_iso:
        return ""
    try:
        dt = datetime.fromisoformat(kickoff_iso.replace("Z", "+00:00"))
        return dt.strftime("%Hh%M")
    except Exception:
        return ""


def find_pick(date_iso: str) -> dict | None:
    for p in picks_data.PICKS:
        if p.get("date") == date_iso:
            return p
    return None


# =============================================================================
# Formats de message
# =============================================================================


def format_test() -> str:
    return (
        "🧪 *Test NEXBET Bot v2*\n\n"
        "Connexion établie avec succès ✅\n"
        f"_Timestamp : {datetime.now().strftime('%d/%m/%Y %H:%M')}_\n\n"
        "Setup complet :\n"
        "• Logo bannière ✅\n"
        "• Boutons inline ✅\n"
        "• Sondages engagement ✅\n"
        "• Signature canal ✅\n\n"
        + LEGAL_FOOTER
    )


def format_pick_simple(pick: dict) -> str:
    emoji = SPORT_EMOJI.get(pick["sport"], "🎯")
    profit_potential = pick["stake"] * (pick["odds"] - 1)
    msg = (
        "🎯 *NEXBET — Pick du jour*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"📅 {fmt_date_long(pick['date'])}\n\n"
        f"{emoji} *{pick['league']}*\n"
        f"{pick['home_team']} vs {pick['away_team']}\n"
        f"🕒 {fmt_time(pick.get('kickoff', ''))}\n\n"
        f"⭐ *Pari* : {pick['pick']}\n"
        f"📊 Cote marché : *{pick['odds']:.2f}*\n"
        f"💰 Mise : {pick['stake']:.2f} € → +{profit_potential:.2f} €\n"
    )
    if pick.get("headline"):
        msg += f"\n💡 _{pick['headline']}_\n"
    msg += "\n" + LEGAL_FOOTER
    return msg


def format_pick_combo(pick: dict) -> str:
    legs = pick.get("legs", [])
    profit_potential = pick["stake"] * (pick["odds"] - 1)
    msg = (
        "🎰 *NEXBET — Combo du jour*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"📅 {fmt_date_long(pick['date'])}\n\n"
        f"*{pick['pick']}*\n\n"
    )
    for i, leg in enumerate(legs, 1):
        leg_emoji = SPORT_EMOJI.get(leg["sport"], "🎯")
        msg += (
            f"*{i}.* {leg_emoji} {leg['pick']}\n"
            f"   _{leg['home_team']} vs {leg['away_team']}_ · *{leg['odds']:.2f}*\n\n"
        )
    msg += (
        "━━━━━━━━━━━━━━━━━\n"
        f"🎲 Cote totale : *{pick['odds']:.2f}*\n"
        f"💰 Mise {pick['stake']:.2f} € → *+{profit_potential:.2f} €*\n\n"
        + LEGAL_FOOTER
    )
    return msg


def format_result(pick: dict) -> str:
    emoji = SPORT_EMOJI.get(pick["sport"], "🎯")
    is_win = pick.get("outcome") == "win"
    is_loss = pick.get("outcome") == "loss"
    is_void = pick.get("outcome") == "void"

    if is_win:
        status_emoji = "✅"
        status_label = "GAGNÉ"
        profit_value = pick.get("profit") or (pick["stake"] * (pick["odds"] - 1))
        profit_str = f"+{profit_value:.2f} €"
    elif is_loss:
        status_emoji = "❌"
        status_label = "PERDU"
        profit_value = pick.get("profit") or -pick["stake"]
        profit_str = f"{profit_value:.2f} €"
    elif is_void:
        status_emoji = "⚪"
        status_label = "ANNULÉ"
        profit_str = "Mise remboursée"
    else:
        status_emoji = "⏳"
        status_label = "EN ATTENTE"
        profit_str = "—"

    msg = (
        "📊 *NEXBET — Résultat*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"📅 {fmt_date_long(pick['date'])}\n\n"
        f"{emoji} {pick['pick']}\n"
        f"Cote : {pick['odds']:.2f} · Mise : {pick['stake']:.2f} €\n\n"
        f"{status_emoji} *{status_label}* — {profit_str}\n"
    )
    result = pick.get("result")
    if result and result.get("score_text"):
        msg += f"\n📋 _{result['score_text']}_\n"
    if result and result.get("summary"):
        msg += f"💬 {result['summary']}\n"
    msg += "\n" + LEGAL_FOOTER
    return msg


def format_recap_weekly() -> str:
    today = date.today()
    week_ago = today - timedelta(days=7)
    recent = [
        p for p in picks_data.PICKS
        if datetime.strptime(p["date"], "%Y-%m-%d").date() >= week_ago
    ]
    if not recent:
        return (
            "📊 *NEXBET — Récap hebdo*\n"
            "━━━━━━━━━━━━━━━━━\n\n"
            "Aucun pick sur les 7 derniers jours.\n\n"
            + LEGAL_FOOTER
        )

    wins = sum(1 for p in recent if p.get("outcome") == "win")
    losses = sum(1 for p in recent if p.get("outcome") == "loss")
    settled = wins + losses
    total_staked = sum(p.get("stake", 0) for p in recent if p.get("outcome") in {"win", "loss"})
    total_profit = sum(
        (p.get("profit") or (p["stake"] * (p["odds"] - 1) if p.get("outcome") == "win" else -p["stake"]))
        for p in recent
        if p.get("outcome") in {"win", "loss"}
    )
    win_rate = (wins / settled * 100) if settled else 0
    roi = (total_profit / total_staked * 100) if total_staked else 0
    profit_sign = "+" if total_profit >= 0 else ""

    msg = (
        "📊 *NEXBET — Récap hebdo*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"📅 Du {fmt_date_long(week_ago.isoformat())}\n"
        f"    au {fmt_date_long(today.isoformat())}\n\n"
        f"🎯 *{settled} paris réglés*\n"
        f"✅ Wins : {wins}\n"
        f"❌ Losses : {losses}\n"
        f"📈 Win rate : *{win_rate:.1f}%*\n\n"
        f"💰 Profit net : *{profit_sign}{total_profit:.2f} €*\n"
        f"📊 ROI : {profit_sign}{roi:.1f}%\n"
        f"🎰 Total misé : {total_staked:.2f} €\n\n"
        + LEGAL_FOOTER
    )
    return msg


# =============================================================================
# Workflows : combine message + boutons + (optionnel) poll
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
    buttons = _buttons_pick(pick["date"])

    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print(f"\n[+ logo banner + 3 boutons + sondage engagement après le pick]")
        return True

    # 1) Photo + caption + boutons
    ok = send_photo(LOGO_BANNER_URL, msg, buttons)
    if not ok:
        return False

    # 2) Sondage engagement
    poll_question = (
        "🎰 Tu joues ce combo aujourd'hui ?"
        if is_combo
        else f"🎯 Tu joues ce pick ?"
    )
    send_poll(
        poll_question,
        ["✅ Oui je joue", "🤔 J'hésite", "❌ Je skip aujourd'hui"],
    )
    return True


def publish_result(pick: dict, dry_run: bool = False) -> bool:
    msg = format_result(pick)
    buttons = _buttons_result()
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print("\n[+ logo banner + 2 boutons]")
        return True
    return send_photo(LOGO_BANNER_URL, msg, buttons)


def publish_recap(dry_run: bool = False) -> bool:
    msg = format_recap_weekly()
    buttons = _buttons_recap()
    if dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        print("\n[+ logo banner + 3 boutons + sondage satisfaction]")
        return True

    ok = send_photo(LOGO_BANNER_URL, msg, buttons)
    if not ok:
        return False

    # Sondage satisfaction utilisateurs
    send_poll(
        "📊 Satisfait des picks NEXBET cette semaine ?",
        ["🔥 Excellent", "👍 Bien", "😐 Moyen", "👎 Décevant"],
    )
    return True


# =============================================================================
# Main
# =============================================================================


def main() -> int:
    parser = argparse.ArgumentParser(description="Publication NEXBET sur Telegram")
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
            print(f"❌ Aucun pick trouvé pour {target.isoformat()}")
            return 1
        return 0 if publish_pick(pick, args.dry_run) else 1

    if args.result:
        pick = find_pick(args.result)
        if not pick:
            print(f"❌ Aucun pick trouvé pour {args.result}")
            return 1
        return 0 if publish_result(pick, args.dry_run) else 1

    if args.recap == "weekly":
        return 0 if publish_recap(args.dry_run) else 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
