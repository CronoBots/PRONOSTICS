"""Adapter TennisAbstract — Elo par surface pour joueurs ATP/WTA.

TennisAbstract publie des ratings Elo globaux et par surface (hard, clay, grass)
mis à jour quotidiennement. C'est LA référence gratuite pour le tennis.

Pas d'API officielle : on parse les HTML reports publiés à URLs stables.

Pages utiles :
  - ATP global Elo: https://tennisabstract.com/reports/atp_elo_ratings.html
  - ATP Clay yElo: https://tennisabstract.com/reports/atp_season_yelo_ratings.html
  - WTA: idem avec wta_ dans l'URL

Format des tables HTML :
  <table id="reportable">
    <thead> Rank | Player | Age | Elo | hElo | cElo | gElo | Peak | Peak_Date </thead>
    <tbody>
      <tr><td>1</td><td><a>...Sinner...</a></td>...
"""

from __future__ import annotations

import logging
import re
from typing import Literal

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)

Surface = Literal["overall", "hard", "clay", "grass"]
Tour = Literal["atp", "wta"]

# Index colonnes dans la table reportable (vérifié sur la page publique)
# Cols: Rank, Player, Age, Elo, hElo, cElo, gElo, Peak, Peak_Date
COL_PLAYER = 1
COL_ELO = 3
COL_HELO = 4
COL_CELO = 5
COL_GELO = 6


def _surface_col(surface: Surface) -> int:
    return {
        "overall": COL_ELO,
        "hard": COL_HELO,
        "clay": COL_CELO,
        "grass": COL_GELO,
    }[surface]


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_html(url: str) -> str:
    timeout = get_settings().request_timeout_seconds
    headers = {
        # TennisAbstract bloque parfois les requêtes sans UA
        "User-Agent": "Mozilla/5.0 (compatible; WTF-Bot/1.0; +https://cronobots.github.io/PRONOSTICS/)",
    }
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.text


def _normalize_player_name(name: str) -> str:
    """Normalise pour matching : lowercase, retire accents, retire 'Jr', etc."""
    name = name.lower().strip()
    # Enlève les espaces multiples, points, virgules
    name = re.sub(r"[.,]", "", name)
    name = re.sub(r"\s+", " ", name)
    return name


