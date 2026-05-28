"""Tests for the NEXBET auto-settlement pipeline.

Covers:
- Parser (settle_rules.parse_pick_label / parse_pick_label_full)
- Rules (settle_rules.apply_rule) per market
- Combo aggregation (auto_settle._aggregate_combo)
- AST round-trip (settle_ast.update_pick_outcome)
- Replay (every settled pick in picks_data — outcome must match)
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
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
    # "Liverpool ML" alone has no regulation qualifier → generic_ml.
    # auto_settle._remap_spec_for_sport remaps to football_ml_regulation
    # when pick.sport == "football".
    assert specs[0].market == "generic_ml"
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
    # "Thunder ML" has no regulation qualifier → generic_ml (F2).
    # auto_settle._remap_spec_for_sport remaps to basket_team_ml when
    # pick.sport == "basketball".
    assert specs[0].market == "generic_ml"
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


# --- F2: sport-aware ML disambiguation ------------------------------------


def test_parse_thunder_bare_ml_is_generic():
    """F2: bare 'Team ML' (no qualifier) must NOT be tagged
    football_ml_regulation — it's generic_ml until auto_settle remaps it
    by pick.sport."""
    spec = parse_pick_label("Thunder ML")
    assert spec.market == "generic_ml"
    assert spec.target == "Thunder"


def test_parse_wolves_bare_ml_is_generic():
    spec = parse_pick_label("Wolves ML")
    assert spec.market == "generic_ml"
    assert spec.target == "Wolves"


def test_parse_tottenham_ml_90min_only_is_regulation():
    """Tightened regex still recognises 'ML 90 min' without parens."""
    spec = parse_pick_label("Tottenham ML 90 min")
    assert spec.market == "football_ml_regulation"
    assert spec.target == "Tottenham"


def test_parse_ml_regulation_alt_phrasing():
    """ML (regulation) and ML (regular time) — both EN forms."""
    s1 = parse_pick_label("Arsenal ML (regulation)")
    s2 = parse_pick_label("Arsenal ML (regular time)")
    assert s1.market == "football_ml_regulation"
    assert s2.market == "football_ml_regulation"


def test_remap_generic_ml_basketball():
    """F2 (d): generic_ml + sport='basketball' → basket_team_ml."""
    from auto_settle import _remap_spec_for_sport

    spec = BetSpec(market="generic_ml", target="Thunder", raw_label="Thunder ML")
    remapped = _remap_spec_for_sport(spec, "basketball")
    assert remapped.market == "basket_team_ml"
    assert remapped.target == "Thunder"


def test_remap_generic_ml_football():
    """F2 (d): generic_ml + sport='football' → football_ml_regulation."""
    from auto_settle import _remap_spec_for_sport

    spec = BetSpec(market="generic_ml", target="Liverpool", raw_label="Liverpool ML")
    remapped = _remap_spec_for_sport(spec, "football")
    assert remapped.market == "football_ml_regulation"


def test_remap_football_ml_regulation_stable():
    """F2: explicit football_ml_regulation is left untouched."""
    from auto_settle import _remap_spec_for_sport

    spec = BetSpec(
        market="football_ml_regulation",
        target="Tottenham",
        raw_label="Tottenham ML 90 min",
    )
    remapped = _remap_spec_for_sport(spec, "football")
    assert remapped.market == "football_ml_regulation"


# --- F12: EN 'in exactly N sets' ------------------------------------------


def test_parse_en_in_exactly_n_sets():
    spec = parse_pick_label("Bautista Agut in exactly 2 sets", lang="en")
    assert spec.market == "tennis_exact_sets"
    assert spec.n_sets == 2
    assert spec.target == "Bautista Agut"


def test_parse_en_in_n_sets_exactly():
    spec = parse_pick_label("Bautista Agut in 2 sets exactly", lang="en")
    assert spec.market == "tennis_exact_sets"
    assert spec.n_sets == 2


# --- F13: tennis_exact_sets with n_sets=None voids -----------------------


def test_rule_exact_sets_n_sets_none_voids():
    spec = BetSpec(market="tennis_exact_sets", target="Báez", n_sets=None)
    score = MatchScore(
        status="final",
        home_team="Báez",
        away_team="Cobolli",
        home_score=3,
        away_score=0,
        set_scores=[(6, 3), (6, 4), (6, 2)],
    )
    assert apply_rule(spec, score) == "void"


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
# 3. Combo aggregation — auto_settle._aggregate_combo
# ============================================================================


def _import_aggregator():
    from auto_settle import _aggregate_combo

    return _aggregate_combo


@pytest.mark.parametrize(
    "legs,expected",
    [
        (["win", "win", "win"], "win"),
        (["win", "win"], "win"),
        (["win", "loss"], "loss"),
        (["loss", "win"], "loss"),
        (["win", "void"], "void"),
        (["loss", "void"], "void"),
        (["void", "void"], "void"),
        (["win", "win", "loss"], "loss"),
        (["win", "loss", "void"], "void"),
    ],
)
def test_combo_aggregate(legs, expected):
    agg = _import_aggregator()
    assert agg(legs) == expected


# ============================================================================
# 4. AST round-trip — settle_ast.update_pick_outcome
# ============================================================================


@pytest.fixture
def temp_picks_data(tmp_path):
    """Copy picks_data.py to a temp dir + return its Path."""
    import shutil

    src = ROOT / "scripts" / "picks_data.py"
    dst = tmp_path / "picks_data.py"
    shutil.copy(src, dst)
    return dst


def test_ast_update_pending_outcome(temp_picks_data):
    from settle_ast import update_pick_outcome

    update_pick_outcome(
        temp_picks_data,
        date="2026-05-28",
        outcome="win",
        result={
            "score_home": "2/2",
            "score_text": "2 sélections gagnées sur 2",
            "summary": "Test summary.",
            "bet_outcome": "Pari gagné test.",
        },
        leg_updates=[
            {
                "outcome": "win",
                "result": {
                    "score_text": "Osaka bat Vekic 6-3 6-2",
                    "summary": "Test leg 1",
                    "bet_outcome": "Jambe gagnée test.",
                },
            },
            {
                "outcome": "win",
                "result": {
                    "score_text": "Rinderknech bat Berrettini 6-4 6-4 6-3",
                    "summary": "Test leg 2",
                    "bet_outcome": "Jambe gagnée test.",
                },
            },
        ],
    )

    import importlib.util

    spec = importlib.util.spec_from_file_location("tmp_pd", temp_picks_data)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    target = next(p for p in mod.PICKS if p["date"] == "2026-05-28")
    assert target["outcome"] == "win"
    assert target["result"]["score_text"] == "2 sélections gagnées sur 2"
    assert target["legs"][0]["outcome"] == "win"
    assert target["legs"][1]["outcome"] == "win"

    j1 = next(p for p in mod.PICKS if p["date"] == "2026-05-18")
    assert j1["outcome"] == "win"
    assert j1["result"]["score_text"] == "Liverpool 3 - 1 Crystal Palace"


def test_ast_update_idempotent(temp_picks_data):
    from settle_ast import update_pick_outcome

    payload = {
        "score_home": "1/1",
        "score_text": "Idempotent test",
        "summary": "Test",
        "bet_outcome": "Test",
    }
    update_pick_outcome(temp_picks_data, "2026-05-28", "win", payload)
    content1 = temp_picks_data.read_text()
    update_pick_outcome(temp_picks_data, "2026-05-28", "win", payload)
    content2 = temp_picks_data.read_text()
    assert content1 == content2


def test_ast_invalid_date_raises(temp_picks_data):
    from settle_ast import update_pick_outcome

    with pytest.raises(ValueError):
        update_pick_outcome(
            temp_picks_data,
            "1900-01-01",
            "win",
            {"score_text": "x", "summary": "x", "bet_outcome": "x"},
        )


# ============================================================================
# 5. Replay tests — canned MatchScore from existing result.score_text
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


# ============================================================================
# 6. auto_settle routing — F1 / F4 / F5 / F6 / F14
# ============================================================================


def test_settle_one_leg_basket_player_prop_no_box_score(monkeypatch):
    """F1: when a basket player prop has no player_points, leg routes to
    no_data (not silent void)."""
    import auto_settle

    fake_score = MatchScore(
        status="final",
        home_team="Minnesota Timberwolves",
        away_team="OKC Thunder",
        home_score=121,
        away_score=107,
        player_points=None,
    )
    monkeypatch.setattr(auto_settle, "_fetch_match_score", lambda *a, **k: fake_score)
    monkeypatch.setattr(auto_settle, "_try_send_admin", lambda *a, **k: None)

    leg = {
        "pick": "Wolves ML + Edwards Over 28.5 pts",
        "sport": "basketball",
        "home_team": "Minnesota Timberwolves",
        "away_team": "OKC Thunder",
        "kickoff": "2026-05-23T22:00:00Z",
    }
    outcome, score, specs, reason = auto_settle._settle_one_leg(leg)
    assert outcome is None
    assert reason == "no_player_box_score"


def test_settle_one_leg_basket_player_prop_with_data(monkeypatch):
    """F1 inverse: player_points present → normal settlement."""
    import auto_settle

    fake_score = MatchScore(
        status="final",
        home_team="Minnesota Timberwolves",
        away_team="OKC Thunder",
        home_score=121,
        away_score=107,
        player_points={"Anthony Edwards": 41},
    )
    monkeypatch.setattr(auto_settle, "_fetch_match_score", lambda *a, **k: fake_score)

    leg = {
        "pick": "Wolves ML + Edwards Over 28.5 pts",
        "sport": "basketball",
        "home_team": "Minnesota Timberwolves",
        "away_team": "OKC Thunder",
        "kickoff": "2026-05-23T22:00:00Z",
    }
    outcome, score, specs, reason = auto_settle._settle_one_leg(leg)
    assert outcome == "win"
    assert reason == "ok"


def test_settle_one_leg_postponed_within_grace(monkeypatch):
    """F4: postponed < 48h → no_data, NOT void."""
    import auto_settle

    now = datetime.now(timezone.utc)
    fake_score = MatchScore(
        status="postponed",
        home_team="Liverpool",
        away_team="Crystal Palace",
        started_at=now,  # postponed just now
    )
    monkeypatch.setattr(auto_settle, "_fetch_match_score", lambda *a, **k: fake_score)

    leg = {
        "pick": "Liverpool ML 90 min",
        "sport": "football",
        "home_team": "Liverpool",
        "away_team": "Crystal Palace",
        "kickoff": now.isoformat().replace("+00:00", "Z"),
    }
    outcome, score, specs, reason = auto_settle._settle_one_leg(leg)
    assert outcome is None
    assert reason == "postponed_grace"


def test_settle_one_leg_postponed_past_grace(monkeypatch):
    """F4: postponed > 48h → goes through apply_rule (returns void)."""
    import auto_settle

    long_ago = datetime.now(timezone.utc) - timedelta(hours=72)
    fake_score = MatchScore(
        status="postponed",
        home_team="Liverpool",
        away_team="Crystal Palace",
        started_at=long_ago,
    )
    monkeypatch.setattr(auto_settle, "_fetch_match_score", lambda *a, **k: fake_score)

    leg = {
        "pick": "Liverpool ML 90 min",
        "sport": "football",
        "home_team": "Liverpool",
        "away_team": "Crystal Palace",
        "kickoff": long_ago.isoformat().replace("+00:00", "Z"),
    }
    outcome, score, specs, reason = auto_settle._settle_one_leg(leg)
    assert outcome == "void"
    assert reason == "ok"


def test_fetch_match_score_ambiguous_returns_none(monkeypatch):
    """F5: multiple candidates → return None (not closest-pick)."""
    import auto_settle

    class FakeSofa:
        def scheduled_events(self, slug, date):
            return [
                {
                    "homeTeam": {"name": "Liverpool"},
                    "awayTeam": {"name": "Crystal Palace"},
                    "startTimestamp": 1700000000,
                },
                {
                    "homeTeam": {"name": "Liverpool FC U21"},
                    "awayTeam": {"name": "Crystal Palace U21"},
                    "startTimestamp": 1700001000,
                },
            ]

    monkeypatch.setattr(auto_settle, "_sofa", lambda: FakeSofa())
    monkeypatch.setattr(auto_settle.time, "sleep", lambda *_: None)

    result = auto_settle._fetch_match_score(
        "Liverpool", "Crystal Palace", "2026-05-18T15:00:00Z", "football"
    )
    assert result is None


def test_event_to_score_football_with_et_omits_regulation(monkeypatch):
    """F6: SofaScore event with ET/pens MUST NOT use 'current' as regulation."""
    import auto_settle

    ev = {
        "status": {"type": "finished"},
        "homeTeam": {"name": "Real Madrid"},
        "awayTeam": {"name": "Liverpool"},
        # 90 min was 1-1; ET added one goal each; pens decided it.
        "homeScore": {"current": 2, "period1": 0, "period2": 1, "extra1": 1, "penalty": 4},
        "awayScore": {"current": 2, "period1": 1, "period2": 0, "extra1": 1, "penalty": 3},
        "startTimestamp": 1700000000,
    }
    score = auto_settle._event_to_score(ev, "football")
    # period1+period2 sum is the regulation result (1-1)
    assert score.regulation_score == (1, 1)


def test_event_to_score_football_et_without_periods_voids_regulation():
    """F6: if ET markers present but period1/period2 absent → reg=None."""
    import auto_settle

    ev = {
        "status": {"type": "finished"},
        "homeTeam": {"name": "Real Madrid"},
        "awayTeam": {"name": "Liverpool"},
        # Only 'current' (which already includes ET) — no period split.
        "homeScore": {"current": 2, "penalty": 4},
        "awayScore": {"current": 2, "penalty": 3},
        "startTimestamp": 1700000000,
    }
    score = auto_settle._event_to_score(ev, "football")
    assert score.regulation_score is None


def test_event_to_score_football_90min_only_uses_current_safe():
    """F6 happy path: no ET markers, no period1/2 → safe fallback to current."""
    import auto_settle

    ev = {
        "status": {"type": "finished"},
        "homeTeam": {"name": "Liverpool"},
        "awayTeam": {"name": "Crystal Palace"},
        "homeScore": {"current": 3},
        "awayScore": {"current": 1},
        "startTimestamp": 1700000000,
    }
    score = auto_settle._event_to_score(ev, "football")
    assert score.regulation_score == (3, 1)


def test_event_to_score_tennis_retirement_word_boundary():
    """F14: 'interrupted' must NOT trigger retired-status (word boundary)."""
    import auto_settle

    ev = {
        "status": {"type": "finished"},
        "homeTeam": {"name": "Player A"},
        "awayTeam": {"name": "Player B"},
        "homeScore": {"current": 1, "period1": 6, "period2": 4},
        "awayScore": {"current": 1, "period1": 4, "period2": 6},
        "startTimestamp": 1700000000,
        "winnerCode": 1,
        "statusDescription": "match was interrupted then finished",
    }
    score = auto_settle._event_to_score(ev, "tennis")
    assert score.status == "final"  # NOT retired


def test_admin_ping_uses_admin_chat_not_public_channel(monkeypatch):
    """F3: _try_send_admin must NOT call publish_telegram.send_message.
    It posts directly to api.telegram.org with TELEGRAM_ADMIN_CHAT_ID."""
    import auto_settle

    # Force the env vars
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "fake-token")
    monkeypatch.setenv("TELEGRAM_ADMIN_CHAT_ID", "12345")
    # If anyone ever re-imports publish_telegram.send_message and tries to
    # call it, fail loudly.
    import publish_telegram

    def _explode(*a, **k):
        raise AssertionError(
            "_try_send_admin must NOT use publish_telegram.send_message"
        )

    monkeypatch.setattr(publish_telegram, "send_message", _explode)

    # Patch the network call so we don't actually hit Telegram.
    sent = {}

    def fake_urlopen(req, timeout=15):
        sent["url"] = req.full_url
        sent["body"] = req.data

        class _R:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return b'{"ok":true}'

        return _R()

    import urllib.request as urlrequest

    monkeypatch.setattr(urlrequest, "urlopen", fake_urlopen)

    auto_settle._try_send_admin("test message")

    assert sent.get("url", "").startswith("https://api.telegram.org/botfake-token/")
    import json as _json

    body = _json.loads(sent["body"].decode("utf-8"))
    assert body["chat_id"] == "12345"


def test_admin_ping_no_admin_chat_falls_back_to_stderr(monkeypatch, capsys):
    """F3: when TELEGRAM_ADMIN_CHAT_ID is unset, fall back to stderr —
    NEVER to the public channel."""
    import auto_settle

    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "fake-token")
    monkeypatch.delenv("TELEGRAM_ADMIN_CHAT_ID", raising=False)

    import publish_telegram

    def _explode(*a, **k):
        raise AssertionError("must not post to public channel as fallback")

    monkeypatch.setattr(publish_telegram, "send_message", _explode)

    auto_settle._try_send_admin("test fallback")
    captured = capsys.readouterr()
    assert "test fallback" in captured.err


def test_write_shadow_report_atomic(tmp_path, monkeypatch):
    """F15: shadow report writes go through a .tmp + os.replace."""
    import auto_settle

    monkeypatch.setattr(auto_settle, "AUTO_DIR", tmp_path)
    report = {"proposed": [{"date": "2026-05-28", "outcome": "win"}], "skipped_unknown": [], "skipped_no_data": []}
    out_path = auto_settle._write_shadow_report(report)
    assert out_path.exists()
    # The .tmp must NOT linger after success.
    assert not out_path.with_suffix(out_path.suffix + ".tmp").exists()
    import json as _json

    assert _json.loads(out_path.read_text())["proposed"][0]["date"] == "2026-05-28"


def test_event_to_score_tennis_retirement_real_ret():
    """F14: a genuine 'ret.' must mark retired."""
    import auto_settle

    ev = {
        "status": {"type": "finished"},
        "homeTeam": {"name": "Player A"},
        "awayTeam": {"name": "Player B"},
        "homeScore": {"current": 1, "period1": 6, "period2": 4},
        "awayScore": {"current": 0, "period1": 4, "period2": 0},
        "startTimestamp": 1700000000,
        "winnerCode": 1,
        "statusDescription": "Player B ret.",
    }
    score = auto_settle._event_to_score(ev, "tennis")
    assert score.status == "retired"


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
