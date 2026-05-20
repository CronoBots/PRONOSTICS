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


STAKE = 10.0
STARTING_BANKROLL = 1000.0


PICKS: list[Pick] = [
    {
        "date": "2026-05-17",
        "sport": "tennis",
        "league": "ATP Masters 1000 — Rome",
        "home_team": "Jannik Sinner",
        "away_team": "Casper Ruud",
        "kickoff": "2026-05-17T15:00:00+00:00",
        "pick": "Jannik Sinner",
        "odds": 1.50,
        "model_probability": 0.75,
        "rationale": [
            "Sinner n°1 mondial, finale à domicile devant le président italien",
            "Ruud 8 finales Masters 1000 jouées, 1 seule gagnée",
            "Sinner invaincu sur ses 5 dernières confrontations directes",
        ],
        "sources": [
            "https://www.olympics.com/en/news/italian-open-2026-jannik-sinner-ends-50-year-wait-complete-career-golden-masters",
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
        "odds": 3.40,
        "model_probability": 0.32,
        "rationale": [
            "Value bet : Spurs cotés 3.40 alors que notre modèle leur donne 32%",
            "Wembanyama monstrueux en playoffs (moyenne 28pts/14reb/4blocks)",
            "Thunder fatigué après G7 face à Denver, repos minimal",
        ],
        "sources": [
            "https://www.espn.com/nba/game/_/gameId/401873197/spurs-thunder",
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
        "odds": 1.95,
        "model_probability": 0.58,
        "rationale": [
            "Madison Square Garden : Knicks 32V-9D à domicile cette saison",
            "Brunson en feu : 34.5 pts/match dans les playoffs",
            "Cavaliers sans Mitchell à 100% (épaule)",
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
            "Plus-money value play : cote 2.12 sous-évalue les Tigers à domicile face à un starter en difficulté",
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
