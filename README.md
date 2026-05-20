# PRONOSTICS

Plateforme de pronostics sportifs quotidiens : agrège des événements depuis plusieurs sources
(API-Football, Football-Data.org, The Odds API), calcule une probabilité par issue à l'aide de
moteurs heuristiques par sport, et expose le tout via une API GraphQL consommée par une UI
Next.js.

## Sports couverts

- Football (soccer)
- Basketball (NBA, Euroleague)
- Tennis (ATP/WTA)
- Sports US (NFL, MLB, NHL)

## Architecture

```
PRONOSTICS/
├── backend/                    # FastAPI + GraphQL (Strawberry) + SQLite
│   ├── app/
│   │   ├── adapters/           # Connecteurs API externes (+ mock fallback)
│   │   ├── engines/            # Moteurs de prédiction par sport (heuristique → ML)
│   │   ├── graphql/            # Schéma GraphQL
│   │   ├── services/           # Ingestion + agrégation prédictions
│   │   └── ml/                 # Modèles statistiques (Poisson, etc.)
│   └── scripts/daily_update.py # Pipeline quotidien
├── frontend/                   # Next.js + Apollo + Tailwind
└── .github/workflows/          # GitHub Action quotidienne
```

## Démarrage rapide

### Backend (génération des pronostics)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env      # remplir les clés API (optionnel — mock par défaut)
python scripts/daily_update.py  # ingestion + prédictions → backend/data/predictions/<date>.json
uvicorn app.main:app --reload   # (optionnel) GraphQL → http://localhost:8000/graphql
```

### Frontend (site statique)

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

Le frontend lit les JSON générés par le backend (`backend/data/predictions/`).
Avant `next build`, un script copie ces JSON dans `frontend/public/data/predictions/`.

## Déploiement GitHub Pages

Le site se déploie automatiquement sur GitHub Pages — aucune infra à héberger.

**Setup initial** (une seule fois) :
1. Sur GitHub → `Settings` → `Pages` → `Source` : **GitHub Actions**
2. (Optionnel) `Settings` → `Secrets and variables` → `Actions` → ajouter
   `API_FOOTBALL_KEY`, `FOOTBALL_DATA_TOKEN`, `ODDS_API_KEY` si tu as les clés
3. Merge cette branche sur `main`

**Flux automatique** :
- `.github/workflows/daily-update.yml` tourne chaque jour à 06:00 UTC :
  génère les pronostics et commit le JSON sur `main`
- `.github/workflows/deploy-pages.yml` se déclenche au push sur `main` :
  rebuild le site et le déploie

**URL du site** : `https://<ton-user>.github.io/PRONOSTICS/`

**Déclenchement manuel** : onglet `Actions` → `Daily predictions update` →
`Run workflow` (tu peux saisir une date précise).

## Configuration des sources de données

| Variable d'env             | Source              | Free tier             |
|----------------------------|---------------------|-----------------------|
| `API_FOOTBALL_KEY`         | RapidAPI Football   | 100 req/jour          |
| `FOOTBALL_DATA_TOKEN`      | football-data.org   | 10 req/min            |
| `ODDS_API_KEY`             | the-odds-api.com    | 500 req/mois          |

Sans clé, l'app utilise un adapter mock qui génère des matches plausibles.

## Pipeline quotidien

Le workflow GitHub `daily-update.yml` lance `scripts/daily_update.py` chaque jour à 06:00 UTC :
1. Récupère les fixtures du jour depuis chaque adapter actif
2. Calcule les features (forme, h2h, classement, etc.)
3. Applique le moteur de prédiction du sport concerné
4. Persiste les prédictions en base
5. Optionnel : commit `backend/data/predictions.json` pour exposer en statique

Tu peux le déclencher manuellement via l'onglet **Actions** sur GitHub.

## Moteurs de prédiction

Chaque sport a son moteur dans `backend/app/engines/`. Tous implémentent la même interface
`PredictionEngine.predict(match) -> Prediction` avec :
- `probabilities` : dict `{outcome: probability}` (somme = 1)
- `confidence` : float 0-1
- `rationale` : list de facteurs explicatifs

Les heuristiques v1 combinent forme récente, classement, h2h et avantage à domicile. Les
modèles ML (Poisson pour foot, Elo pour tennis, etc.) sont des hooks dans `app/ml/` à
remplir au fur et à mesure.

## Ajouter un nouveau sport

1. Créer `backend/app/engines/<sport>_heuristic.py` qui hérite de `BasePredictionEngine`
2. Enregistrer le moteur dans `app/engines/__init__.py`
3. Ajouter l'adapter source dans `app/adapters/` si nécessaire
4. Étendre les enums GraphQL dans `app/graphql/schema.py`