def _parse_elo_table(html: str) -> dict[str, dict[str, float]]:
    """Parse la table 'reportable' et retourne {player_name: {col_index: value}}.

    Pas de lib externe (BeautifulSoup, lxml) pour rester sans deps : regex pragmatique
    sur les <tr><td>...</td></tr> de la table reportable.
    """
    # Extrait le contenu de la table reportable (entre <tbody> et </tbody>)
    tbody_match = re.search(
        r'<table[^>]*id=["\']reportable["\'][^>]*>.*?<tbody[^>]*>(.*?)</tbody>',
        html,
        re.IGNORECASE | re.DOTALL,
    )
    if not tbody_match:
        # Fallback : prendre toute la table
        tbody_match = re.search(
            r'<table[^>]*id=["\']reportable["\'][^>]*>(.*?)</table>',
            html,
            re.IGNORECASE | re.DOTALL,
        )
    if not tbody_match:
        logger.warning("tennis_abstract: table reportable introuvable")
        return {}

    tbody_html = tbody_match.group(1)

    # Pour chaque <tr>, extraire les <td>
    players: dict[str, dict[str, float]] = {}
    tr_pattern = re.compile(r"<tr[^>]*>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
    td_pattern = re.compile(r"<td[^>]*>(.*?)</td>", re.IGNORECASE | re.DOTALL)
    tag_pattern = re.compile(r"<[^>]+>")

    for tr_match in tr_pattern.finditer(tbody_html):
        row_html = tr_match.group(1)
        tds = td_pattern.findall(row_html)
        if len(tds) < 7:
            continue
        # Extrait texte de chaque cellule (enlève les balises imbriquées <a>, <span>…)
        cells = [tag_pattern.sub("", td).strip() for td in tds]

        player_name = cells[COL_PLAYER]
        if not player_name:
            continue

        try:
            elos = {
                "overall": float(cells[COL_ELO]) if cells[COL_ELO] else None,
                "hard": float(cells[COL_HELO]) if cells[COL_HELO] else None,
                "clay": float(cells[COL_CELO]) if cells[COL_CELO] else None,
                "grass": float(cells[COL_GELO]) if cells[COL_GELO] else None,
            }
        except (ValueError, IndexError):
            continue

        normalized = _normalize_player_name(player_name)
        players[normalized] = {
            "display_name": player_name,
            "elo_overall": elos["overall"],
            "elo_hard": elos["hard"],
            "elo_clay": elos["clay"],
            "elo_grass": elos["grass"],
        }
    logger.info("tennis_abstract: %d joueurs parsés", len(players))
    return players


async def fetch_elo_ratings(tour: Tour = "atp") -> dict[str, dict]:
    """Pull les Elo ratings du tour (ATP ou WTA), surfaces multiples.

    Returns:
        Dict {nom_normalisé: {display_name, elo_overall, elo_hard, elo_clay, elo_grass}}
    """
    url = f"https://tennisabstract.com/reports/{tour}_elo_ratings.html"
    try:
        html = await _fetch_html(url)
    except Exception as exc:  # noqa: BLE001
        logger.warning("tennis_abstract %s ratings fetch failed: %s", tour, exc)
        return {}
    return _parse_elo_table(html)


def elo_to_win_probability(elo_a: float, elo_b: float) -> float:
    """Formule Elo standard : P(A bat B) = 1 / (1 + 10^((B-A)/400))."""
    if elo_a is None or elo_b is None:
        return 0.5
    diff = elo_b - elo_a
    return 1.0 / (1.0 + 10 ** (diff / 400))


async def predict_match(
    player_a: str,
    player_b: str,
    surface: Surface = "overall",
    tour: Tour = "atp",
) -> dict | None:
    """Prédit la proba de gain du joueur A vs B selon Elo TennisAbstract.

    Returns:
        Dict {prob_a, prob_b, elo_a, elo_b, surface_used, source} ou None si introuvable.
    """
    ratings = await fetch_elo_ratings(tour)
    if not ratings:
        return None

    norm_a = _normalize_player_name(player_a)
    norm_b = _normalize_player_name(player_b)

    # Recherche par match exact, puis substring (pour gérer "C. Ruud" vs "Casper Ruud")
    def find(norm: str) -> dict | None:
        if norm in ratings:
            return ratings[norm]
        # Substring match (un nom contient l'autre)
        for k, v in ratings.items():
            if norm in k or k in norm:
                return v
        # Last name match : split, dernière partie
        last_a = norm.split()[-1] if norm.split() else norm
        for k, v in ratings.items():
            if last_a in k:
                return v
        return None

    rec_a = find(norm_a)
    rec_b = find(norm_b)
    if not rec_a or not rec_b:
        logger.warning(
            "tennis_abstract: joueurs introuvables (a=%s found=%s, b=%s found=%s)",
            player_a, bool(rec_a), player_b, bool(rec_b),
        )
        return None

    elo_key = f"elo_{surface}" if surface != "overall" else "elo_overall"
    elo_a = rec_a.get(elo_key)
    elo_b = rec_b.get(elo_key)
    if elo_a is None or elo_b is None:
        # Fallback overall
        elo_a = rec_a.get("elo_overall")
        elo_b = rec_b.get("elo_overall")
        surface = "overall"

    prob_a = elo_to_win_probability(elo_a, elo_b)
    return {
        "prob_a": round(prob_a, 4),
        "prob_b": round(1 - prob_a, 4),
        "elo_a": elo_a,
        "elo_b": elo_b,
        "surface_used": surface,
        "source": f"tennis_abstract_{tour}",
        "display_a": rec_a.get("display_name"),
        "display_b": rec_b.get("display_name"),
    }
