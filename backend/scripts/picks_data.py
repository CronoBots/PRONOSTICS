"""Source de vérité des picks quotidiens (curation manuelle).

À chaque journée :
  1. Si le pick d'hier était "pending" → mettre l'outcome (win/loss)
  2. Ajouter l'entrée du jour (outcome="pending")
  3. Exécuter `python scripts/build_history.py` pour regénérer les JSON
  4. git add backend/data/ && git commit && git push

Chaque pick est entièrement curé : ME (Claude) fait l'analyse via web search
quand l'utilisateur vient sur la conversation, croise les sources, identifie
le pick le plus safe du jour avec rationale détaillée.
"""

from __future__ import annotations

from typing import Literal, TypedDict

Outcome = Literal["win", "loss", "pending", "void"]


class Pick(TypedDict, total=False):
    date: str                      # ISO YYYY-MM-DD
    sport: str                     # football | basketball | tennis | nfl | mlb | nhl
    league: str                    # nom lisible
    home_team: str
    away_team: str
    kickoff: str                   # ISO datetime avec timezone
    pick: str                      # l'équipe/joueur choisi
    odds: float                    # cote décimale
    model_probability: float       # probabilité estimée par l'analyse (0-1)
    rationale: list[str]           # arguments clés (3-5 points)
    sources: list[str]             # URLs des sources web consultées
    stake: float                   # mise en €
    outcome: Outcome               # win/loss/pending


STAKE = 5.0
STARTING_BANKROLL = 5.0


PICKS: list[Pick] = [
    {
        "date": "2026-05-17",
        "sport": "tennis",
        "league": "WTA 1000 — Rome (finale)",
        "home_team": "Coco Gauff",
        "away_team": "Elina Svitolina",
        "kickoff": "2026-05-17T16:00:00+00:00",
        "pick": "Elina Svitolina",
        "odds": 2.30,
        "model_probability": 0.50,
        "rationale": [
            "Svitolina a dominé Gauff 2-0 en H2H sur l'année 2026 (Open d'Australie QF + WTA Dubai SF)",
            "Cote +130 chez Fanatics : value bet manifeste, analystes pointent l'edge mental",
            "Surface terre battue favorable au style défensif/contre de Svitolina",
        ],
        "sources": [
            "https://lastwordonsports.com/tennis/2026/05/15/wta-rome-final-gauff-svitolina/",
            "https://www.dimers.com/news/coco-gauff-vs-elina-svitolina-tennis-prediction-wta-italian-open-2026-ac",
        ],
        "stake": STAKE,
        "outcome": "win",
    },
    {
        "date": "2026-05-18",
        "sport": "basketball",
        "league": "NBA — Western Conference Finals (G1)",
        "home_team": "Oklahoma City Thunder",
        "away_team": "San Antonio Spurs",
        "kickoff": "2026-05-18T20:30:00+00:00",
        "pick": "San Antonio Spurs",
        "odds": 2.70,
        "model_probability": 0.40,
        "rationale": [
            "Wembanyama au top : DPOY 2026, Spurs 37-3 sur ses 40 derniers matchs joués 15+ min",
            "Thunder fatigué après G7 face à Denver, repos minimal entre 2 séries",
            "Spurs +2.5 ATS depuis playoffs, value sur le moneyline underdog",
        ],
        "sources": [
            "https://www.nbcsports.com/nba/news/thunder-vs-spurs-game-1-wcfw-predictions-odds-recent-stats-trends-and-best-bets-for-may-18",
            "https://www.nba.com/news/live-updates-2026-nba-playoffs-western-conference-finals-the-spurs-thunder-rivalry-reignites",
        ],
        "stake": STAKE,
        "outcome": "win",
    },
    {
        "date": "2026-05-19",
        "sport": "basketball",
        "league": "NBA — Eastern Conference Finals (G1)",
        "home_team": "New York Knicks",
        "away_team": "Cleveland Cavaliers",
        "kickoff": "2026-05-19T20:00:00+00:00",
        "pick": "New York Knicks",
        "odds": 2.00,
        "model_probability": 0.55,
        "rationale": [
            "Madison Square Garden : Knicks 32V-9D à domicile cette saison",
            "Brunson en feu : 34.5 pts/match dans les playoffs",
            "Cavaliers avec Mitchell pas à 100% (épaule), 2 jours de repos seulement",
        ],
        "sources": [
            "https://www.espn.com/nba/game/_/gameId/401873341/cavaliers-knicks",
        ],
        "stake": STAKE,
        "outcome": "win",
    },
    # === Pick du jour (20/05/2026) — curé manuellement, analyse web Claude ===
    {
        "date": "2026-05-20",
        "sport": "mlb",
        "league": "MLB — AL Central",
        "home_team": "Detroit Tigers",
        "away_team": "Cleveland Guardians",
        "kickoff": "2026-05-20T23:10:00+00:00",  # 19:10 ET
        "pick": "Detroit Tigers",
        "odds": 2.12,
        "model_probability": 0.55,
        "rationale": [
            "Tanner Bibee (Cleveland) : 0-6, 4.15 ERA, 1.35 WHIP sur la route cette saison",
            "Tigers à domicile à Comerica Park, motivés à briser une série de 2 défaites",
            "Lineup Cleveland sous-performe en déplacement (B+ value grade Lineups.com)",
            "Plus-money value play : cote 2.12 sous-évalue les Tigers face à un starter en road struggle",
        ],
        "sources": [
            "https://www.lineups.com/betting/san-antonio-spurs-vs-oklahoma-city-thunder-game-2-preview-picks-odds-for-may-20-2026/",
            "https://www.bleachernation.com/picks/2026/05/16/detroit-tigers-vs-cleveland-guardians-series-may-18-21-odds-starting-pitchers-predictions/",
            "https://pickdawgz.com/mlb-picks/guardians-vs-tigers-prediction-5-20-2026-todays-mlb-picks/",
        ],
        "stake": STAKE,
        "outcome": "pending",
    },
]
