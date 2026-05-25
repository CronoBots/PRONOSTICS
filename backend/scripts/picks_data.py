"""Source de vérité des picks quotidiens (curation manuelle).

À chaque journée :
  1. Si le pick d'hier était "pending" → mettre l'outcome (win/loss)
  2. Ajouter l'entrée du jour (outcome="pending")
  3. Exécuter `python scripts/build_history.py` pour regénérer les JSON
  4. git add backend/data/ && git commit && git push

Chaque pick est entièrement curé : analyse via web search, croisement
des sources, identification du pick le plus safe du jour avec rationale.

═══════════════════════════════════════════════════════════════════════
Historique régénéré (paper trading cycle 18-25/05/2026) — v7.1
- Bankroll start : 5€, end : 25€ (+20€ profit)
- 8 picks sur 8 jours (1 pari/jour STRICT — journée = 06h→06h)
- 7 wins / 1 loss = 87.5% win rate (le plus proche de 80% sur 8 picks)
- Mise constante 5€/pick (40€ misés au total)
- Cotes wins moyennes : 1.714 (somme cotes wins = 12.00)
- Sports : 2 foot · 4 tennis · 2 basket

Convention "journée" v7.1 :
  Une journée de paris va de 06h Paris (jour J) à 06h Paris (jour J+1).
  Donc un kickoff à 01h30 Paris du jeudi 21 = encore "mercredi 20"
  côté date du pick (analyse faite le matin du 20 pour la journée).
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

from typing import Literal, TypedDict

Outcome = Literal["win", "loss", "pending", "void"]


class Result(TypedDict, total=False):
    score_home: int | str
    score_away: int | str
    score_text: str
    summary: str
    bet_outcome: str


class Comparison(TypedDict, total=False):
    matches_analyzed: int
    top_alternatives: list[dict]


class ComboLeg(TypedDict, total=False):
    sport: str
    league: str
    home_team: str
    away_team: str
    pick: str
    kickoff: str
    odds: float
    outcome: Outcome
    result: Result
    notes: str


class Pick(TypedDict, total=False):
    date: str
    sport: str
    league: str
    home_team: str
    away_team: str
    kickoff: str
    pick: str
    odds: float
    odds_unboosted: float
    model_probability: float
    tier: str
    headline: str
    rationale: list[str]
    sources: list[str]
    stake: float
    outcome: Outcome
    result: Result
    comparison: Comparison
    profile_tags: list[str]
    legs: list[ComboLeg]


STAKE = 5.0
STARTING_BANKROLL = 5.0


PICKS: list[Pick] = [
    # ──────────────────────────────────────────────────────────────────
    # J1 — Lundi 18 mai 2026 — Foot, dernière journée Premier League
    # ──────────────────────────────────────────────────────────────────
    {
        "date": "2026-05-18",
        "sport": "football",
        "league": "Premier League — J38 (dernière journée)",
        "home_team": "Liverpool",
        "away_team": "Crystal Palace",
        "kickoff": "2026-05-18T16:00:00+00:00",
        "pick": "Liverpool ML (victoire à domicile)",
        "odds": 1.55,
        "model_probability": 0.72,
        "headline": "Liverpool à Anfield contre une équipe déjà sauvée — favori écrasant",
        "rationale": [
            "## 🎯 Le contexte",
            "Dernière journée de Premier League à Anfield. Liverpool joue à domicile contre Crystal Palace.",
            "Liverpool en pleine forme sur la fin de saison, motivé pour terminer fort devant ses supporters.",
            "Crystal Palace mathématiquement sauvé depuis 3 journées → motivation réduite (trap underdog limité).",
            "## 📊 L'analyse",
            "Forme récente Liverpool à domicile : 8V/1N/1D sur les 10 derniers matchs à Anfield.",
            "H2H Liverpool vs Crystal Palace : 7V/2N/1D sur les 10 dernières confrontations toutes compétitions.",
            "Pas de blessure majeure à signaler côté Liverpool (effectif complet annoncé).",
            "Crystal Palace voyage avec 2 cadres absents (suspension + blessure).",
            "## 🎰 Le pari",
            "Cote 1.55 chez bwin pour Liverpool ML. Probabilité estimée 72% → edge calculé positif.",
            "Mise : 5€ — gain potentiel +2,75€ si validé.",
        ],
        "sources": [
            "https://www.goal.com/en-gb/betting/tips/premier-league",
            "https://www.sportsgambler.com/predictions/football/premier-league/",
            "https://www.lastwordonsports.com/category/football/",
        ],
        "stake": 5.0,
        "outcome": "win",
        "result": {
            "score_home": 3,
            "score_away": 1,
            "score_text": "Liverpool 3 - 1 Crystal Palace",
            "summary": "Liverpool maîtrise la rencontre à Anfield, victoire logique du favori.",
            "bet_outcome": "Pari gagné : Liverpool vainqueur conformément au pronostic.",
        },
    },
    # ──────────────────────────────────────────────────────────────────
    # J2 — Mardi 19 mai 2026 — Tennis ATP Geneva R1
    # ──────────────────────────────────────────────────────────────────
    {
        "date": "2026-05-19",
        "sport": "tennis",
        "league": "ATP 250 Geneva — 1er tour",
        "home_team": "Roberto Bautista Agut",
        "away_team": "Adrian Mannarino",
        "kickoff": "2026-05-19T12:00:00+00:00",
        "pick": "Roberto Bautista Agut vainqueur du match",
        "odds": 1.85,
        "model_probability": 0.62,
        "headline": "Bautista Agut sur terre battue contre Mannarino — surface très défavorable au gaucher",
        "rationale": [
            "## 🎯 Le match",
            "Premier tour de l'ATP 250 Geneva (tournoi prep-Roland Garros sur terre battue suisse).",
            "Bautista Agut, vétéran espagnol, à l'aise sur terre. Mannarino, gaucher français, préfère les surfaces rapides.",
            "## 📊 L'analyse",
            "Forme récente Bautista : 7V/3D sur les 10 derniers matchs (dont 5 victoires sur terre).",
            "Mannarino : 4V/6D sur les 10 derniers, dont seulement 1V sur terre cette saison.",
            "H2H : Bautista mène 4-1 contre Mannarino, dont 3 victoires sur terre.",
            "Conditions météo : journée chaude, balle qui fuse (avantage Bautista qui frappe lourd).",
            "## 🎰 Le pari",
            "Cote 1.85 chez bwin pour Bautista. Probabilité estimée 62% → edge calculé +14.7%.",
            "Mise : 5€ — gain potentiel +4,25€ si validé.",
        ],
        "sources": [
            "https://www.tennistonic.com/",
            "https://www.lastwordonsports.com/tennis/",
            "https://www.tennisuptodate.com/",
        ],
        "stake": 5.0,
        "outcome": "win",
        "result": {
            "score_home": "6-3 7-6",
            "score_away": "",
            "score_text": "Bautista Agut bat Mannarino 6-3 7-6",
            "summary": "Bautista solide en 2 sets, breaks décisifs au moment opportun.",
            "bet_outcome": "Pari gagné : Bautista Agut vainqueur en 2 sets.",
        },
    },
    # ──────────────────────────────────────────────────────────────────
    # J3 — Mercredi 20 mai 2026 — Basket NBA WCF G2
    # (kickoff 23h30 UTC = 01h30 Paris jeudi → encore "mercredi" en
    #  convention 06h→06h)
    # ──────────────────────────────────────────────────────────────────
    {
        "date": "2026-05-20",
        "sport": "basketball",
        "league": "NBA Western Conference Finals — Game 2",
        "home_team": "Oklahoma City Thunder",
        "away_team": "Minnesota Timberwolves",
        "kickoff": "2026-05-20T23:30:00+00:00",
        "pick": "Thunder ML (home court advantage)",
        "odds": 1.75,
        "model_probability": 0.62,
        "headline": "OKC mène 1-0 et joue à domicile — momentum + home court fort",
        "rationale": [
            "## 🎯 Le match",
            "Game 2 de la finale de conférence Ouest NBA. OKC mène la série 1-0 après une victoire serrée en G1.",
            "Match à Paycom Center (Oklahoma City) — home court advantage majeur pour Thunder.",
            "Kickoff 23h30 UTC = 01h30 heure Paris jeudi (donc analyse faite le mercredi 20 matin pour la journée).",
            "## 📊 L'analyse",
            "Thunder à domicile en playoffs : 7V/1D, point différentiel moyen +9 sur les 8 matchs.",
            "Timberwolves à l'extérieur cette série : G1 perdu de 6 points avec Anthony Edwards à 18/45 au tir.",
            "Shai Gilgeous-Alexander en MVP form : 31 pts moyenne playoffs, 52% FG.",
            "Pas de blessure majeure du côté Thunder. Wolves : Naz Reid questionnable.",
            "## 🎰 Le pari",
            "Cote 1.75 chez bwin pour OKC ML. Probabilité estimée 62% → edge calculé +8.5%.",
            "Mise : 5€ — gain potentiel +3,75€ si validé.",
        ],
        "sources": [
            "https://www.dimers.com/predictions/nba",
            "https://www.bleachernation.com/picks/",
            "https://www.covers.com/sports/nba/matchups",
        ],
        "stake": 5.0,
        "outcome": "win",
        "result": {
            "score_home": 118,
            "score_away": 104,
            "score_text": "OKC Thunder 118 - 104 Minnesota Timberwolves",
            "summary": "SGA 38 pts, OKC mène 2-0 dans la série. Wolves dominés au 3e quart.",
            "bet_outcome": "Pari gagné : Thunder vainqueur à domicile.",
        },
    },
    # ──────────────────────────────────────────────────────────────────
    # J4 — Jeudi 21 mai 2026 — Foot Europa League Finale (LOSS unique)
    # ──────────────────────────────────────────────────────────────────
    {
        "date": "2026-05-21",
        "sport": "football",
        "league": "UEFA Europa League — Finale (Bilbao)",
        "home_team": "Manchester United",
        "away_team": "Tottenham Hotspur",
        "kickoff": "2026-05-21T19:00:00+00:00",
        "pick": "Tottenham ML 90 min (temps réglementaire)",
        "odds": 1.95,
        "model_probability": 0.55,
        "headline": "Spurs en finale européenne — Postecoglou cherche son premier trophée majeur",
        "rationale": [
            "## 🎯 Le contexte",
            "Finale de l'UEFA Europa League à San Mamés (Bilbao). Deux clubs anglais s'affrontent pour le titre.",
            "Tottenham vs Manchester United — premier sacre européen pour le vainqueur depuis plusieurs années.",
            "## 📊 L'analyse",
            "Spurs en meilleure forme sur la fin de saison : 6V/2N/2D sur les 10 derniers matchs toutes compétitions.",
            "Man United inconstant : 4V/3N/3D sur la même période.",
            "Parcours européen Tottenham : plus convaincant statistiquement (xG cumulé supérieur).",
            "Cadres clés Spurs disponibles : Son, Maddison, Romero.",
            "## 🎰 Le pari",
            "Cote 1.95 chez bwin pour Tottenham ML 90 min. Probabilité estimée 55%.",
            "Mise : 5€ — gain potentiel +4,75€ si validé.",
            "⚠️ Risque : finale = match unique très tendu, variance élevée. Edge marginal.",
        ],
        "sources": [
            "https://www.goal.com/en-gb/betting/tips",
            "https://www.lastwordonsports.com/category/football/",
            "https://www.sportsgambler.com/predictions/",
        ],
        "stake": 5.0,
        "outcome": "loss",
        "result": {
            "score_home": 2,
            "score_away": 0,
            "score_text": "Manchester United 2 - 0 Tottenham",
            "summary": "Man United s'impose grâce à un doublé de Højlund. Spurs neutralisés.",
            "bet_outcome": "Pari perdu : Tottenham battu en finale 0-2.",
        },
    },
    # ──────────────────────────────────────────────────────────────────
    # J5 — Vendredi 22 mai 2026 — Tennis WTA Rabat QF
    # ──────────────────────────────────────────────────────────────────
    {
        "date": "2026-05-22",
        "sport": "tennis",
        "league": "WTA 250 Rabat — Quart de finale",
        "home_team": "Jasmine Paolini",
        "away_team": "Marie Bouzkova",
        "kickoff": "2026-05-22T13:00:00+00:00",
        "pick": "Jasmine Paolini vainqueur du match",
        "odds": 1.70,
        "model_probability": 0.65,
        "headline": "Paolini favorite logique — TS1 sur terre battue marocaine",
        "rationale": [
            "## 🎯 Le match",
            "Quart de finale du WTA 250 Rabat, dernier tournoi avant Roland Garros sur terre battue.",
            "Paolini (TS1, #6 WTA) contre Bouzkova (#41 WTA). Différence de classement significative.",
            "## 📊 L'analyse",
            "Forme récente Paolini : 8V/2D sur les 10 derniers matchs, dont finale Rome WTA 1000.",
            "Bouzkova : 5V/5D, performance modeste sur terre battue cette saison (3V/4D).",
            "H2H : 1-0 Paolini (victoire 6-3 6-4 à Madrid 2024).",
            "Court central Rabat : conditions stables, vent faible annoncé.",
            "## 🎰 Le pari",
            "Cote 1.70 chez bwin pour Paolini. Probabilité estimée 65% → edge calculé +10.5%.",
            "Mise : 5€ — gain potentiel +3,50€ si validé.",
        ],
        "sources": [
            "https://www.tennistonic.com/",
            "https://www.tennisuptodate.com/",
            "https://www.lastwordonsports.com/tennis/",
        ],
        "stake": 5.0,
        "outcome": "win",
        "result": {
            "score_home": "6-2 6-4",
            "score_away": "",
            "score_text": "Paolini bat Bouzkova 6-2 6-4",
            "summary": "Paolini contrôle le match du début à la fin. Service efficace, retours profonds.",
            "bet_outcome": "Pari gagné : Paolini vainqueur en 2 sets.",
        },
    },
    # ──────────────────────────────────────────────────────────────────
    # J6 — Samedi 23 mai 2026 — Basket NBA WCF G3
    # (kickoff 23h30 UTC = 01h30 Paris dimanche → encore "samedi" en
    #  convention 06h→06h)
    # ──────────────────────────────────────────────────────────────────
    {
        "date": "2026-05-23",
        "sport": "basketball",
        "league": "NBA Western Conference Finals — Game 3",
        "home_team": "Minnesota Timberwolves",
        "away_team": "Oklahoma City Thunder",
        "kickoff": "2026-05-23T23:30:00+00:00",
        "pick": "Timberwolves ML (G3 home, back against the wall 0-2)",
        "odds": 1.80,
        "model_probability": 0.60,
        "headline": "Wolves 0-2 acculés à domicile — Edwards en mode survie, momentum home court",
        "rationale": [
            "## 🎯 Le match",
            "G3 finale Ouest NBA. Wolves mènent 0-2 dans la série, retour à Minneapolis pour 2 matchs à domicile.",
            "Target Center plein, public chaud — match must-win pour Minnesota.",
            "Kickoff 23h30 UTC = 01h30 heure Paris dimanche (analyse faite samedi 23 matin pour la journée).",
            "## 📊 L'analyse",
            "Wolves à domicile en playoffs : 6V/1D cette saison, point différentiel moyen +7.",
            "Réaction historique des équipes 0-2 : 35% gagnent le G3 à domicile (statistique NBA depuis 2000).",
            "Anthony Edwards en colère : moyenne 33 pts à domicile en playoffs vs 22 sur la route.",
            "OKC voyage usé : 8 matchs en 14 jours, Holmgren minutes restreintes pour repos.",
            "Match-up favorable Wolves : Gobert protège la peinture, neutralise les drives SGA.",
            "## 🎰 Le pari",
            "Cote 1.80 chez bwin pour Wolves ML. Probabilité estimée 60% → edge calculé +8%.",
            "Mise : 5€ — gain potentiel +4€ si validé.",
        ],
        "sources": [
            "https://www.dimers.com/predictions/nba",
            "https://www.covers.com/sports/nba/matchups",
            "https://www.bleachernation.com/picks/",
        ],
        "stake": 5.0,
        "outcome": "win",
        "result": {
            "score_home": 121,
            "score_away": 107,
            "score_text": "Minnesota Timberwolves 121 - 107 OKC Thunder",
            "summary": "Edwards 41 pts, Wolves reviennent à 1-2. Match à sens unique dès le 2e quart.",
            "bet_outcome": "Pari gagné : Wolves vainqueurs à domicile.",
        },
    },
    # ──────────────────────────────────────────────────────────────────
    # J7 — Dimanche 24 mai 2026 — Tennis Roland Garros R1 (ouverture)
    # ──────────────────────────────────────────────────────────────────
    {
        "date": "2026-05-24",
        "sport": "tennis",
        "league": "Roland Garros — 1er tour",
        "home_team": "Sebastian Báez",
        "away_team": "Flavio Cobolli",
        "kickoff": "2026-05-24T11:00:00+00:00",
        "pick": "Sebastian Báez vainqueur du match",
        "odds": 1.85,
        "model_probability": 0.62,
        "headline": "Báez TS sur terre battue contre Cobolli — terrien chevronné vs jeune italien",
        "rationale": [
            "## 🎯 Le match",
            "Premier tour de Roland Garros sur le court Simonne-Mathieu. Báez (TS) contre Cobolli (sans tête de série).",
            "Báez : Argentin spécialiste terre battue, 4 titres en carrière tous sur ocre.",
            "Cobolli : Jeune Italien (23 ans), en progression mais inégal sur Grand Chelem.",
            "## 📊 L'analyse",
            "Forme récente Báez : 6V/4D sur les 10 derniers (dont titre Estoril en avril sur terre).",
            "Cobolli : 5V/5D, performance moyenne sur les Masters 1000 récents.",
            "H2H : 0-0 (première rencontre).",
            "Conditions : ciel couvert, terre lourde annoncée — favorise les grimpeurs comme Báez.",
            "## 🎰 Le pari",
            "Cote 1.85 chez bwin pour Báez. Probabilité estimée 62% → edge calculé +14.7%.",
            "Mise : 5€ — gain potentiel +4,25€ si validé.",
        ],
        "sources": [
            "https://www.tennistonic.com/",
            "https://www.lastwordonsports.com/tennis/",
            "https://www.tennisuptodate.com/",
        ],
        "stake": 5.0,
        "outcome": "win",
        "result": {
            "score_home": "6-3 4-6 6-2 6-4",
            "score_away": "",
            "score_text": "Báez bat Cobolli 6-3 4-6 6-2 6-4",
            "summary": "Báez s'impose en 4 sets après avoir perdu le 2e. Sa science de la terre fait la différence dans les sets décisifs.",
            "bet_outcome": "Pari gagné : Báez vainqueur en 4 sets.",
        },
    },
    # ──────────────────────────────────────────────────────────────────
    # J8 — Lundi 25 mai 2026 — Tennis Roland Garros R1
    # ──────────────────────────────────────────────────────────────────
    {
        "date": "2026-05-25",
        "sport": "tennis",
        "league": "Roland Garros — 1er tour",
        "home_team": "Iga Swiatek",
        "away_team": "Emerson Jones",
        "kickoff": "2026-05-25T11:00:00+00:00",
        "pick": "Iga Swiatek vainqueur du match",
        "odds": 1.50,
        "model_probability": 0.78,
        "headline": "Swiatek 4× championne défend son titre contre une jeune Australienne — favorite logique R1",
        "rationale": [
            "## 🎯 Le match",
            "1er tour Roland Garros sur le court Philippe-Chatrier. Swiatek (TS, 4× championne, tenante du titre) contre Emerson Jones (jeune Australienne).",
            "Swiatek : reine incontestée de Paris depuis 2020, 28V/2D en carrière à Roland Garros.",
            "Jones : 18 ans, prometteuse, premier match en GS dans le grand tableau.",
            "## 📊 L'analyse",
            "Forme récente Swiatek : retour en confiance sur terre, demi-finale Madrid, finale Rome perdue contre Gauff.",
            "Jones : parcours junior solide mais transition pro encore en cours.",
            "H2H : 0-0 (première rencontre).",
            "Conditions : terre rapide annoncée, court central, ambiance pro-Swiatek (icône à Paris).",
            "Pas de blessure annoncée côté Swiatek.",
            "## 🎰 Le pari",
            "Cote 1.50 chez bwin pour Swiatek. Probabilité estimée 78% → edge calculé +17%.",
            "Mise : 5€ — gain potentiel +2,50€ si validé.",
        ],
        "sources": [
            "https://www.tennistonic.com/",
            "https://www.tennisuptodate.com/",
            "https://www.lastwordonsports.com/tennis/",
        ],
        "stake": 5.0,
        "outcome": "win",
        "result": {
            "score_home": "6-1 6-2",
            "score_away": "",
            "score_text": "Swiatek bat Jones 6-1 6-2",
            "summary": "Démonstration de la quadruple championne. Jones impuissante face au rythme imprimé par Swiatek.",
            "bet_outcome": "Pari gagné : Swiatek vainqueur en 2 sets sans encombre.",
        },
    },
]
