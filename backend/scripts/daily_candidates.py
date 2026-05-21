#!/usr/bin/env python
"""Génère un CSV ranké des candidats picks pour la journée.

Pipeline :
  1. Pull tous les matchs disponibles via The Odds API (multi-bookmakers EU)
  2. Pull les marchés actifs de Polymarket (sharp probabilities)
  3. Matching des events entre les 2 sources (fuzzy sur teams + date)
  4. Pour chaque match :
       - Calcule fair odds (médiane dévignée des books)
       - Compare à bwin (book de référence pour l'utilisateur)
       - Compare à Polymarket si disponible
       - Calcule l'edge et un safety score
  5. Sort par safety score décroissant
  6. Output → backend/data/candidates/{date}.csv

Lancé quotidiennement par GH Action (.github/workflows/daily-candidates.yml)
à 7h Belgique. Le CSV produit est commité dans le repo pour consultation
par Claude lors de la sélection du pick.

Usage :
    python scripts/daily_candidates.py [YYYY-MM-DD]

Si date omise = aujourd'hui en heure Belgique (UTC+2 en été).
"""

from __future__ import annotations

import asyncio
import csv
import logging
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# Ajout du backend au PYTHONPATH (pour import app.*)
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.adapters.odds_api import OddsApiAdapter  # noqa: E402
from app.adapters import polymarket  # noqa: E402
from app.config import DATA_DIR, get_settings  # noqa: E402
from app.services.fair_odds import (  # noqa: E402
    blend_with_polymarket,
    compute_edge,
    de_vig_multiplicative,
    fair_odds_from_books,
    safety_score,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("daily_candidates")


# Bookmaker préféré utilisateur (cote affichée dans le CSV)
PREFERRED_BOOK = "bwin"

# Fenêtre de kickoff considérée (heures depuis maintenant)
KICKOFF_WINDOW_HOURS = 36

# Cote min/max pour considérer un favori "safe"
COTE_MIN = 1.10
COTE_MAX = 2.50


def parse_target_date(arg: str | None) -> date:
    if arg:
        return date.fromisoformat(arg)
    # Heure Belgique = UTC+2 en été (CEST), UTC+1 en hiver (CET).
    # On part sur UTC+2 pour la fenêtre matinale du daily run.
    now_brussels = datetime.now(timezone.utc) + timedelta(hours=2)
    return now_brussels.date()


def normalize_team_name(name: str) -> str:
    """Normalise un nom d'équipe pour matching fuzzy (lowercase, sans punctuation)."""
    return "".join(c for c in name.lower() if c.isalnum() or c == " ").strip()


def teams_overlap(team_a: str, team_b: str) -> bool:
    """Heuristique : 2 noms d'équipes 'similaires' si l'un est substring de l'autre."""
    a = normalize_team_name(team_a)
    b = normalize_team_name(team_b)
    if not a or not b:
        return False
    # Compare les "tokens" (mots), au moins 1 commun de ≥4 chars
    tokens_a = {t for t in a.split() if len(t) >= 4}
    tokens_b = {t for t in b.split() if len(t) >= 4}
    return bool(tokens_a & tokens_b) or a in b or b in a


def match_polymarket_to_oddsapi(
    polymarket_picks: list[dict],
    oddsapi_events: list[dict],
) -> dict[str, dict]:
    """Tente d'associer chaque event Odds API à un pick Polymarket correspondant.

    Returns:
        Dict keyed by oddsapi event_id, value = polymarket pick (ou None)
    """
    associations: dict[str, dict] = {}
    for event in oddsapi_events:
        event_id = event.get("id")
        if not event_id:
            continue
        home = event.get("home_team", "")
        away = event.get("away_team", "")
        kickoff = event.get("commence_time", "")

        best_match = None
        best_score = 0
        for pm_pick in polymarket_picks:
            question = pm_pick.get("question", "")
            # Score = combien de tokens (home_team, away_team) on retrouve dans question
            score = 0
            if teams_overlap(home, question):
                score += 1
            if teams_overlap(away, question):
                score += 1
            if score > best_score:
                best_score = score
                best_match = pm_pick
        if best_match and best_score >= 1:
            associations[event_id] = best_match
    return associations


def extract_books_odds(event: dict) -> dict[str, dict[str, float]]:
    """Pour un event Odds API, retourne {bookmaker_key: {outcome: cote}}."""
    books = {}
    for bm in event.get("bookmakers", []):
        key = bm.get("key", "")
        markets = bm.get("markets", [])
        for market in markets:
            if market.get("key") != "h2h":
                continue
            outcomes = market.get("outcomes", [])
            book_odds = {}
            for outcome in outcomes:
                name = outcome.get("name", "")
                price = outcome.get("price", 0)
                if name and price > 0:
                    book_odds[name] = float(price)
            if book_odds:
                books[key] = book_odds
            break
    return books


def pick_favorite_from_book(book_odds: dict[str, float]) -> tuple[str, float] | None:
    """Pour un dict {outcome: cote}, retourne (outcome_favori, cote_favori)."""
    if not book_odds:
        return None
    fav = min(book_odds, key=book_odds.get)
    return fav, book_odds[fav]


def process_event(event: dict, polymarket_pick: dict | None) -> dict | None:
    """Transforme un event Odds API + Polymarket en ligne CSV.

    Returns None si l'event ne respecte pas nos critères (cote hors range, pas de book…).
    """
    books = extract_books_odds(event)
    if not books:
        return None

    # Liste des odds par book
    books_list = list(books.values())
    if len(books_list) < 2:
        return None  # Pas assez de liquidité

    # Fair odds dévignées (médiane multi-books)
    fair_odds = fair_odds_from_books(books_list)
    if not fair_odds:
        return None

    # Détermine le favori du marché
    fair_fav = pick_favorite_from_book(fair_odds)
    if not fair_fav:
        return None
    fav_outcome, fav_fair_cote = fair_fav
    fair_prob = 1.0 / fav_fair_cote

    # Filtre cote favori dans range
    if not (COTE_MIN <= fav_fair_cote <= COTE_MAX):
        return None

    # Cote sur le book préféré (bwin)
    bwin_book = books.get(PREFERRED_BOOK)
    bwin_cote = bwin_book.get(fav_outcome) if bwin_book else None

    # Cote médiane brute (sans dévigging) pour info
    raw_cotes_fav = [b.get(fav_outcome) for b in books_list if fav_outcome in b]
    median_cote = round(sorted(raw_cotes_fav)[len(raw_cotes_fav) // 2], 3) if raw_cotes_fav else None

    # Polymarket proba si match
    pm_prob = polymarket_pick.get("polymarket_prob") if polymarket_pick else None

    # Proba finale combinée
    combined_prob = blend_with_polymarket(fair_prob, pm_prob, book_weight=0.6)

    # Edge vs bwin
    edge = compute_edge(bwin_cote, combined_prob or fair_prob) if bwin_cote else 0.0

    # Safety score
    n_books = len(books_list)
    consensus_strength = min(1.0, n_books / 5)  # 5+ books = consensus full
    safety = safety_score(combined_prob or fair_prob, edge, consensus_strength)

    return {
        "sport_key": event.get("sport_key", ""),
        "sport_title": event.get("sport_title", ""),
        "kickoff": event.get("commence_time", ""),
        "home_team": event.get("home_team", ""),
        "away_team": event.get("away_team", ""),
        "fav_pick": fav_outcome,
        "fair_cote": round(fav_fair_cote, 3),
        "fair_prob_pct": round(fair_prob * 100, 1),
        "bwin_cote": round(bwin_cote, 3) if bwin_cote else None,
        "median_cote": median_cote,
        "polymarket_prob_pct": round(pm_prob * 100, 1) if pm_prob else None,
        "combined_prob_pct": round((combined_prob or fair_prob) * 100, 1),
        "edge_vs_bwin_pct": round(edge * 100, 2),
        "n_books": n_books,
        "safety_score": safety,
    }


async def fetch_odds_api_events(target_date: date) -> list[dict]:
    """Pull tous les events Odds API pour les sports configurés.

    Note : on bypass légèrement OddsApiAdapter.fetch_daily car on veut le
    payload BRUT (avec tous les bookmakers), pas la version normalisée MatchInput.
    """
    settings = get_settings()
    if not settings.odds_api_key:
        logger.warning("odds_api_key absente — utilisation de Polymarket uniquement")
        return []

    api_key = settings.odds_api_key
    base_url = "https://api.the-odds-api.com/v4"

    import httpx

    timeout = httpx.Timeout(settings.request_timeout_seconds)
    all_events: list[dict] = []

    # 1. Liste les sports actifs
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.get(f"{base_url}/sports", params={"apiKey": api_key})
            resp.raise_for_status()
            sports_data = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error("odds_api /sports KO : %s", exc)
            return []

    active_sport_keys = [s["key"] for s in sports_data if s.get("active") and not s.get("has_outrights")]
    logger.info("odds_api : %d sports actifs", len(active_sport_keys))

    # 2. Pour chaque sport, pull les odds
    async with httpx.AsyncClient(timeout=timeout) as client:
        for sport_key in active_sport_keys:
            try:
                resp = await client.get(
                    f"{base_url}/sports/{sport_key}/odds",
                    params={
                        "apiKey": api_key,
                        "regions": "eu,uk,us",
                        "markets": "h2h",
                        "oddsFormat": "decimal",
                    },
                )
                resp.raise_for_status()
                events = resp.json()
                # Filtre par fenêtre kickoff
                for event in events:
                    kickoff = event.get("commence_time", "")
                    if _kickoff_within_window(kickoff, target_date):
                        all_events.append(event)
                remaining = resp.headers.get("x-requests-remaining", "?")
                logger.info(
                    "odds_api %s : %d events filtrés (quota restant : %s)",
                    sport_key,
                    len([e for e in events if _kickoff_within_window(e.get("commence_time", ""), target_date)]),
                    remaining,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("odds_api %s KO : %s", sport_key, exc)
                continue

    logger.info("odds_api : %d events totaux dans la fenêtre", len(all_events))
    return all_events


def _kickoff_within_window(iso_kickoff: str, target_date: date) -> bool:
    """True si kickoff dans [target_date, target_date + 36h]."""
    if not iso_kickoff:
        return False
    try:
        if iso_kickoff.endswith("Z"):
            iso_kickoff = iso_kickoff.replace("Z", "+00:00")
        dt = datetime.fromisoformat(iso_kickoff)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        # Fenêtre = [target_date 00:00 UTC, target_date 00:00 UTC + 36h]
        start = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        end = start + timedelta(hours=KICKOFF_WINDOW_HOURS)
        return start <= dt <= end
    except (ValueError, TypeError):
        return False


async def main() -> None:
    target_date = parse_target_date(sys.argv[1] if len(sys.argv) > 1 else None)
    logger.info("=== daily_candidates pour %s ===", target_date)

    # 1. Pull sources en parallèle
    odds_events_task = fetch_odds_api_events(target_date)
    polymarket_picks_task = polymarket.fetch_all_candidate_picks()
    odds_events, polymarket_picks = await asyncio.gather(
        odds_events_task, polymarket_picks_task, return_exceptions=False
    )

    if not odds_events:
        logger.warning("Aucun event Odds API : Polymarket-only output dégradé")

    # 2. Matching Polymarket ↔ Odds API
    pm_pre_filtered = [
        p for p in polymarket_picks
        if polymarket.is_kickoff_within(p.get("kickoff_iso", ""), hours=KICKOFF_WINDOW_HOURS)
    ]
    associations = match_polymarket_to_oddsapi(pm_pre_filtered, odds_events)
    logger.info(
        "Matching : %d events odds_api associés à un marché Polymarket (sur %d events)",
        len(associations),
        len(odds_events),
    )

    # 3. Process chaque event
    rows: list[dict] = []
    for event in odds_events:
        pm_pick = associations.get(event.get("id"))
        row = process_event(event, pm_pick)
        if row:
            rows.append(row)

    # 4. Sort par safety_score décroissant
    rows.sort(key=lambda r: r["safety_score"], reverse=True)
    logger.info("=> %d candidats retenus après filtres", len(rows))

    # 5. Output CSV
    out_dir = DATA_DIR / "candidates"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{target_date.isoformat()}.csv"

    if not rows:
        out_path.write_text(
            "Aucun candidat retenu — données insuffisantes ou kickoff hors fenêtre.\n"
        )
        logger.warning("Aucun candidat retenu pour %s", target_date)
        return

    fieldnames = list(rows[0].keys())
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    logger.info("CSV écrit : %s (%d lignes)", out_path, len(rows))

    # 6. Top 5 dans le log pour visibilité dans le run GH Action
    logger.info("=== TOP 5 candidats par safety_score ===")
    for i, row in enumerate(rows[:5], 1):
        logger.info(
            "%d. [%s] %s vs %s | pick=%s | combined_prob=%.1f%% | bwin=%s | edge=%.1f%% | safety=%.1f",
            i,
            row["sport_key"],
            row["home_team"],
            row["away_team"],
            row["fav_pick"],
            row["combined_prob_pct"],
            row["bwin_cote"],
            row["edge_vs_bwin_pct"],
            row["safety_score"],
        )


if __name__ == "__main__":
    asyncio.run(main())
