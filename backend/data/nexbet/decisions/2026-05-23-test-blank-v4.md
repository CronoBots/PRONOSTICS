# NΞXBΞT — Trace TEST À BLANC v4.0 — 2026-05-23

> **MODE TEST À BLANC** — aucune position paper créée, aucune écriture dans `paper_trading_log.md`. Cycle paper démarre 24/05.

## Métadonnées

- **Heure analyse** : 16h11 Belgique (14h11 UTC), samedi 23/05/2026
- **Bankroll virtuel paper** : 100.00 € (état initial, cycle pas démarré)
- **Méthodologie** : v4.0 (recap-only, EV ≥ +2% strict)
- **Branche git** : `claude/agent-pickup-testing-PjfQi`
- **Fenêtre kickoff retenue** : 17h Belgique 23/05 → fin 24/05
- **Watchlist** : `decisions/2026-05-23-test-blank-watchlist.md` (16 lignes documentées)

## Funnel

1. **Cartographie** : 16 lignes documentées (sports actifs scannés : NHL ECF, NBA ECF, MLB regular, EFL Championship Final, Bundesliga relegation, ATP/WTA Roland Garros R1 J-1, Coupe de France final).
2. **Rejets F1 (cote hors 1.50-2.00)** :
   - Carolina ML 1.49 (NHL G2) — sous seuil de 0.01
   - Tous top-10 ATP R1 RG (cotes 1.04-1.30) hors fenêtre
3. **Rejets AB-1 (top-10 ATP J-1 GS)** :
   - Sinner, Zverev, Djokovic, Auger-Aliassime, Shelton, Medvedev, Fritz, De Minaur, Bublik, Cobolli + Ruud (N°11 marge)
4. **Rejets F4 sources insuffisantes** :
   - Bundesliga Wolfsburg/Paderborn (whitelist v4 quasi-absente)
   - Coupe de France (PSG éliminé, pas de finale claire ce week-end avec coverage)

## Top 5 candidats étudiés

### Candidat 1 — Cleveland Cavaliers ML G3 vs Knicks (cote ~1.65)

**Calculs** :
- book_proba = 1 / 1.65 = **0.6061**
- model_proba (médiane sources) : seulement **1 proba explicite chiffrée** retrouvée (FanDuel/numberFire 57.6%). BleacherNation, SportsLine, Tonyspicks et OddsShark ont des "picks Cavaliers" qualitatifs mais pas de % chiffré explicite extractible.
- n_eff = 1 → **F4 KO** (minimum 3 probas explicites requis)
- proba_shrunk = N/A
- EV = N/A

**Sources tentées** :
- https://www.fanduel.com/research/cavaliers-vs-knicks-prediction-nba-odds-spread-best-bets-for-eastern-finals-5-23-2026 → numberFire 57.6%
- https://www.cbssports.com/nba/news/knicks-cavaliers-odds-prediction-spread-time-2026-nba-eastern-conference-finals-game-3-picks/ → pick qualitatif (no %)
- https://www.bleachernation.com/picks/2026/05/23/cavaliers-vs-knicks-predictions-best-bets-and-odds-eastern-conference-finals-game-3-saturday-may-23-2026/ → pick qualitatif
- https://www.oddsshark.com/nba/knicks-cavaliers-picks-odds-game-3-may-23-2026 → pick qualitatif
- https://www.dimers.com/bet-hub/nba/schedule/2025_215_cle_nyk → page existe, % non extrait du snippet

**Anti-bias** :
- AB-1 : NA (basket)
- AB-2 : Cleveland mène/sous-côté ? **Cleveland est mené 0-2 dans la série** → **NE déclenche PAS AB-2** (AB-2 vise le perdant 1-3, pas 0-2). NA.
- AB-3 : NA (pas Cinderella)
- PC-2 EXPERIMENTAL : "G2 home après G1 loss anormale" — ici on est en G3 home après deux G1+G2 défaites. Signal qualitatif "desperate home team" type, mais pas validé n=3.
- AB-4 : NA (single)
- AB-5 : NA (basket)

**Verdict** : 🔴 **INSUFFISANT** — F4 KO (seulement 1 proba chiffrée explicite, 2 sources qualitatives convergentes). En v4 strict on n'utilise pas les picks qualitatifs comme remplacement de probas chiffrées.

---

### Candidat 2 — Middlesbrough ML EFL Championship Final (cote ~1.91)

