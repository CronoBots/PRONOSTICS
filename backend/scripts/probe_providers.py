#!/usr/bin/env python3
"""Probe sports data providers from a GitHub Actions runner.

Goal: identify which provider(s) return real data from a runner's
cloud IP (vs being blocked by Cloudflare or IP-deny lists).

Runs each probe with a strict 10s timeout. Prints a one-line verdict
per provider so the operator can pick a winner.
"""
from __future__ import annotations

import json
import sys
import urllib.request
import urllib.error

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def _get(url: str, headers: dict | None = None) -> tuple[int, str, dict | str | None]:
    h = {"User-Agent": UA, "Accept": "application/json, text/plain, */*"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body_bytes = r.read()  # FULL body — was truncated at 4000B before
            body_str = body_bytes.decode("utf-8", errors="replace")
            try:
                return r.status, "ok", json.loads(body_str)
            except json.JSONDecodeError:
                return r.status, "ok-not-json", body_str[:300]
    except urllib.error.HTTPError as e:
        return e.code, f"http-error", str(e)
    except urllib.error.URLError as e:
        return -1, "url-error", str(e)
    except Exception as e:
        return -2, "exception", repr(e)


PROBES = [
    # (name, url, what-to-look-for)
    ("sofascore-tennis", "https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/2026-05-28"),
    ("espn-tennis-atp", "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=20260528"),
    ("espn-tennis-wta", "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?dates=20260528"),
    ("espn-nba",        "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"),
    ("espn-soccer-uefa","https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard"),
    ("thesportsdb-free-tennis", "https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=2026-05-28&s=tennis"),
    ("thesportsdb-free-nba",    "https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=2026-05-28&s=basketball"),
    ("wikipedia-rg2026", "https://en.wikipedia.org/api/rest_v1/page/summary/2026_French_Open"),
    ("flashscore-html", "https://www.flashscore.com/tennis/atp-singles/french-open/"),
    ("livescore-tennis","https://www.livescores.com/tennis/"),
    ("tennislive-api",  "https://api.tennis-live.org/v1/matches?date=2026-05-28"),
    ("openligadb",      "https://api.openligadb.de/getbltable/bl1/2025"),
]


def main() -> int:
    print(f"{'PROVIDER':<32} {'STATUS':<8} {'NOTE'}")
    print("=" * 80)
    for name, url in PROBES:
        code, status, payload = _get(url)
        note = ""
        if isinstance(payload, dict):
            keys = list(payload.keys())[:5]
            count = (
                len(payload.get("events", []))
                if isinstance(payload.get("events"), list)
                else None
            )
            note = f"keys={keys} events={count}" if count is not None else f"keys={keys}"
        elif isinstance(payload, str):
            note = payload[:120].replace("\n", " ")
        print(f"{name:<32} {code:<8} {note}")

    # ========================================================================
    # DEEP DIVE — for any tennis endpoint that returns events, dump the
    # actual event list so we can see WHAT ESPN considers a match on this
    # date, and whether player names match what we have in picks_data.py.
    # ========================================================================
    print("\n" + "=" * 80)
    print("DEEP DIVE — tennis on 2026-05-28 (target: Osaka, Vekic, Rinderknech, Berrettini)")
    print("=" * 80)
    for tour in ("atp", "wta"):
        for date in ("20260528",):
            url = f"https://site.api.espn.com/apis/site/v2/sports/tennis/{tour}/scoreboard?dates={date}"
            code, status, payload = _get(url)
            if not isinstance(payload, dict):
                print(f"  {tour} {date}: status={code} payload-type={type(payload).__name__}")
                continue
            events = payload.get("events", [])
            print(f"\n  {tour.upper()} {date}: {len(events)} events")
            for ev in events:
                print(f"    EVENT name={ev.get('name','?')!r} date={ev.get('date','?')!r}")
                groupings = ev.get("groupings") or []
                print(f"    GROUPINGS count: {len(groupings)}")
                for gi, g in enumerate(groupings):
                    gname = (g.get("grouping") or {}).get("displayName", "?")
                    comps = g.get("competitions") or []
                    print(f"      [g{gi}] {gname!r} — {len(comps)} competitions")
                    # Show date range across competitions
                    dates_seen = sorted(set((c.get("date") or "")[:10] for c in comps if c.get("date")))
                    print(f"        date range: {dates_seen[:3]} ... {dates_seen[-3:] if len(dates_seen) > 3 else ''}")
                    # Find competitions for 2026-05-28 specifically
                    target = [c for c in comps if (c.get("date") or "")[:10] == "2026-05-28"]
                    print(f"        competitions on 2026-05-28: {len(target)}")
                    for c in target[:5]:
                        names = []
                        for co in c.get("competitors") or []:
                            ath = co.get("athlete") or {}
                            tm = co.get("team") or {}
                            n = ath.get("displayName") or tm.get("displayName") or "?"
                            sc = co.get("score", "?")
                            ls = [p.get("value", "?") for p in (co.get("linescores") or [])]
                            names.append(f"{n}={sc}({'-'.join(str(x) for x in ls)})")
                        notes = [n.get("text") for n in (c.get("notes") or [])]
                        st = (c.get("status") or {}).get("type", {})
                        print(f"          [{st.get('name','?')}] {' vs '.join(names)} | notes={notes}")

    # ========================================================================
    # CORE API v2 — different shape, often more granular (match-by-match)
    # ========================================================================
    print("\n" + "=" * 80)
    print("CORE API v2 — tennis events index (any tour, recent)")
    print("=" * 80)
    for tour in ("atp", "wta"):
        url = f"https://sports.core.api.espn.com/v2/sports/tennis/leagues/{tour}/events?dates=20260528"
        code, status, payload = _get(url)
        print(f"\n  {tour.upper()} 20260528 core-api: status={code}")
        if isinstance(payload, dict):
            print(f"    keys: {list(payload.keys())}")
            items = payload.get("items", [])
            print(f"    items count: {len(items)}")
            for it in items[:5]:
                print(f"      item: {it}")
        elif isinstance(payload, str):
            print(f"    body[:300]: {payload[:300]}")
    return 0


def probe_production_fetch():
    """Call auto_settle._fetch_match_score with the exact J11 leg
    parameters and trace what happens."""
    import sys as _sys
    from pathlib import Path
    _sys.path.insert(0, str(Path(__file__).resolve().parent))
    import auto_settle

    print("\n" + "=" * 80)
    print("PRODUCTION CALL — auto_settle._fetch_match_score for J11 Osaka leg")
    print("=" * 80)

    # Monkey-patch _espn_get to log each call
    original_espn_get = auto_settle._espn_get
    def traced_get(path):
        result = original_espn_get(path)
        if result is None:
            print(f"  [_espn_get] path={path!r} → None (error)")
        else:
            events = result.get("events", [])
            print(f"  [_espn_get] path={path!r} → {len(events)} events")
        return result
    auto_settle._espn_get = traced_get

    # Mimic the J11 Osaka leg call
    score = auto_settle._fetch_match_score(
        home="Donna Vekic",
        away="Naomi Osaka",
        kickoff_iso="2026-05-28T09:00:00+00:00",
        sport="tennis",
        league_str="Roland Garros — 2e tour",
    )
    print(f"\n  RESULT: {score}")

    # Repeat for Rinderknech leg
    print("\n  --- Rinderknech leg ---")
    score2 = auto_settle._fetch_match_score(
        home="Arthur Rinderknech",
        away="Matteo Berrettini",
        kickoff_iso="2026-05-28T18:15:00+00:00",
        sport="tennis",
        league_str="Roland Garros — 2e tour",
    )
    print(f"\n  RESULT: {score2}")


if __name__ == "__main__":
    rc = main()
    probe_production_fetch()
    sys.exit(rc)
