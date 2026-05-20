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

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # remplir les clés API (optionnel — mock par défaut)
python scripts/daily_update.py  # ingestion + prédictions du jour
uvicorn app.main:app --reload   # GraphQL → http://localhost:8000/graphql
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

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
