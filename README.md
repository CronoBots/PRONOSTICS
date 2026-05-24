# PRONOSTICS — NΞXBΞT

Plateforme de pronostics sportifs quotidiens. Le backend Python agrège des matchs
via WebSearch sur sources whitelistées + APIs (Football-Data.org, API-Football,
The Odds API quand quota dispo), calcule des probabilités via la méthodologie
**NΞXBΞT v4.2**, et expose les résultats via un frontend Next.js déployé en
statique sur GitHub Pages.

## 🟦 Identité visuelle v5 — Cobalt Premium (24/05/2026)

Le projet utilise la palette **Cobalt** (bleu `#2A4BFA`) comme couleur de marque :
logo (un "N" cobalt stylisé), CTA primaires, brand text, glow shadows.
La sémantique gain/perte reste universelle :
- 🟢 vert `#10D9A3` pour les gains/wins/profits
- 🔴 rouge `#FF4D6D` pour les pertes/losses
- 🟦 cobalt = **brand uniquement** (pas sémantique)

Cf. `frontend/tailwind.config.js` et `frontend/src/styles/globals.css` pour les
tokens et thème light/dark.

## 📊 Mode actuel : Paper trading (24/05 → 23/06/2026)

Le projet est en **cycle paper trading 30 jours**. Bankroll virtuel 100€ démarré
le 24/05/2026, bankroll réel 25€ gelé pendant le cycle. Aucun bet réel n'est
placé tant que le cycle n'est pas terminé et que les seuils Calibration Brier <
0.235 + ROI ≥ 0% ne sont pas atteints.

Cf. `backend/data/nexbet/paper_trading_log.md` pour les positions virtuelles et
`backend/data/nexbet/decisions/<date>.md` pour les traces d'analyse quotidienne.

## Sports couverts

- Tennis (ATP/WTA — Grand Chelems, Masters 1000, ATP Tour)
- Basketball (NBA Playoffs, Euroleague Final Four)
- Hockey sur glace (NHL Playoffs)
- Football (Premier League, Bundesliga, Ligue 1, Champions League finale, EFL)
- Baseball (MLB)
- Sports US (NFL en saison)

## Architecture

```
PRONOSTICS/
├── backend/                       # Pipeline Python + méthodologie NEXBET
│   ├── app/                       # FastAPI + GraphQL Strawberry (optionnel)
│   │   ├── adapters/              # Football-Data, API-Football, Odds API
│   │   ├── engines/               # Moteurs de prédiction par sport
│   │   ├── services/              # fair_odds, ingestion
│   │   └── ml/                    # Poisson, Elo (hooks)
│   ├── scripts/
│   │   ├── daily_update.py        # Pipeline quotidien (cron 06h UTC)
│   │   ├── daily_candidates.py    # Génère candidats CSV/MD via WebSearch
│   │   ├── build_history.py       # Reconstruit history.json depuis picks_data.py
│   │   ├── picks_data.py          # Source de vérité des picks placés
│   │   └── analyze_match.py       # CLI manuel multi-sources
│   └── data/
│       ├── history.json           # Picks résolus + stats (consommé par frontend)
│       ├── candidates/            # CSV+MD générés par daily_candidates
│       ├── comparison/            # Comparatifs proba modèles vs book
│       └── nexbet/                # Méthodologie + traces décisions NEXBET
│           ├── method.md          # Procédure 8 étapes v4
│           ├── criteria.md        # F1-F6 + seuils EV + shrinkage Bayesian
│           ├── learnings.md       # Anti-bias rules + patterns détectés
│           ├── output-format.md   # v4.2 dual artefact (trace + rapport user)
│           ├── sources_catalogue.md  # Whitelist sources (accessible/forbidden)
│           ├── paper_trading_log.md  # Positions virtuelles du cycle paper
│           ├── decisions/<date>.md   # Traces quotidiennes audit-grade
│           └── archive/              # Docs v3 archivés
├── frontend/                      # Next.js static (déployé GitHub Pages)
│   ├── src/
│   │   ├── pages/                 # Routes (/, /paris, /stats, /today, etc.)
│   │   ├── components/            # BrandLogo, Header, BankrollChart, etc.
│   │   ├── styles/globals.css     # Theme tokens light/dark + palette v5
│   │   └── lib/                   # i18n, dataSource, types, auth
│   └── public/
│       ├── logo.png               # Logo cobalt transparent 512×512
│       ├── logo-square.png        # Logo cobalt fond noir 512×512 (OG)
│       ├── favicon-32.png         # Favicon onglet navigateur
│       ├── apple-touch-icon.png   # Icon iOS home screen
│       └── data/                  # JSON copiés via prebuild script
├── .claude/
│   └── agents/nexbet-analyst.md   # Spec de l'agent IA NEXBET
└── .github/workflows/             # CI/CD GitHub Actions
```

## Démarrage rapide

