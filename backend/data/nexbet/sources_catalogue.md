# Catalogue des sources NEXBET (v4.7 — Focus tennis/football/NBA)

> **v4.7 (26/05/2026)** : nouvel **ordre de priorité unifié** sur les 3
> sports actifs :
> 1. **SofaScore** = source **primaire** (tous sports). Pas de quota.
>    `backend/app/adapters/sofascore.py` enrichi à ~45 fonctions
>    (event details, votes, lineups, h2h, rankings ATP/WTA, standings
>    home/away, top players, transfer history, win probability graph…).
> 2. **API-Sports** = source **secondaire** — réserver le quota 100 req/jour
>    aux endpoints uniques (`/predictions`, `/injuries`, `/lineups`
>    confirmées) qui ne sont PAS dans SofaScore.
> 3. **The Odds API** = source **cotes uniquement** — 500 req/mois free,
>    pour la comparaison bookmakers.
> Cherry-pick depuis github.com/tommhe14/sofascore-wrapper (MIT) +
> github.com/apdmatos/sofascore-api (MIT). Validation locale 17/20
> tests OK (3 EMPTY normaux : win_probability/pregame_form non
> disponibles tennis ; édge cases foot low-tier).
>
> **Cleanup ciblé (25/05/2026 soir)** : promotion d'**API-Sports en
> source quanti PRIORITÉ #1** pour foot/basket. Résolution de
> l'incohérence triple SofaScore (legacy 🔴 supprimée, adapter app
> obsolète vs wrapper scripts v4.5 clarifié). Whitelists par sport
> nettoyées. Sources qui ne couvrent QUE NHL/MLB/NFL retirées des
> tables actives (déplacées en "archive sports suspendus").
>
> **v4.6 (25/05/2026)** : **focus stratégique foot / basket / tennis
> UNIQUEMENT**. Sources US sports (NHL, MLB, NFL) marquées "inactives
> v4.6" mais conservées dans la doc pour réactivation future.
>
> **v4.5 (25/05/2026)** : intégration **SofaScore API** (api.sofascore.com)
> comme source de cartographie tennis prioritaire + signal Win Probability.
> Couverture tennis manquante de v4.4 désormais couverte. ⚠️ API non-officielle
> (TOS gris, usage perso toléré).
>
> **v4.4 (24/05)** : intégration API-Sports pour foot/basket/hockey/baseball.
> **Refonte v4.0 (23/05)** : reclassement par accessibilité réelle.

## 🟢 ACCESSIBLE — Ordre de priorité v4.7

**Règle d'or v4.7** : SofaScore d'abord (toujours), API-Sports pour les
gaps (predictions/injuries/lineups confirmées), The Odds API pour les
cotes uniquement. Préserver le quota API-Sports = ne pas dupliquer ce
que SofaScore couvre déjà.

### ⭐ SofaScore (api.sofascore.com) — PRIMAIRE tous sports (v4.7)

**Statut** : 🟢 ACCESSIBLE (validé local 17/20 tests OK, 2026-05-26)
**Type** : API JSON publique non-officielle (frontend reverse-engineered)
**Authentification** : aucune, juste User-Agent navigateur
**Quota** : aucun (rate-limit interne ~4 req/sec côté adapter)
**Couverture v4.7 (sports actifs)** :
- 🎾 **Tennis** : 1245 matchs/jour, rankings ATP/WTA, h2h, bio joueurs
- ⚽ **Football** : programme, standings home/away, top players, lineups, win-prob
- 🏀 **NBA** : programme basketball, standings, top players, h2h, votes

**Wrapper Python** : `backend/app/adapters/sofascore.py` (async httpx, ~45 fonctions)

**Endpoints clés NEXBET (groupés par bloc)** :
- Programme : `fetch_scheduled_events(sport, date)`
- Event drill-down : `fetch_event_details`, `fetch_lineups`, `fetch_incidents`,
  `fetch_win_probability` (foot/basket), `fetch_pregame_form` (foot/basket),
  `fetch_match_votes` (sentiment public), `fetch_h2h_events`, `fetch_h2h_stats`,
  `fetch_team_streaks`, `fetch_shotmap`, `fetch_managers`
- Player : `fetch_player_details`, `fetch_player_transfer_history`,
  `fetch_player_attributes` (style), `fetch_player_last_events`,
  `fetch_player_league_stats`
