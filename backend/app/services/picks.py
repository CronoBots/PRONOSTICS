"""Sélection du 'safe pick' du jour.

Deux modes selon les données disponibles :

  A) VALUE BET (mode strict)
     - Cote bookmaker >= MIN_ODDS et <= MAX_ODDS_VALUE
     - Notre proba estimée > proba implicite du bookmaker
     - EV positive mais pas absurde (>= MIN_EV, <= MAX_EV)
     - Le ratio model/book reste raisonnable (filtre anti-données absentes)

  B) SAFE FAVORITE (fallback)
     Quand aucun value bet n'est détecté (par ex. on a juste les cotes
     sans données d'équipes), on tombe sur le favori le plus serré :
     cote entre 2.00 et 2.40 = match équilibré, le bookmaker n'est pas
     très confiant, mais le résultat reste "honnête".

L'algo retourne *un seul* pick : le meilleur value bet, sinon le favori safe.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.models import Match


# Bornes communes
MIN_ODDS = 2.0
MAX_ODDS_VALUE = 3.00          # value bet : on accepte jusqu'à 3.00
MAX_ODDS_FAVORITE = 2.40       # safe favorite : match équilibré

# Filtres value bet (mode A)
MIN_MODEL_PROBABILITY = 0.45
MIN_EV = 0.05
MAX_EV = 0.30                   # au-dessus c'est probablement du bruit (no-data)
MAX_MODEL_BOOK_RATIO = 1.80     # model_prob / book_prob max — filtre anti-hallu


@dataclass
class ValuePick:
    match_id: int
    sport: str
    league: str
    home_team: str
    away_team: str
    kickoff_iso: str
    pick: str
    odds: float
    model_probability: float
    book_probability: float
    expected_value: float
    confidence: float
    engine: str
    rationale: list[str]
    kind: str = "value_bet"     # "value_bet" | "safe_favorite"

    def to_dict(self) -> dict:
        return {
            "match_id": self.match_id,
            "sport": self.sport,
            "league": self.league,
            "home_team": self.home_team,
            "away_team": self.away_team,
            "kickoff": self.kickoff_iso,
            "pick": self.pick,
            "odds": self.odds,
            "model_probability": self.model_probability,
            "book_probability": self.book_probability,
            "expected_value": self.expected_value,
            "confidence": self.confidence,
            "engine": self.engine,
            "rationale": self.rationale,
            "kind": self.kind,
        }


def _build_pick(
    match: Match,
    prediction,
    pick_name: str,
    odds: float,
    model_prob: float,
    rationale_extra: Optional[list[str]] = None,
    kind: str = "value_bet",
) -> ValuePick:
    book_prob = round(1 / odds, 4) if odds > 0 else 0.0
    ev = round(model_prob * odds - 1, 4)
    rationale = list(prediction.rationale or [])
    if rationale_extra:
        rationale = rationale_extra + rationale
    return ValuePick(
        match_id=match.id,
        sport=match.sport,
        league=match.league,
        home_team=match.home_team,
        away_team=match.away_team,
        kickoff_iso=match.kickoff.isoformat(),
        pick=pick_name,
        odds=round(odds, 2),
        model_probability=round(model_prob, 4),
        book_probability=book_prob,
        expected_value=ev,
        confidence=round(model_prob, 4),
        engine=prediction.engine,
        rationale=rationale,
        kind=kind,
    )


# --- Mode A : value bets -------------------------------------------------


def _value_bet_for(match: Match) -> Optional[ValuePick]:
    if not match.predictions:
        return None
    pred = match.predictions[-1]
    odds_snapshot = pred.odds_snapshot or {}
    odds = odds_snapshot.get(pred.pick)
    if not odds or not (MIN_ODDS <= odds <= MAX_ODDS_VALUE):
        return None

    model_prob = pred.confidence
    if model_prob < MIN_MODEL_PROBABILITY:
        return None

    book_prob = 1 / odds
    if model_prob <= book_prob:
        return None

    ev = model_prob * odds - 1
    if ev < MIN_EV or ev > MAX_EV:
        return None

    if model_prob / book_prob > MAX_MODEL_BOOK_RATIO:
        return None

    return _build_pick(match, pred, pred.pick, odds, model_prob, kind="value_bet")


# --- Mode B : safe favorite fallback -------------------------------------


def _safe_favorite_for(match: Match) -> Optional[ValuePick]:
    """Cherche dans toutes les issues du match une cote dans [2.00, 2.40].

    Retourne le candidat avec la cote la plus basse (= probabilité bookmaker
    la plus haute) parmi les outcomes qualifiants.
    """
    if not match.predictions:
        return None
    pred = match.predictions[-1]
    odds_snapshot = pred.odds_snapshot or {}
    if not odds_snapshot:
        return None

    candidates = [
        (outcome, o)
        for outcome, o in odds_snapshot.items()
        if MIN_ODDS <= o <= MAX_ODDS_FAVORITE
    ]
    if not candidates:
        return None

    candidates.sort(key=lambda x: x[1])  # cote la plus basse en tête
    pick_name, odds = candidates[0]
    book_prob = 1 / odds
    # En fallback, on s'aligne sur le book : model_prob = book_prob
    model_prob = book_prob

    rationale_extra = [
        "Mode favori safe : pas assez de données équipes pour un vrai value bet.",
        f"Cote {odds:.2f} = match équilibré côté bookmaker (~{book_prob*100:.0f}%).",
    ]
    return _build_pick(
        match,
        pred,
        pick_name,
        odds,
        model_prob,
        rationale_extra=rationale_extra,
        kind="safe_favorite",
    )


# --- Public API ----------------------------------------------------------


def select_value_picks(matches: list[Match], limit: int = 5) -> list[ValuePick]:
    """Top value bets du jour (mode A uniquement), triés par EV."""
    picks = [vp for m in matches if (vp := _value_bet_for(m)) is not None]
    picks.sort(key=lambda x: x.expected_value, reverse=True)
    return picks[:limit]


def select_safe_pick(matches: list[Match]) -> Optional[ValuePick]:
    """Le pick safe du jour : value bet si dispo, sinon favori safe (cote ~2.00)."""
    value_picks = select_value_picks(matches, limit=1)
    if value_picks:
        return value_picks[0]

    # Fallback : favori le plus serré du jour, cote 2.00-2.40
    fallbacks = [vp for m in matches if (vp := _safe_favorite_for(m)) is not None]
    if not fallbacks:
        return None
    fallbacks.sort(key=lambda x: x.odds)  # cote la plus basse = favori le plus fort
    return fallbacks[0]
