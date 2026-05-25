"""
Wrapper Python pour SofaScore API (api.sofascore.com).

⚠️ API non-officielle (pas documentée publiquement). TOS gris : usage perso
toléré, usage commercial à éviter. Utilisée comme source de cartographie
et signal quantitatif complémentaire.

Couverture : multi-sports complet (tennis, foot, basket, hockey, baseball,
F1, etc.). **Indispensable pour tennis** (API-Sports ne couvre pas).

Endpoints utilisés :
- /sport/{sport}/scheduled-events/{date} : cartographie auto par sport+date
- /event/{id} : détails match
- /event/{id}/win-probability : proba modèle SofaScore (signal unique !)
- /event/{id}/h2h : historique face-à-face
- /event/{id}/odds/1/all : cotes multi-bookmakers
- /event/{id}/lineups : compositions
- /event/{id}/statistics : stats live + finales

Authentification : aucune (juste un User-Agent navigateur).
Cloudflare protection : bypass via cloudscraper si nécessaire.

Doc reverse-engineered : voir DevTools Network sur sofascore.com
"""

import logging
import time
from datetime import datetime
from typing import Any, Optional

try:
    import cloudscraper

    _CSCRAPE_AVAILABLE = True
except ImportError:
    _CSCRAPE_AVAILABLE = False

import requests

log = logging.getLogger("nexbet.sofascore")

BASE_URL = "https://api.sofascore.com/api/v1"

# User-Agent navigateur récent (Cloudflare exige un UA crédible)
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# Sports SofaScore (slugs API)
SPORTS = {
    "tennis": "tennis",
    "football": "football",
    "basketball": "basketball",
    "ice-hockey": "ice-hockey",
    "baseball": "baseball",
    "american-football": "american-football",
}

# Status codes SofaScore
STATUS_NOT_STARTED = 0
STATUS_LIVE = 7  # ou autre selon sport
STATUS_ENDED = 100
STATUS_CANCELED = 70


class SofaScoreError(Exception):
    """Erreur SofaScore (403 Cloudflare, 429 rate limit, etc.)."""


class SofaScore:
    """Client SofaScore API."""

    def __init__(self, use_cloudscraper: bool = True, rate_limit_sec: float = 1.0):
        """
        Args:
            use_cloudscraper: utilise cloudscraper si dispo (bypass Cloudflare).
                Sinon fallback sur requests + User-Agent. cloudscraper recommandé.
            rate_limit_sec: délai minimum entre 2 requêtes (defaut 1s).
        """
        self.rate_limit = rate_limit_sec
        self._last_request = 0.0
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Referer": "https://www.sofascore.com/",
            "Origin": "https://www.sofascore.com",
        }

        if use_cloudscraper and _CSCRAPE_AVAILABLE:
            self.session = cloudscraper.create_scraper(
                browser={"browser": "chrome", "platform": "darwin", "mobile": False}
            )
            log.info("SofaScore client: cloudscraper enabled")
        else:
            self.session = requests.Session()
            if use_cloudscraper and not _CSCRAPE_AVAILABLE:
                log.warning(
                    "cloudscraper non installé (pip install cloudscraper) — "
                    "fallback requests + User-Agent. Peut être bloqué par Cloudflare."
                )
        self.session.headers.update(self.headers)

    def _get(self, path: str) -> dict:
        """GET avec rate limiting + headers navigateur."""
        # Rate limit
        elapsed = time.time() - self._last_request
        if elapsed < self.rate_limit:
            time.sleep(self.rate_limit - elapsed)

        url = f"{BASE_URL}{path}"
        resp = self.session.get(url, timeout=15)
        self._last_request = time.time()

        if resp.status_code == 403:
            raise SofaScoreError(
                f"403 Forbidden sur {path} — Cloudflare bloque. Installer "
                "cloudscraper (pip install cloudscraper) ou changer d'IP."
            )
        if resp.status_code == 429:
            raise SofaScoreError(f"429 Rate limit sur {path} — attendre 60s.")
        if resp.status_code == 404:
            log.warning("404 sur %s (event peut ne pas exister)", path)
            return {}
        resp.raise_for_status()
        return resp.json()

    # ━━━━━━━━━━━━ CARTOGRAPHIE ━━━━━━━━━━━━

    def scheduled_events(self, sport: str, date: Optional[str] = None) -> list[dict]:
        """
        Liste tous les matchs programmés pour un sport+date.

        Args:
            sport : "tennis" | "football" | "basketball" | "ice-hockey" | "baseball"
            date : "YYYY-MM-DD" (defaut: aujourd'hui UTC)

        Returns: liste d'events SofaScore (chaque event a son id, teams, status, etc.)
        """
        if date is None:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        if sport not in SPORTS:
            raise SofaScoreError(f"Sport '{sport}' inconnu. Choix : {list(SPORTS)}")
        data = self._get(f"/sport/{sport}/scheduled-events/{date}")
        return data.get("events", [])

    def live_events(self, sport: str) -> list[dict]:
        """Matchs LIVE en cours pour un sport."""
        data = self._get(f"/sport/{sport}/events/live")
        return data.get("events", [])

    # ━━━━━━━━━━━━ DÉTAILS MATCH ━━━━━━━━━━━━

    def event(self, event_id: int) -> dict:
        """Détails complets d'un match."""
        data = self._get(f"/event/{event_id}")
        return data.get("event", {})

    def win_probability(self, event_id: int) -> dict:
        """
        ⭐ SIGNAL UNIQUE — proba modèle SofaScore (timeline).

        Returns: dict avec historique des proba avant/pendant match.
        C'est LE signal différenciant qui n'existe pas chez les autres
        sources whitelist.
        """
        return self._get(f"/event/{event_id}/win-probability")

    def h2h(self, event_id: int) -> dict:
        """Historique face-à-face structuré (10 derniers matchs)."""
        return self._get(f"/event/{event_id}/h2h")

    def odds(self, event_id: int) -> dict:
        """Cotes multi-bookmakers consolidées."""
        return self._get(f"/event/{event_id}/odds/1/all")

    def lineups(self, event_id: int) -> dict:
        """Compositions / lineups (foot principalement)."""
        return self._get(f"/event/{event_id}/lineups")

    def statistics(self, event_id: int) -> dict:
        """Stats détaillées (xG foot, aces tennis, etc.)."""
        return self._get(f"/event/{event_id}/statistics")

    def incidents(self, event_id: int) -> dict:
        """Incidents du match (cartons, buts, breaks, etc.)."""
        return self._get(f"/event/{event_id}/incidents")

    # ━━━━━━━━━━━━ SEARCH ━━━━━━━━━━━━

    def search_player(self, query: str) -> list[dict]:
        """Cherche un joueur par nom."""
        data = self._get(f"/search/players/{query}")
        return data.get("results", [])

    def search_team(self, query: str) -> list[dict]:
        """Cherche une équipe par nom."""
        data = self._get(f"/search/teams/{query}")
        return data.get("results", [])