### Backend (génération des pronostics)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env      # remplir les clés API (optionnel — mock par défaut)
python scripts/daily_update.py  # ingestion + prédictions → backend/data/history.json
python scripts/build_history.py # reconstruit history.json depuis picks_data.py
```

### Frontend (site statique)

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

Le frontend lit `backend/data/history.json` et les fichiers générés. Avant
`next build`, le script `frontend/scripts/copy-predictions.js` copie les JSON
dans `frontend/public/data/`.

## Méthodologie NΞXBΞT (v4.2)

L'agent NEXBET cartographie chaque jour les matchs disponibles, applique les
filtres F1-F6 (cote 1.50-2.00, anti-duplication, sources whitelist, EV strict
≥ +2%), calcule une probabilité Bayesian-shrunk (proba_shrunk = (n_eff × model
+ 2 × book) / (n_eff + 2)), et présente un TOP 3 candidats au user qui décide
de valider ou skipper.

**Mode recap-only depuis v4.0** : l'agent ne valide JAMAIS automatiquement,
le user tranche. Pas de tier FLOOR, pas de F1-bis playoff mode, pas de bonus
PC ni malus sharp (tous supprimés en v4).

**Dual artefact v4.2** : à chaque run, deux sorties distinctes :
1. **Trace technique** (`backend/data/nexbet/decisions/<date>.md`) — calculs,
   sources URLs, anti-bias, pour audit méthodologique
2. **Rapport user narratif** — sport et compétition explicites, bio joueurs,
   langage accessible, sans jargon technique (interdit : "proba_shrunk",
   "F1-F6", "AB-X" dans la réponse user)

Cf. `backend/data/nexbet/method.md` pour la procédure complète + sources
whitelistées dans `sources_catalogue.md`.

## Déploiement GitHub Pages

Le site se déploie automatiquement sur GitHub Pages — aucune infra à héberger.

**Setup initial** (une seule fois) :
1. Sur GitHub → `Settings` → `Pages` → `Source` : **GitHub Actions**
2. (Optionnel) `Settings` → `Secrets and variables` → `Actions` → ajouter
   `API_FOOTBALL_KEY`, `FOOTBALL_DATA_TOKEN`, `ODDS_API_KEY` si tu as les clés
3. Merge cette branche sur `main`

**Flux automatique** :
- `.github/workflows/daily-update.yml` tourne chaque jour à 06h UTC :
  génère les candidats du jour et commit sur `main`
- `.github/workflows/deploy-pages.yml` se déclenche au push sur `main` :
  rebuild le site et le déploie

**URL du site** : `https://<ton-user>.github.io/PRONOSTICS/`

## Configuration des sources de données

| Variable d'env             | Source              | Free tier             | Statut actuel (mai 2026) |
|----------------------------|---------------------|-----------------------|--------------------------|
| `API_FOOTBALL_KEY`         | RapidAPI Football   | 100 req/jour          | OK                       |
| `FOOTBALL_DATA_TOKEN`      | football-data.org   | 10 req/min            | OK                       |
| `ODDS_API_KEY`             | the-odds-api.com    | 500 req/mois          | ⚠️ Quota épuisé (498/500) |

⚠️ **The Odds API quota épuisé** : depuis fin mai 2026, le pipeline backend
fonctionne en mode dégradé sans l'API Odds. La méthodologie NEXBET v4.1+ se
base sur WebSearch sur les sources whitelistées (Dimers, Tennis Tonic, Last
Word on Sports, Bleacher Nation, Stats Insider, etc.) plutôt que sur l'API
quantitative.

Sans clé, le backend utilise un adapter mock qui génère des matches plausibles.

## Pipeline quotidien

Le workflow GitHub `daily-update.yml` lance `scripts/daily_update.py` chaque
jour à 06h UTC :
1. Récupère les fixtures du jour depuis chaque adapter actif
2. Calcule les features (forme, H2H, classement, etc.)
3. Applique le moteur de prédiction du sport concerné
4. Persiste dans `backend/data/history.json`
5. Génère `backend/data/candidates/<date>.csv` + `.md` pour audit

L'agent NEXBET (`/nexbet-analyst`) prend le relais en mode interactif pour
analyser les candidats et présenter le TOP 3 au user.

Tu peux déclencher manuellement via l'onglet **Actions** sur GitHub.

## Moteurs de prédiction

Chaque sport a son moteur dans `backend/app/engines/`. Tous implémentent la
même interface `PredictionEngine.predict(match) -> Prediction` avec :
- `probabilities` : dict `{outcome: probability}` (somme = 1)
- `confidence` : float 0-1
- `rationale` : list de facteurs explicatifs

Les heuristiques v1 combinent forme récente, classement, H2H et avantage à
domicile. Les modèles ML (Poisson pour foot, Elo pour tennis, etc.) sont des
hooks dans `app/ml/` à remplir au fur et à mesure.

## Ajouter un nouveau sport

1. Créer `backend/app/engines/<sport>_heuristic.py` qui hérite de `BasePredictionEngine`
2. Enregistrer le moteur dans `app/engines/__init__.py`
3. Ajouter l'adapter source dans `app/adapters/` si nécessaire
4. Étendre les enums GraphQL dans `app/graphql/schema.py`
5. Documenter les sources WebSearch whitelistables dans `sources_catalogue.md`
