#!/usr/bin/env python
"""Analyse complète d'un match en agrégant toutes les sources.

Cible : remplacer le 'gut feeling' par une vraie estimation quantitative
basée sur 3+ méthodes indépendantes (cfr METHODOLOGY.md).

Usage :
    python scripts/analyze_match.py --sport tennis --player-a "Ruud" --player-b "Popyrin" --surface clay
    python scripts/analyze_match.py --sport nba --home "Knicks" --away "Cavaliers"
    python scripts/analyze_match.py --sport nhl --home "Hurricanes" --away "Canadiens"
    python scripts/analyze_match.py --sport mlb --home "Yankees" --away "Blue Jays"

Output : tableau récap avec proba de 3 méthodes + médiane + recommandation.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.adapters import (  # noqa: E402
    balldontlie,
    kalshi,
    manifold,
    mlb_stats,
    nba_stats,
    nhl_stats,
    polymarket,
    tennis_abstract,
)


logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("analyze_match")
logger.setLevel(logging.INFO)


async def analyze_tennis(player_a: str, player_b: str, surface: str = "overall", tour: str = "atp") -> dict:
    """Agrège les sources tennis : TennisAbstract Elo (par surface) + Polymarket."""
    print(f"\n=== Analyse tennis : {player_a} vs {player_b} ({surface}, {tour.upper()}) ===\n")

    # Méthode A : Elo TennisAbstract
    print("  Méthode A : TennisAbstract Elo (surface-specific)...")
    elo_result = await tennis_abstract.predict_match(player_a, player_b, surface=surface, tour=tour)
    if elo_result:
        print(
            f"    -> {elo_result['display_a']} ({elo_result['elo_a']:.0f}) "
            f"vs {elo_result['display_b']} ({elo_result['elo_b']:.0f}) "
            f"sur {elo_result['surface_used']}"
        )
        print(f"       proba A = {elo_result['prob_a']*100:.1f}%, proba B = {elo_result['prob_b']*100:.1f}%")
        prob_a_elo = elo_result["prob_a"]
    else:
        print("    -> introuvable")
        prob_a_elo = None

    # Méthode B : Polymarket (recherche par nom dans les marchés actifs)
    print("\n  Méthode B : Polymarket prob (marché crypto)...")
    pm_picks = await polymarket.fetch_all_candidate_picks()
    prob_a_pm = _find_polymarket_prob(pm_picks, player_a, player_b)
    if prob_a_pm is not None:
        print(f"    -> proba A = {prob_a_pm*100:.1f}% (Polymarket)")
    else:
        print("    -> introuvable dans les marchés actifs")

    # Méthode C : Manifold Markets (backup sharp universel)
    print("\n  Méthode C : Manifold Markets...")
    manifold_picks = await manifold.fetch_active_sports_markets()
    prob_a_manifold = manifold.find_prob_for_match(manifold_picks, player_a, player_b)
    if prob_a_manifold is not None:
        print(f"    -> proba A = {prob_a_manifold*100:.1f}% (Manifold)")
    else:
        print("    -> introuvable")

    # Méthode D : Kalshi (sharp US, surtout tournois majeurs ATP/WTA)
    print("\n  Méthode D : Kalshi (sharp US régulé)...")
    kalshi_picks = await kalshi.fetch_all_sports_markets()
    prob_a_kalshi = kalshi.find_prob_for_match(kalshi_picks, player_a, player_b)
    if prob_a_kalshi is not None:
        print(f"    -> proba A = {prob_a_kalshi*100:.1f}% (Kalshi)")
    else:
        print("    -> introuvable (Kalshi couvre surtout les GS et 1000s)")

    return _summarize_multi(
        [prob_a_elo, prob_a_pm, prob_a_manifold, prob_a_kalshi],
        labels=["TennisAbstract Elo", "Polymarket", "Manifold", "Kalshi"],
        label_a=player_a,
        label_b=player_b,
    )


async def analyze_nba(home: str, away: str) -> dict:
    print(f"\n=== Analyse NBA : {home} (home) vs {away} ===\n")

    print("  Méthode A : NBA Stats official (net rating + home adv)...")
    nba_result = await nba_stats.predict_match_from_stats(home, away)
    if nba_result:
        hs = nba_result["home_summary"]
        a_s = nba_result["away_summary"]
        print(
            f"    -> {hs['team_name']} ({hs['wins']}-{hs['losses']}, "
            f"NetRtg {hs.get('net_rating', '?')}, home {hs.get('home_record')})"
        )
        print(
            f"       vs {a_s['team_name']} ({a_s['wins']}-{a_s['losses']}, "
            f"NetRtg {a_s.get('net_rating', '?')}, road {a_s.get('away_record')})"
        )
        print(f"       proba home = {nba_result['prob_home']*100:.1f}%")
        prob_home_nba = nba_result["prob_home"]
    else:
        print("    -> introuvable")
        prob_home_nba = None

    print("\n  Méthode B : Polymarket prob...")
    pm_picks = await polymarket.fetch_all_candidate_picks()
    prob_home_pm = _find_polymarket_prob(pm_picks, home, away)
    if prob_home_pm is not None:
        print(f"    -> proba home = {prob_home_pm*100:.1f}%")
    else:
        print("    -> introuvable")

    print("\n  Méthode C : Manifold Markets...")
    m_picks = await manifold.fetch_active_sports_markets()
    prob_home_m = manifold.find_prob_for_match(m_picks, home, away)
    if prob_home_m is not None:
        print(f"    -> proba home = {prob_home_m*100:.1f}% (Manifold)")
    else:
        print("    -> introuvable")

    print("\n  Méthode D : Kalshi (sharp US)...")
    k_picks = await kalshi.fetch_all_sports_markets()
    prob_home_k = kalshi.find_prob_for_match(k_picks, home, away)
    if prob_home_k is not None:
        print(f"    -> proba home = {prob_home_k*100:.1f}% (Kalshi)")
    else:
        print("    -> introuvable")

    return _summarize_multi(
        [prob_home_nba, prob_home_pm, prob_home_m, prob_home_k],
        labels=["NBA Stats", "Polymarket", "Manifold", "Kalshi"],
        label_a=home,
        label_b=away,
    )


async def analyze_nhl(home: str, away: str) -> dict:
    print(f"\n=== Analyse NHL : {home} (home) vs {away} ===\n")

    print("  Méthode A : NHL Stats official (win% + home adv)...")
    nhl_result = await nhl_stats.predict_match_from_stats(home, away)
    if nhl_result:
        hs = nhl_result["home_summary"]
        a_s = nhl_result["away_summary"]
        print(
            f"    -> {hs['team_name']} ({hs['wins']}-{hs['losses']}-{hs.get('otLosses', 0)}, "
            f"home {hs.get('home_wins')}-{hs.get('home_losses')})"
        )
        print(
            f"       vs {a_s['team_name']} ({a_s['wins']}-{a_s['losses']}-{a_s.get('otLosses', 0)}, "
            f"road {a_s.get('road_wins')}-{a_s.get('road_losses')})"
        )
        print(f"       proba home = {nhl_result['prob_home']*100:.1f}%")
        prob_home_nhl = nhl_result["prob_home"]
    else:
        print("    -> introuvable")
        prob_home_nhl = None

    print("\n  Méthode B : Polymarket prob...")
    pm_picks = await polymarket.fetch_all_candidate_picks()
    prob_home_pm = _find_polymarket_prob(pm_picks, home, away)
    if prob_home_pm is not None:
        print(f"    -> proba home = {prob_home_pm*100:.1f}%")
    else:
        print("    -> introuvable")

    print("\n  Méthode C : Manifold Markets...")
    m_picks = await manifold.fetch_active_sports_markets()
    prob_home_m = manifold.find_prob_for_match(m_picks, home, away)
    if prob_home_m is not None:
        print(f"    -> proba home = {prob_home_m*100:.1f}% (Manifold)")
    else:
        print("    -> introuvable")

    print("\n  Méthode D : Kalshi (sharp US)...")
    k_picks = await kalshi.fetch_all_sports_markets()
    prob_home_k = kalshi.find_prob_for_match(k_picks, home, away)
    if prob_home_k is not None:
        print(f"    -> proba home = {prob_home_k*100:.1f}% (Kalshi)")
    else:
        print("    -> introuvable")

    return _summarize_multi(
        [prob_home_nhl, prob_home_pm, prob_home_m, prob_home_k],
        labels=["NHL Stats", "Polymarket", "Manifold", "Kalshi"],
        label_a=home,
        label_b=away,
    )


async def analyze_mlb(home: str, away: str) -> dict:
    print(f"\n=== Analyse MLB : {home} (home) vs {away} ===\n")

    print("  Méthode A : MLB Stats official (Pythagorean + home adv)...")
    mlb_result = await mlb_stats.predict_match_from_stats(home, away)
    if mlb_result:
        hs = mlb_result["home_summary"]
        a_s = mlb_result["away_summary"]
        print(
            f"    -> {hs['team_name']} ({hs['wins']}-{hs['losses']}, "
            f"pythag {mlb_result['home_pythagorean']:.3f}, home {hs.get('home_record')})"
        )
        print(
            f"       vs {a_s['team_name']} ({a_s['wins']}-{a_s['losses']}, "
            f"pythag {mlb_result['away_pythagorean']:.3f}, away {a_s.get('away_record')})"
        )
        print(f"       proba home = {mlb_result['prob_home']*100:.1f}%")
        print(f"    ⚠️ {mlb_result['note']}")
        prob_home_mlb = mlb_result["prob_home"]
    else:
        print("    -> introuvable")
        prob_home_mlb = None

    print("\n  Méthode B : Polymarket prob...")
    pm_picks = await polymarket.fetch_all_candidate_picks()
    prob_home_pm = _find_polymarket_prob(pm_picks, home, away)
    if prob_home_pm is not None:
        print(f"    -> proba home = {prob_home_pm*100:.1f}%")
    else:
        print("    -> introuvable")

    print("\n  Méthode C : Manifold Markets...")
    m_picks = await manifold.fetch_active_sports_markets()
    prob_home_m = manifold.find_prob_for_match(m_picks, home, away)
    if prob_home_m is not None:
        print(f"    -> proba home = {prob_home_m*100:.1f}% (Manifold)")
    else:
        print("    -> introuvable")

    print("\n  Méthode D : Kalshi (sharp US)...")
    k_picks = await kalshi.fetch_all_sports_markets()
    prob_home_k = kalshi.find_prob_for_match(k_picks, home, away)
    if prob_home_k is not None:
        print(f"    -> proba home = {prob_home_k*100:.1f}% (Kalshi)")
    else:
        print("    -> introuvable")

    return _summarize_multi(
        [prob_home_mlb, prob_home_pm, prob_home_m, prob_home_k],
        labels=["MLB Stats", "Polymarket", "Manifold", "Kalshi"],
        label_a=home,
        label_b=away,
    )


def _find_polymarket_prob(picks: list[dict], name_a: str, name_b: str) -> float | None:
    """Cherche dans les picks Polymarket un marché qui mentionne A ou B.

    Le 'Yes' représente généralement le 'A' (le sujet de la question).
    On retourne la proba si trouvée pour A.
    """
    norm_a = name_a.lower()
    norm_b = name_b.lower()
    for pick in picks:
        q = pick.get("question", "").lower()
        if norm_a in q and norm_b in q:
            # Question type : "Will [A] beat [B]?" → Yes price = proba A
            if q.find(norm_a) < q.find(norm_b):
                return pick["polymarket_prob"]
            else:
                return 1 - pick["polymarket_prob"]
        # Fallback : juste A dans la question
        if norm_a in q:
            return pick["polymarket_prob"]
    return None


def _summarize_multi(
    probs: list[float | None],
    labels: list[str],
    label_a: str,
    label_b: str,
) -> dict:
    """Synthèse multi-sources (N méthodes). Affiche la médiane + écart inter-sources.

    Plus robuste que `_summarize` (limité à 2 sources) : tolère 0..N sources None
    et calcule un score de confiance basé sur n_sources + spread.
    """
    valid = [(p, l) for p, l in zip(probs, labels) if p is not None]
    if not valid:
        print("\n❌ Aucune méthode n'a retourné de probabilité — analyse impossible.")
        return {"error": "no_data"}

    values = [p for p, _ in valid]
    med = median(values)
    print(f"\n📊 Synthèse multi-sources ({len(valid)}/{len(probs)} dispo) :")
    for p, l in valid:
        delta = (p - med) * 100
        print(f"  {l:20s} : {p*100:.1f}% (Δ vs médiane : {delta:+.1f}pts)")
    print(f"\n  → Médiane proba {label_a} : {med*100:.1f}%")
    print(f"  → Médiane proba {label_b} : {(1-med)*100:.1f}%")

    spread = (max(values) - min(values)) * 100 if len(values) > 1 else 0
    if spread > 10:
        print(f"  ⚠️ Désaccord important entre sources (spread {spread:.0f} pts)")
    if len(valid) < 2:
        print("  ⚠️ Une seule source — fragile, croiser avec WebSearch")

    print("\n💡 Recommandation :")
    if med >= 0.75:
        print(f"  ✅ Pick SAFE : {label_a} à proba ≥ 75% → candidat sérieux")
    elif med >= 0.65:
        print(f"  🟡 Pick MARGINAL : {label_a} à proba 65-75% → acceptable en combiné")
    elif med <= 0.25:
        print(f"  ✅ Pick SAFE : {label_b} à proba ≥ 75% (inverse)")
    elif med <= 0.35:
        print(f"  🟡 Pick MARGINAL : {label_b} à proba 65-75%")
    else:
        print(f"  ❌ Pas safe : proba autour de 50%, à éviter pour 'mode safety'")

    return {
        "prob_a": round(med, 4),
        "prob_b": round(1 - med, 4),
        "n_sources": len(valid),
        "sources_detail": [{"label": l, "prob": round(p, 4)} for p, l in valid],
        "spread_pct": round(spread, 1),
        "label_a": label_a,
        "label_b": label_b,
    }


def _summarize(prob_method_a: float | None, prob_method_b: float | None, label_a: str, label_b: str) -> dict:
    """Affiche le tableau récap et retourne la médiane."""
    probs = [p for p in [prob_method_a, prob_method_b] if p is not None]
    if not probs:
        print("\n❌ Aucune méthode n'a retourné de probabilité — analyse impossible.")
        return {"error": "no_data"}

    med = median(probs)
    print(f"\n📊 Synthèse :")
    print(f"  Proba {label_a} (médiane des méthodes disponibles) : {med*100:.1f}%")
    print(f"  Proba {label_b} : {(1-med)*100:.1f}%")
    print(f"  Sources : {len(probs)} méthode(s) sur 3 idéales")

    if len(probs) < 2:
        print("  ⚠️ Une seule source — recommandation : croiser avec une 3e source manuellement (WebSearch)")
    if max(probs) - min(probs) > 0.10:
        print(f"  ⚠️ Désaccord entre sources (écart {(max(probs)-min(probs))*100:.0f} pts) — investiguer")

    # Recommandation
    print("\n💡 Recommandation :")
    if med >= 0.75:
        print(f"  ✅ Pick SAFE : {label_a} à proba ≥ 75% → candidat sérieux")
    elif med >= 0.65:
        print(f"  🟡 Pick MARGINAL : {label_a} à proba 65-75% → acceptable en combiné")
    elif med <= 0.25:
        print(f"  ✅ Pick SAFE : {label_b} à proba ≥ 75% (inverse)")
    elif med <= 0.35:
        print(f"  🟡 Pick MARGINAL : {label_b} à proba 65-75%")
    else:
        print(f"  ❌ Pas safe : proba autour de 50%, à éviter pour 'mode safety'")

    return {
        "prob_a": round(med, 4),
        "prob_b": round(1 - med, 4),
        "n_sources": len(probs),
        "label_a": label_a,
        "label_b": label_b,
    }


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Analyse multi-sources d'un match")
    p.add_argument("--sport", required=True, choices=["tennis", "nba", "nhl", "mlb"])
    # Tennis
    p.add_argument("--player-a", help="Joueur A (tennis)")
    p.add_argument("--player-b", help="Joueur B (tennis)")
    p.add_argument("--surface", default="overall", choices=["overall", "hard", "clay", "grass"])
    p.add_argument("--tour", default="atp", choices=["atp", "wta"])
    # Sports d'équipe
    p.add_argument("--home", help="Équipe domicile")
    p.add_argument("--away", help="Équipe extérieur")
    return p.parse_args()


async def main():
    args = parse_args()
    if args.sport == "tennis":
        if not (args.player_a and args.player_b):
            print("Tennis nécessite --player-a et --player-b")
            sys.exit(1)
        await analyze_tennis(args.player_a, args.player_b, surface=args.surface, tour=args.tour)
    elif args.sport == "nba":
        if not (args.home and args.away):
            print("NBA nécessite --home et --away")
            sys.exit(1)
        await analyze_nba(args.home, args.away)
    elif args.sport == "nhl":
        if not (args.home and args.away):
            print("NHL nécessite --home et --away")
            sys.exit(1)
        await analyze_nhl(args.home, args.away)
    elif args.sport == "mlb":
        if not (args.home and args.away):
            print("MLB nécessite --home et --away")
            sys.exit(1)
        await analyze_mlb(args.home, args.away)


if __name__ == "__main__":
    asyncio.run(main())