- Team : `fetch_team_details`, `fetch_team_squad`, `fetch_team_last/next_events`,
  `fetch_team_performance`, `fetch_team_transfers`, `fetch_team_league_stats`
- League : `fetch_league_info`, `fetch_league_seasons`, `get_current_season_id`
  (helper), `fetch_league_rounds`, `fetch_league_fixtures_round`,
  `fetch_top_players_league`, `fetch_top_teams_league`
- Classements : `fetch_standings/_home/_away`, `fetch_rankings(atp/wta)`
- Search : `search_entities` (universel), `search_player_or_team`

**Limites** :
- `win_probability` et `pregame_form` ne marchent QUE foot/basket (pas tennis)
- Endpoints "graph" (win-prob graph, comments, highlights) souvent vides
  hors live ou pour les matchs low-tier
- Cloudflare 403 occasionnel — User-Agent navigateur + ~4 req/sec dans
  l'adapter, pas de retry agressif

**Activation** : aucune action — l'adapter marche out-of-the-box dès
clone du repo.

**Validation** : `cd backend && python scripts/test_sofascore.py`

---

### API-Sports (api-sports.io) — SECONDAIRE (v4.4, repriorité v4.7)

**Statut** : 🟢 ACCESSIBLE — clé requise (free signup 100 req/jour)
**Type** : API REST officielle, documentée publiquement
**Authentification** : header `x-apisports-key` (clé dans `.env` → `API_SPORTS_KEY`)
**Couverture v4.6 (sports actifs)** :
- ⚽ **Football** : toutes ligues mondiales (Premier League, Bundesliga,
  Ligue 1, La Liga, Serie A, Champions League, Coupes nationales, etc.)
- 🏀 **Basketball** : NBA + Euroleague + ligues européennes
- 🎾 Tennis : **NON couvert** → utiliser SofaScore en remplacement
- 🏒 NHL, ⚾ MLB, 🏈 NFL, 🏎 F1, 🥊 MMA : couverts mais hors scope v4.6

**Endpoints clés NEXBET** :
- `/fixtures?date={YYYY-MM-DD}` — cartographie matchs du jour par ligue
- `/fixtures/headtohead?h2h={team1}-{team2}` — historique face-à-face
- `/predictions?fixture={id}` — ⭐ **proba modèle propriétaire** (compte
  comme source quanti #1 dans n_eff)
- `/odds?fixture={id}` — cotes multi-bookmakers (dont bwin)
- `/injuries?team={id}&season={year}` — blessures équipe
- `/lineups?fixture={id}` — compositions confirmées
- `/standings?league={id}&season={year}` — classement saison
- `/players/topscorers` — meilleurs buteurs ligue

**Plan Free** : 100 req/jour, 10 req/min (largement suffisant pour le
scan quotidien NEXBET — typiquement 30-50 req/jour pour 5-10 candidats).
**Plan Pro** ($19/mois) : 7500 req/jour si scaling.

**Wrapper Python** : `backend/scripts/sportsapi.py`
- Classe `SportsAPI` avec rate limiting, retry exponentiel, status check
- `LEAGUE_IDS` constante avec IDs ligues principales pré-mappés
- Exception `SportsAPIError` pour erreurs auth/quota/rate-limit

**Script de test** : `backend/scripts/check_sportsapi.py` (CLI)
```bash
python backend/scripts/check_sportsapi.py
```

**Activation** :
1. Inscription gratuite sur https://api-sports.io
2. Récupérer la clé dans dashboard "My Access"
3. Ajouter `API_SPORTS_KEY=ta_cle` dans `.env` racine repo
4. Tester avec `check_sportsapi.py`

**Usage NEXBET** : appel systématique aux endpoints `/predictions` et
`/odds` pour chaque candidat foot ou basket pendant l'Étape 3 (analyse
approfondie). Le `%` de prédiction renvoyé compte comme **1 source
quantitative dans `n_eff`** (avec tag `api-sports` dans la trace).

---

### ~~SofaScore API — PRIORITÉ #1 tennis (v4.5)~~ → voir bloc PRIMAIRE ci-dessus

> v4.7 : SofaScore est devenu **PRIMAIRE tous sports**. Bloc fusionné
> dans la section "PRIMAIRE tous sports" en tête de catalogue.

#### SofaScore API (api.sofascore.com) — ancien bloc v4.5 (référence historique)

