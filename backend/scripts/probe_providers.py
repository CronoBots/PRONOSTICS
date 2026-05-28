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
            body = r.read()[:4000].decode("utf-8", errors="replace")
            try:
                return r.status, "ok", json.loads(body)
            except json.JSONDecodeError:
                return r.status, "ok-not-json", body[:200]
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
    return 0


if __name__ == "__main__":
    sys.exit(main())
