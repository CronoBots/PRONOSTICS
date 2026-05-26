"""Test de l'adapter sofascore.py — couvre les 3 sports actifs NEXBET v4.6.

Scope strict : TENNIS / FOOTBALL / NBA. Aligné avec sources_catalogue.md.

Le conteneur Claude Code Web bloque sofascore.com via allowlist, donc ce test
ne tourne QUE sur ta machine locale (où tu as accès au net).

Usage :
    cd backend
    python scripts/test_sofascore.py

Couvre :
  - TENNIS : programme RG du jour + rankings ATP/WTA + h2h
  - FOOTBALL : programme du jour + Premier League standings + win_prob/h2h
  - NBA : programme du jour + standings ligue + drill-down event

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
NBA_ID = 132  # unique-tournament NBA

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
        evs = await sofascore.fetch_scheduled_events("tennis", TODAY)
        if evs:
            ev_id = evs[0]["event_id"]
            tests.append(await run(f"fetch_event_details({ev_id})", sofascore.fetch_event_details(ev_id)))
            tests.append(await run(f"fetch_match_votes({ev_id})", sofascore.fetch_match_votes(ev_id)))
            tests.append(await run(f"fetch_h2h_events({ev_id})", sofascore.fetch_h2h_events(ev_id)))
            tests.append(await run(f"fetch_h2h_stats({ev_id})", sofascore.fetch_h2h_stats(ev_id)))
            # Ces endpoints sont principalement foot/basket — peuvent retourner EMPTY pour tennis (normal)
            tests.append(await run(f"fetch_win_probability({ev_id}) [foot/basket only]", sofascore.fetch_win_probability(ev_id)))
            tests.append(await run(f"fetch_pregame_form({ev_id}) [foot/basket only]", sofascore.fetch_pregame_form(ev_id)))

    # 7. Drill-down sur un event football du jour (où win_prob/pregame_form devraient marcher)
    if football_today.ok:
        evs_foot = await sofascore.fetch_scheduled_events("football", TODAY)
        if evs_foot:
            fev_id = evs_foot[0]["event_id"]
            tests.append(await run(f"fetch_win_probability({fev_id}) [foot]", sofascore.fetch_win_probability(fev_id)))
            tests.append(await run(f"fetch_pregame_form({fev_id}) [foot]", sofascore.fetch_pregame_form(fev_id)))
            tests.append(await run(f"fetch_h2h_events({fev_id}) [foot]", sofascore.fetch_h2h_events(fev_id)))

    # =========================================================================
    # 8. NBA — 3e sport actif NEXBET v4.6
    # =========================================================================
    print("\n--- Tests NBA (3e sport actif) ---\n")

    nba_today = await run(
        "fetch_scheduled_events(basketball, 2026-05-26)",
        sofascore.fetch_scheduled_events("basketball", TODAY),
    )
    tests.append(nba_today)

    tests.append(await run("search_entities('LeBron')", sofascore.search_entities("LeBron")))

    # NBA league info + standings
    nba_info = await run(f"fetch_league_info(NBA={NBA_ID})", sofascore.fetch_league_info(NBA_ID))
    tests.append(nba_info)

    nba_season_id = await sofascore.get_current_season_id(NBA_ID)
    t = Test(f"get_current_season_id(NBA={NBA_ID})")
    t.ok = nba_season_id is not None
    t.detail = f"→ {nba_season_id}" if nba_season_id else "EMPTY"
    tests.append(t)

    if nba_season_id:
        tests.append(await run(
            f"fetch_standings(NBA, {nba_season_id})",
            sofascore.fetch_standings(NBA_ID, nba_season_id),
        ))
        tests.append(await run(
            f"fetch_top_players_league(NBA, {nba_season_id})",
            sofascore.fetch_top_players_league(NBA_ID, nba_season_id),
        ))

    # Drill-down NBA si match du jour
    if nba_today.ok:
        evs_nba = await sofascore.fetch_scheduled_events("basketball", TODAY)
        if evs_nba:
            # Préfère un event NBA (tournament id 132) si dispo, sinon premier match
            nba_evs = [e for e in evs_nba if e.get("tournament_id") == NBA_ID]
            target = (nba_evs[0] if nba_evs else evs_nba[0])
            nev_id = target["event_id"]
            tag = "[NBA]" if target.get("tournament_id") == NBA_ID else "[basket non-NBA]"
            tests.append(await run(f"fetch_event_details({nev_id}) {tag}", sofascore.fetch_event_details(nev_id)))
            tests.append(await run(f"fetch_win_probability({nev_id}) {tag}", sofascore.fetch_win_probability(nev_id)))
            tests.append(await run(f"fetch_h2h_events({nev_id}) {tag}", sofascore.fetch_h2h_events(nev_id)))

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
