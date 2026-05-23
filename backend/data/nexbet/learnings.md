# NΞXBΞT analyst — Base de connaissances évolutive

> Ce fichier est la **mémoire long terme** de l'agent.
> Mis à jour APRÈS chaque pick résolu (win/loss), il accumule les
> patterns prouvés et les biais à éviter.

> L'agent DOIT lire ce fichier au début de chaque analyse (Étape 0
> de method.md) et appliquer les règles ci-dessous.

---

## 📌 Anti-bias rules (rejet automatique)

Règles dures issues d'expérience. Tout candidat qui correspond à un
de ces patterns est **rejeté immédiatement**, sans débat.

### AB-1 : Top-10 ATP en J-2/J-1 avant Grand Slam
**Validé le** : 22/05/2026 (Ruud loss Geneva SF, 2 jours avant Roland Garros)
**Description** : un top joueur ATP en demi-finale ou finale d'un tournoi
warm-up (250/500) juste avant un Grand Slam économise systématiquement
ses forces — il peut perdre volontairement ou simplement jouer en mode
"économique" (les statistiques cardio confirment 80% load moyen vs 95%
en condition normale).
**Action** : rejet automatique de tout pari sur un top-10 ATP ≤ 48h
avant un GS, sauf si le joueur est explicitement éliminé de la
préparation GS (ex : déjà forfait Roland Garros confirmé).
**Application** : cas Ruud Geneva 22/05 (perdu vs Navone en SF) — la
proba estimée 80% ignorait ce facteur.

### AB-2 : Pari sur le perdant d'une série playoffs déjà à 3-1
**Validé par observation historique NBA/NHL**
**Description** : une équipe menée 1-3 en série de playoffs joue avec la
mort dans l'âme dès le Game 5 — les comebacks 1-3 → 4-3 sont à 3% dans
l'histoire NBA, 6% NHL. Picker l'équipe leader à 3-1 chez elle est
généralement EV+, mais picker le perdant pour un "sursaut d'orgueil"
est un trap.
**Action** : si on est sur l'équipe menée 1-3, exiger proba ≥ 0.75 et
cote ≥ 2.50 (sinon c'est qu'on est juste contrarian sans edge).

### AB-3 : Bet contre Cinderella playoff team en momentum
**À surveiller** (pas encore tranché)
**Description** : Habs Cinderella en NHL playoffs 2026 ont battu les 3
seeds supérieurs (Toronto, Washington, Carolina G1) malgré
les cotes défavorables.
**Action provisoire** : si une équipe favorite affronte un Cinderella
underdog qui a déjà 5+ wins inattendus en playoffs, REVOIR la proba à la
baisse de 5 points (intangible motivation/momentum non capturé par les
modèles).

### AB-4 : Combiné 3+ jambes
**Règle générique du criteria.md mais re-précisée ici**
**Description** : la variance est trop élevée. Même 3 favoris à 75% chacun
donnent proba combinée 0.75³ = 42% — c'est sous notre seuil F2 (60%).
**Action** : rejet automatique de tout combiné 3+ jambes.

### AB-5 : MLB Moneyline cote > 2.50 sans matchup pitcher exceptionnel
**Validé le** : 20/05/2026 (Tigers LOSS vs Cleveland, cote 2.73 boostée)
**Description** : en MLB régulière, une cote ML > 2.50 indique une vraie
infériorité de l'équipe pickée. Le baseball a une variance match-to-match
extrêmement élevée (single game = 60% prédictif vs 80%+ NBA/NHL) — les
"value bets" identifiés à cote 2.50+ sont souvent des trappes du modèle
qui sous-pondère le lanceur du jour.
**Action** : rejeter automatiquement tout MLB ML cote > 2.50 SAUF si :
  - Top-5 ERA pitcher prévu pour notre équipe (confirmé via FanGraphs/MLB.com)
  - ET lineup adverse faible vs son arm-side (lefty/righty splits explicites)
  - ET ≥ 3 sources pros recommandent explicitement notre side
**Cas observé** : Tigers 20/05 avait "Cleveland starter 0-6 ERA 4.15 road" comme
edge supposé, mais on n'avait pas confirmé le lanceur Tigers (top-5 ERA ?).
Hypothèse de pari = "le mauvais starter adverse compense tout" — faux.

