"""
Wrapper Python pour API-Sports (api-sports.io) — Mode direct.

Couvre 4 sports prioritaires pour NEXBET v4.4 :
- ⚽ Football (Premier League, Liga, Bundesliga, Serie A, Ligue 1, CL, EL)
- 🏀 Basketball (NBA + Euroleague)
- 🏒 Hockey (NHL)
- ⚾ Baseball (MLB)

⚠️ Tennis NON couvert par API-Sports — utiliser WebSearch whitelist
(Tennis Tonic, Dimers, LWOS, Stats Insider) + SofaScore optionnel.

Authentification : header `x-apisports-key` (mode direct, pas RapidAPI).
Clé en variable d'env `API_SPORTS_KEY` (jamais commitée).

Doc officielle : https://www.api-sports.io/documentation
"""

import logging
import os
from typing import Any, Optional

import requests

log = logging.getLogger("nexbet.sportsapi")

# Endpoints par sport (mode direct, pas RapidAPI)
SPORT_HOSTS = {
    "football": "v3.football.api-sports.io",
    "basketball": "v1.basketball.api-sports.io",
    "hockey": "v1.hockey.api-sports.io",
    "baseball": "v1.baseball.api-sports.io",
}

# IDs de ligues utiles (récupérés depuis /leagues, à mettre à jour si la saison change)
LEAGUE_IDS = {
    "football": {
        "premier_league": 39,
        "bundesliga": 78,
        "liga": 140,
        "serie_a": 135,
        "ligue_1": 61,
        "champions_league": 2,
        "europa_league": 3,
        "coupe_de_france": 66,
    },
    "basketball": {
        "nba": 12,
        "euroleague": 1,
    },
    "hockey": {
        "nhl": 57,
    },
    "baseball": {
        "mlb": 1,
    },
}


class SportsAPIError(Exception):
    """Erreur API-Sports (rate limit, auth, etc.)."""


