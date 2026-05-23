# Catalogue des sources de données NΞXBΞT

Toutes les sources branchées sur le pipeline `daily_candidates.py` →
`analyze_match.py` → agent NΞXBΞT.

## 🟢 Tier 1 — Cotes & sharp markets

| Source | Adapter | Type | Coût | Inscription |
|---|---|---|---|---|
| **The Odds API** | `odds_api.py` | REST JSON | 500 req/mois free, plans pro ~$50/mo | https://the-odds-api.com/ |
| **Polymarket** | `polymarket.py` | REST (Gamma API) | Gratuit, **sans clé** | Aucune — public read-only |
| **Manifold Markets** | `manifold.py` | REST JSON | Gratuit, **sans clé** | Aucune — public read-only |
| **Kalshi** | `kalshi.py` | REST JSON | Read public sans clé. Clé optionnelle pour limites étendues. | https://kalshi.com (KYC pour trader, pas pour lire) |

### Variables d'env
```env
ODDS_API_KEY=xxx     # obligatoire pour cotes multi-books
KALSHI_KEY=          # optionnel, lecture publique marche sans
```

## 🟡 Tier 2 — Stats sports

| Source | Adapter | Type | Coût | Inscription |
|---|---|---|---|---|
| **MLB Stats API** | `mlb_stats.py` | REST JSON officielle | Gratuit, sans clé | Aucune |
| **NHL API** | `nhl_stats.py` | REST JSON officielle | Gratuit, sans clé | Aucune |
| **NBA Stats** | `nba_stats.py` | REST JSON officielle | Gratuit, sans clé | Aucune |
| **balldontlie.io** | `balldontlie.py` | REST JSON | Free signup (depuis 2024) | https://www.balldontlie.io/ |
| **API-SPORTS** | `api_sports.py` | REST JSON | 100 req/jour free, plans payants | https://api-sports.io/ |
| **API-Football** | `api_football.py` | REST JSON (sous-domaine API-SPORTS) | Idem API-SPORTS | https://www.api-football.com/ |
| **football-data.org** | `football_data.py` | REST JSON | Free tier, ligues majeures | https://www.football-data.org/ |
| **TennisAbstract** | `tennis_abstract.py` | Scraping HTML | Gratuit | Aucune |

### Variables d'env
```env
BALLDONTLIE_KEY=xxx      # NBA player stats
API_SPORTS_KEY=xxx       # multi-sport fallback
API_FOOTBALL_KEY=xxx     # même clé que API_SPORTS_KEY si tu as les deux
FOOTBALL_DATA_TOKEN=xxx  # soccer européen
```

## 🔵 Tier 3 — Contexte

| Source | Adapter | Type | Coût | Inscription |
|---|---|---|---|---|
| **OpenWeatherMap** | `openweather.py` | REST JSON | 1000 req/jour free | https://openweathermap.org/api |

### Variables d'env
```env
OPENWEATHER_KEY=xxx
```

## ⚙️ Procédure de mise en place

### 1. Créer les comptes (ordre de priorité)
1. **The Odds API** → clé en 2 min, débloque les cotes multi-books
2. **balldontlie.io** → débloque NBA player props
3. **API-SPORTS** → débloque tennis ATP 250 + coupes nationales soccer
4. **OpenWeatherMap** → débloque météo (impact MLB/NFL totaux)
5. **football-data.org** (optionnel) → fallback soccer européen
6. **Kalshi** (optionnel) → lecture publique marche sans clé

### 2. Copier les clés dans `.env` (racine du repo)
Voir `.env.example` à la racine pour le template.

### 3. Pour exécuter en local
```bash
cd backend
pip install -r requirements.txt
python scripts/daily_candidates.py            # CSV du jour
python scripts/analyze_match.py --sport nba --home Knicks --away Celtics
```

### 4. Whitelist réseau (Claude Code Web uniquement)
Si tu exécutes les scripts depuis l'environnement Claude Code Web (où la
network policy bloque les hôtes externes par défaut), ajoute ces hosts
à l'allowlist de l'environnement :
- `api.the-odds-api.com`
- `gamma-api.polymarket.com`
- `api.manifold.markets`
- `api.elections.kalshi.com`
- `statsapi.mlb.com`
- `api-web.nhle.com`
- `stats.nba.com`
- `api.balldontlie.io`
- `v3.football.api-sports.io`
- `v1.tennis.api-sports.io`
- `v1.basketball.api-sports.io`
- `v1.baseball.api-sports.io`
- `v1.hockey.api-sports.io`
- `api.openweathermap.org`
- `www.tennisabstract.com`

> **Note Belgique** : Polymarket bloque le trading mais l'API publique
> `gamma-api.polymarket.com` reste accessible pour la lecture des markets.
> C'est légal (équivalent à lire les cotes sur un site web).

## 🧪 Status / health-check

Pour vérifier qu'un adapter répond bien :
```python
# Manifold (sans clé)
python -c "import asyncio; from app.adapters import manifold; print(len(asyncio.run(manifold.fetch_active_sports_markets())))"

# Kalshi (sans clé)
python -c "import asyncio; from app.adapters import kalshi; print(len(asyncio.run(kalshi.fetch_all_sports_markets())))"

# Polymarket (sans clé)
python -c "import asyncio; from app.adapters import polymarket; print(len(asyncio.run(polymarket.fetch_all_candidate_picks())))"
```
