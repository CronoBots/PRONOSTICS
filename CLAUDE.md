# NEXBET — Project guidelines for Claude

This file is the source of truth for project conventions. Read it
before any task. If a convention here conflicts with what you find
in code, the doc wins — open a PR to align the code, don't bend
the standard.

---

## 0. Repository map

```
backend/
  scripts/
    picks_data.py            ← source FR des picks (la VÉRITÉ)
    picks_translations_en.py ← overlay EN par date YYYY-MM-DD
    build_history.py         ← génère data/history.json + predictions/*.json
    publish_telegram.py      ← publication Telegram (pick / result / recap)
    update_learnings.py      ← auto-learning loop pour l'agent
  data/
    history.json             ← DOIT être copié dans frontend/public/data/
    predictions/             ← *.json par date (pending uniquement)
    nexbet/                  ← métho de l'agent (criteria.md, learnings.md)
.claude/agents/
  nexbet-analyst.md          ← l'agent qui fait les analyses du jour (v4.8)
.github/workflows/
  telegram-daily.yml         ← cron + workflow_dispatch pour Telegram
frontend/
  public/data/
    history.json             ← lu par le front (FetchHistory)
    predictions/{date}.json  ← lu par le front (fetchDay)
  src/
    components/HistoryList.tsx    ← la référence UI (DayCard, LegRow, …)
    pages/{index,today,paris,stats,calendrier,premium}.tsx
    lib/{i18n,types,dataSource,auth,theme}.tsx
CLAUDE.md                    ← ce fichier
```

---

## 1. Bet settlement protocol (MANDATORY — automatic, no reminder)

When a bet outcome is confirmed (won, lost, void), these steps run
in order. The user does NOT need to re-explain this each time.

1. **Verify the outcome** with ≥ 2 independent sources (cf.
   nexbet-analyst v4 methodology). Quote the textual result in the
   commit message or trace.

2. **Update `backend/scripts/picks_data.py`** for the pick:
   - Flip `outcome` from `"pending"` to `"win"` / `"loss"` / `"void"`
   - Set `profit` (positive for win, negative for loss, 0 for void)
   - Fill `result`:
     - `score_home` (combos: "N/M", singles: home team score)
     - `score_text` (e.g. "Bencic bat McNally 6-4 6-0")
     - `summary` (one-sentence French summary)
     - `bet_outcome` (one-sentence French verdict)
   - For combos: fill the same fields on EACH leg in `legs[]`

3. **Update `backend/scripts/picks_translations_en.py`**: mirror
   the FR result/score_text/summary/bet_outcome in EN, keyed by
   the same date (YYYY-MM-DD).

4. **Regenerate history JSON**:
   ```bash
   cd backend && python3 scripts/build_history.py
   ```
   Verify the totals printed match expectations. Only
   `backend/data/history.json` (committed) needs updating —
   `frontend/public/data/history.json` is gitignored and gets
   recopied automatically by `frontend/scripts/copy-predictions.js`
   on every `npm run build` (prebuild hook).

5. **Commit + push** to `main`. GitHub Pages redeploys in 1-2 min.

6. **Publish to Telegram**:
   - Normal flow: cron at 06:00 UTC tomorrow morning will fire
     `result-yesterday` mode.
   - Same-day flow: trigger `workflow_dispatch` with mode
     `result-today` OR `result-date` (+ `result_date` YYYY-MM-DD input).

7. **Agent learnings**: if the outcome surfaces a methodology
   lesson, add a note to `backend/data/nexbet/learnings.md`
   (EXPERIMENTAL n=1 if first occurrence, promotion rules in file).

---

## 2. Publication format rules (Telegram)

`publish_telegram.py` already enforces these in `format_pick_*`,
`format_result`, `format_recap_weekly`. Preserve them when editing.

