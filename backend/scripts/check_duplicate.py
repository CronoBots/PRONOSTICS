"""Anti-duplication checker pour NΞXBΞT.

Vérifie si un match (home_team, away_team) a déjà été pické dans les
7 derniers jours. Empêche l'agent de re-picker le même évènement.

Usage:
    python backend/scripts/check_duplicate.py "Mariano Navone" "Learner Tien"

Exit codes:
    0 : pas de duplicate, OK pour pick
    1 : duplicate trouvé dans les 7 derniers jours
    2 : erreur arguments / fichier
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path


WINDOW_DAYS = 7
PICKS_FILE = Path(__file__).parent / "picks_data.py"


def _normalize(name: str) -> str:
    return name.lower().strip().replace("é", "e").replace("è", "e")


def _load_picks() -> list[dict]:
    if not PICKS_FILE.exists():
        print(f"ERREUR: {PICKS_FILE} introuvable", file=sys.stderr)
        sys.exit(2)
    namespace: dict = {}
    exec(PICKS_FILE.read_text(), namespace)
    picks = namespace.get("PICKS")
    if picks is None:
        print("ERREUR: PICKS array introuvable dans picks_data.py", file=sys.stderr)
        sys.exit(2)
    return picks


def check_duplicate(home: str, away: str, today: date | None = None) -> dict | None:
    today = today or date.today()
    cutoff = today - timedelta(days=WINDOW_DAYS)
    home_n, away_n = _normalize(home), _normalize(away)

    for pick in _load_picks():
        pick_date_str = pick.get("date")
        if not pick_date_str:
            continue
        try:
            pick_date = date.fromisoformat(pick_date_str)
        except ValueError:
            continue
        if pick_date < cutoff:
            continue

        # Match direct sur home/away
        ph = _normalize(pick.get("home_team", ""))
        pa = _normalize(pick.get("away_team", ""))
        if home_n in (ph, pa) or away_n in (ph, pa):
            return pick

        # Match dans les legs si combiné
        for leg in pick.get("legs", []) or []:
            lh = _normalize(leg.get("home_team", ""))
            la = _normalize(leg.get("away_team", ""))
            if home_n in (lh, la) or away_n in (lh, la):
                return pick

    return None


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: check_duplicate.py <home_team> <away_team>", file=sys.stderr)
        return 2

    home, away = sys.argv[1], sys.argv[2]
    dup = check_duplicate(home, away)

    if dup is None:
        print(f"OK: aucun pick récent sur {home} vs {away} (fenêtre {WINDOW_DAYS}j)")
        return 0

    print(
        f"DUPLICATE: {home} vs {away} déjà pické le {dup['date']} "
        f"({dup.get('pick', 'pick inconnu')})",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