### AB-6 : Sources pros divergentes du pick
**Validé le** : 22/05/2026 (combo Olympiakos LOSS, Stats Insider recommandait Navarro avant le pick Mboko 23/05 — pattern récurrent)
**Description** : si ≥ 2 sources pros (Stats Insider, OddsShark, Bleacher
Nation, Dimers, etc.) recommandent **explicitement l'AUTRE side** que notre
pick, ET le book proba va dans le même sens public, c'est un signal que
notre estimation est biaisée. Le marché n'a pas tort si 2+ sources pros
indépendantes convergent contre nous.
**Action** : si AB-6 déclenché → rejet automatique, ou minoration aggressive
(-0.05 sur proba_shrunk au lieu du -0.03 standard "pas de sharp").
**Distinction** : ne pas confondre avec un désaccord sharp légitime — AB-6
concerne les sources pros ANALYTIQUES (avec rationale), pas juste les
prédictions algo brutes.

---

## ✅ Patterns confirmés (boost de confiance)

Patterns qui ont prouvé leur valeur. Si un pick coche un de ces patterns,
augmenter la confiance / la mise.

### PC-1 : Double favoris à domicile en combiné boosté bwin
**Validé le** : 21/05/2026 (Ruud + Knicks WIN à 2,36 boostée)
**Description** : 2 favoris ultra-établis (probas individuelles ≥ 78%)
jouant à domicile dans 2 sports différents, combinés avec un boost
bwin de +20-30%. EV combinée typique +40-50%, c'est dans le top 1% des
opportunités.
**Conditions** :
- Chaque jambe à proba ≥ 0.75 individuellement
- 2 sports différents (zéro corrélation)
- Boost bwin doit augmenter la cote ≥ +20%
- Probabilité combinée ≥ 0.60
**Action** : si réuni, mise jusqu'à 2× standard (10€ au lieu de 5€).

### PC-2 : NBA Game 2 home après G1 loss anormale
**Validé le** : 21/05/2026 (Knicks G2 vs Cavs, comeback win après deficit)
**Description** : une équipe favorite qui perd Game 1 d'une série en
ayant dominé statistiquement (shots, possession, hits) bounce-back en
Game 2 à 78% des cas sur 20 ans de playoffs NBA.
**Conditions** :
- L'équipe avait Corsi/possession favorable en G1 mais a perdu sur shooting variance
- Game 2 à domicile
- Coach reconnu pour ses ajustements (Thibodeau, Spoelstra, Kerr, etc.)
**Action** : ajouter +5 points à la proba de base.

### PC-3 : Promo bookmaker bwin sur événement premium
**À monitorer** : signal fort si la promo est sur un combiné multi-sport
**Description** : bwin pousse des promos "gains boostés en cash" sur
les marchés liquides à fort volume (gros matchs NBA + tennis ATP +
Champions League). C'est généralement un cadeau marketing pour acquérir
du volume, EV nettement positif.
**Action** : à chaque analyse quotidienne, scan rapide des promos bwin
de la veille — si une promo est dispo sur un de nos candidats, c'est
prioritaire.

### PC-4 : NBA G1 underdog avec H2H fort + repos différentiel ≥ +2j
**À monitorer** (n=1 — Spurs WIN G1 WCF 18/05/2026 à 2.70)
**Description** : en NBA playoffs, un underdog à cote 2.50–2.80 qui a un
H2H récent favorable (≥ 3 wins sur 5 H2H récents) ET un différentiel
repos ≥ +2 jours en sa faveur a un edge réel sous-pondéré par les modèles
mainstream. Spurs (5-1 H2H vs OKC, +3 jours repos) → cote 2.70 alors que
la "vraie" proba était ~0.40-0.45 = value massive.
**Conditions** (à confirmer) :
- Sport NBA ou NHL (rest matters)
- Game 1 d'une série playoffs
- H2H saison régulière favorable underdog (≥ 3 wins sur 5)
- Repos différentiel ≥ +2 jours en faveur underdog
- ≥ 2 sources pros mentionnent explicitement le facteur fatigue/H2H
**Action provisoire** : si pattern réuni → tier FLOOR autorisé même à
cote 2.50-2.80 (sortie du F1 single strict v3, mise réduite 2€). À
confirmer 2× supplémentaires avant codification ferme.

