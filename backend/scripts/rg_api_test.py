"""Offline tests for rg_api (pure logic only — no network).

Run directly:  python3 rg_api_test.py
Or via pytest: pytest rg_api_test.py
"""

import rg_api as r


def test_parse_beats():
    assert r.parse_label_to_players("Alcaraz bat Sinner") == ("Alcaraz", "Sinner")
    assert r.parse_label_to_players("Sinner beats Zverev") == ("Sinner", "Zverev")
    assert r.parse_label_to_players("Djokovic def. Ruud") == ("Djokovic", "Ruud")


def test_parse_single_winner():
    assert r.parse_label_to_players("Alcaraz vainqueur du match") == ("Alcaraz", None)
    assert r.parse_label_to_players("Sinner gagne en 3 sets") == ("Sinner", None)
    assert r.parse_label_to_players("Gauff wins") == ("Gauff", None)


def test_parse_total_games_slash():
    assert r.parse_label_to_players("Plus de 21.5 jeux — Alcaraz/Sinner") == (
        "Alcaraz",
        "Sinner",
    )
    assert r.parse_label_to_players("Over 21.5 games — Swiatek/Gauff") == (
        "Swiatek",
        "Gauff",
    )


def test_parse_handicap_and_vs():
    assert r.parse_label_to_players("Machac +6.5") == ("Machac", None)
    assert r.parse_label_to_players("Alcaraz vs Sinner") == ("Alcaraz", "Sinner")


def test_parse_empty():
    assert r.parse_label_to_players("") == (None, None)


def test_name_matches_surname_and_accents():
    assert r._name_matches("Alcaraz", "Carlos Alcaraz")
    assert r._name_matches("alcaraz", "Carlos Alcaraz")
    assert r._name_matches("Swiatek", "Iga Świątek")  # accent-insensitive
    assert r._name_matches("De Minaur", "Alex De Minaur")
    assert not r._name_matches("Sinner", "Carlos Alcaraz")


def test_candidate_score():
    match = {"home": {"name": "Carlos Alcaraz"}, "away": {"name": "Jannik Sinner"}}
    assert r._candidate_score(match, "Alcaraz", "Sinner") == 2
    assert r._candidate_score(match, "Sinner", "Alcaraz") == 2  # order-agnostic
    assert r._candidate_score(match, "Alcaraz", None) == 1
    assert r._candidate_score(match, "Alcaraz", "Zverev") == 1  # one side only
    assert r._candidate_score(match, "Nadal", "Federer") == 0


def _sample_match():
    return {
        "id": 42,
        "tour": "atp",
        "home": {"name": "Carlos Alcaraz"},
        "away": {"name": "Jannik Sinner"},
        "winner": "home",
        "status": "finished",
        "start_time": "2026-06-07T13:00:00",
        "home_score": {"sets_won": 3, "sets": [6, 3, 6, 6]},
        "away_score": {"sets_won": 1, "sets": [4, 6, 2, 1]},
    }


def test_map_score():
    out = r._map_score(_sample_match())
    assert out["home"] == "Carlos Alcaraz"
    assert out["winner"] == "home"
    assert out["home_sets"] == 3 and out["away_sets"] == 1
    assert out["sets"] == [[6, 4], [3, 6], [6, 2], [6, 1]]
    assert out["status"] == "finished"
    assert out["source"] == "rg-api"
    assert out["match_id"] == 42


def test_to_match_score_tennis_shape():
    ms = r.to_match_score(_sample_match())
    assert ms.status == "final"
    assert ms.home_team == "Carlos Alcaraz" and ms.away_team == "Jannik Sinner"
    assert ms.home_score == 3 and ms.away_score == 1
    assert ms.set_scores == [(6, 4), (3, 6), (6, 2), (6, 1)]
    assert ms.regulation_score is None and ms.player_points is None
    assert ms.started_at is not None


def test_settle_status_retired_and_postponed():
    assert r._settle_status({"status": "finished"}) == "final"
    assert r._settle_status({"status": "inprogress"}) == "in_progress"
    assert (
        r._settle_status({"status": "finished", "status_description": "Retired"})
        == "retired"
    )
    assert (
        r._settle_status({"status": "notstarted", "status_description": "Walkover"})
        == "walkover"
    )
    assert r._settle_status({"status": "postponed"}) == "postponed"


def test_map_named_markets_is_bookmaker_agnostic():
    odds = {
        "markets": [
            {
                "label": "Match Winner",
                "type": "winner",
                "outcomes": [
                    {"participant": "Carlos Alcaraz", "odds": 1.44},
                    {"participant": "Jannik Sinner", "odds": 2.80},
                ],
            }
        ]
    }
    markets = r._map_named_markets(odds, "Carlos Alcaraz", "Jannik Sinner")
    assert markets == [
        {
            "name": "match_winner",
            "choices": [
                {"name": "home", "decimal": 1.44},
                {"name": "away", "decimal": 2.80},
            ],
        }
    ]
    import json

    assert "unibet" not in json.dumps(markets).lower()  # AB-7


def test_map_generic_markets_winner_mapping():
    odds = {
        "markets": [
            {
                "name": "Full time",
                "choices": [
                    {"name": "1", "decimal": 1.5},
                    {"name": "2", "decimal": 2.6},
                ],
            }
        ]
    }
    markets = r._map_generic_markets(odds, "Carlos Alcaraz", "Jannik Sinner")
    assert markets[0]["name"] == "match_winner"
    assert markets[0]["choices"][0] == {"name": "home", "decimal": 1.5}
    assert markets[0]["choices"][1] == {"name": "away", "decimal": 2.6}


def test_fetch_returns_none_when_no_match(monkeypatch):
    monkeypatch.setattr(r, "get_matches", lambda *a, **k: [])
    assert r.fetch_score("Alcaraz bat Sinner") is None
    assert r.fetch_match_score("Alcaraz bat Sinner") is None
    assert r.fetch_odds("Alcaraz bat Sinner") is None
    assert r.fetch_analysis("Alcaraz bat Sinner") is None


def test_fetch_score_end_to_end(monkeypatch):
    match = _sample_match()
    monkeypatch.setattr(
        r, "get_matches", lambda tour="atp", **k: [match] if tour == "atp" else []
    )
    out = r.fetch_score("Alcaraz bat Sinner")
    assert out["winner"] == "home"
    assert out["match_id"] == 42
    assert out["source"] == "rg-api"

    ms = r.fetch_match_score("Alcaraz bat Sinner")
    assert ms is not None and ms.status == "final"


def _run_all():
    import inspect

    funcs = [
        (n, f)
        for n, f in sorted(globals().items())
        if n.startswith("test_") and inspect.isfunction(f)
    ]

    class _MP:
        def __init__(self):
            self._undo = []

        def setattr(self, obj, name, val):
            self._undo.append((obj, name, getattr(obj, name)))
            setattr(obj, name, val)

        def undo(self):
            for obj, name, old in reversed(self._undo):
                setattr(obj, name, old)
            self._undo.clear()

    passed = 0
    for name, fn in funcs:
        mp = _MP()
        try:
            if "monkeypatch" in inspect.signature(fn).parameters:
                fn(mp)
            else:
                fn()
            passed += 1
            print(f"ok   {name}")
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {name}: {exc!r}")
        finally:
            mp.undo()
    print(f"\n{passed}/{len(funcs)} passed")
    return 0 if passed == len(funcs) else 1


if __name__ == "__main__":
    raise SystemExit(_run_all())
