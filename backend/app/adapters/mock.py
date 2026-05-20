"""Adapter mock : génère des matches plausibles pour démo & dev.

Utile pour faire tourner toute la chaîne sans clé API.
"""

from __future__ import annotations

import hashlib
import random
from datetime import date, datetime, time, timezone

from app.adapters.base import BaseAdapter
from app.config import Settings
from app.schemas import HeadToHead, MatchInput, TeamForm

_FIXTURES: dict[str, list[tuple[str, str, str]]] = {
    "football": [
        ("Premier League", "Manchester City", "Liverpool"),
        ("Premier League", "Arsenal", "Tottenham"),
        ("La Liga", "Real Madrid", "Barcelona"),
        ("La Liga", "Atletico Madrid", "Sevilla"),
        ("Ligue 1", "PSG", "Marseille"),
        ("Serie A", "Inter", "Juventus"),
        ("Bundesliga", "Bayern Munich", "Dortmund"),
        ("Champions League", "Real Madrid", "Manchester City"),
    ],
    "basketball": [
        ("NBA", "Boston Celtics", "Los Angeles Lakers"),
        ("NBA", "Denver Nuggets", "Phoenix Suns"),
        ("NBA", "Milwaukee Bucks", "Philadelphia 76ers"),
        ("Euroleague", "Real Madrid", "Olympiacos"),
    ],
    "tennis": [
        ("ATP Masters", "Novak Djokovic", "Carlos Alcaraz"),
        ("ATP Masters", "Jannik Sinner", "Daniil Medvedev"),
        ("WTA 1000", "Iga Swiatek", "Aryna Sabalenka"),
    ],
    "nfl": [
        ("NFL", "Kansas City Chiefs", "Buffalo Bills"),
        ("NFL", "San Francisco 49ers", "Dallas Cowboys"),
    ],
    "mlb": [
        ("MLB", "New York Yankees", "Boston Red Sox"),
        ("MLB", "Los Angeles Dodgers", "San Francisco Giants"),
    ],
    "nhl": [
        ("NHL", "Edmonton Oilers", "Toronto Maple Leafs"),
        ("NHL", "Florida Panthers", "Tampa Bay Lightning"),
    ],
}


def _seeded_rng(*parts: str) -> random.Random:
    """RNG déterministe par (date, sport, équipes) → résultats reproductibles."""
    seed = hashlib.md5("|".join(parts).encode()).hexdigest()
    return random.Random(int(seed[:16], 16))


def _build_form(rng: random.Random, base_strength: float) -> TeamForm:
    sample = "WDL"
    last_5 = "".join(rng.choices(sample, weights=[base_strength, 0.2, 1 - base_strength], k=5))
    wins = last_5.count("W")
    draws = last_5.count("D")
    losses = last_5.count("L")
    return TeamForm(
        wins=wins,
        draws=draws,
        losses=losses,
        goals_scored=rng.randint(4, 14),
        goals_conceded=rng.randint(2, 12),
        last_5=last_5,
        rank=rng.randint(1, 20),
        rating=round(1400 + base_strength * 600, 1),
    )


class MockAdapter(BaseAdapter):
    name = "mock"

    def is_configured(self, settings: Settings) -> bool:  # noqa: ARG002
        return True

    async def fetch_daily(self, sport: str, when: date) -> list[MatchInput]:
        fixtures = _FIXTURES.get(sport, [])
        matches: list[MatchInput] = []

        for i, (league, home, away) in enumerate(fixtures):
            rng = _seeded_rng(when.isoformat(), sport, home, away)
            home_strength = rng.uniform(0.35, 0.75)
            away_strength = rng.uniform(0.30, 0.70)

            kickoff = datetime.combine(when, time(hour=14 + (i % 8), minute=0), tzinfo=timezone.utc)

            odds = {
                home: round(1 / max(home_strength + 0.05, 0.1), 2),
                away: round(1 / max(away_strength, 0.1), 2),
            }
            if sport == "football":
                odds["Draw"] = round(1 / 0.27, 2)

            matches.append(
                MatchInput(
                    external_id=f"mock-{sport}-{i}-{when.isoformat()}",
                    source=self.name,
                    sport=sport,
                    league=league,
                    home_team=home,
                    away_team=away,
                    kickoff=kickoff,
                    stage="Regular season",
                    home_form=_build_form(rng, home_strength),
                    away_form=_build_form(rng, away_strength),
                    h2h=HeadToHead(
                        home_wins=rng.randint(0, 6),
                        away_wins=rng.randint(0, 6),
                        draws=rng.randint(0, 3) if sport == "football" else 0,
                        samples=rng.randint(5, 12),
                    ),
                    venue=f"{home} Stadium",
                    importance=rng.uniform(0.4, 0.9),
                    odds=odds,
                )
            )

        return matches
