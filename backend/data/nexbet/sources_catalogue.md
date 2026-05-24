# Catalogue des sources NΞXBΞT (v4.4 — API-Sports intégrée)

> **v4.4 (24/05/2026 soir)** : intégration **API-Sports** (api-sports.io)
> comme source quantitative officielle pour foot/basket/hockey/baseball.
> API officielle, légalement clean, tarif raisonnable. Tennis reste sur
> WebSearch whitelist.
>
> **v4.2 (24/05/2026)** : règle dédup corrélation modèle ajoutée.
> **Refonte v4.0 (23/05/2026)** : reclassement par accessibilité réelle.

## 🟢 ACCESSIBLE — Source officielle API (NOUVEAU v4.4)

### API-Sports (api-sports.io) — Mode direct

**Statut** : 🟢 ACCESSIBLE — clé `API_SPORTS_KEY` configurée
**Type** : API JSON officielle (légalement clean, TOS clairs)
**Authentification** : header `x-apisports-key` (clé en variable d'env)
**Doc** : https://www.api-sports.io/documentation

**Couverture** :
- ⚽ Football (Premier League, Bundesliga, Liga, Serie A, Ligue 1, CL, EL, EFL, Coupe de France, etc.)
- 🏀 Basketball (NBA + Euroleague + NCAA)
- 🏒 Hockey (NHL + KHL)
- ⚾ Baseball (MLB + KBO + NPB)
- 🏈 NFL, 🏎 F1, 🏉 Rugby, 🏐 Volley, 🤝 Handball, 🥊 MMA

**Endpoints clés pour NEXBET** :
- `fixtures` : schedule par sport + date (cartographie auto)
- `odds` : cotes multi-bookmakers (Pinnacle, Bet365, Bwin, DK, etc.)
- `predictions` (foot only) : modèle API-Sports → **source quanti #1**
- `fixtures/headtohead` : H2H structuré (10 derniers matchs)
- `fixtures/lineups` : compositions/blessures (foot)
- `injuries` : blessures actuelles (foot)
- `teams/statistics` : stats équipe par saison

**Limites du plan free** :
- 100 req/jour par sport
- Plan Pro $19/mois par sport, ou bundle ~$30-50/mois

**Wrapper Python** : `backend/scripts/sportsapi.py`
**Test rapide** : `python backend/scripts/test_sportsapi.py`

⚠️ **TENNIS NON COUVERT par API-Sports.** Pour ATP/WTA/GS, continuer
avec : WebSearch whitelist (Tennis Tonic, Dimers, LWOS, Stats Insider)
+ SofaScore API optionnel (cf section 🟡 SNIPPET-ONLY).

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

## Whitelist de référence par sport (v4)

### NBA (ECF/WCF/Finals période)
1. Bleacher Nation
2. Dimers
3. CBS Sports (SportsLine model, via snippets)
4. FanDuel Research
5. Covers
6. Lineups

### NHL (Stanley Cup playoffs)
1. Covers
2. Lineups
3. Bleacher Nation
4. Yahoo Sports (snippets)
5. OddsShark (snippets)

### Tennis (Grand Slam + ATP/WTA tour)
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
que d'analyser des matchs sous-couverts. Privilégier NBA/NHL/MLB/soccer
en attendant. Biais documenté, à monitorer dans l'audit fin de cycle.

### MLB
1. OddsShark (snippets)
2. Action Network (snippets)
3. tonyspicks.com
4. FanGraphs (snippets)
5. Bleacher Nation
6. Covers

### Soccer (Euro Championship, Coupes nationales)
1. Goal.com
2. SportsGambler
3. CBS Sports
4. dailysports.net
5. Freetips
6. Covers

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
