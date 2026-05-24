"""
Script CLI de vérification API-Sports (renommé de test_sportsapi.py en
v4.4 pour éviter que pytest le découvre — c'est un script CLI manuel,
pas un test pytest).

Usage :
    cd /home/user/PRONOSTICS
    export API_SPORTS_KEY=ta_cle_ici   # ou dans .env
    python backend/scripts/check_sportsapi.py

Le script :
1. Vérifie que la clé répond (quota + plan)
2. Récupère les matchs football du jour
3. Si un match est trouvé, affiche cotes + prédictions
4. Récupère les matchs NBA/NHL/MLB du jour
"""

import json
import logging
import os
from datetime import datetime, timedelta

from dotenv import load_dotenv

# Charge .env depuis la racine du repo
load_dotenv()

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sportsapi import SportsAPI, SportsAPIError, LEAGUE_IDS  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")


def main():
    try:
        api = SportsAPI()
    except SportsAPIError as e:
        print(f"❌ {e}")
        print("\n💡 Setup :")
        print("  1. Ajoute API_SPORTS_KEY=ta_cle dans .env à la racine du repo")
        print("  2. Ou exporte la var : export API_SPORTS_KEY=...")
        return

    print("=" * 60)
    print("🔑 TEST 1 : Vérification de la clé + quota")
    print("=" * 60)
    try:
        status = api.get_status("football")
        print(json.dumps(status, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return

    today = datetime.utcnow().strftime("%Y-%m-%d")
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    print("\n" + "=" * 60)
    print(f"⚽ TEST 2 : Football fixtures du {today} (toutes ligues)")
    print("=" * 60)
    fixtures = api.get_fixtures("football", date=today)
    print(f"  → {len(fixtures)} matchs trouvés ce jour.")
    if fixtures:
        f = fixtures[0]
        print(f"\n  Premier match :")
        print(f"    {f['teams']['home']['name']} vs {f['teams']['away']['name']}")
        print(f"    Ligue : {f['league']['name']} ({f['league']['country']})")
        print(f"    Kickoff UTC : {f['fixture']['date']}")
        print(f"    Status : {f['fixture']['status']['long']}")

        fixture_id = f["fixture"]["id"]
        print(f"\n  💰 Cotes (fixture_id={fixture_id})...")
        try:
            odds = api.get_odds("football", fixture_id)
            if odds:
                bm_count = len(odds[0].get("bookmakers", []))
                print(f"    {bm_count} bookmakers ont des cotes pour ce match.")
            else:
                print(f"    Aucune cote dispo (match trop loin ou trop récent).")
        except Exception as e:
            print(f"    ❌ {e}")

        print(f"\n  🔮 Prédiction modèle API-Sports...")
        try:
            pred = api.get_predictions(fixture_id)
            if pred:
                advice = pred.get("predictions", {}).get("advice", "n/a")
                percent = pred.get("predictions", {}).get("percent", {})
                print(f"    Conseil : {advice}")
                print(f"    Win % : home={percent.get('home')} draw={percent.get('draw')} away={percent.get('away')}")
            else:
                print(f"    Aucune prédiction dispo.")
        except Exception as e:
            print(f"    ❌ {e}")

    print("\n" + "=" * 60)
    print(f"🏀 TEST 3 : NBA games du {today}")
    print("=" * 60)
    nba_id = LEAGUE_IDS["basketball"]["nba"]
    nba_games = api.get_fixtures("basketball", date=today, league_id=nba_id)
    print(f"  → {len(nba_games)} matchs NBA aujourd'hui.")
    for g in nba_games[:3]:
        teams = g.get("teams", {})
        print(f"    {teams.get('home', {}).get('name')} vs {teams.get('away', {}).get('name')}")

    print("\n" + "=" * 60)
    print(f"🏒 TEST 4 : NHL games du {today}")
    print("=" * 60)
    nhl_id = LEAGUE_IDS["hockey"]["nhl"]
    nhl_games = api.get_fixtures("hockey", date=today, league_id=nhl_id)
    print(f"  → {len(nhl_games)} matchs NHL aujourd'hui.")
    for g in nhl_games[:3]:
        teams = g.get("teams", {})
        print(f"    {teams.get('home', {}).get('name')} vs {teams.get('away', {}).get('name')}")

    print("\n" + "=" * 60)
    print(f"⚾ TEST 5 : MLB games du {today}")
    print("=" * 60)
    mlb_id = LEAGUE_IDS["baseball"]["mlb"]
    mlb_games = api.get_fixtures("baseball", date=today, league_id=mlb_id)
    print(f"  → {len(mlb_games)} matchs MLB aujourd'hui.")
    for g in mlb_games[:3]:
        teams = g.get("teams", {})
        print(f"    {teams.get('home', {}).get('name')} vs {teams.get('away', {}).get('name')}")

    print("\n" + "=" * 60)
    print("✅ Tous les tests OK — ta clé fonctionne sur 4 sports")
    print("=" * 60)
    print("\n💡 Prochaine étape : intégrer dans daily_candidates.py + bot Discord.")


if __name__ == "__main__":
    main()