class SportsAPI:
    """Client API-Sports multi-sports."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("API_SPORTS_KEY")
        if not self.api_key:
            raise SportsAPIError(
                "API_SPORTS_KEY manquante — créer un .env avec ta clé api-sports.io"
            )
        self.session = requests.Session()
        self.session.headers.update({"x-apisports-key": self.api_key})

    def _get(self, sport: str, endpoint: str, params: Optional[dict] = None) -> dict:
        """GET sur l'endpoint d'un sport donné."""
        host = SPORT_HOSTS.get(sport)
        if not host:
            raise SportsAPIError(
                f"Sport '{sport}' non supporté. Choix : {list(SPORT_HOSTS)}"
            )
        url = f"https://{host}/{endpoint.lstrip('/')}"
        resp = self.session.get(url, params=params or {}, timeout=15)
        if resp.status_code == 429:
            raise SportsAPIError("Rate limit atteint — attendre ou upgrade plan")
        if resp.status_code == 499:
            raise SportsAPIError("Clé API invalide ou révoquée")
        resp.raise_for_status()
        data = resp.json()
        # API-Sports renvoie { "errors": [...], "response": [...] }
        if data.get("errors"):
            errs = data["errors"]
            if isinstance(errs, dict) and errs:
                log.warning("API-Sports errors : %s", errs)
            elif isinstance(errs, list) and errs:
                log.warning("API-Sports errors : %s", errs)
        return data

    # ━━━━━━━━━━━━ FIXTURES / SCHEDULE ━━━━━━━━━━━━

    def get_fixtures(
        self,
        sport: str,
        date: Optional[str] = None,
        league_id: Optional[int] = None,
        season: Optional[int] = None,
        live: bool = False,
    ) -> list[dict]:
        """
        Schedule d'un sport à une date donnée.

        Args:
            sport : "football" | "basketball" | "hockey" | "baseball"
            date : "YYYY-MM-DD" (ex: "2026-05-25")
            league_id : optionnel, filtre par ligue (cf LEAGUE_IDS)
            season : optionnel, année de la saison (ex: 2025 pour saison 2025-2026)
            live : si True, ne renvoie que les matchs en direct
        """
        endpoint = "fixtures" if sport == "football" else "games"
        params: dict[str, Any] = {}
        if live:
            params["live"] = "all"
        if date:
            params["date"] = date
        if league_id:
            params["league"] = league_id
        if season:
            params["season"] = season
        data = self._get(sport, endpoint, params)
        return data.get("response", [])

    # ━━━━━━━━━━━━ ODDS ━━━━━━━━━━━━

    def get_odds(
        self,
        sport: str,
        fixture_id: int,
        bookmaker_id: Optional[int] = None,
    ) -> list[dict]:
        """
        Cotes multi-bookmakers pour un match.

        Bookmakers populaires :
        - Pinnacle : 4
        - Bet365 : 8
        - Bwin : 6 (selon sport)
        - DraftKings : 25
        """
        endpoint = "odds"
        params: dict[str, Any] = {}
        if sport == "football":
            params["fixture"] = fixture_id
        else:
            params["game"] = fixture_id
        if bookmaker_id:
            params["bookmaker"] = bookmaker_id
        data = self._get(sport, endpoint, params)
        return data.get("response", [])

    # ━━━━━━━━━━━━ PREDICTIONS (foot seulement) ━━━━━━━━━━━━

    def get_predictions(self, fixture_id: int) -> dict:
        """
        Prédictions du modèle API-Sports pour un match foot.
        Renvoie une dict avec : winner, win_or_draw, under_over, goals,
        advice, percent (% par issue), comparison (form/h2h/etc.).

        ⚠️ Football uniquement (endpoint pas dispo pour les autres sports).
        """
        data = self._get("football", "predictions", {"fixture": fixture_id})
        resp = data.get("response", [])
        return resp[0] if resp else {}

    # ━━━━━━━━━━━━ H2H ━━━━━━━━━━━━

    def get_h2h(
        self,
        sport: str,
        team1_id: int,
        team2_id: int,
        last: int = 10,
    ) -> list[dict]:
        """Historique face-à-face entre 2 équipes (N derniers matchs)."""
        endpoint = "fixtures/headtohead" if sport == "football" else "games/h2h"
        params = {"h2h": f"{team1_id}-{team2_id}", "last": last}
        data = self._get(sport, endpoint, params)
        return data.get("response", [])

    # ━━━━━━━━━━━━ LINEUPS ━━━━━━━━━━━━

    def get_lineups(self, sport: str, fixture_id: int) -> list[dict]:
        """Compositions / lineups d'un match (post-publication par l'équipe)."""
        if sport != "football":
            log.warning("get_lineups : foot uniquement (sport=%s)", sport)
            return []
        data = self._get("football", "fixtures/lineups", {"fixture": fixture_id})
        return data.get("response", [])

    # ━━━━━━━━━━━━ INJURIES ━━━━━━━━━━━━

    def get_injuries(
        self,
        sport: str,
        team_id: Optional[int] = None,
        league_id: Optional[int] = None,
        season: Optional[int] = None,
    ) -> list[dict]:
        """Blessures actuelles (par équipe ou ligue)."""
        if sport != "football":
            log.warning("get_injuries : foot uniquement (sport=%s)", sport)
            return []
        params: dict[str, Any] = {}
        if team_id:
            params["team"] = team_id
        if league_id:
            params["league"] = league_id
        if season:
            params["season"] = season
        data = self._get("football", "injuries", params)
        return data.get("response", [])

    # ━━━━━━━━━━━━ STATS ÉQUIPE ━━━━━━━━━━━━

    def get_team_stats(
        self, sport: str, team_id: int, league_id: int, season: int
    ) -> dict:
        """Stats d'une équipe sur une saison (forme, buts, possession, etc.)."""
        endpoint = "teams/statistics" if sport == "football" else "teams/statistics"
        params = {"team": team_id, "league": league_id, "season": season}
        data = self._get(sport, endpoint, params)
        return data.get("response", {})

    # ━━━━━━━━━━━━ STANDINGS ━━━━━━━━━━━━

    def get_standings(
        self, sport: str, league_id: int, season: int
    ) -> list[dict]:
        """Classement d'une ligue."""
        data = self._get(
            sport, "standings", {"league": league_id, "season": season}
        )
        return data.get("response", [])

    # ━━━━━━━━━━━━ STATUS API (quota) ━━━━━━━━━━━━

    def get_status(self, sport: str = "football") -> dict:
        """
        Quota actuel + plan + requests count.
        Utile en début de pipeline pour vérifier qu'on a du quota.
        """
        data = self._get(sport, "status", {})
        return data.get("response", {})


# ━━━━━━━━━━━━ Helper : ID équipe par nom ━━━━━━━━━━━━

def search_team(api: SportsAPI, sport: str, name: str) -> Optional[int]:
    """
    Cherche l'ID d'une équipe par nom. Renvoie le premier match si trouvé.

    Ex : search_team(api, "football", "Liverpool") -> 40
         search_team(api, "basketball", "Boston Celtics") -> 132
    """
    endpoint = "teams" if sport == "football" else "teams"
    data = api._get(sport, endpoint, {"search": name})
    resp = data.get("response", [])
    if not resp:
        return None
    return resp[0]["team"]["id"] if sport == "football" else resp[0]["id"]