### Pick of the day (`format_pick_*`)
Free preview shows only:
- 🔒 BET OF THE DAY · Premium pick (header)
- Long date
- Sport family + bet structure (single / N-leg parlay) — NO league
- PRICING block (free preview):
  - Combined price · Fair value · Model probability · Edge · Stake
  - Potential return · Net P/L if won
- 💎 Premium subscribers unlock: bullet list (selections, match
  details, rationale, live updates)
- Track record · last 7 days
- Footer (NEXBET branding + 21+ + BeGambleAware)

### Result (`format_result`)
- `🟢 RESULT — WON` / `🔴 RESULT — LOST` / `⚪ RESULT — VOIDED`
- Long date
- Sport icon + pick description
- `Odds X.XX · Stake X.XX EUR`
- `*Net P/L*  🟢 *+X.XX EUR*`
- `*Final score*` italicised
- `*Summary*` italicised
- Track record · last 7 days
- Footer

### Weekly recap (`format_recap_weekly`)
Sunday 09:00 Belgique. Shows W/L/win rate/ROI/bankroll over the
week. Format already locked in code.

### Cron schedule (`.github/workflows/telegram-daily.yml`)
- 06:00 UTC daily → `result-yesterday`
- 08:00 UTC daily → `pick-today`
- 07:00 UTC Sunday → `recap-weekly`
- `workflow_dispatch` options: test, pick-today, pick-yesterday,
  result-yesterday, result-today, result-date, recap-weekly

---

## 3. UI conventions — visual standards

### Page width ladder (mandatory, applied to every `<main>`)
```
max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8
```
- Mobile: `max-w-md` (448px)
- Tablet: `max-w-2xl` (672px)
- Desktop: `max-w-5xl` (1024px)
- XL: `max-w-6xl` (1152px)

Any page using a different ladder is a bug.

### Status colors (semantic)
| State    | Background           | Foreground          | Border               |
|----------|----------------------|---------------------|----------------------|
| Win      | `bg-accent-green/15` | `text-accent-green` | `border-accent-green/35` |
| Loss     | `bg-accent-red/15`   | `text-accent-red`   | `border-accent-red/35`   |
| Void     | `bg-accent-blue/15`  | `text-accent-blue`  | `border-accent-blue/35`  |
| Pending  | `bg-yellow-500/15`   | `text-yellow-300`   | `border-yellow-500/40`   |

Bars (full-fill, e.g. day status indicator): `bg-accent-green` / `bg-accent-red` / etc.

### Card patterns
- Rounded: `rounded-2xl` (1rem) for primary cards
- Border: `border border-white/[0.06]` default
- Background: `bg-bg-card` for the primary surface, `bg-bg-elevated/40` for nested footer blocks
- Padding: `p-3.5` for BetRow content area, `px-4 py-3` for headers
- Section separators inside a card: `border-white/[0.12]` (header→body), `border-white/15` (between major sections like legs→Cote totale)
- Inter-leg separator: `border-white/[0.12]` with `first:border-t-0`

### Typography hierarchy (bet card)
| Element                  | Size      | Weight              | Color           |
|--------------------------|-----------|---------------------|-----------------|
| Player / entity name     | text-base | font-semibold       | text-white      |
| Bet odds (leg)           | text-base | font-bold           | semantic color  |
| Cote totale (combo)      | text-xl   | font-extrabold      | semantic color  |
| Bet type subtitle        | text-[11px] | normal           | text-white/55   |
| Matchup line             | text-[11px] | normal           | text-white/35   |
| Score line               | text-[11px] | semibold (numbers) | semantic color  |
| Day header label         | text-base | font-semibold + capitalize | text-white |
| MISE/RETOUR labels       | text-[9px] uppercase tracking-wider | font-semibold | text-white/40 |
| MISE/RETOUR values       | text-sm   | font-bold tabular-nums | text-white  |