# ━━━━━━━━━━━━ HELPERS NEXBET ━━━━━━━━━━━━

def filter_top_n_atp(events: list[dict], n: int = 10) -> list[dict]:
    """Filtre les matchs avec un joueur top-N ATP/WTA."""
    out = []
    for e in events:
        home_rank = e.get("homeTeam", {}).get("ranking", 9999)
        away_rank = e.get("awayTeam", {}).get("ranking", 9999)
        if home_rank <= n or away_rank <= n:
            out.append(e)
    return out


def filter_by_status(events: list[dict], status: str = "notstarted") -> list[dict]:
    """
    Filtre par statut : 'notstarted' | 'inprogress' | 'finished' | 'canceled'.
    """
    return [e for e in events if e.get("status", {}).get("type") == status]


def filter_by_round(events: list[dict], round_n: int) -> list[dict]:
    """Filtre par tour (R1=64, R2=32, R3=16, R4=8, QF=4, SF=2, F=1)."""
    return [e for e in events if e.get("roundInfo", {}).get("round") == round_n]


def summarize_event(event: dict) -> dict:
    """Résume un event SofaScore aux champs essentiels pour NEXBET."""
    home = event.get("homeTeam", {})
    away = event.get("awayTeam", {})
    return {
        "id": event.get("id"),
        "slug": event.get("slug"),
        "tournament": event.get("tournament", {}).get("uniqueTournament", {}).get("name"),
        "round": event.get("roundInfo", {}).get("name"),
        "venue": event.get("venue", {}).get("stadium", {}).get("name"),
        "ground": event.get("groundType"),
        "kickoff_unix": event.get("startTimestamp"),
        "status": event.get("status", {}).get("type"),
        "home_name": home.get("name"),
        "home_country": home.get("country", {}).get("alpha2"),
        "home_ranking": home.get("ranking"),
        "home_seed": event.get("homeTeamSeed"),
        "away_name": away.get("name"),
        "away_country": away.get("country", {}).get("alpha2"),
        "away_ranking": away.get("ranking"),
        "away_seed": event.get("awayTeamSeed"),
        "winner_code": event.get("winnerCode"),  # 1=home, 2=away (si fini)
        "user_count": home.get("userCount", 0) + away.get("userCount", 0),
    }
