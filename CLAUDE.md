# NEXBET — Project guidelines for Claude

## Bet settlement protocol (MANDATORY)

When a bet outcome is confirmed (won, lost, void), the following
steps MUST run in order. Do not stop halfway, do not wait for the
user to ask.

1. **Verify the outcome** with at least 2 independent sources
   (per nexbet-analyst v4 methodology). Quote the textual result.

2. **Update `backend/scripts/picks_data.py`**:
   - Flip `outcome` from `"pending"` to `"win"` / `"loss"` / `"void"`
   - Set `profit` (positive for win, negative for loss, 0 for void)
   - Fill `result`: `score_home`, `score_text`, `summary`, `bet_outcome`
   - For combos, fill the same fields on each leg in `legs[]`

3. **Update `backend/scripts/picks_translations_en.py`**:
   - Mirror the FR result/score_text/summary/bet_outcome in EN
   - Match exists keyed by pick date (YYYY-MM-DD)

4. **Regenerate the history JSON**:
   ```bash
   cd backend && python3 scripts/build_history.py
   cp data/history.json ../frontend/public/data/history.json
   ```
   Verify the totals printed match expectations (count, win rate,
   profit, bankroll). The empty `predictions/*.json` is normal once
   the day's pick is settled.

5. **Commit + push** to main. GitHub Pages redeploys in 1-2 min.

6. **Publish the result on Telegram** — this is normally handled
   by the daily cron at 06:00 UTC the next morning
   (`.github/workflows/telegram-daily.yml` → `result-yesterday`
   mode). The cron calls `publish_telegram.py --result <YESTERDAY>`
   which formats the message using `format_result()`.

   If a manual publication is needed before the cron fires (e.g.
   for same-day settlements), trigger the workflow_dispatch with
   mode `result-yesterday` AFTER midnight UTC, OR add a `result-date`
   custom input to the workflow.

7. **Update agent learnings** if relevant: the nexbet-analyst loop
   (`backend/data/nexbet/learnings.md`) tracks empirical patterns —
   add a note if the outcome surfaced a methodology lesson.

## Publication format rules (must respect at every settlement)

`publish_telegram.py format_result()` already enforces the required
elements. Do not strip them when editing:

- **Title**: `🟢 RESULT — WON` / `🔴 RESULT — LOST` / `⚪ RESULT —
  VOIDED` — colored status dot + outcome word in caps
- **Date**: `Wednesday, May 27, 2026` long form, EN locale
- **Bet line**: sport icon + pick description
- **Odds + Stake**: `Odds 1.66 · Stake 5.00 EUR`
- **Net P/L**: `🟢 +3.30 EUR` colored
- **Final score**: italicised, under a `*Final score*` header
- **Summary**: italicised, full sentence
- **Track record**: last 7 days W/L/win rate/ROI
- **Footer**: NEXBET branding + responsible gambling

If editing the format, preserve all blocks.

## Paris page (`/paris`) — UI conventions

- Bets per day grouped in a `DayCard` with the day's net result chip
- Outer colored left bar = day's overall outcome
- Settled bet shows the score (`leg.result.score_text`) under the
  matchup line, in the leg's outcome color
- Pending bets shown to non-Premium users as locked teaser cards
- Long combo picks ("X + Y") wrap before the "+"
- Footer: Mise / Retour grid + result pill (✓ N/N sélections)

## Terminology

- **FR**: "sélection" / "sélections" for combo legs (NOT "jambes")
- **EN**: "selection" / "selections" (NOT "leg" — kept consistent
  with FR for accessibility, even though "leg" is technically valid)