**Calculs** :
- book_proba = 1 / 1.91 = **0.5236**
- model_proba sources :
  - Goal.com top apps : 54.6%
  - Goal.com tipsters : ~60% (même éditeur que ci-dessus → **risque corrélation** noté)
  - Sportytrader algo : 31.04% (Middlesbrough 90min, draw 45.77%)
- Médiane stricte (3 sources) = **0.546**
- n_eff = 3
- proba_shrunk = (3 × 0.546 + 2 × 0.5236) / 5 = (1.638 + 1.0472) / 5 = **0.5370**
- EV = 0.5370 × 1.91 − 1 = **+2.57%**

**Sources accessibles** :
- https://www.goal.com/en-us/betting/tips/hull-city-vs-middlesbrough-predictions-5-23-2026/A%3Abltc59e9f9ba00cef24 → "top apps 54.6% Middlesbrough win"
- https://www.sportytrader.com/en/betting-tips/tennis/atp/roland-garros-354/ (referenced via Sportytrader football) → 31.04% Middlesbrough 90min, draw 45.77%
- https://www.cbssports.com/betting/news/hull-city-vs-middlesbrough-prediction-odds-expert-picks-for-saturdays-efl-championship-playoff-final/ → "Middlesbrough should prevail" qualitatif
- https://www.covers.com/soccer/hull-city-vs-middlesbrough-predictions-picks-saturday-may-23-2026 → Under 2.5 best bet, Middlesbrough pick implicite
- https://www.sportsgambler.com/betting-tips/football/hull-vs-middlesbrough-prediction-lineups-odds-2026-05-23/ → pick qualitatif

**Anti-bias** :
- AB-1/2/3/4/5 : NA
- Note : Middlesbrough coach Kim Hellberg avoue "9-10 jours sans entraînement" → risque fitness élevé, signal qualitatif négatif.
- Trois sources divergent fortement (54.6% / 60% / 31%) → modèle pas confiant.

**Verdict** : 🔴 **INSUFFISANT** — proba_shrunk **0.537 < 0.55** (F2 KO). EV +2.57% serait suffisant en isolé, mais proba_shrunk sous seuil = rejet.

---

### Candidat 3 — Pittsburgh Pirates ML @ Toronto Blue Jays (cote ~1.65)

**Calculs** :
- book_proba = 1 / 1.65 = **0.6061**
- model_proba sources :
  - Dimers : 57%
  - FanDuel/numberFire : 61.4%
  - Polymarket (snippet) : 59% (data textuelle dans search, pas WebFetch)
- Médiane (3 sources) = **0.59**
- n_eff = 3
- proba_shrunk = (3 × 0.59 + 2 × 0.6061) / 5 = (1.77 + 1.2122) / 5 = **0.5964**
- EV = 0.5964 × 1.65 − 1 = **−1.59%**

**Sources accessibles** :
- https://www.dimers.com/news/pittsburgh-pirates-vs-toronto-blue-jays-prediction-mlb-saturday-05-23-2026-ac → "Pirates 57%"
- https://www.fanduel.com/research/pirates-vs-blue-jays-mlb-odds-prediction-point-spread-over-under-and-betting-trends-for-5-23-2026 → "numberFire 61.4%"
- https://polymarket.com/sports/mlb/mlb-pit-tor-2026-05-23 → snippet cite "Pirates 59¢ (59%)"
- https://www.bleachernation.com/picks/2026/05/20/toronto-blue-jays-vs-pittsburgh-pirates-series-may-22-24-odds-starting-pitchers-predictions/ → preview série, pick qualitatif
- https://www.tonyspicks.com/2026/05/22/pirates-vs-bluejays-mlb-sharp-pick-may-23-2026/ → "sharp pick"

**Anti-bias** :
- AB-5 : NA (Pirates favoris, cote 1.65 < 2.50)
- Autres AB : NA
- Skenes Cy Young + WHIP 0.71 leads majors → matchup pitcher EXCEPTIONNEL côté favori (renforce le book, pas inverse)

**Verdict** : 🔴 **INSUFFISANT** — EV **−1.59% < 0%** (F3 KO). Le shrinkage tire la proba modèle (0.59) vers la book_proba (0.606) → mais le marché est légèrement plus optimiste que la médiane des modèles, ce qui donne un EV légèrement négatif. Pas value.

---

### Candidat 4 — Seattle Mariners ML @ Royals (cote ~1.71)

**Calculs** :
- book_proba = 1 / 1.71 = 0.5848
- model_proba : seulement FanDuel/numberFire 59.4% chiffré. Pickdawgz et Tonyspicks ont picks qualitatifs.
- n_eff = 1 → **F4 KO**