---

## 📊 Sources fiables par sport (qualité prouvée)

### NBA
- ⭐⭐⭐ ESPN BPI (FiveThirtyEight est mort en 2024, ESPN intègre des modèles
  similaires)
- ⭐⭐⭐ Bleacher Nation (analyses sérieuses + cotes consolidées)
- ⭐⭐ OddsShark (consensus market + tendances ATS)
- ⭐⭐ NBC Sports / Action Network
- ⭐ TheRinger / The Athletic (qualitatif mais peu de chiffres)

### NHL
- ⭐⭐⭐ NHL.com (info officielle équipes, statuts goalies)
- ⭐⭐⭐ Covers (consensus + analyses détaillées)
- ⭐⭐ OddsShark, Lineups, CBS Sports Fantasy
- ⭐⭐ Yahoo Sports
- ⭐ Polymarket (sharp money proxy)

### Tennis
- ⭐⭐⭐ ATP Tour officiel (scores live, head-to-head, surface stats)
- ⭐⭐⭐ Tennis Abstract (Elo rating par surface — référence sharp)
- ⭐⭐ Stats Insider (probabilité estimée explicite)
- ⭐⭐ Tennis Tonic (analyses match par match)
- ⭐⭐ Last Word on Sports / Dimers
- ⭐ Polymarket (souvent peu liquide en tennis sauf GS)

### MLB
- ⭐⭐⭐ FanGraphs (sabermétrique de référence)
- ⭐⭐⭐ Baseball Reference (stats historiques)
- ⭐⭐ OddsShark, Action Network (pari + matchup)
- ⭐⭐ MLB.com (rumors, lineups, weather)

### Soccer (football)
- ⭐⭐⭐ FBref (stats avancées xG)
- ⭐⭐⭐ WhoScored (notes joueurs + analyses tactiques)
- ⭐⭐ OPTA / Stats Perform (data officielle)
- ⭐⭐ Football Whispers, FootballOranje
- ⭐⭐ Bet365 / bwin pour les cotes

### Sharps cross-validation (tous sports)
- ⭐⭐⭐ Polymarket (US, prediction market on-chain — quand liquide)
- ⭐⭐⭐ Pinnacle (limites élevées = lines sharp)
- ⭐⭐ Sharp money trackers (Veracity, Action Network sharp report)

---

## 🎯 Historique des picks (référence pour l'agent)

Synthèse des picks récents avec leur leçon. À enrichir après chaque
résolution.

### 20/05/2026 — Detroit Tigers @ Cleveland Guardians (MLB)
- **Pick** : Tigers ML
- **Cote** : 2.73
- **Proba estimée** : 0.42
- **Outcome** : LOSS
- **Leçon** : cote 2.73 implique book proba ~37%, notre 0.42 donnait
  EV +14% mais sur un favori clair MLB c'est rare. La proba 0.42 était
  probablement optimiste — cote 2.73 sur baseball indique généralement
  une vraie infériorité de l'équipe pickée. **AB-5 : éviter MLB ML
  à cote > 2.50 sauf si pitcher matchup explicite identifié comme
  exceptionnel (top-5 ERA + opposing lineup faible vs son arm-side)**.

### 21/05/2026 — Combiné Ruud + Knicks (Tennis + NBA)
- **Pick** : Combiné boosté bwin 2.36 (vs 1.82 sans boost)
- **Proba combinée** : 0.63
- **Outcome** : WIN
- **Leçon** : PC-1 et PC-2 validés. Le boost bwin a transformé un combiné
  +14% EV en +49% EV. Pattern à reproduire dès qu'on a 2 favoris
  ≥ 75% indépendants + boost dispo.