### Bet card structure (`HistoryList.tsx` — the reference)
```
DayCard (button if 1 pick, div otherwise)
 ├── outer colored vertical bar (w-1.5, day's overall status color)
 └── flex-1 content
     ├── Day header (capitalize day + day# + month name + ProfitChip)
     ├── BetRow (asDiv when DayCard is button)
     │    ├── matchup + time line (singles only)
     │    │     OR time only (combos)
     │    ├── For combo: list of LegRow (matchup · time, with score below if settled)
     │    ├── For single: inline body (entity · odds, type, matchup · time, score)
     │    └── FinancialStatsGrid
     │         ├── Cote totale (combos only, showTotalOdds)
     │         ├── 2-col Mise / Retour grid
     │         └── Result pill (✓ N/N sélections — combos only)
     └── footer escapes parent padding (-mb-3.5) to reach card edge
```

### Pending / locked variant (non-Premium teaser)
- Header: `🔒 Pari simple` (singles) or `🔒 Combiné N sélections`
  (combos) + `Premium` yellow pill
- Kickoff time line: `⏱ Pari en cours · 13:00`
- N blurred placeholder rows (no sport emoji, no team initials —
  must NOT leak the sport)
- Centered CTA: `👑 Débloquer avec Premium →`
- Tapping the card navigates to `/premium`

### Press feedback
- Cards (DayCard, BetRow as button): `active:scale-[0.99]` +
  `transition-transform duration-100 ease-out` + `hover:bg-white/[0.02]`
- BottomNav tabs: `nav-pulse` class (scale 0.92 + bg dim, no white flash)
- Page transition: `key={router.asPath}` re-mount triggers
  `pageTransition` keyframes (fade + 6px slide-up, 220ms)

---

## 4. Bet entity rendering (parsePickLabel)

The function lives in `frontend/src/components/HistoryList.tsx`. It
turns a raw pick label into `{ entity, typeKey, typeParams }` that
the UI renders. Patterns recognised (in order):

| Pattern                          | typeKey                       | Example entity            |
|----------------------------------|-------------------------------|---------------------------|
| `ML 90 min` / `(temps réglem.)`  | `betType.matchWinnerRegulation` | `Tottenham`              |
| `vainqueur(e)(s) du match` / `wins` | `betType.matchWinner`      | `Naomi Osaka`             |
| `en N sets` / `in N sets`        | `betType.winInSets`           | `Báez` (stripped)         |
| `Over X` / `Plus de X`           | `betType.totalGames`          | `Plus de 21.5` (locale)   |
| `+/-X.X jeux`                    | `betType.handicap`            | `Machac +6.5`             |
| `… + BTTS / Les deux équipes`    | `betType.specialCombo`        | humanised text            |
| (fallback)                       | `null`                        | humanised text            |

The humaniser also strips internal annotations like `(combo simple
maison)` and translates EN ↔ FR fragments (`ML` ↔ `gagne`, `BTTS`
↔ `Les deux équipes marquent`, `Over` ↔ `Plus de`).

`renderEntity()` splits on ` + ` so multi-clause picks render with
each clause on its own line (line break BEFORE the `+`).

`extractScore()` keeps only the trailing numeric portion of a
result.score_text so the matchup names aren't repeated.

---

## 5. Terminology (lock these)

| Term FR        | Term EN        | What it is                        |
|----------------|----------------|-----------------------------------|
| sélection(s)   | selection(s)   | A leg inside a combo (NOT "jambe", NOT "leg") |
| pari simple    | single bet     | Single-pick (1 selection)         |
| combiné        | combo          | 2+ legs accumulator               |
| cote           | odds           | The price                         |
| mise           | stake          | The amount wagered                |
| retour         | return         | mise × odds (gross payout)        |
| gain           | gain           | retour − mise (net profit)        |
| vainqueur du match (temps réglementaire) | match winner (regulation time) | Football ML 90 min |

Avoid: "jambes", "parlay" (FR), "ML" (raw, prefer the spelled-out form)

---

## 6. i18n discipline

- Every user-facing string lives in `frontend/src/lib/i18n.tsx`.
  FR + EN parallel keys, ordered identically in both blocks.
