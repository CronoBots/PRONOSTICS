# Catalogue des sources NΞXBΞT (v4.6 — Focus foot/basket/tennis)

> **v4.6 (25/05/2026)** : **focus stratégique foot / basket / tennis
> UNIQUEMENT**. Sources US sports (NHL, MLB, NFL) marquées "inactives
> v4.6" mais conservées dans la doc pour réactivation future. Whitelist
> par sport simplifiée aux 3 sports actifs en tête, US sports archivés
> en fin de section.
>
> **v4.5 (25/05/2026)** : intégration **SofaScore API** (api.sofascore.com)
> comme source de cartographie tennis prioritaire + signal Win Probability.
> Couverture tennis manquante de v4.4 désormais couverte. ⚠️ API non-officielle
> (TOS gris, usage perso toléré).
>
> **v4.4 (24/05)** : intégration API-Sports pour foot/basket/hockey/baseball.
> **Refonte v4.0 (23/05)** : reclassement par accessibilité réelle.

## 🟢 ACCESSIBLE — Source officielle API

### API-Sports (api-sports.io) — Mode direct (v4.4)

[Section existante — voir doc complète v4.4 plus bas]

### SofaScore API (api.sofascore.com) — Reverse-engineered (NOUVEAU v4.5)

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
| **Sofascore** | sofascore.com / api.sofascore.com | 403 User-Agent + Cloudflare | Aucun — abandonner |
| **TennisTemple** | tennistemple.com | 403 | Aucun — abandonner |
| **NHL.com** | nhl.com | 403 fréquent | Snippets WebSearch parfois OK |
| **NBA.com** | nba.com | 403 fréquent | Snippets WebSearch parfois OK |
| **Polymarket frontend** | polymarket.com | JS-rendered | URL citable, data non lue |
| **Pinnacle** | pinnacle.com | Login required + geo-block | Aucun — abandonner |
| **Betfair Exchange** | betfair.com | Login required | Aucun — abandonner |
| **Tennis Abstract** | tennisabstract.com | Souvent 403 | Limited |

## 🔵 PIPELINE BACKEND — Sources API du repo (status réel v4)

Ces sources sont branchées sur `daily_candidates.py` / `analyze_match.py`
MAIS sont actuellement non opérationnelles dans l'environnement Claude
Code Web.

| Source | Adapter | Status v4 | Cause |
|---|---|---|---|
| The Odds API | `odds_api.py` | ❌ Quota épuisé | 498/500 req utilisés en mai 2026 |
| Polymarket Gamma | `polymarket.py` | ⚠️ Accessible mais data peu liquide tennis | OK pour NBA/NHL playoffs |
| Manifold Markets | `manifold.py` | ⚠️ Accessible mais marchés rares | Sports premium uniquement |
| Kalshi | `kalshi.py` | ⚠️ Accessible | Sample limité |
| NBA Stats API | `nba_stats.py` | ✅ Accessible | Stats historiques OK |
| NHL Stats API | `nhl_stats.py` | ✅ Accessible | Stats historiques OK |
| MLB Stats API | `mlb_stats.py` | ✅ Accessible | Stats historiques OK |
| Tennis Abstract | `tennis_abstract.py` | ⚠️ Scraping fragile | 403 intermittent |
| Sofascore | `sofascore.py` | ❌ 403 systématique | Cloudflare |

**Action v4** : la chaîne pipeline est en mode dégradé. Pour les
prochaines semaines, l'agent fonctionne **100% WebSearch + WebFetch
sur whitelist accessibles**. Le pipeline backend reste branché en
backup pour quand The Odds API quota se remettra ou si le user injecte
une nouvelle clé.

## Whitelist de référence par sport (v4.6 — focus foot/basket/tennis)

### ⚽ Soccer (Euro Championship, Coupes nationales) — **ACTIF**
1. Goal.com
2. SportsGambler
3. CBS Sports
4. dailysports.net
5. Freetips
6. Covers

### 🏀 Basketball (NBA playoffs + Euroleague) — **ACTIF**
1. Bleacher Nation
2. Dimers
3. CBS Sports (SportsLine model, via snippets)
4. FanDuel Research
5. Covers
6. Lineups

### 🎾 Tennis (Grand Slam + ATP/WTA tour) — **ACTIF**
1. Tennis Tonic
2. Last Word on Sports
3. Dimers
4. Stats Insider
5. Tennis Up to Date
6. Profootballnetwork (parfois)
7. Rotowire (utile en phase GS R1-R3)

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
Prochain health-check programmé : **2026-06-23** (fin cycle paper).