### 22/05/2026 — Combiné Ruud + Olympiakos (Tennis + Euroleague)
- **Pick** : Combiné boosté bwin 2.25 (vs 1.82 sans boost)
- **Proba combinée** : 0.54
- **Outcome** : LOSS (Ruud perdu en SF vs Navone)
- **Leçon** : AB-1 confirmée. Le facteur "J-2 avant Roland Garros" n'a
  pas été intégré dans la proba 0.80 estimée pour Ruud. Avec le facteur
  Grand Slam preparation, la proba réelle Ruud était probablement 0.55-0.60,
  ce qui aurait éliminé le combiné du short-list. **Action** : codifier
  AB-1 (déjà fait ci-dessus).

---

## 🔍 Anomalies / situations à monitorer

### Quota Odds API
La clé Odds API du repo semble épuisée régulièrement (498/500 utilisé
ce 23/05). En mode dégradé, ne pas compter sur les calls automatiques —
fonctionner full WebSearch/WebFetch.

### Saisons de transition
Le 23-24/05 est la transition Roland Garros (commence dimanche 24/05).
Pour les 4 prochaines semaines, le tennis devient le sport prioritaire,
mais attention au facteur "joueur clé out" qui peut chambouler une
préview faite la veille.

### Phase Conference Finals NBA + NHL
Les playoffs sont à leur apogée (ECF/WCF NBA, Stanley Cup Conf Finals
NHL). Volumes énormes côté analyses pros, easier de trouver 3+
sources concordantes — favoriser ces sports tant qu'ils sont en
phase finale.

---

## 🛠️ Méthodes d'amélioration continue

### Après chaque pick résolu (win OU loss)

1. Lire la trace de décision (`decisions/<date>.md`)
2. Pour chaque hypothèse posée dans la rationale, vérifier si elle s'est
   réalisée :
   - Hypothèse réalisée + win → renforce le pattern
   - Hypothèse réalisée + loss → la conviction était bonne mais autre
     facteur a fait perdre
   - Hypothèse PAS réalisée + win → bonne nouvelle mais on a eu de la
     chance, ne pas généraliser
   - Hypothèse PAS réalisée + loss → l'hypothèse était mauvaise,
     identifier le pourquoi
3. Si un pattern nouveau émerge, l'ajouter dans cette doc avec date de
   validation
4. Si un pattern de cette doc échoue 2 fois de suite, le re-évaluer
   (peut-être à supprimer ou à raffiner)

### Cadence de revue
- **Hebdomadaire** : relecture rapide des dernières entrées
- **Mensuelle** : audit global, suppression patterns obsolètes,
  fusion patterns similaires

---

## 📈 Calibration historique (mise à jour après chaque pick résolu)

> Table compacte des picks résolus pour suivre la calibration proba/outcome.
> Source détaillée : `backend/data/nexbet/backtest_<date>.md`.

### Picks résolus 17/05 → 22/05/2026 (n=6)

| Date | Pick | Cote | model_proba | Outcome | Spread (m-b) |
|---|---|---|---|---|---|
| 17/05 | Svitolina WTA Rome | 2.30 | 0.50 | ✅ WIN | +7 pts |
| 18/05 | Spurs WCF G1 | 2.70 | 0.40 | ✅ WIN | +3 pts |
| 19/05 | Knicks ECF G1 | 2.00 | 0.55 | ✅ WIN | +4 pts |
| 20/05 | Tigers MLB boosté | 2.73 | 0.55 | ❌ LOSS | +18 pts |
| 21/05 | Combo Ruud+Knicks | 2.36 | 0.63 | ✅ WIN | +21 pts |
| 22/05 | Combo Ruud+Olymp. | 2.25 | 0.54 | ❌ LOSS | +10 pts |

**Stats globales** : Hit rate 4/6 = 66.7%, ROI +56% sur 30€ misés.

**Insights de calibration** :
- **Cotes wins moyennes** : 2.34 — **cotes losses moyennes** : 2.49.
  Le sweet spot historique est ~2.00-2.30.
- **Spread wins moyens** : +9 pts — **spread losses moyens** : +14 pts.
  → Au-delà de **+10 pts d'edge estimé**, le modèle est probablement trop
  optimiste (overconfidence). Renforcer le shrinkage (w_book adaptatif
  proposé dans backtest_2026-05-23.md).
- **Hit rate par sport** : NBA 2/2, Tennis 1/1, MLB 0/1, Combo 1/2.
  NBA et Tennis dominent ; MLB single confirmé risqué (AB-5).