**Statut** : 🟢 ACCESSIBLE — réponse JSON confirmée par user 25/05/2026
**Type** : API JSON non-officielle (frontend SofaScore reverse-engineered)
**Authentification** : aucune (juste User-Agent navigateur)
**Cloudflare** : bypass via `cloudscraper` Python si nécessaire

**⚠️ TOS** : API non-documentée publiquement. Usage perso (paper trading,
analyse) **toléré** par la communauté. Usage commercial large = risqué
légalement. NEXBET = usage perso solo dev, OK.

**Couverture** :
- 🎾 Tennis (ATP/WTA/Grand Chelems/Challengers — **comble le gap API-Sports**)
- ⚽ Football (toutes ligues mondiales)
- 🏀 Basketball (NBA, Euroleague, etc.)
- 🏒 Hockey (NHL, KHL, etc.)
- ⚾ Baseball (MLB, etc.)
- 🏈 NFL, 🏎 F1, 🥊 MMA, rugby, etc.

**Endpoints clés NEXBET** :
- `/sport/{sport}/scheduled-events/{date}` — **cartographie auto par jour**
- `/event/{id}/win-probability` — ⭐ **signal proba modèle propriétaire**
  (signal différenciant absent des autres sources whitelist)
- `/event/{id}/odds/1/all` — cotes multi-bookmakers consolidées
- `/event/{id}/h2h` — historique face-à-face structuré
- `/event/{id}/lineups` — compositions (foot)
- `/event/{id}/statistics` — stats détaillées (xG, aces, etc.)
- `/event/{id}` — détails match
- `/search/players/{query}` — recherche joueur

