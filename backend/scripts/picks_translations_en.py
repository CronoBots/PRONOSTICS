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
        "home_country": "ESP",
        "away_country": "FRA",
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
        "home_country": "ITA",
        "away_country": "CZE",
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
        "home_country": "ARG",
        "away_country": "ITA",
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
        "home_country": "POL",
        "away_country": "AUS",
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
    # J10 — May 27, 2026 — COMBO 2 legs RG R2 (Bencic + Rublev) — WON
    "2026-05-27": {
        "league": "Roland Garros — Second round",
        "pick": "2-leg tennis parlay — Roland Garros R2",
        "headline": (
            "Two dominant favourites at Roland Garros second round. "
            "Bencic (#11 WTA) faces McNally (#63), who is playing her "
            "first RG main draw with a 9-11 Grand Slam record. Rublev "
            "(#15 ATP) faces Carabelli (#59), leading H2H 1-0 with a "
            "straight-sets win on clay. Combined model probability "
            "around 66%."
        ),
        "score_text": "2 legs won out of 2 — Bencic and Rublev both victorious",
        "summary": "Perfect combo: Bencic 2-0 and Rublev 3-0. Combined odds 1.66 honoured.",
        "bet_outcome": "Bet won: 2/2 combo validated, +3.30 EUR net (return 8.30 EUR).",
        "legs": [
            {
                "pick": "Belinda Bencic to win",
                "home_country": "SUI",
                "away_country": "USA",
                "score_text": "Bencic def. McNally 6-4 6-0",
                "summary": "Bencic dominant, win in 2 sets.",
                "bet_outcome": "Leg won: Bencic victorious in 2 sets.",
            },
            {
                "pick": "Andrey Rublev to win",
                "home_country": "RUS",
                "away_country": "ARG",
                "score_text": "Rublev def. Carabelli 6-1 6-3 6-4",
                "summary": "Rublev solid in 3 sets, ranking gap confirmed.",
                "bet_outcome": "Leg won: Rublev victorious in 3 sets.",
            },
        ],
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
                "home_country": "GER",
                "away_country": "JPN",
                "score_text": "Osaka def. Siegemund 6-2 6-4",
                "summary": "Osaka controls, win in 2 sets.",
                "bet_outcome": "Leg won: Osaka victorious.",
            },
            {
                "pick": "Luciano Darderi to win",
                "home_country": "AUT",
                "away_country": "ITA",
                "score_text": "Darderi def. Ofner 6-4 6-3 6-2",
                "summary": "Darderi solid in 3 sets, dominant clay-courter.",
                "bet_outcome": "Leg won: Darderi victorious in 3 sets.",
            },
            {
                "pick": "Juan Manuel Cerundolo to win",
                "home_country": "GBR",
                "away_country": "ARG",
                "score_text": "Cerundolo def. Fearnley 6-3 6-2 6-4",
                "summary": "Cerundolo, Argentinian clay specialist, dominates. Fearnley outclassed on clay.",
                "bet_outcome": "Leg won: Cerundolo victorious.",
            },
        ],
    },
    # J11 — May 28, 2026 — COMBO 2 legs RG R2 Day 5 (Osaka + Rinderknech) — PENDING
    "2026-05-28": {
        "league": "Roland Garros — Second round",
        "pick": "2-leg tennis parlay — Roland Garros R2 Day 5",
        "headline": (
            "Day 5 RG combo: two clay-court favourites with value on "
            "the 2.38 combined price. Osaka (4× Grand Slam champion) "
            "faces Vekic with a clean 1-0 H2H and a stylistic edge on "
            "clay. Rinderknech (ATP #25, home favourite) takes on "
            "Berrettini (ATP #105, returning from injuries) in the "
            "Chatrier night session — crowd factor expected to tip "
            "the scales. Combined model probability ~43%."
        ),
        "legs": [
            {
                "pick": "Naomi Osaka to win",
                "home_country": "CRO",
                "away_country": "JPN",
                "score_text": "Osaka def. Vekic 7-6 6-4",
                "summary": "Osaka solid in 2 sets on Chatrier.",
                "bet_outcome": "Selection won: Osaka victorious.",
            },
            {
                "pick": "Arthur Rinderknech to win",
                "home_country": "FRA",
                "away_country": "ITA",
                "score_text": "Berrettini def. Rinderknech 6-4 6-4 6-4",
                "summary": "Berrettini too consistent on serve, Rinder outclassed in the night session.",
                "bet_outcome": "Selection lost: Rinderknech beaten in straight sets.",
            },
        ],
        "score_text": "1 selection won out of 2 — Osaka OK, Rinderknech lost",
        "summary": "Combo lost: Osaka def. Vekic 7-6 6-4 (leg 1 OK), Berrettini def. Rinderknech 6-4 6-4 6-4 (leg 2 missed).",
        "bet_outcome": "Bet lost: combo 1/2 (at least one selection missed). Net -7.61 EUR.",
    },
    # J12 — May 29, 2026 — COMBO RG R3 alternative markets (pending)
    "2026-05-29": {
        "league": "Roland Garros — Third round",
        "pick": "2-leg tennis parlay — Roland Garros R3 (alternative markets)",
        "headline": (
            "Pivot from match winners (value killed post-Sinner upset) "
            "to alternative markets. De Minaur Set Handicap -1.5 (wins "
            "3-0 or 3-1 — backed by H2H 5-0 + walkover R2 vs Mensik's "
            "7h cumulative) combined with Andreeva 2-0 straight sets "
            "(H2H 4-0, never went 3 sets). Combined model probability "
            "~54.6%, edge +18% on combined odds 2.16."
        ),
        "rationale": [
            "## 🎯 The context",
            "Day 6 of Roland Garros 2026, third round. Strategic pivot: match-winner odds collapsed this morning (Andreeva 1.14, De Minaur 1.25, combo @ 1.42 = NEGATIVE EV) after yesterday's Sinner upset. We shift to alternative markets where value remains.",
            "2-selection combo (AB-4 v4.7: no 3+ selections) at combined odds 2.16 with estimated joint probability 54.6%.",
            "## 📊 Analysis of the 2 selections",
            "**Selection 1 — Alex de Minaur (Australian, ATP #7) Set Handicap -1.5 @ 1.49** vs Jakub Mensik (ATP #21). Set handicap -1.5 = deM must win 3-0 or 3-1 (best-of-5). Head-to-head 5-0 deM, and massive physical gap: deM received an R2 walkover (so 1h52 cumulative total), Mensik played a 5-setter in R2 (~7h cumulative). Model deM 80% match win (Dimers). Estimate deM -1.5 sets ~70% (Mensik can steal 1 set on his serve but 2 = unlikely).",
            "**Selection 2 — Mirra Andreeva (Russian, WTA #8, 19 years old) Set Betting 2-0 @ 1.45** vs Marie Bouzkova (WTA #27). Andreeva head-to-head 4-0 vs Bouzkova, and **none of their 4 matches went 3 sets** — strong empirical signal. Andreeva on fire on clay (17 clay wins in 2026, Madrid final, Stuttgart SF, Rome QF). Estimate Andreeva 2-0 ~78%.",
            "## 🎰 The bet",
            "2 selections at 1.49 × 1.45 = **combined odds 2.16** (Unibet).",
            "Estimated joint probability: 0.70 × 0.78 ≈ 0.546 → calculated edge +18% on the 2.16 line.",
            "Stake: 5€ — potential gain +5.80€ if validated (return 10.80€).",
            "Risk: if deM 0-2 drops 2 sets OR Andreeva goes to 3 sets, the whole combo loses. AB-7 (tennis R2+ fatigue): signal favourable for deM (R2 walkover), neutral for Andreeva.",
            "## 🚨 Anti-bias checks applied",
            "AB-4: 2 legs maximum ✅",
            "AB-7: R2 fatigue flag — deM clear advantage (walkover) ✅",
            "AB-9: no player already engaged in a pending bet ✅",
        ],
        "legs": [
            {
                "pick": "Alex de Minaur Set Handicap -1.5 (wins 3-0 or 3-1)",
                "home_country": "AUS",
                "away_country": "CZE",
            },
            {
                "pick": "Mirra Andreeva to win in straight sets (2-0)",
                "home_country": "RUS",
                "away_country": "CZE",
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
    for field in ("pick", "headline", "league", "home_country", "away_country", "rationale"):
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
            for field in ("pick", "home_country", "away_country"):
                if field in tr_leg:
                    new_leg[field] = tr_leg[field]
            if orig_leg.get("result"):
                new_leg["result"] = dict(orig_leg["result"])
                for field in ("score_text", "summary", "bet_outcome"):
                    if field in tr_leg:
                        new_leg["result"][field] = tr_leg[field]
            out["legs"].append(new_leg)

    return out
