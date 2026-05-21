"""Calcul de 'fair odds' à partir de cotes multi-bookmakers.

Les cotes bookmaker contiennent une marge (vig/overround). On retire cette
marge pour estimer les probabilités 'vraies' du marché. Ensuite on calcule
l'edge entre un book spécifique (ex: bwin) et le consensus.

Référence : Berkowitz et al. 2018 "Removing The Sting", méthode shin/power
pour de-vigging. Ici on utilise la méthode multiplicative simple qui est
robuste pour les marchés à 2-3 outcomes.
"""

from __future__ import annotations

from statistics import median


def implied_probabilities(odds: dict[str, float]) -> dict[str, float]:
    """Pour des odds décimales {outcome: cote}, retourne les proba implicites brutes (somme > 1)."""
    return {k: 1.0 / v for k, v in odds.items() if v > 0}


def de_vig_multiplicative(odds: dict[str, float]) -> dict[str, float]:
    """De-vig multiplicatif : divise chaque proba par leur somme.

    Simple et robuste. Suppose que la marge book est répartie proportionnellement
    aux probabilités (raisonnable pour la plupart des marchés liquides).
    """
    raw = implied_probabilities(odds)
    total = sum(raw.values())
    if total <= 0:
        return raw
    return {k: round(v / total, 4) for k, v in raw.items()}


def fair_odds_from_books(books_odds: list[dict[str, float]]) -> dict[str, float]:
    """À partir d'une liste de cotes multi-books, retourne les fair odds dévignées (médiane).

    Args:
        books_odds: liste de dicts {outcome: cote_décimale}, un par bookmaker.

    Returns:
        Dict {outcome: cote_juste_dévignée} où cote_juste = 1 / proba_juste
    """
    if not books_odds:
        return {}

    # Pour chaque book, calcule les probas dévignées
    devigged_per_book: list[dict[str, float]] = [
        de_vig_multiplicative(book) for book in books_odds if book
    ]
    if not devigged_per_book:
        return {}

    # Médiane des probas dévignées par outcome (résistance aux outliers)
    all_outcomes = set()
    for d in devigged_per_book:
        all_outcomes.update(d.keys())

    median_probs = {}
    for outcome in all_outcomes:
        values = [d.get(outcome) for d in devigged_per_book if outcome in d]
        if values:
            median_probs[outcome] = median(values)

    # Re-normalise (la médiane par outcome ne somme pas exactement à 1)
    total = sum(median_probs.values())
    if total > 0:
        median_probs = {k: v / total for k, v in median_probs.items()}

    # Conversion proba → cote juste
    return {k: round(1.0 / v, 3) for k, v in median_probs.items() if v > 0}


def blend_with_polymarket(
    book_fair_prob: float | None,
    polymarket_prob: float | None,
    book_weight: float = 0.6,
) -> float | None:
    """Combine la proba dévignée des books avec la proba Polymarket.

    Polymarket est plus 'sharp' mais a moins de volume sur certains marchés.
    On pondère selon le book_weight (par défaut 60% books, 40% polymarket).

    Returns:
        Probabilité combinée [0,1], ou None si entrées invalides.
    """
    if book_fair_prob is None and polymarket_prob is None:
        return None
    if book_fair_prob is None:
        return polymarket_prob
    if polymarket_prob is None:
        return book_fair_prob

    blended = book_weight * book_fair_prob + (1 - book_weight) * polymarket_prob
    return round(blended, 4)


def compute_edge(bwin_odds: float, fair_prob: float) -> float:
    """Edge = (cote bwin × proba juste) − 1.

    Positif = bwin offre plus que la valeur juste → value bet potentiel.
    Négatif = bwin sous-cote → on accepte de payer le 'tax' pour la sécurité.
    """
    if bwin_odds <= 0 or fair_prob <= 0:
        return 0.0
    return round(bwin_odds * fair_prob - 1, 4)


def safety_score(
    fair_prob: float,
    edge: float,
    consensus_strength: float = 1.0,
) -> float:
    """Score composite pour ranker les candidats par 'safety'.

    Heuristique :
    - Probabilité haute (favori clair) = bonus
    - Edge positif (book sous-cote) = bonus modeste
    - Consensus fort entre sources (peu de variance) = bonus

    Returns:
        Score 0-100, plus haut = plus safe.
    """
    if fair_prob <= 0:
        return 0.0
    # Composante proba : 0 si proba < 50%, croît rapidement au-delà
    prob_score = max(0, (fair_prob - 0.5) * 200)  # 0 à 100 entre proba 50% et 100%
    # Composante edge : +20 max si edge > 10%
    edge_score = max(-20, min(20, edge * 200))
    # Pondération par consensus (0-1)
    return round((prob_score + edge_score) * consensus_strength, 1)
