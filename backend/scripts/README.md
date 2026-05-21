# 🔧 Scripts pipeline WTF

Documentation des scripts d'analyse et d'automatisation.

---

## 📊 `daily_candidates.py` — Cartographie quotidienne (auto)

**Quand** : tourne chaque jour à 7h00 Belgique via GH Action `daily-candidates.yml`.

**Ce qu'il fait** :
1. Pull tous les matchs J/J+1 via **The Odds API** (multi-bookmakers EU/UK/US)
2. Pull les marchés sports actifs sur **Polymarket** (probabilités sharp)
3. Matching fuzzy events entre les 2 sources
4. Pour chaque match : calcule fair odds dévignée + edge vs bwin + safety score
5. Output : `backend/data/candidates/{date}.csv` (trié par safety_score décroissant)

**Lancer manuellement** :
```bash
python scripts/daily_candidates.py            # aujourd'hui
python scripts/daily_candidates.py 2026-05-22 # date précise
```

**Prérequis** : `ODDS_API_KEY` en variable d'env (en local : `.env`).

**Quota** : ~6-8 req/jour sur Odds API. Budget largement sous les 500 req/mois free.

---

## 🎯 `analyze_match.py` — Analyse multi-sources d'un match précis

**Quand** : à la demande, pour analyser en profondeur un candidat sélectionné dans le CSV
de `daily_candidates`.

**Ce qu'il fait** : agrège plusieurs méthodes de prédiction indépendantes :
- **Tennis** : TennisAbstract Elo (surface-specific) + Polymarket
- **NBA** : NBA Stats officielle (net rating + home adv) + Polymarket
- **NHL** : NHL Stats officielle (win% + home adv) + Polymarket
- **MLB** : MLB Stats officielle (Pythagorean) + Polymarket

**Usage** :
```bash
# Tennis
python scripts/analyze_match.py --sport tennis \
    --player-a "Casper Ruud" --player-b "Alexei Popyrin" \
    --surface clay --tour atp

# NBA
python scripts/analyze_match.py --sport nba \
    --home "Knicks" --away "Cavaliers"

# NHL
python scripts/analyze_match.py --sport nhl \
    --home "Hurricanes" --away "Canadiens"

# MLB (avec note : haute variance, croiser FanGraphs FIP)
python scripts/analyze_match.py --sport mlb \
    --home "Yankees" --away "Blue Jays"
```

**Output** : tableau récap avec proba de chaque méthode, médiane, et recommandation
SAFE / MARGINAL / ÉVITER.

---

## 📜 Scripts existants

### `build_history.py`
Régénère `backend/data/history.json` + `predictions/{date}.json` à partir de `picks_data.py`.
À lancer après chaque mise à jour de `picks_data.py`.

### `picks_data.py`
Source de vérité des picks quotidiens (curation manuelle Claude).
Format : liste Python typée avec `outcome`, `rationale`, `comparison`, etc.

### `pick_template.py`
Template de pick pour copier-coller lors de l'ajout d'une nouvelle entrée.

### `daily_update.py`
Workflow legacy (désactivé en auto, dispo en `workflow_dispatch`).
Génère des prédictions via les engines hardcodés. Pas utilisé actuellement.

---

## 🏗 Architecture pipeline complet

```
                ┌─── DAILY CANDIDATES (7h Belgique, auto) ──────┐
                │                                                 │
                │  1. CARTOGRAPHIE                                │
                │     The Odds API → tous matchs                  │
                │     Polymarket → proba sharp                    │
                │                                                 │
                │  2. FAIR ODDS                                   │
                │     De-vig multiplicatif médiane multi-books    │
                │     Blend avec Polymarket (60/40)               │
                │                                                 │
                │  3. EDGE DETECTION                              │
                │     bwin vs fair odds                           │
                │     Safety score composite                      │
                │                                                 │
                │  4. OUTPUT                                      │
                │     candidates/{date}.csv trié                  │
                │     Commit auto + push                          │
                └─────────────────────────────────────────────────┘
                                    │
                                    ▼ (Claude consulte le CSV)
                ┌─── ANALYSE DÉTAILLÉE (à la demande) ──────────┐
                │                                                 │
                │  analyze_match.py --sport X --home A --away B  │
                │                                                 │
                │  Aggregate :                                    │
                │    - TennisAbstract (tennis)                    │
                │    - NBA/NHL/MLB stats officielles (sports US) │
                │    - Polymarket prob (toujours)                 │
                │                                                 │
                │  Médiane → Recommandation SAFE/MARGINAL/ÉVITER │
                └─────────────────────────────────────────────────┘
                                    │
                                    ▼
                ┌─── DOCUMENTATION DU PICK (Claude) ─────────────┐
                │                                                 │
                │  ANALYSIS_FRAMEWORK.md (15 sections ABC...)    │
                │  METHODOLOGY.md (5 étapes, checklist 6 quest.)│
                │                                                 │
                │  picks_data.py : ajout entrée                  │
                │  build_history.py : régénère JSON              │
                │  git commit + push                              │
                └─────────────────────────────────────────────────┘
                                    │
                                    ▼
                ┌─── LE LENDEMAIN ────────────────────────────────┐
                │                                                 │
                │  User confirme le résultat                      │
                │  picks_data.py : pending → win/loss            │
                │  LESSONS_LEARNED.md : post-mortem si défaite   │
                │  Push main → GH Pages déploie                   │
                └─────────────────────────────────────────────────┘
```

---

## 📡 Sources de données utilisées (toutes gratuites)

| Source | Type | Utilisé par |
|---|---|---|
| The Odds API | Cotes multi-books | `daily_candidates.py` |
| Polymarket Gamma API | Proba sharp crypto | `daily_candidates.py`, `analyze_match.py` |
| TennisAbstract (scraping) | Elo par surface | `analyze_match.py --sport tennis` |
| stats.nba.com | Stats NBA officielles | `analyze_match.py --sport nba` |
| api-web.nhle.com | Stats NHL officielles | `analyze_match.py --sport nhl` |
| statsapi.mlb.com | Stats MLB officielles | `analyze_match.py --sport mlb` |

**Coût total : 0 €/mois**.

---

## 🛠 Maintenance & évolution

### Phase 3 — à venir si besoin

- **Flashscore scraper** : auto-update des outcomes (au lieu de WebSearch manuel)
- **API-Football** : enrichissement football (lineups, blessures, formations)
- **Sofascore unofficial** : xG live + ratings joueurs (foot, NBA, tennis)
- **Notification matinale** : webhook Discord ou email avec le top 3 candidats du jour
- **Bot Discord** : diffusion des picks aux abonnés (canal alternatif au web)

### Calibration

Suivre `LESSONS_LEARNED.md` après chaque pick. Si écart entre confiance déclarée
et taux de win observé > 10 pts sur 20+ picks → re-calibrer les modèles (ajuster les
poids dans `fair_odds.py:blend_with_polymarket` et `safety_score`).