**Sources tentées** :
- https://www.fanduel.com/research/mariners-vs-royals-mlb-odds-prediction-point-spread-over-under-and-betting-trends-for-5-23-2026 → 59.4%
- https://www.tonyspicks.com/2026/05/22/mariners-vs-royals-mlb-sharp-pick-may-23-2026/ → qualitatif
- https://pickdawgz.com/mlb-picks/seattle-mariners-vs-kansas-city-royals-prediction-5-23-2026-todays-mlb-picks/ → qualitatif

**Verdict** : 🔴 **INSUFFISANT** — F4 KO (1 proba chiffrée < 3 requis).

---

### Candidat 5 — Texas Rangers ML @ LA Angels (cote ~1.74)

**Calculs** :
- book_proba = 1 / 1.74 = 0.5747
- model_proba : FanDuel 59.5% + ESPN Analytics 58.1% (snippet)
- n_eff = 2 → **F4 KO** (minimum 3)

**Sources tentées** :
- https://www.fanduel.com/research/rangers-vs-angels-mlb-odds-prediction-point-spread-over-under-and-betting-trends-for-5-23-2026 → 59.5%
- https://www.tonyspicks.com/2026/05/22/rangers-vs-angels-mlb-sharp-pick-may-23-2026/ → qualitatif
- https://www.pickswise.com/mlb/predictions/texas-rangers-vs-los-angeles-angels-predictions-513989/ → snippet ESPN 58.1%

**Verdict** : 🔴 **INSUFFISANT** — F4 KO (2 probas chiffrées < 3 requis).

---

## Synthèse verdicts

| # | Candidat | Cote | proba_shrunk | EV | Verdict |
|---|---|---|---|---|---|
| 1 | Cavaliers ML G3 | 1.65 | N/A | N/A | 🔴 F4 KO |
| 2 | Middlesbrough ML | 1.91 | 0.537 | +2.57% | 🔴 F2 KO |
| 3 | Pirates ML | 1.65 | 0.596 | −1.59% | 🔴 F3 KO |
| 4 | Mariners ML | 1.71 | N/A | N/A | 🔴 F4 KO |
| 5 | Rangers ML | 1.74 | N/A | N/A | 🔴 F4 KO |

**Aucun candidat 🟢 ni 🟡 ni 🟠.** Tous 🔴.

## Recommandation

**Cas C — SKIP recommandé**. Discipline v4 rétablie : EV ≥ +2% strict + proba_shrunk ≥ 0.55. Aucun candidat ne satisfait les deux conjointement.

Le moins pire à pure EV : Middlesbrough (+2.57% EV mais proba_shrunk 0.537 sous seuil).

## Décision user (en attente)

> **TEST À BLANC** — peu importe la décision, aucune position paper créée.

## Sources consultées (URLs complètes)

### NBA ECF Game 3
- https://www.fanduel.com/research/cavaliers-vs-knicks-prediction-nba-odds-spread-best-bets-for-eastern-finals-5-23-2026
- https://www.cbssports.com/nba/news/knicks-cavaliers-odds-prediction-spread-time-2026-nba-eastern-conference-finals-game-3-picks/
- https://www.bleachernation.com/picks/2026/05/23/cavaliers-vs-knicks-predictions-best-bets-and-odds-eastern-conference-finals-game-3-saturday-may-23-2026/
- https://www.oddsshark.com/nba/knicks-cavaliers-picks-odds-game-3-may-23-2026
- https://www.covers.com/nba/knicks-vs-cavaliers-prediction-picks-best-bets-sgp-saturday-5-23-2026
- https://www.dimers.com/bet-hub/nba/schedule/2025_215_cle_nyk
- https://www.lineups.com/betting/new-york-knicks-vs-cleveland-cavaliers-game-3-preview-picks-odds-for-saturday-may-23-2026/

### EFL Championship Final
- https://www.goal.com/en-us/betting/tips/hull-city-vs-middlesbrough-predictions-5-23-2026/A%3Abltc59e9f9ba00cef24
- https://www.cbssports.com/betting/news/hull-city-vs-middlesbrough-prediction-odds-expert-picks-for-saturdays-efl-championship-playoff-final/
- https://www.covers.com/soccer/hull-city-vs-middlesbrough-predictions-picks-saturday-may-23-2026
- https://www.sportsgambler.com/betting-tips/football/hull-vs-middlesbrough-prediction-lineups-odds-2026-05-23/
- https://dailysports.net/predictions/hull-city-vs-middlesbrough-preview-and-analytical-prediction-for-the-championship-play-off-final/
- https://www.sportytrader.com/en/betting-tips/football/