**Data par event (riche)** :
- Ranking ATP/WTA en temps réel
- Seed (TS#, WC, Q, LL)
- Venue + court (Philippe-Chatrier, Suzanne-Lenglen, etc.)
- groundType (Red clay, Hard, Grass)
- status.code (0=NotStarted, 100=Ended, 70=Canceled)
- winnerCode (1=home, 2=away si fini)
- startTimestamp Unix précis
- userCount (proxy popularité / intérêt marché)

**Wrapper Python** : `backend/scripts/sofascore.py`
- Classe `SofaScore` avec rate limiting auto (1 req/sec)
- Cloudscraper fallback pour bypass Cloudflare
- Helpers : `filter_top_n_atp()`, `filter_by_round()`, `summarize_event()`

**Rate limit** : ~30 req/min toléré, >100/min = ban IP probable
**Stabilité** : API peut changer sans préavis (frontend update = endpoints
peuvent bouger). À monitorer.

**Installation** :
```bash
pip install cloudscraper requests
```

**Usage** :
```python
from sofascore import SofaScore, filter_top_n_atp, summarize_event

s = SofaScore()
events = s.scheduled_events("tennis", "2026-05-25")  # cartographie
top10 = filter_top_n_atp(events, n=10)               # filtre top-10 ATP

# Pour un match spécifique
event_id = top10[0]["id"]
wp = s.win_probability(event_id)  # signal modèle
h2h = s.h2h(event_id)             # historique
```

## 🟢 ACCESSIBLE — Sources primaires v4 (whitelist WebSearch)

Ces sources passent les requêtes WebFetch sans 403 ET fournissent du
contenu lisible. À utiliser en priorité comme source pour `model_proba`.

| Source | URL | Sports | Type contenu |
|---|---|---|---|
| **Last Word on Sports** | lastwordonsports.com | Tennis, NBA, NHL, MLB, Soccer | Preview + prediction texte |
| **Bleacher Nation** | bleachernation.com/picks | Multi-sports | Picks + analyses détaillées |
| **Dimers** | dimers.com | NBA, NHL, NFL, MLB, Tennis | Modèle prob explicite |
| **Stats Insider** | statsinsider.com.au | Multi-sports | Modèle ML + prob explicite |
| **Tennis Tonic** | tennistonic.com | Tennis ATP/WTA | H2H + prediction + odds |
| **Tennis Up to Date** | tennisuptodate.com | Tennis ATP/WTA | Preview + finale focus |
| **Covers** | covers.com | NBA, NHL, MLB, NFL, Soccer | Consensus + analyses |
| **Lineups** | lineups.com | NBA, NHL, MLB | Previews + lineups |
| **FanDuel Research** | fanduel.com/research | NBA, NFL, NHL, MLB | Player projections |
| **Goal.com** | goal.com/en-gb/betting/tips | Soccer Europe | Tips + predictions |
| **SportsGambler** | sportsgambler.com | Soccer Europe | Predictions + odds |
| **CBS Sports** | cbssports.com (via snippets) | NBA, NHL, MLB, NFL | Picks (SportsLine model) |
| **Lastwordonsports — backup** | lastwordonsports.com | Tennis surtout | Multi articles par match |

## 🟡 SNIPPET-ONLY — Utilisable via WebSearch uniquement

Ces sources sont souvent en 403 sur WebFetch direct, MAIS les snippets
WebSearch contiennent souvent la proba/prediction utile.

**Règle v4.1** : un % chiffré lu via snippet WebSearch est **accepté
comme source quantitative** (compte 1× dans `n_eff`) à condition que la
trace identifie "via snippet" et reproduise le snippet textuel. Ex :
*"Polymarket Pirates 59¢"* → proba = 0.59, source quanti.

| Source | URL | Sports | Note |
|---|---|---|---|
| **ESPN** | espn.com | NBA, NFL, MLB, NHL | BPI dans snippets |
| **Yahoo Sports** | sports.yahoo.com | Multi-sports | Articles preview |
| **Action Network** | actionnetwork.com | Multi-sports | Sharp picks (snippets) |
| **OddsShark** | oddsshark.com | NBA, NHL, MLB, NFL | Consensus picks |
| **NBC Sports** | nbcsports.com | NBA, NFL | Articles preview |
| **FanGraphs** | fangraphs.com | MLB | Sabermétrique (snippets) |
| **Baseball Reference** | baseball-reference.com | MLB | Stats historiques |
| **profootballnetwork** | profootballnetwork.com | Tennis (parfois), NFL | Previews multi-sport |
| **puntodebreak** | puntodebreak.com | Tennis | Preview en/es |
| **freetips** | freetips.com | Soccer, Tennis | Picks + value |
| **clutchpoints** | clutchpoints.com | NBA | Game previews |
| **el-balad** | el-balad.com | Tennis (parfois) | Preview en arabe avec data |
| **dailysports** | dailysports.net | Soccer | Analytical previews |

**Utilisation** : extraire les probas/picks des snippets de résultats
WebSearch, ne pas tenter WebFetch direct.

## 🔴 FORBIDDEN — Inaccessibles, ne plus citer comme source primaire

Ces sources renvoient systématiquement 403 ou data inutilisable. Ne plus
les utiliser comme source primaire pour `model_proba`. Citer seulement
si trouvées dans un autre snippet, en mentionnant que la data n'a pas pu
être lue.

| Source | URL | Raison | Workaround |
|---|---|---|---|
| **ATP Tour officiel** | atptour.com | Cloudflare 403 | Citer URL si présente dans search, data non lue |
| **WTA Tour officiel** | wtatennis.com | 403 | Citer URL si présente dans search |
| **TennisTemple** | tennistemple.com | 403 | Aucun — abandonner |
| **NHL.com** | nhl.com | 403 fréquent | Snippets WebSearch parfois OK (sport hors scope v4.6 de toute façon) |
| **NBA.com** | nba.com | 403 fréquent | Snippets WebSearch parfois OK |
| **Polymarket frontend** | polymarket.com | JS-rendered | URL citable, data non lue |
| **Pinnacle** | pinnacle.com | Login required + geo-block | Aucun — abandonner |
| **Betfair Exchange** | betfair.com | Login required | Aucun — abandonner |
| **Tennis Abstract** | tennisabstract.com | Souvent 403 | Limited |

> **Note** : SofaScore via `sofascore.com` (frontend HTML) reste inaccessible
> en 403, MAIS l'API JSON `api.sofascore.com` accédée via `cloudscraper`
> fonctionne — cf. section 🟢 SofaScore API ci-dessus. Ne pas confondre.
> L'ancien adapter `backend/app/adapters/sofascore.py` (requests simples)
> est obsolète, utiliser `backend/scripts/sofascore.py` (cloudscraper).

## 🔵 PIPELINE BACKEND — Wrappers Python du repo (status v4.6)

Statut des wrappers/adapters Python branchés sur `daily_candidates.py` /
`analyze_match.py` et utilisables directement par l'agent via `Bash`.

| Source | Chemin | Statut v4.6 | Note |
|---|---|---|---|
| ⭐ **SofaScore (v4.7)** | `backend/app/adapters/sofascore.py` | 🟢 **PRIMAIRE tous sports** | Async httpx, ~45 fonctions, validé 17/20 tests 2026-05-26 |
| API-Sports | `backend/scripts/sportsapi.py` | 🟢 **SECONDAIRE** (gaps SofaScore) | Clé requise — `API_SPORTS_KEY` dans `.env`. Réserver pour `/predictions`, `/injuries`, `/lineups` |
| The Odds API | `backend/app/adapters/odds_api.py` | 🟢 **TERTIAIRE — cotes** | 500 req/mois — comparaison bookmakers. Reset mensuel |
| Football-Data | `backend/app/adapters/football_data.py` | 🟢 Backup foot | Free token `FOOTBALL_DATA_TOKEN` |
| API-Football | `backend/app/adapters/api_football.py` | 🟢 Backup foot | Même clé qu'API-Sports |
| Polymarket Gamma | `backend/app/adapters/polymarket.py` | ⚠️ Accessible, sport-dépendant | Sharp signal via snippet si liquidité |
| Manifold Markets | `backend/app/adapters/manifold.py` | ⚠️ Marchés rares | Sports premium uniquement |
| Kalshi | `backend/app/adapters/kalshi.py` | ⚠️ Accessible | Sample limité |
| Balldontlie (NBA) | `backend/app/adapters/balldontlie.py` | 🟢 Backup props NBA | Clé `BALLDONTLIE_KEY` — réservé aux player props |
| NBA Stats officiel | `backend/app/adapters/nba_stats.py` | 🟢 Backup standings/forme | API gratuite sans clé |
| OpenWeather | `backend/app/adapters/openweather.py` | 🟢 Météo foot extérieur | Clé `OPENWEATHER_KEY` |
| Tennis Abstract | `backend/app/adapters/tennis_abstract.py` | ⚠️ Scraping fragile | 403 intermittent — fallback sur SofaScore |
| ~~SofaScore legacy~~ | `backend/scripts/sofascore.py` | ⏸ Conservé pour compat | Wrapper sync cloudscraper v4.5 — préférer adapter v4.7 |
| ~~NBA Stats~~ | `backend/app/adapters/nba_stats.py` | ⏸ Hors scope v4.6 | Stats historiques OK si réactivé |
| ~~NHL Stats~~ | `backend/app/adapters/nhl_stats.py` | ⏸ Hors scope v4.6 | NHL suspendu v4.6 |
| ~~MLB Stats~~ | `backend/app/adapters/mlb_stats.py` | ⏸ Hors scope v4.6 | MLB suspendu v4.6 |

**Mode opérationnel v4.6** :
- **Source quanti #1** : **API-Sports** (foot/basket) + **SofaScore** (tennis)
  via wrappers `backend/scripts/sportsapi.py` et `backend/scripts/sofascore.py`
- **Sources complémentaires** : WebSearch sur whitelist 🟢 + snippets 🟡
  (Dimers, Stats Insider, Tennis Tonic, Goal.com, etc.)
- **Backups** : Football-Data, Balldontlie, Polymarket si edge cases
- **The Odds API** : désactivée jusqu'à reset quota (juin 2026)

## Whitelist de référence par sport (v4.6 — focus foot/basket/tennis)

### ⚽ Soccer (Euro Championship, Coupes nationales) — **ACTIF**
1. ⭐ **API-Sports** (`/predictions`, `/odds`) — quanti #1
2. Goal.com
3. SportsGambler
4. CBS Sports
5. dailysports.net
6. Freetips
7. Covers
8. Football-Data (backup, ligues principales)

### 🏀 Basketball (NBA playoffs + Euroleague) — **ACTIF**
1. ⭐ **API-Sports** (`/predictions`, `/odds`) — quanti #1
2. Dimers
3. Bleacher Nation
4. CBS Sports (SportsLine model, via snippets)
5. FanDuel Research
6. Covers
7. Lineups
8. Balldontlie (backup stats NBA)

### 🎾 Tennis (Grand Slam + ATP/WTA tour) — **ACTIF**
1. ⭐ **SofaScore API** (`/win-probability`, `/h2h`) — quanti #1 (API-Sports ne couvre pas tennis)
2. Tennis Tonic
3. Last Word on Sports
4. Dimers
5. Stats Insider
6. Tennis Up to Date
7. Profootballnetwork (parfois)
8. Rotowire (utile en phase GS R1-R3)

**Note Grand Slam — Roland Garros 24/05 → 09/06/2026** :
AB-1 strict actif sur top-10 ATP J-1/J-2 → bloque les analyses tier 1.
Outsiders R1/R2 fortement déconseillés (variance élevée, coverage
faible). Tennis sera sous-représenté dans le funnel paper pendant 15j.
**Pas de compensation artificielle** : on accepte la déplétion plutôt
que d'analyser des matchs sous-couverts. Privilégier foot et basket
NBA en attendant. Biais documenté, à monitorer dans l'audit fin de cycle.

---

### 🔒 Sports suspendus v4.6 (whitelist conservée en archive)

> Les listes ci-dessous restent documentées pour réactivation future
> (bump v4.7+), mais ne doivent pas être utilisées tant que le focus
> reste foot/basket/tennis. **Aucune cartographie sur ces sports.**

#### 🏒 NHL (Stanley Cup playoffs) — **INACTIF v4.6**
1. Covers
2. Lineups
3. Bleacher Nation
4. Yahoo Sports (snippets)
5. OddsShark (snippets)

#### ⚾ MLB — **INACTIF v4.6**
1. OddsShark (snippets)
2. Action Network (snippets)
3. tonyspicks.com
4. FanGraphs (snippets)
5. Bleacher Nation
6. Covers

#### 🏈 NFL — **INACTIF v4.6** (intersaison de toute façon)
1. ESPN BPI (snippets)
2. FanDuel Research
3. CBS Sports SportsLine
4. Bleacher Nation
5. profootballnetwork

## Procédure de scraping v4

### Étape 1 — WebSearch
Lance N WebSearch parallèles avec query précise incluant :
- Nom des 2 équipes/joueurs
- Date exacte du match (jour + mois + année)
- Mot-clé `prediction` OR `odds` OR `pick`
- Exclure : compétitions confondues (ex: `-game2` si on cherche le G3)

### Étape 2 — WebFetch ciblé (whitelist 🟢 ACCESSIBLE uniquement)
Si WebSearch snippet insuffisant, faire un WebFetch sur une URL 🟢
accessible. Ne jamais tenter WebFetch sur 🔴 FORBIDDEN.

### Étape 3 — Extraction
Pour chaque source :
- Probabilité explicite si donnée (ex : "Mboko 59%")
- Pick recommandé si donné (ex : "We pick Navone")
- Quotes textuelles si utiles

### Étape 4 — Validation
Au moins **3 sources accessibles** avec proba ou pick explicite. Sinon
F4 KO, candidat rejeté.

## Risques corrélation modèle (v4.2)

Quand 2 sources whitelistées donnent une proba **exactement identique**
sur un même match (ex : Dimers 64% et Stats Insider 64% sur Kecmanović
au J1 24/05), suspecter un **modèle partagé** ou cross-citation :
- Décision défensive : compter **1× dans `n_eff`** (pas 2×)
- Documenter dans la trace : "Dédup défensive — Dimers 64% = Stats
  Insider 64% (suspect modèle partagé)"
- Médiane interne sur les % avant l'inclusion (devrait être triviale si
  identiques)

