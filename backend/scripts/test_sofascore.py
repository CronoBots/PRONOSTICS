"""Test rapide de l'adapter sofascore.py — à lancer en local.

Le conteneur Claude Code Web bloque sofascore.com via allowlist, donc ce test
ne tourne QUE sur ta machine locale (où tu as accès au net).

Usage :
    cd backend
    python scripts/test_sofascore.py

Couvre les fonctions critiques sur des cas réels :
  - scheduled_events tennis (Roland-Garros 2026-05-26)
  - rankings ATP/WTA
  - search universel ("Sinner")
  - league info Premier League (id=17)
  - standings home/away
  - lineups + win_probability + event_details sur un event RG du jour

Affiche un rapport ✓/✗ + temps d'exécution.
"""

from __future__ import annotations

import asyncio
import sys
import time
from datetime import date
from pathlib import Path

# Permet d'importer app.* depuis backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.adapters import sofascore  # noqa: E402

# IDs Sofascore connus (stables)
PREMIER_LEAGUE_ID = 17
LA_LIGA_ID = 8

TODAY = date(2026, 5, 26)


class Test:
    def __init__(self, name: str):
        self.name = name
        self.ok = False
        self.duration = 0.0
        self.detail = ""

    def __repr__(self) -> str:
        mark = "✓" if self.ok else "✗"
        return f"{mark} [{self.duration:5.2f}s] {self.name:48s} {self.detail}"


async def run(name: str, coro) -> Test:
    t = Test(name)
    t0 = time.perf_counter()
    try:
        result = await coro
        t.duration = time.perf_counter() - t0
        if result is None or (isinstance(result, list | dict) and not result):
            t.detail = "EMPTY (rate-limit ? 403 ? ID inconnu ?)"
        else:
            t.ok = True
            if isinstance(result, list):
                t.detail = f"→ {len(result)} items"
            elif isinstance(result, dict):
                if "results" in result:
                    t.detail = f"→ {len(result['results'])} results"
                else:
                    t.detail = f"→ {len(result)} keys: {list(result.keys())[:3]}…"
            else:
                t.detail = f"→ {type(result).__name__}"
    except Exception as exc:
        t.duration = time.perf_counter() - t0
        t.detail = f"EXC: {type(exc).__name__}: {exc}"
    return t


async def main() -> int:
    tests: list[Test] = []

    print(f"\n=== Test sofascore.py — {TODAY.isoformat()} ===\n")

    # 1. Matchs du jour, par sport
    tennis_today = await run(
        "fetch_scheduled_events(tennis, 2026-05-26)",
        sofascore.fetch_scheduled_events("tennis", TODAY),
    )
    tests.append(tennis_today)

    football_today = await run(
        "fetch_scheduled_events(football, 2026-05-26)",
        sofascore.fetch_scheduled_events("football", TODAY),
    )
    tests.append(football_today)

    # 2. Rankings ATP/WTA
    tests.append(await run("fetch_rankings('atp', 10)", sofascore.fetch_rankings("atp", 10)))
    tests.append(await run("fetch_rankings('wta', 10)", sofascore.fetch_rankings("wta", 10)))

    # 3. Search universel
    tests.append(await run("search_entities('Sinner')", sofascore.search_entities("Sinner")))
    tests.append(await run("search_player_or_team('Sabalenka')", sofascore.search_player_or_team("Sabalenka")))

    # 4. League info + saisons
    tests.append(await run(f"fetch_league_info({PREMIER_LEAGUE_ID})", sofascore.fetch_league_info(PREMIER_LEAGUE_ID)))
    season_id = await sofascore.get_current_season_id(PREMIER_LEAGUE_ID)
    t = Test(f"get_current_season_id({PREMIER_LEAGUE_ID})")
    t.ok = season_id is not None
    t.detail = f"→ {season_id}" if season_id else "EMPTY"
    tests.append(t)

    # 5. Standings (si on a un season_id)
    if season_id:
        tests.append(await run(
            f"fetch_standings(PL, {season_id})",
            sofascore.fetch_standings(PREMIER_LEAGUE_ID, season_id),
        ))
        tests.append(await run(
            f"fetch_standings_home(PL, {season_id})",
            sofascore.fetch_standings_home(PREMIER_LEAGUE_ID, season_id),
        ))
        tests.append(await run(
            f"fetch_top_players_league(PL, {season_id})",
            sofascore.fetch_top_players_league(PREMIER_LEAGUE_ID, season_id),
        ))

    # 6. Drill-down sur un event tennis du jour (si dispo)
    if tennis_today.ok:
        events = tennis_today.detail
        # Le test renvoie juste un compteur, on refait l'appel pour récupérer un event
        evs = await sofascore.fetch_scheduled_events("tennis", TODAY)
        if evs:
            ev_id = evs[0]["event_id"]
            tests.append(await run(f"fetch_event_details({ev_id})", sofascore.fetch_event_details(ev_id)))
            tests.append(await run(f"fetch_win_probability({ev_id})", sofascore.fetch_win_probability(ev_id)))
            tests.append(await run(f"fetch_pregame_form({ev_id})", sofascore.fetch_pregame_form(ev_id)))
            tests.append(await run(f"fetch_match_votes({ev_id})", sofascore.fetch_match_votes(ev_id)))
            tests.append(await run(f"fetch_h2h_events({ev_id})", sofascore.fetch_h2h_events(ev_id)))

    # === Rapport ===
    print()
    for t in tests:
        print(t)

    ok = sum(1 for t in tests if t.ok)
    total = len(tests)
    print(f"\n=== {ok}/{total} tests OK ===\n")
    return 0 if ok == total else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