### MLB
- https://www.dimers.com/news/pittsburgh-pirates-vs-toronto-blue-jays-prediction-mlb-saturday-05-23-2026-ac
- https://www.fanduel.com/research/pirates-vs-blue-jays-mlb-odds-prediction-point-spread-over-under-and-betting-trends-for-5-23-2026
- https://polymarket.com/sports/mlb/mlb-pit-tor-2026-05-23
- https://www.bleachernation.com/picks/2026/05/20/toronto-blue-jays-vs-pittsburgh-pirates-series-may-22-24-odds-starting-pitchers-predictions/
- https://www.tonyspicks.com/2026/05/22/pirates-vs-bluejays-mlb-sharp-pick-may-23-2026/
- https://www.fanduel.com/research/mariners-vs-royals-mlb-odds-prediction-point-spread-over-under-and-betting-trends-for-5-23-2026
- https://www.fanduel.com/research/rangers-vs-angels-mlb-odds-prediction-point-spread-over-under-and-betting-trends-for-5-23-2026

### NHL (rejeté F1)
- https://www.covers.com/nhl/canadiens-vs-hurricanes-prediction-picks-best-bets-sgp-saturday-5-23-2026
- https://www.lineups.com/betting/montreal-canadiens-vs-carolina-hurricanes-game-2-preview-picks-odds-for-saturday-may-23-2026/
- https://www.bleachernation.com/picks/2026/05/23/hurricanes-vs-canadiens-stanley-cup-semifinals-game-2-prediction-odds-picks-best-bets-saturday-may-23-2026/

### Tennis Roland Garros R1 (tous rejetés AB-1 ou F1)
- https://www.rotowire.com/tennis/article/tennis-betting-2026-french-open-mens-betting-picks-odds-predictions-and-tennis-best-bets-115311
- https://www.cbssports.com/tennis/news/2026-french-open-draw-schedule-bracket-date-roland-garros/
- https://tennisuptodate.com/atp/french-open-roland-garros-atp-2026-draw-schedule-entry-list-and-predictions
- https://www.covers.com/tennis/french-open-predictions-picks-best-bets-2026

## Anomalies / doutes

1. **Cavaliers G3** : 1 seule proba chiffrée explicite. F4 strict KO, mais en pratique 3-4 sources ont un "pick" Cavaliers. La règle v4 est stricte → on rejette, mais c'est un cas où le candidat aurait sans doute mérité un verdict plus nuancé si l'extraction de % avait été plus profonde. À noter pour audit méthodo.
2. **Middlesbrough Goal.com x2** : top apps 54.6% + tipsters 60% — deux entrées du même éditeur, **corrélation source confirmée**, risque double-comptage.
3. **Polymarket Pirates 59¢** : data vue uniquement via snippet WebSearch, pas via WebFetch (URL JS-rendered). Acceptable selon catalogue v4 ("citer URL mais pas data lue") — j'ai utilisé la donnée snippet en assumant qu'elle est lisible côté search, à valider en méthodo.
4. **Roland Garros R1** : aucun candidat possible. Tous top-10 ATP J-1 GS → AB-1 strict. Les outsiders à cote 1.50-2.00 cités par RotoWire/Covers ont une coverage de probas trop faible (< 3 sources whitelist).
5. **Heure analyse 16h11** : Hull/Middlesbrough kickoff 17h30 Belgique → fenêtre F5 OK (>1h). EFL final est un événement spécial mais correctement couvert.

## Auto-checks v4

- [x] EV strict ≥ +2% pour 🟡 : aucun candidat ne passe à la fois EV ≥ +2% ET proba_shrunk ≥ 0.55
- [x] Min 3 sources accessibles avec proba explicite : seuls Middlesbrough et Pirates passent (et Middlesbrough avec corrélation Goal x2)
- [x] Aucun candidat citant Sofascore/ATP/WTA officiels comme source primaire : OK
- [x] AB-1 strict actif sur top-10 ATP J-1 RG : OK (rejet en bloc avant calculs)
- [x] Aucun tier FLOOR mentionné : OK
- [x] Aucune insertion dans `picks_data.py` : OK (mode paper + test blank)
- [x] Recommandation conditionnelle au format strict Cas C : OK
- [x] Trace + watchlist écrites sous nom `*-test-blank-*` : OK
- [ ] Commit + push : à effectuer après cette trace
- [x] Aucune écriture dans `paper_trading_log.md` : OK (test blank)
