"""Tests for the NEXBET auto-settlement pipeline.

Covers:
- Parser (settle_rules.parse_pick_label / parse_pick_label_full)
- Rules (settle_rules.apply_rule) per market
- Replay (every settled pick in picks_data — outcome must match)

AST round-trip + combo aggregation tests are added in subsequent
commits as settle_ast.py and auto_settle.py land.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from settle_rules import (  # noqa: E402
    BetSpec,
    MatchScore,
    apply_rule,
    parse_pick_label,
    parse_pick_label_full,
)


# ============================================================================
# 1. Parser tests — every label currently in picks_data.py
# ============================================================================


def test_parse_compound_ml_btts_fr():
    specs = parse_pick_label_full(
        "Liverpool ML + Both Teams To Score (combo simple maison)"
    )
    assert len(specs) == 2
    assert specs[0].market == "football_ml_regulation"
    assert specs[0].target == "Liverpool"
    assert specs[1].market == "football_btts"


def test_parse_compound_ml_btts_en():
    specs = parse_pick_label_full("Liverpool to win + Both Teams to Score", lang="en")
    assert len(specs) == 2
    assert specs[0].market in {"tennis_match_winner", "football_ml_regulation"}
    assert specs[0].target == "Liverpool"
    assert specs[1].market == "football_btts"


def test_parse_bautista_exact_sets():
    spec = parse_pick_label("Bautista Agut vainqueur en 2 sets exactement")
    assert spec.market == "tennis_exact_sets"
    assert spec.target == "Bautista Agut"
    assert spec.n_sets == 2


def test_parse_baez_exact_4_sets():
    spec = parse_pick_label("Báez vainqueur en 4 sets exactement")
    assert spec.market == "tennis_exact_sets"
    assert spec.target == "Báez"
    assert spec.n_sets == 4


def test_parse_thunder_ml_plus_over():
    specs = parse_pick_label_full("Thunder ML + Over 215.5 total points (combo)")
    assert len(specs) == 2
    assert specs[0].target == "Thunder"
    assert specs[0].market in {"tennis_match_winner", "football_ml_regulation"}
    assert specs[1].market == "basket_total_points"
    assert specs[1].direction == "over"
    assert specs[1].threshold == 215.5


def test_parse_tottenham_ml_regulation():
    spec = parse_pick_label("Tottenham ML 90 min (temps réglementaire)")
    assert spec.market == "football_ml_regulation"
    assert spec.target == "Tottenham"


def test_parse_paolini_winner_plus_under_games():
    specs = parse_pick_label_full("Paolini vainqueure + Under 21.5 jeux totaux")
    assert len(specs) == 2
    assert specs[0].market == "tennis_match_winner"
    assert specs[0].target == "Paolini"
    assert specs[1].market == "tennis_total_games"
    assert specs[1].direction == "under"
    assert specs[1].threshold == 21.5


def test_parse_wolves_ml_plus_player_prop():
    specs = parse_pick_label_full("Wolves ML + Edwards Over 28.5 pts")
    assert len(specs) == 2
    assert specs[0].target == "Wolves"
    assert specs[1].market == "basket_player_points"
    assert specs[1].direction == "over"
    assert specs[1].threshold == 28.5
    assert specs[1].extra.get("player") == "Edwards"


def test_parse_swiatek_winner_under_games():
    specs = parse_pick_label_full("Swiatek vainqueure + Under 14.5 jeux totaux")
    assert len(specs) == 2
    assert specs[0].market == "tennis_match_winner"
    assert specs[0].target == "Swiatek"
    assert specs[1].market == "tennis_total_games"
    assert specs[1].threshold == 14.5
    assert specs[1].direction == "under"


def test_parse_osaka_winner_fr():
    spec = parse_pick_label("Naomi Osaka vainqueur du match")
    assert spec.market == "tennis_match_winner"
    assert spec.target == "Naomi Osaka"


def test_parse_bencic_winner_fem():
    spec = parse_pick_label("Belinda Bencic vainqueure du match")
    assert spec.market == "tennis_match_winner"
    assert spec.target == "Belinda Bencic"


def test_parse_rublev_winner_fr():
    spec = parse_pick_label("Andrey Rublev vainqueur du match")
    assert spec.market == "tennis_match_winner"
    assert spec.target == "Andrey Rublev"


def test_parse_en_to_win():
    spec = parse_pick_label("Belinda Bencic to win", lang="en")
    assert spec.market == "tennis_match_winner"
    assert spec.target == "Belinda Bencic"


def test_parse_en_in_2_sets():
    # The JS source regex matches "in N sets exactly" — NOT "in exactly N sets".
    # The EN translations file uses "in exactly N sets", which is a known gap
    # in the original parser. The convention we port is the JS one verbatim.
    spec = parse_pick_label("Bautista Agut in 2 sets", lang="en")
    assert spec.market == "tennis_exact_sets"
    assert spec.n_sets == 2


def test_parse_btts_standalone():
    spec = parse_pick_label("Both Teams To Score")
    assert spec.market == "football_btts"


def test_parse_unknown_market():
    spec = parse_pick_label("complete gibberish nonsense")
    # Falls through to ML pattern catching nothing, then unknown
    assert spec.market in {"unknown", "tennis_match_winner"}


# ============================================================================
# 2. Rule tests — per market
# ============================================================================


# --- tennis_match_winner ---------------------------------------------------


def test_rule_tennis_ml_win():
    spec = BetSpec(market="tennis_match_winner", target="Osaka")
    score = MatchScore(
        status="final",
        home_team="Siegemund",
        away_team="Osaka",
        home_score=0,
        away_score=2,
        set_scores=[(2, 6), (4, 6)],
    )
    assert apply_rule(spec, score) == "win"


def test_rule_tennis_ml_loss():
    spec = BetSpec(market="tennis_match_winner", target="Siegemund")
    score = MatchScore(
        status="final",
        home_team="Siegemund",
        away_team="Osaka",
        home_score=0,
        away_score=2,
        set_scores=[(2, 6), (4, 6)],
    )
    assert apply_rule(spec, score) == "loss"


def test_rule_tennis_ml_retired_set1_void():
    spec = BetSpec(market="tennis_match_winner", target="Osaka")
    score = MatchScore(
        status="retired",
        home_team="Siegemund",
        away_team="Osaka",
        set_scores=None,
    )
    assert apply_rule(spec, score) == "void"


def test_rule_tennis_ml_retired_set3_advancer_wins():
    spec = BetSpec(market="tennis_match_winner", target="Osaka")
    score = MatchScore(
        status="retired",
        home_team="Siegemund",
        away_team="Osaka",
        home_score=0,
        away_score=2,
        set_scores=[(2, 6), (4, 6)],
    )
    assert apply_rule(spec, score) == "win"


# --- tennis_exact_sets -----------------------------------------------------


def test_rule_exact_sets_win():
    spec = BetSpec(market="tennis_exact_sets", target="Bautista", n_sets=2)
    score = MatchScore(
        status="final",
        home_team="Bautista Agut",
        away_team="Mannarino",
        home_score=2,
        away_score=0,
        set_scores=[(6, 3), (7, 6)],
    )
    assert apply_rule(spec, score) == "win"


def test_rule_exact_sets_off_by_one_loss():
    spec = BetSpec(market="tennis_exact_sets", target="Báez", n_sets=4)
    score = MatchScore(
        status="final",
        home_team="Báez",
        away_team="Cobolli",
        home_score=3,
        away_score=0,
        set_scores=[(6, 3), (6, 4), (6, 2)],
    )
    assert apply_rule(spec, score) == "loss"


def test_rule_exact_sets_retired_void():
    spec = BetSpec(market="tennis_exact_sets", target="Báez", n_sets=4)
    score = MatchScore(
        status="retired",
        home_team="Báez",
        away_team="Cobolli",
        home_score=2,
        away_score=0,
        set_scores=[(6, 3), (6, 4)],
    )
    assert apply_rule(spec, score) == "void"


# --- tennis_total_games ----------------------------------------------------


def test_rule_total_games_over_wins():
    spec = BetSpec(market="tennis_total_games", direction="over", threshold=21.5)
    score = MatchScore(
        status="final",
        home_team="A",
        away_team="B",
        set_scores=[(7, 6), (6, 4)],
    )
    assert apply_rule(spec, score) == "win"


def test_rule_total_games_under_wins():
    spec = BetSpec(market="tennis_total_games", direction="under", threshold=21.5)
    score = MatchScore(
        status="final",
        home_team="A",
        away_team="B",
        set_scores=[(6, 2), (6, 4)],
    )
    assert apply_rule(spec, score) == "win"


def test_rule_total_games_exact_void():
    spec = BetSpec(market="tennis_total_games", direction="over", threshold=14.0)
    score = MatchScore(
        status="final",
        home_team="A",
        away_team="B",
        set_scores=[(6, 1), (6, 1)],
    )
    assert apply_rule(spec, score) == "void"


def test_rule_total_games_retired_void():
    spec = BetSpec(market="tennis_total_games", direction="under", threshold=21.5)
    score = MatchScore(
        status="retired",
        home_team="A",
        away_team="B",
        set_scores=[(6, 2)],
    )
    assert apply_rule(spec, score) == "void"


# --- football_ml_regulation ------------------------------------------------


def test_rule_football_ml_home_win():
    spec = BetSpec(market="football_ml_regulation", target="Liverpool")
    score = MatchScore(
        status="final",
        home_team="Liverpool",
        away_team="Crystal Palace",
        regulation_score=(3, 1),
        home_score=3,
        away_score=1,
    )
    assert apply_rule(spec, score) == "win"


def test_rule_football_ml_away_win():
    spec = BetSpec(market="football_ml_regulation", target="Tottenham")
    score = MatchScore(
        status="final",
        home_team="Manchester United",
        away_team="Tottenham",
        regulation_score=(2, 0),
    )
    assert apply_rule(spec, score) == "loss"


def test_rule_football_ml_draw_both_lose():
    spec_home = BetSpec(market="football_ml_regulation", target="Liverpool")
    spec_away = BetSpec(market="football_ml_regulation", target="Crystal Palace")
    score = MatchScore(
        status="final",
        home_team="Liverpool",
        away_team="Crystal Palace",
        regulation_score=(1, 1),
    )
    assert apply_rule(spec_home, score) == "loss"
    assert apply_rule(spec_away, score) == "loss"


# --- football_btts ---------------------------------------------------------


def test_rule_btts_00_loss():
    spec = BetSpec(market="football_btts")
    score = MatchScore(
        status="final",
        home_team="A",
        away_team="B",
        regulation_score=(0, 0),
    )
    assert apply_rule(spec, score) == "loss"


def test_rule_btts_10_loss():
    spec = BetSpec(market="football_btts")
    score = MatchScore(
        status="final",
        home_team="A",
        away_team="B",
        regulation_score=(1, 0),
    )
    assert apply_rule(spec, score) == "loss"


def test_rule_btts_21_win():
    spec = BetSpec(market="football_btts")
    score = MatchScore(
        status="final",
        home_team="A",
        away_team="B",
        regulation_score=(2, 1),
    )
    assert apply_rule(spec, score) == "win"


# --- basket_team_ml --------------------------------------------------------


def test_rule_basket_ml_ot_win():
    spec = BetSpec(market="basket_team_ml", target="Thunder")
    score = MatchScore(
        status="final",
        home_team="OKC Thunder",
        away_team="Minnesota Timberwolves",
        home_score=118,
        away_score=104,
    )
    assert apply_rule(spec, score) == "win"


# --- basket_total_points ---------------------------------------------------


def test_rule_basket_total_over():
    spec = BetSpec(market="basket_total_points", direction="over", threshold=215.5)
    score = MatchScore(
        status="final",
        home_team="OKC",
        away_team="MIN",
        home_score=118,
        away_score=104,
    )
    assert apply_rule(spec, score) == "win"


def test_rule_basket_total_under():
    spec = BetSpec(market="basket_total_points", direction="under", threshold=230.0)
    score = MatchScore(
        status="final",
        home_team="OKC",
        away_team="MIN",
        home_score=110,
        away_score=109,
    )
    assert apply_rule(spec, score) == "win"


def test_rule_basket_total_exact_void():
    spec = BetSpec(market="basket_total_points", direction="over", threshold=220.0)
    score = MatchScore(
        status="final",
        home_team="A",
        away_team="B",
        home_score=110,
        away_score=110,
    )
    assert apply_rule(spec, score) == "void"


# --- basket_player_points --------------------------------------------------


def test_rule_player_props_present():
    spec = BetSpec(
        market="basket_player_points",
        direction="over",
        threshold=28.5,
        extra={"player": "Edwards"},
    )
    score = MatchScore(
        status="final",
        home_team="MIN",
        away_team="OKC",
        home_score=121,
        away_score=107,
        player_points={"Anthony Edwards": 41},
    )
    assert apply_rule(spec, score) == "win"


def test_rule_player_props_absent_voids():
    spec = BetSpec(
        market="basket_player_points",
        direction="over",
        threshold=28.5,
        extra={"player": "Edwards"},
    )
    score = MatchScore(
        status="final",
        home_team="MIN",
        away_team="OKC",
        home_score=100,
        away_score=99,
        player_points=None,
    )
    assert apply_rule(spec, score) == "void"


# ============================================================================
# 3. Replay tests — canned MatchScore from existing result.score_text
# ============================================================================


REPLAY_CASES = [
    (
        "2026-05-18",
        [
            BetSpec(market="football_ml_regulation", target="Liverpool"),
            BetSpec(market="football_btts"),
        ],
        MatchScore(
            status="final",
            home_team="Liverpool",
            away_team="Crystal Palace",
            regulation_score=(3, 1),
        ),
        "win",
    ),
    (
        "2026-05-19",
        [BetSpec(market="tennis_exact_sets", target="Bautista Agut", n_sets=2)],
        MatchScore(
            status="final",
            home_team="Roberto Bautista Agut",
            away_team="Adrian Mannarino",
            home_score=2,
            away_score=0,
            set_scores=[(6, 3), (7, 6)],
        ),
        "win",
    ),
    (
        "2026-05-20",
        [
            BetSpec(market="basket_team_ml", target="Thunder"),
            BetSpec(
                market="basket_total_points", direction="over", threshold=215.5
            ),
        ],
        MatchScore(
            status="final",
            home_team="Oklahoma City Thunder",
            away_team="Minnesota Timberwolves",
            home_score=118,
            away_score=104,
        ),
        "win",
    ),
    (
        "2026-05-21",
        [BetSpec(market="football_ml_regulation", target="Tottenham")],
        MatchScore(
            status="final",
            home_team="Manchester United",
            away_team="Tottenham Hotspur",
            regulation_score=(2, 0),
        ),
        "loss",
    ),
    (
        "2026-05-22",
        [
            BetSpec(market="tennis_match_winner", target="Paolini"),
            BetSpec(
                market="tennis_total_games", direction="under", threshold=21.5
            ),
        ],
        MatchScore(
            status="final",
            home_team="Jasmine Paolini",
            away_team="Marie Bouzkova",
            home_score=2,
            away_score=0,
            set_scores=[(6, 2), (6, 4)],
        ),
        "win",
    ),
    (
        "2026-05-23",
        [
            BetSpec(market="basket_team_ml", target="Wolves"),
            BetSpec(
                market="basket_player_points",
                direction="over",
                threshold=28.5,
                extra={"player": "Edwards"},
            ),
        ],
        MatchScore(
            status="final",
            home_team="Minnesota Timberwolves",
            away_team="OKC Thunder",
            home_score=121,
            away_score=107,
            player_points={"Anthony Edwards": 41},
        ),
        "win",
    ),
    (
        "2026-05-24",
        [BetSpec(market="tennis_exact_sets", target="Báez", n_sets=4)],
        MatchScore(
            status="final",
            home_team="Sebastian Báez",
            away_team="Flavio Cobolli",
            home_score=3,
            away_score=1,
            set_scores=[(6, 3), (4, 6), (6, 2), (6, 4)],
        ),
        "win",
    ),
    (
        "2026-05-25",
        [
            BetSpec(market="tennis_match_winner", target="Swiatek"),
            BetSpec(
                market="tennis_total_games", direction="under", threshold=14.5
            ),
        ],
        MatchScore(
            status="final",
            home_team="Iga Swiatek",
            away_team="Emerson Jones",
            home_score=2,
            away_score=0,
            set_scores=[(6, 1), (6, 2)],
        ),
        "loss",
    ),
]


@pytest.mark.parametrize("date,specs,score,expected", REPLAY_CASES)
def test_replay_single_pick(date, specs, score, expected):
    outcomes = [apply_rule(s, score) for s in specs]
    if all(o == "win" for o in outcomes):
        agg = "win"
    elif any(o == "void" for o in outcomes):
        agg = "void"
    else:
        agg = "loss"
    assert agg == expected, f"{date}: {outcomes} aggregated to {agg}, expected {expected}"


def test_replay_j9_combo():
    specs = [
        BetSpec(market="tennis_match_winner", target="Osaka"),
        BetSpec(market="tennis_match_winner", target="Darderi"),
        BetSpec(market="tennis_match_winner", target="Cerundolo"),
    ]
    scores = [
        MatchScore(
            status="final",
            home_team="Laura Siegemund",
            away_team="Naomi Osaka",
            home_score=0,
            away_score=2,
            set_scores=[(2, 6), (4, 6)],
        ),
        MatchScore(
            status="final",
            home_team="Sebastian Ofner",
            away_team="Luciano Darderi",
            home_score=0,
            away_score=3,
            set_scores=[(4, 6), (3, 6), (2, 6)],
        ),
        MatchScore(
            status="final",
            home_team="Jacob Fearnley",
            away_team="Juan Manuel Cerundolo",
            home_score=0,
            away_score=3,
            set_scores=[(3, 6), (2, 6), (4, 6)],
        ),
    ]
    outcomes = [apply_rule(s, sc) for s, sc in zip(specs, scores)]
    assert outcomes == ["win", "win", "win"]


def test_replay_j10_combo():
    specs = [
        BetSpec(market="tennis_match_winner", target="Belinda Bencic"),
        BetSpec(market="tennis_match_winner", target="Andrey Rublev"),
    ]
    scores = [
        MatchScore(
            status="final",
            home_team="Belinda Bencic",
            away_team="Caty McNally",
            home_score=2,
            away_score=0,
            set_scores=[(6, 4), (6, 0)],
        ),
        MatchScore(
            status="final",
            home_team="Andrey Rublev",
            away_team="Camilo Ugo Carabelli",
            home_score=3,
            away_score=0,
            set_scores=[(6, 1), (6, 3), (6, 4)],
        ),
    ]
    outcomes = [apply_rule(s, sc) for s, sc in zip(specs, scores)]
    assert outcomes == ["win", "win"]