Domaines suspects d'utiliser un modèle commun (à surveiller) :
- Dimers + Stats Insider (parfois alignés au %)
- Lineups + Covers (cross-pollination probable sur NHL/NBA)
- FanDuel Research + Action Network (data partagée probable)

Quand le doute persiste, **n_eff = nombre de modèles distincts
estimés**, pas nombre de domaines.

## Snippet "agrégateur" anonyme — INTERDIT (v4.2)

Un snippet du type "consensus betting sites give X 65%" sans
composition explicite n'est PAS une source quantitative valide :
- Pas de domaine identifiable → F4 KO sur ce candidat
- Exiger la liste des sources composantes ou rejeter
- Cf. J1 (24/05) — Međedović "aggregator snippet 65%" sans provenance
  → à éviter dans les runs futurs

## Health-check des sources (mensuel)

Tous les mois, tester un WebFetch sur 3 URLs de chaque catégorie 🟢 pour
détecter les régressions :
- Si une source 🟢 passe en 403 → la déclasser en 🔴
- Si une source 🔴 redevient accessible → la promouvoir en 🟢
- Documenter les changements dans ce fichier

Date du dernier health-check : **2026-05-23**.
Date du dernier cleanup catalogue : **2026-05-25** (promotion API-Sports
PRIORITÉ #1, résolution incohérence SofaScore, simplification whitelists
v4.6).
Prochain health-check programmé : **2026-06-23** (fin cycle paper).