- Naming: `<section>.<key>` (e.g. `history.combinedLegs`,
  `premium.heroPrefix`).
- Interpolation: `{token}` syntax (e.g. `"Combiné {n} sélections"`).
- Locale-aware rendering (dates, currency, weekday names) via
  `localeForLang(lang)` from `@/lib/i18n`.
- Bet entity helpers (`parsePickLabel`, `humanizePickFragment`)
  take an explicit `lang` param so Over/Under, ML, BTTS translate
  on the fly.

---

## 7. Premium gating

Non-Premium users:
- See full settled bet history (any past pick, FR or EN)
- See pending picks as locked teaser (no sport reveal, no league,
  no entity, no leg odds)
- Can tap → redirected to `/premium`

Premium users:
- See pending picks in full

The teaser exposes only:
- Combo cardinality (N sélections)
- Generic kickoff time
- Aggregate pricing (combined odds, fair value, model proba, edge,
  stake, potential return, net P/L)

Never leak: sport icon on legs, team names, league, market type,
bet rationale.

---

## 8. Agent NEXBET v4.8 (analyses)

Triggered by the user's command (`fais l'analyse du jour`, `/nexbet`).

Hard rules:
- **Bookmaker-agnostic output** — never name Unibet/bwin/etc in
  user-facing text (cf. AB-7).
- **2 sources + textual quote** for each outcome verification.
- **AB-1** : Top-10 ATP en tournoi de préparation J-2/J-1 d'un GS — blocking
- **AB-3** : EXPERIMENTAL Cinderella playoff team in momentum
- **AB-4** : Combiné 3+ jambes — blocking (variance too high)
- **AB-5** : MLB ML > 2.50 without pitcher edge — blocking
- **AB-8** : H2H factual check on 2 sources before handicap pick — EXPERIMENTAL
- **AB-9** : Same-day same-player exposure block — blocking
- Paper trading active (started 24/05/2026, 30-day cycle)
- Bankroll: 5€/day strict stakes, current 55.90€ after J10 win
- All foot / basket / tennis only (NHL/MLB/NFL/F1/MMA suspended)

Cf. `.claude/agents/nexbet-analyst.md` for the full prompt.
Cf. `backend/data/nexbet/{criteria,learnings,sources_catalogue}.md`.

---

## 9. Data flow (read this before touching anything)

```
backend/scripts/picks_data.py  ←  the SOURCE OF TRUTH (FR data, committed)
       │
       ├─ build_history.py  ─→  backend/data/history.json (committed)
       │                          │
       │                          └─ frontend/scripts/copy-predictions.js
       │                              (runs as `npm run prebuild` during
       │                               Next.js build) copies into
       │                               frontend/public/data/history.json
       │                                      │
       │                                      └─ fetchHistory() reads it
       │                                                │
       │                                                └─ /paris, /stats, …
       │
       └─ today builder  ─→  backend/data/predictions/<date>.json (committed,
                                only when a pick is still pending)
                                  │
                                  └─ also copied by copy-predictions.js
                                          │
                                          └─ fetchDay() in lib/dataSource.ts
                                                  │
                                                  └─ /today

picks_translations_en.py  ─→  overlayed at publish time (Telegram) and
                                at render time (frontend if lang=en)
