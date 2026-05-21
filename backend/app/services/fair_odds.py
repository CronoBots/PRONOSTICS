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
    n_books: int = 0,
) -> float:
    """Score composite pour ranker les candidats par 'safety'.

    Calibrage : on récompense la proba haute (favori clair) et un edge
    modeste. On pénalise FORTEMENT les edges anormalement grands sur peu
    de bookmakers (signaux artificiels typiques d'un outlier 1 book).

    Returns:
        Score 0-100, plus haut = plus safe.
    """
    if fair_prob <= 0:
        return 0.0

    # Composante proba : 0 si proba < 50%, croît jusqu'à 100 à proba=100%
    prob_score = max(0, (fair_prob - 0.5) * 200)

    # Edge crédité par paliers selon la fiabilité de l'estimation (n_books)
    # Plus on a de books, plus on peut faire confiance à l'edge calculé.
    if n_books >= 10:
        trusted_edge_max = 0.20  # on accepte edges jusqu'à ±20%
    elif n_books >= 6:
        trusted_edge_max = 0.10  # ±10% max crédible
    elif n_books >= 3:
        trusted_edge_max = 0.05  # ±5% max crédible
    else:
        trusted_edge_max = 0.0  # 0-2 books = pas d'edge crédible
    trusted_edge = max(-trusted_edge_max, min(trusted_edge_max, edge))
    edge_score = trusted_edge * 100

    # Pénalité forte si l'edge brut dépasse fortement le 'trusted_edge_max'
    # (= signal d'alerte 'cote outlier sur 1 book')
    suspicious_penalty = 0.0
    if abs(edge) > trusted_edge_max + 0.15:
        # Au-delà de 15 pts au-dessus du seuil de confiance = suspect
        excess = abs(edge) - (trusted_edge_max + 0.15)
        suspicious_penalty = -min(40, excess * 100)

    raw = prob_score + edge_score + suspicious_penalty
    weighted = raw * consensus_strength
    return round(max(0, weighted), 1)
