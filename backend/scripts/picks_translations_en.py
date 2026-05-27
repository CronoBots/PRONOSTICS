"""English translations for picks_data.PICKS — used by publish_telegram.py.

Overlay only: picks_data stays the single source of truth (FR for the
website). This module provides EN equivalents of user-facing strings for
the Telegram channel.

Keyed by pick date (YYYY-MM-DD). For each pick, optionally provides:
  - pick          : English bet statement
  - headline      : one-line narrative
  - league        : tournament/round name in English
  - score_text    : final score description
  - summary       : match summary
  - bet_outcome   : win/loss explanation
  - legs          : list of {pick, score_text, summary, bet_outcome} for combos
"""

from __future__ import annotations

TRANSLATIONS: dict[str, dict] = {
    # J1 — May 18, 2026 — Premier League final day
    "2026-05-18": {
        "league": "Premier League — Matchday 38 (final day)",
        "pick": "Liverpool to win + Both Teams to Score",
        "headline": (
            "Liverpool 8-1-1 at home over the last 10. BTTS hit in 7 of "
            "their last 10 at Anfield. Crystal Palace travel with two key "
            "players missing but score in 6 of their last 8 away games."
        ),
        "score_text": "Liverpool 3-1 Crystal Palace",
        "summary": "Liverpool dominates at Anfield, logical favourite win.",
        "bet_outcome": "Bet won: Liverpool wins and both teams scored, as predicted.",
    },
    # J2 — May 19, 2026 — ATP Geneva R1
    "2026-05-19": {
        "league": "ATP 250 Geneva — First round",
        "pick": "Bautista Agut to win in exactly 2 sets",
        "headline": (
            "Bautista 7-3 over the last 10, 5 wins on clay, 4 of them in "
            "straight sets. Mannarino struggles on clay (1W this season). "
            "Head-to-head: Bautista leads 4-1, three of those in 2 sets."
        ),
        "score_text": "Bautista Agut def. Mannarino 6-3 7-6",
        "summary": "Bautista solid in 2 sets, decisive breaks at the right moments.",
        "bet_outcome": "Bet won: Bautista Agut won in 2 sets.",
    },
    # J3 — May 20, 2026 — NBA WCF G2
    "2026-05-20": {
        "league": "NBA Western Conference Finals — Game 2",
        "pick": "Thunder to win + Over 215.5 total points",
        "headline": (
            "OKC 7-1 at home in these playoffs, average +9 differential. "
            "SGA averaging 31 pts on 52% FG. G1 totals went over 220. "
            "Wolves' pace suits the over."
        ),
        "score_text": "OKC Thunder 118-104 Minnesota Timberwolves",
        "summary": "SGA 38 pts, OKC leads series 2-0. Wolves outclassed in Q3.",
        "bet_outcome": "Bet won: Thunder won at home, total points 222 (over 215.5).",
    },
    # J4 — May 21, 2026 — UEL Final (LOSS)
    "2026-05-21": {
        "league": "UEFA Europa League — Final (Bilbao)",
        "pick": "Tottenham to win in regulation (90 min)",
        "headline": (
            "Spurs 6-2-2 over the last 10. Stronger underlying numbers in "
            "Europe (xG advantage). Key players available: Son, Maddison, "
            "Romero. High-variance single-leg final — edge is marginal."
        ),
        "score_text": "Manchester United 2-0 Tottenham",
        "summary": "Man United wins thanks to a Højlund double. Spurs neutralised.",
        "bet_outcome": "Bet lost: Tottenham defeated 0-2 in the final.",
    },
    # J5 — May 22, 2026 — WTA Rabat QF
    "2026-05-22": {
        "league": "WTA 250 Rabat — Quarter-final",
        "pick": "Paolini to win + Under 21.5 total games",
        "headline": (
            "Paolini 8-2 over the last 10 (Rome WTA 1000 finalist). "
            "Bouzkova 3-4 on clay this season. Head-to-head: Paolini won "
            "6-3 6-4 at Madrid 2024. Quick clay surface favours short sets."
        ),
        "score_text": "Paolini def. Bouzkova 6-2 6-4",
        "summary": "Paolini controls the match throughout. Strong serving, deep returns.",
        "bet_outcome": "Bet won: Paolini won in 2 sets with 18 total games (under 21.5).",
    },
    # J6 — May 23, 2026 — NBA WCF G3
    "2026-05-23": {
        "league": "NBA Western Conference Finals — Game 3",
        "pick": "Timberwolves to win + Edwards Over 28.5 points",
        "headline": (
            "Wolves 0-2 at home in must-win mode. 35% historic G3 win rate "
            "for teams down 0-2 at home (NBA since 2000). Edwards averages "
            "33 pts at home in these playoffs vs 22 on road. OKC fatigued "
            "after 8 games in 14 days."
        ),
        "score_text": "Minnesota Timberwolves 121-107 OKC Thunder",
        "summary": "Edwards 41 pts, Wolves cut series to 1-2. Dominant from Q2 onward.",
        "bet_outcome": "Bet won: Wolves won at home and Edwards scored 41 (over 28.5).",
    },
    # J7 — May 24, 2026 — Roland Garros R1
    "2026-05-24": {
        "league": "Roland Garros — First round",
        "pick": "Báez to win in exactly 4 sets",
        "headline": (
            "Báez is a clay specialist (4 career titles, all on clay, "
            "Estoril winner in April). Cobolli can take one set with his "
            "serve, but the experience gap on clay favours Báez over the "
            "distance — typical pattern of a 4-set win."
        ),
        "score_text": "Báez def. Cobolli 6-3 4-6 6-2 6-4",
        "summary": "Báez wins in 4 sets after dropping set 2. Clay expertise decisive in close sets.",
        "bet_outcome": "Bet won: Báez won in exactly 4 sets as predicted.",
    },
    # J8 — May 25, 2026 — Roland Garros R1 (LOSS)
    "2026-05-25": {
        "league": "Roland Garros — First round",
        "pick": "Swiatek to win + Under 14.5 total games",
        "headline": (
            "4-time RG champion vs 18-year-old Jones playing her first "
            "main-draw Grand Slam match. Swiatek 28-2 career at Roland "
            "Garros. Defending champion typically wins R1 in straight "
            "sets with low total-game count."
        ),
        "score_text": "Swiatek def. Jones 6-1 6-2 (15 total games)",
        "summary": "Swiatek wins easily as expected BUT total games is 15 (6+1+6+2) → the Under 14.5 leg of the combo fails.",
        "bet_outcome": "Bet lost: Swiatek won (leg 1 OK) but 15 total games > 14.5 (leg 2 failed) → combo lost.",
    },
    # J9 — May 26, 2026 — COMBO 3 legs RG R1
    "2026-05-26": {
        "league": "Roland Garros — First round",
        "pick": "3-leg tennis parlay — Roland Garros R1",
        "headline": (
            "Three convergent favourites at the French Open first round: "
            "all three are clay-court specialists facing opponents weaker "
            "on the surface. Each leg estimated above 80% individually; "
            "combined model probability around 66%."
        ),
        "score_text": "3 legs won out of 3 — Osaka, Darderi, Cerundolo all victorious",
        "summary": "Perfect combo: all 3 RG R1 favourites delivered. Total odds 2.06 honoured.",
        "bet_outcome": "Bet won: 3/3 combo validated, +5.32 EUR net (return 10.32 EUR).",
        "legs": [
            {
                "pick": "Naomi Osaka to win",
                "score_text": "Osaka def. Siegemund 6-2 6-4",
                "summary": "Osaka controls, win in 2 sets.",
                "bet_outcome": "Leg won: Osaka victorious.",
            },
            {
                "pick": "Luciano Darderi to win",
                "score_text": "Darderi def. Ofner 6-4 6-3 6-2",
                "summary": "Darderi solid in 3 sets, dominant clay-courter.",
                "bet_outcome": "Leg won: Darderi victorious in 3 sets.",
            },
            {
                "pick": "Juan Manuel Cerundolo to win",
                "score_text": "Cerundolo def. Fearnley 6-3 6-2 6-4",
                "summary": "Cerundolo, Argentinian clay specialist, dominates. Fearnley outclassed on clay.",
                "bet_outcome": "Leg won: Cerundolo victorious.",
            },
        ],
    },
}