```

`frontend/public/data/*.json` is **gitignored** — never commit it
directly. The prebuild step rebuilds it from `backend/data/*` on
every deployment.

---

## 10. Commit + push discipline

- Commit message format (used throughout this project):
  - Subject line: `<scope>: <imperative summary>` (e.g.
    `paris: drop GAIN from footer`)
  - Body: WHY + WHAT, in plain English, no bullet vomit
- Branch: develop on `main` directly for solo work, push immediately
- Always `git push -u origin main` (set tracking)
- Never `--force` push without explicit request

The repo runs a `stop-hook-git-check.sh` that nags on uncommitted
changes. Don't accumulate — commit often, push often.

---

## 11. Quick reference: when in doubt

- "Should I show the sport emoji on a locked bet?" → NO (cf. § 7)
- "Should the combo legs use jambes or sélections?" → sélections (cf. § 5)
- "Where do I put the score?" → under the matchup line, in semantic
  color, with `extractScore()` to keep only the digits (cf. § 4)
- "What's the page width?" → `max-w-md md:max-w-2xl lg:max-w-5xl
  xl:max-w-6xl` on every page (cf. § 3)
- "Should I create a new component for this?" → No. Reuse
  `HistoryList` patterns. The reference is /paris.
- "Did the user ask for jargon (`ML 90 min`)?" → Translate to the
  full form (`Vainqueur du match (temps réglementaire)`).

---

## 12. Auto-settlement protocol (v1.1 — reminder pivot)

The pipeline is a SECOND layer on top of §1 — manual settlement still
works exactly as before. The DEFAULT cron mode is now `reminder` (not
`shadow`): the cron pings the admin on Telegram with the list of pending
picks past kickoff+2h that still need manual settlement per §1. No
provider call, no file mutation.

**Why the pivot**: SofaScore (and most public sports APIs) block
cloud IPs via Cloudflare. From GitHub Actions runners + most cloud
infras, scheduled_events returns 403 even with cloudscraper or
curl_cffi (the IP block is enforced before TLS negotiation). The
shadow/live modes are kept in the codebase for future use — wire a
paying provider (api-tennis.com, api-football.com, BallDontLie+key) or
a residential proxy, then flip the cron default back to `shadow`.

### Pipeline files

```
backend/scripts/
  settle_rules.py    ← parser + per-market rules (pure, no I/O)
  settle_ast.py      ← libcst writer for picks_data.py + picks_translations_en.py
  auto_settle.py     ← CLI entry point (reminder | dry-run | shadow | live)

backend/data/auto_settle/
  <YYYY-MM-DD>.json  ← shadow-mode proposal log (committed)
  .notified.json     ← dedupe state for Telegram admin pings

.github/workflows/
  auto-settle.yml    ← cron 0 */2 + workflow_dispatch
