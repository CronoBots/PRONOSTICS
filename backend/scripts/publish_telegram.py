#!/usr/bin/env python3
"""Publication des picks et résultats NEXBET sur Telegram.

Lit les credentials depuis l'environnement :
  - TELEGRAM_BOT_TOKEN  : token du bot (BotFather)
  - TELEGRAM_CHANNEL_ID : ID numérique du canal (commence par -100…)

Usage :
    python scripts/publish_telegram.py --test
        # Envoie un message de test pour vérifier la config

    python scripts/publish_telegram.py --pick today
        # Publie le pick du jour (lit picks_data.PICKS)

    python scripts/publish_telegram.py --pick yesterday
        # Publie le pick d'hier (utile en mode auto)

    python scripts/publish_telegram.py --result 2026-05-26
        # Publie le résultat (win/loss) d'un pick par date

    python scripts/publish_telegram.py --recap weekly
        # Publie un récap des 7 derniers jours

    python scripts/publish_telegram.py --pick today --dry-run
        # Affiche le message sans l'envoyer (pour preview)
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError
import json

# Chargement .env local si présent (pour test depuis ta machine).
# En GitHub Actions, les variables viennent directement des secrets.
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

# Import picks_data (même répertoire)
sys.path.insert(0, str(Path(__file__).parent))
import picks_data  # noqa: E402

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()

SPORT_EMOJI = {
    "football": "⚽",
    "tennis": "🎾",
    "basketball": "🏀",
    "combo": "🎰",
}

LEGAL_FOOTER = (
    "━━━━━━━━━━━━━━━━━\n"
    "⚠️ *21+ — Jouer comporte des risques*\n"
    "Aide : [arretezvousatemps.be](https://www.arretezvousatemps.be)\n"
    "_Pronostics fournis à titre informatif. Aucune garantie de gains._"
)


def send_message(text: str) -> bool:
    """Envoie un message au canal Telegram via Bot API."""
    if not BOT_TOKEN or not CHANNEL_ID:
        print(
            "❌ TELEGRAM_BOT_TOKEN ou TELEGRAM_CHANNEL_ID manquant.\n"
            "   Configure ces variables dans .env (local) ou GitHub Secrets (CI)."
        )
        return False

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = json.dumps({
        "chat_id": CHANNEL_ID,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }).encode("utf-8")
    req = urlrequest.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            if data.get("ok"):
                print(f"✅ Message publié (message_id={data.get('result', {}).get('message_id')})")
                return True
            print(f"❌ Telegram API error : {data}")
            return False
    except HTTPError as e:
        print(f"❌ HTTP {e.code} : {e.read().decode('utf-8', errors='replace')[:300]}")
        return False
    except URLError as e:
        print(f"❌ Erreur réseau : {e}")
        return False


# =============================================================================
# Helpers de formatage
# =============================================================================

JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
MOIS = [
    "", "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def fmt_date_long(date_str: str) -> str:
    """2026-05-26 → 'Mardi 26 mai 2026'."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{JOURS[d.weekday()]} {d.day} {MOIS[d.month]} {d.year}"


def fmt_time(kickoff_iso: str) -> str:
    """'2026-05-26T11:00:00+00:00' → '11h00' (UTC, à adapter si besoin)."""
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
        "🧪 *Test NEXBET Bot*\n\n"
        "Connexion établie avec succès ✅\n"
        f"_Timestamp : {datetime.now().strftime('%d/%m/%Y %H:%M')}_\n\n"
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
        f"🕒 Coup d'envoi : {fmt_time(pick.get('kickoff', ''))}\n\n"
        f"⭐ *Pari* : {pick['pick']}\n"
        f"📊 Cote marché : *{pick['odds']:.2f}*\n"
        f"💰 Mise : {pick['stake']:.2f} € → gain potentiel : +{profit_potential:.2f} €\n"
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
            f"   _{leg['home_team']} vs {leg['away_team']}_\n"
            f"   Cote : *{leg['odds']:.2f}*\n\n"
        )
    msg += (
        "━━━━━━━━━━━━━━━━━\n"
        f"🎲 Cote totale : *{pick['odds']:.2f}*\n"
        f"💰 Mise : {pick['stake']:.2f} € → gain potentiel : *+{profit_potential:.2f} €*\n\n"
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
        # picks_data n'a pas de champ profit calculé — on compute à la volée
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
    total_profit = sum(p.get("profit", 0) for p in recent if p.get("outcome") in {"win", "loss"})
    win_rate = (wins / settled * 100) if settled else 0
    roi = (total_profit / total_staked * 100) if total_staked else 0
    profit_sign = "+" if total_profit >= 0 else ""

    msg = (
        "📊 *NEXBET — Récap hebdo*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"📅 Du {fmt_date_long(week_ago.isoformat())}\n"
        f"   au {fmt_date_long(today.isoformat())}\n\n"
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
# Main
# =============================================================================


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Publication des picks NEXBET sur Telegram",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--test", action="store_true", help="Message de test (vérification setup)")
    group.add_argument(
        "--pick",
        choices=["today", "yesterday"],
        help="Publie le pick du jour (today) ou d'hier (yesterday)",
    )
    group.add_argument(
        "--result",
        metavar="YYYY-MM-DD",
        help="Publie le résultat d'un pick à une date donnée",
    )
    group.add_argument(
        "--recap",
        choices=["weekly"],
        help="Publie un récap (weekly = 7 derniers jours)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche le message sans l'envoyer",
    )
    args = parser.parse_args()

    if args.test:
        msg = format_test()
    elif args.pick:
        target = date.today() if args.pick == "today" else date.today() - timedelta(days=1)
        pick = find_pick(target.isoformat())
        if not pick:
            print(f"❌ Aucun pick trouvé pour {target.isoformat()}")
            return 1
        msg = format_pick_combo(pick) if pick.get("sport") == "combo" else format_pick_simple(pick)
    elif args.result:
        pick = find_pick(args.result)
        if not pick:
            print(f"❌ Aucun pick trouvé pour {args.result}")
            return 1
        msg = format_result(pick)
    elif args.recap == "weekly":
        msg = format_recap_weekly()
    else:
        parser.print_help()
        return 1

    if args.dry_run:
        print("=" * 60)
        print(msg)
        print("=" * 60)
        return 0

    return 0 if send_message(msg) else 1


if __name__ == "__main__":
    sys.exit(main())