def translate_pick(pick: dict) -> dict:
    """Return a copy of `pick` with English overrides applied where available.

    Looks up TRANSLATIONS by pick['date']. For each available EN string,
    overrides the corresponding FR field. Falls back to original FR if no
    translation is provided.

    Handles combo legs: if `legs` translations are provided, applies them
    in order to the pick's leg list.
    """
    date_key = pick.get("date", "")
    tr = TRANSLATIONS.get(date_key)
    if not tr:
        return pick  # No translation available, return as-is

    out = dict(pick)  # shallow copy
    for field in ("pick", "headline", "league"):
        if field in tr:
            out[field] = tr[field]

    # Translate result fields
    if pick.get("result"):
        out["result"] = dict(pick["result"])
        for field in ("score_text", "summary", "bet_outcome"):
            if field in tr:
                out["result"][field] = tr[field]

    # Translate combo legs
    if pick.get("legs") and tr.get("legs"):
        out["legs"] = []
        for orig_leg, tr_leg in zip(pick["legs"], tr["legs"]):
            new_leg = dict(orig_leg)
            if "pick" in tr_leg:
                new_leg["pick"] = tr_leg["pick"]
            if orig_leg.get("result"):
                new_leg["result"] = dict(orig_leg["result"])
                for field in ("score_text", "summary", "bet_outcome"):
                    if field in tr_leg:
                        new_leg["result"][field] = tr_leg[field]
            out["legs"].append(new_leg)

    return out