```

### Modes (v1.3 — daily auto-live + Telegram chain)

| Mode      | Calls provider? | Writes to picks_data.py? | Cron trigger |
|-----------|-----------------|--------------------------|--------------|
| reminder  | no              | no — just Telegram ping  | manual only  |
| dry-run   | yes             | no — stdout only         | manual only  |
| shadow    | yes             | no — proposal JSON + admin diff | every 2h (`0 */2 * * *`) |
| live      | yes             | YES — libcst edit + build_history.py + git commit + chained Telegram channel publish | daily 06:00 UTC (`0 6 * * *`) |

**v1.3 auto-live chain**: at 06:00 UTC the cron runs auto_settle.py
in live mode. By that hour every match started 24h+ ago is finished.
Live mode:
1. Refuses to half-settle a day — aborts if any pick is in
   `skipped_unknown` OR `skipped_no_data` (data gap). Sends an admin
   ping; operator settles the missing pick manually (§1), re-runs
   `mode=live` via workflow_dispatch.
2. On clean settlement, commits + pushes.
3. Chains into `publish_telegram.py --result <yesterday>` so subscribers
   get the daily result post automatically.

Shadow stays at every 2h for audit-trail proposals (admin DM via
`TELEGRAM_ADMIN_CHAT_ID`) — never touches picks_data.py.

Provider: **ESPN unofficial API** (v1.2 swap). SofaScore was blocked
by Cloudflare from GitHub Actions IPs (probe confirmed 403). ESPN
passes (200) for tennis ATP/WTA, NBA, UEFA soccer, top-5 football
leagues. No API key needed.

### Markets covered

| Sport      | Market                       | settle_rules market key   |
|------------|------------------------------|---------------------------|
| tennis     | match winner                 | `tennis_match_winner`     |
| tennis     | win in N sets exactly        | `tennis_exact_sets`       |
| tennis     | total games over/under       | `tennis_total_games`      |
| football   | match winner (90 min)        | `football_ml_regulation`  |
| football   | both teams to score          | `football_btts`           |
| basketball | team moneyline               | `basket_team_ml`          |
| basketball | total points over/under      | `basket_total_points`     |
| basketball | player points over/under     | `basket_player_points`    |

Anything else (handicaps, asian lines, props beyond points, etc.)
falls into `market="unknown"` and is logged to `skipped_unknown[]`
without ever touching the pick.

### Combo aggregation rule (deviation from industry standard)

NEXBET house rule for combos:

- All legs won → combo wins
- Any leg voided → **whole combo voided**
- Otherwise → combo lost

This deviates from the standard bookmaker behaviour, which would
remove the voided leg from the parlay and recompute the residual
odds on the remaining legs. The user has explicitly chosen the
above semantics for now; revisit before promoting v1 → v2.

### Provider

Data: `backend/scripts/sofascore.py` (existing in-repo client).
The original task spec mentioned BallDontLie, but BallDontLie
doesn't cover tennis and SofaScore is already integrated and
multi-sport, so we use SofaScore. Rate-paced at 1 request every
15s in `auto_settle.py::_settle_one_leg` (we have very low daily
volume — 1 to 3 picks per day).

### Failure handling

- Unparseable label (`market="unknown"`) → logged to
  `skipped_unknown[]`, never modifies the pick, Telegram admin
  ping with the offending label.
- Provider returned no data → `skipped_no_data[]`, retries on the
  next cron tick, admin ping ONLY ONCE per pick per day (state in
  `.notified.json`).
- Live-mode mutation raised → in-memory snapshot/restore reverts
  `picks_data.py` + `picks_translations_en.py` to their pre-edit
  bytes (NOT `git checkout --` — that would wipe operator WIP).
  Admin alert with traceback, exit code 1 (loud).
- After every successful AST write, `auto_settle.py` reloads
  `picks_data` to verify import safety before continuing.
- Live mode aborts upfront if either source file has uncommitted
  changes (operator edit in progress).

### Telegram secrets (mandatory for live notifications)

Two distinct chat IDs MUST be configured as GitHub Actions secrets:

| Secret                    | Used by                          | What it is                       |
|---------------------------|----------------------------------|----------------------------------|
| `TELEGRAM_BOT_TOKEN`      | both                             | bot token (BotFather)            |
| `TELEGRAM_CHANNEL_ID`     | `publish_telegram.py`            | **public** subscriber channel (starts with -100…) |
| `TELEGRAM_ADMIN_CHAT_ID`  | `auto_settle.py::_try_send_admin`| **operator's private chat** — receives shadow proposals |

Safety rationale (F3): shadow-mode proposal diffs contain predicted
outcomes hours before the official result post. If those leaked to
the public channel, free subscribers would see Premium-tier value
ahead of paying ones. `auto_settle.py` POSTs directly to the
Telegram API with `chat_id=TELEGRAM_ADMIN_CHAT_ID` and NEVER
imports `publish_telegram.send_message`. If `TELEGRAM_ADMIN_CHAT_ID`
is unset, admin pings fall back to stderr — never to the public
channel.

### When in doubt

- "Did the operator ask for auto-settle to publish to Telegram?"
  → No. Auto-settle ONLY pings the admin (proposal diffs). The
  user-facing Telegram publish flow (`publish_telegram.py`) is
  still its own job (cron 06:00 UTC for result-yesterday).
- "Should I add a new market to the parser?" → Add the regex to
  `settle_rules.py`, add the rule to `apply_rule`, add a test in
  `tests/test_settle.py`, then add to the markets table above.
- "What if SofaScore changes their API?" → The provider helper
  `_fetch_match_score` is the only coupling point. Update there
  and the rest of the pipeline is untouched.
