# NEXBET — Base de connaissances (v4.6)

> Mémoire long terme de l'agent. Mis à jour après chaque pick résolu
> (paper ou réel). L'agent DOIT lire ce fichier au début de chaque
> analyse.

## 🔄 Versions — changelog synthétique

| Version | Date | Changements clés |
|---|---|---|
| **v3.3** | jusqu'au 23/05/2026 ~14h | Tier FLOOR (EV ≥ -2%), F1-bis Playoff Mode, bonus PC +0.02, malus sharp -0.03, auto-validation pick unique. **ARCHIVÉ** (cf. `archive/backtest_2026-05-23_v3-calibration.md`) |
| **v4.0** | 23/05/2026 ~14h30 | Pivot recap-only, EV strict ≥ +2%, suppression Tier FLOOR / F1-bis / bonus PC / malus sharp, paper trading 30 jours. Toutes les règles overfit (AB-6, F1-bis Branches A/B) déclassées EXPERIMENTAL |
| **v4.1** | 23/05/2026 ~17h | Hotfix F4 : 1 quanti + 3 convergentes (au lieu de 3 quanti), dédup éditeur (N articles même domaine = 1 source), snippet WebSearch quanti accepté, w_book = 2 fixe (pas adaptatif) |
| **v4.2** | 24/05/2026 | Dual artefact obligatoire : trace technique (`decisions/<date>.md`) + rapport user narratif (sport/compétition explicites, bio joueurs, langage accessible, sans jargon proba_shrunk/F1-F6/AB-X). Interdit citer "agrégateur snippet" sans composition explicite |
| **v4.3** | 24/05/2026 matin | **Recadrage AB-1** : blocant uniquement sur tournois warm-up ATP 250/500 à J-2/J-1 d'un GS, **PAS** sur les GS eux-mêmes (top-10 ATP analysables normalement à RG R1, Wimbledon R1 etc.). **F1 combo** : jambes 1.20-1.50 (+0.05), total 1.60-2.50 (+0.30) pour permettre triples combinés de favoris écrasants. Question user "pourquoi écarter les top-10 ?" légitime — overgeneralisation v4.0 corrigée. |
| **v4.4** | 24/05/2026 soir | **Intégration API-Sports** (api-sports.io) comme source quantitative officielle pour foot/basket/hockey/baseball. Wrapper Python `backend/scripts/sportsapi.py` avec 10 endpoints clés. Predictions API-Sports = nouvelle source quanti #1 pour foot (= n_eff +1 dans calculs proba_shrunk). Tennis reste sur WebSearch whitelist (API-Sports ne couvre pas tennis). Clé en variable d'env `API_SPORTS_KEY`. |
| **v4.5** | 25/05/2026 | **Intégration SofaScore API** (api.sofascore.com) — comble le gap tennis de v4.4. API non-officielle (TOS gris, usage perso OK). Cartographie auto via `/sport/tennis/scheduled-events/{date}` + Win Probability propriétaire (`/event/{id}/win-probability`) = nouveau signal quanti unique pour tennis ATP/WTA/Grand Chelems. Wrapper Python `backend/scripts/sofascore.py` avec cloudscraper bypass Cloudflare + rate limit 1 req/sec. Aucune clé requise (juste User-Agent navigateur). |
| **v4.6** | 25/05/2026 | **Focus stratégique foot / basket / tennis UNIQUEMENT** (décision user). NHL, MLB, NFL, F1, MMA, rugby suspendus du scan quotidien — réactivables via bump v4.7+. Motivation : concentrer expertise/sources sur 3 sports maîtrisés (volume Europe + GS tennis + NBA playoffs) plutôt que diluer sur 6+. **Nouveau filtre F0** "Sport actif" (rejet immédiat hors scope). **AB-5 MLB** déclassé "non applicable" (règle archivée). **AB-2 playoffs** restreint au basket NBA. Étape 1 cartographie = 3 WebSearch parallèles (foot, basket, tennis), plus de fallback NHL/MLB. Historique paper NHL/MLB intact (audit), backend engines + frontend SPORT_OPTIONS conservés (UI multi-sports), réversible. |

---

## 🔧 Hotfix v4.1 — 23/05/2026 ~17h (post test à blanc)

Après le test à blanc v4.0 sur la journée 23/05 (5 candidats analysés,
tous verdict 🔴, recommandation SKIP), 4 anomalies remontées par
l'agent ont été ajustées :

### Changements v4.0 → v4.1

| Anomalie | Avant (v4.0) | Après (v4.1) |
|---|---|---|
| **F4 sources** | 3 sources avec % chiffré requis | **1 quanti + 3 convergentes** (quanti OU quali). Cavaliers G3 désormais analysable même si 1 seule source % chiffré + 3 picks qualitatifs convergents |
| **Dédup éditeur** | Non formalisée (Goal.com x2 comptait pour 2) | **N articles du même domaine = 1 source effective**. Médiane interne d'abord, comptée 1× dans `n_eff` |
| **Snippet WebSearch** | "URL citable, data non-lue" | **Snippet avec % chiffrable = source quantitative valide**. Compte 1× dans `n_eff` si "via snippet" tagué + snippet textuel reproduit |
| **Tennis période GS** | Non documenté | Note explicite : tennis sera sous-représenté 24/05 → 09/06 (Roland Garros). **Pas de compensation artificielle** — déplétion acceptée |

### Garde-fou intégré

Avec F4 v4.1, un candidat peut passer avec `n_eff = 1` (1 seule source
quanti + 2-3 quali convergentes). Dans ce cas, `proba_shrunk` =
(1 × model + 2 × book) / 3 → **poids book ⅔, signal modèle ⅓**.
Naturellement, l'EV calculé est très proche de 0 (book domine), donc
seuls les vrais edges robustes passent F3 ≥ +2%. Pas besoin d'autre
garde-fou.

### Rétro-test sur le test à blanc 23/05

Avec v4.1 appliqué rétroactivement :
- **Cavaliers G3** : 1 quanti FanDuel 57.6% + 3 quali convergents (Bleacher Nation, Covers, autre) → F4 OK. `proba_shrunk = (1 × 0.576 + 2 × 0.606)/3 = 0.596`. EV = 0.596 × 1.65 − 1 = **−1.6%** → 🔴 F3 KO (toujours rejeté, mais désormais analysé)
- **Middlesbrough** : 2 articles Goal.com dédupliqués = 1 source (médiane 54.6/60 = 57.3%) + 1 source Sportytrader 31% = 2 sources quanti effectives. EV recalculé. F4 OK (Sportytrader recommande Hull → divergence pick → F4 KO convergence)
- **Pirates** : 3 quanti convergents (Dimers, FanDuel, Polymarket snippet) → F4 OK. EV reste −1.59% → 🔴 F3 KO
- **Verdict global identique** : Cas C SKIP. v4.1 n'a pas changé le verdict, mais a amélioré la transparence du funnel.

---

## 🆕 Pivot v4.0 — 23/05/2026

### Pourquoi la refonte
8 problèmes structurels identifiés dans v3.3 :
1. **Tier FLOOR** acceptait EV ≥ -2% (mathématiquement perdant)
2. **Erreurs de lecture WebSearch** fréquentes et non détectées (G2/G3,
   SF/Final confondus)
3. **Sources sharps** systématiquement inaccessibles (Sofascore, ATP,
   Polymarket 403 ou JS-rendered) → malus -0.03 tuait tout EV
4. **Hiérarchie tier** mal calibrée — l'agent finissait toujours en FLOOR
5. **Backtest n=6 insuffisant** pour calibrer w_book adaptatif, AB-6,
   F1-bis
6. **F1-bis Branche B** basée sur **faux outcome** (Knicks G3 confondu
   avec G2 "WIN 109-93" du 21/05)
7. **`model_proba` estimé à la louche** par Claude à partir de previews
   textuelles — pas de vraie source quantitative
8. **Pas de garde-fou outcome** : marquage WIN/LOSS basé sur lecture
   approximative

### Changements v4.0
| Élément | v3.3 | v4.0 |
|---|---|---|
| Décision finale | Agent décide | **User décide** (agent recap-only) |
| Tier FLOOR (EV ≥ -2%) | Autorisé | **Supprimé** |
| EV minimum | -2% | **+2% strict** |
| w_book adaptatif (2/3/4) | Actif | **Fixe à 2** |
| Malus "no sharp" -0.03 | Actif | **Supprimé** |
| Bonus PC +0.02 | Actif | **Supprimé** (EXPERIMENTAL) |
| AB-6 | Blocking | **Supprimé** |
| F1-bis Branche A (G1) | Actif | **Supprimé** |
| F1-bis Branche B (G2+) | Actif | **Supprimé** |
| Garantie "1 pick/jour" | Active | **Supprimée** |
| Mode bet | Réel | **Paper trading 30 jours** |
| Bankroll | Réel 25€ | **Virtuel 100€** |
| Outcome verification | Approximative | **2 sources + quote obligatoire** |

### Critères de promotion vers mode bet réel
Après 30 jours paper (≥ 24 picks paper résolus, dont ≥ 12 verdict 🟢+🟡) :
- Hit rate ≥ 55% sur 🟢+🟡 résolus
- ROI virtuel ≥ +5%
→ Promotion vers mode réel possible

Si non : itération v4.x ou prolongation paper.

---

## 📌 Anti-bias rules — BLOCANTS v4 (rejet automatique)

### AB-1 : Top-10 ATP en tournoi de PRÉPARATION à J-2/J-1 d'un GS (RECADRÉ v4.3)
**Statut v4.3** : ✅ ACTIF blocking (portée réduite)
**Validé le** : 22/05/2026 (Ruud loss Geneva SF, 2 jours avant Roland Garros)
**Recadré le** : 24/05/2026 matin (question légitime user "pourquoi écarter top-10 partout ?")

**Description** : un top-10 ATP en SF/finale d'un **tournoi warm-up
(ATP 250/500)** à J-2/J-1 d'un Grand Chelem économise systématiquement
ses forces — load cardio moyen 80% vs 95% en condition normale.
Le mécanisme est documenté économiquement : prize money + points ATP ×5
au GS, le warm-up est secondaire.

**Action — RECADRÉE v4.3** :
- 🚨 **BLOCANT** : top-10 ATP dans un **tournoi de préparation ATP
  250/500** à J-2/J-1 d'un GS proche. Ex : Ruud à Geneva 22/05 (RG le 24/05),
  Sinner à Hambourg J-1 US Open, Alcaraz à Halle J-1 Wimbledon, etc.
- ✅ **NON BLOCANT** : top-10 ATP **dans le GS lui-même** (R1/R2/R3
  etc.). Au contraire — c'est leur priorité absolue, ils jouent à fond.
  Ex : Djokovic vs Mpetshi Perricard à RG R1, Sinner à RG R3, Zverev
  finale RG, etc. → tous analysables normalement par F1-F6.
- ⚠️ **Zone grise** : top-10 dans un Masters 1000 à J-7/J-5 d'un GS →
  documenter en trace mais ne pas blocking automatiquement (load
  management possible mais pas systématique).

**Pourquoi le recadrage v4.3** :
La règle initiale ("≤ 48h avant un GS") était overgeneralisation sur
n=1. Le pattern réel était "tournoi warm-up secondaire avant GS prime"
— pas le GS lui-même. Bloquer Djokovic à RG R1 alors qu'il est grand
favori cote 1.10 contre un wildcard #200 ATP était absurde.

**Note v4.3** : la théorie load management ATP→GS reste solide. Le
recadrage clarifie le contexte d'application. À ré-évaluer après ≥ 3
cas dans le cadre recadré.

### AB-2 : Pari sur le perdant d'une série playoffs déjà à 3-1
**Statut v4** : ✅ ACTIF blocking
**Validé par** : observation historique NBA/NHL (n grand)
**Description** : 1-3 comebacks à 3% historique NBA, 6% NHL.
**Action** : si on est sur l'équipe menée 1-3, exiger proba ≥ 0.75 et
cote ≥ 2.50 (sinon contrarian sans edge).

### AB-4 : Combiné 3+ jambes
**Statut v4** : ✅ ACTIF blocking
**Description** : variance trop élevée. 3 favoris à 75% chacun =
proba combinée 42%.
**Action** : rejet automatique de tout combiné 3+ jambes.

### AB-5 : MLB Moneyline cote > 2.50 sans matchup pitcher exceptionnel
**Statut v4** : ✅ ACTIF blocking
**Validé le** : 20/05/2026 (Tigers LOSS vs Cleveland, cote 2.73)
**Description** : MLB cote > 2.50 indique infériorité réelle. Variance
match-to-match très élevée. "Value bets" à cote 2.50+ souvent trappes.
**Action** : rejeter MLB ML cote > 2.50 SAUF si :
- Top-5 ERA pitcher confirmé
- Lineup adverse faible vs son arm-side
- ≥ 3 sources pros recommandent explicitement notre side

---

## 🟠 Anti-bias EXPERIMENTAUX v4 (note dans trace, pas blocking)

### AB-3 : Bet contre Cinderella playoff team en momentum
**Statut v4** : ⚠️ EXPERIMENTAL n=1
**Description** : Habs Cinderella 2026 ont battu 3 seeds supérieurs.
**Action v4** : **noter dans la trace** si un favori joue contre un
Cinderella avec 5+ wins inattendus, mais pas de rejet automatique ni
de minoration mathématique. Promotion à blocking si n ≥ 3 cas validés.

### AB-8 : H2H factuel doit être vérifié sur 2+ sources avant tout pick handicap/spread
**Statut** : ⚠️ EXPERIMENTAL n=1 — créé 27/05/2026
**Origine** : comparaison Agent NEXBET vs Claude direct sur RG Day 4
(Zverev vs Machac 27/05/2026). Claude direct a proposé Machac +6.5 jeux
à 1.94 avec confiance 62% en s'appuyant sur l'affirmation "Machac a
déjà battu Zverev en 2024". **Faux** : vérification Ladbrokes →
Zverev a battu Machac 2-0 aux JO Paris 30/07/2024 sur terre battue
(même surface, même ville que ce soir). Le H2H réel est 1-0 Zverev,
jamais l'inverse. Sans cette erreur, la confiance tombe à ~52% et
l'edge devient marginal (~0%) → no-bet aurait été la conclusion.

**Action v4.9+** : avant tout pick **handicap jeux / handicap sets /
total games** où la confiance s'appuie sur un précédent H2H spécifique,
**vérifier le H2H sur 2 sources indépendantes** (ex : ATP Tour officiel
+ Tennis Abstract OU Ladbrokes/Bet365 "Face à face" + SofaScore stats).
Si les 2 sources ne convergent pas sur le même résultat exact (score,
date, surface), **flag dans la trace** et déclasser le pick d'un cran
de confiance.

**Promotion** : à blocking si n ≥ 3 erreurs H2H détectées dans les
analyses claude/agent.

### AB-9 : Pas de réutilisation d'un joueur/équipe déjà engagé sur un pari ouvert le même jour
**Statut** : ✅ ACTIF blocking — créé 27/05/2026
**Origine** : situation Rublev RG R2 27/05/2026. Combo J10 placé
(Bencic + Rublev @ 1.66, 5€). En cours de match, cote Rublev LIVE
remonte de ~1.27 à 1.73 (signal défaite probable). User tenté de
placer un 2e combo (Bouzkova + Rublev LIVE @ 2.20, 7.61€). Une seule
défaite de Rublev = double perte simultanée de 12.61€ (24% bankroll
54€). Corrélation parfaite, c'est du chase loss classique.

**Description** : pari B reposant sur un joueur/équipe déjà présent
dans un pari A ouvert le même jour = **exposition corrélée** non
diversifiée. La variance combinée n'est pas la somme arithmétique
mais multiplie le risque sur un seul outcome.

**Action** : rejet automatique de tout 2e pari du jour qui inclut un
joueur, équipe, ou outcome déjà engagé dans un pari pending. Aucune
exception même si le 2e pari semble propre individuellement.

**Pourquoi blocking dès n=1** : math fondamentale (corrélation = 100%
sur une jambe partagée), pas besoin de validation empirique. C'est
une règle de **risk management**, pas d'edge.

**Cas couverts** :
- 2 paris incluant le même joueur tennis (même tournoi ou non)
- 2 paris incluant la même équipe (championnat + coupe)
- Combo principal + single sur un leg du combo
- Pari LIVE en chase d'un pari pré-match qui vacille

---

## 🗑 Anti-bias SUPPRIMÉS en v4

### AB-6 : Sources pros divergentes (SUPPRIMÉ)
**Pourquoi supprimé** : overfit sur n=1 (cas Olympiakos 22/05). Le
mécanisme "≥ 2 sources pros contre = signal blocking" était basé sur
une seule observation. De plus, en pratique avec 3 sources accessibles
seulement, il était trop souvent déclenché de manière artificielle.
**Remplacement** : si les sources divergent du pick, c'est déjà capturé
par le `model_proba` faible (médiane des sources) → pas besoin d'un
malus supplémentaire.

### F1-bis Branche A (G1 underdog) (SUPPRIMÉ)
**Pourquoi supprimé** : overfit sur n=1 (cas Spurs WCF G1 18/05).
Théorie OK (repos différentiel + H2H underdog) mais base statistique
insuffisante. Promotion possible si n ≥ 3 cas validés en paper trading.

### F1-bis Branche B (G2+ momentum) (SUPPRIMÉ)
**Pourquoi supprimé** : **basé sur faux outcome**. Le critère mentionnait
"Knicks G3 ECF cote 2.20 → outcome WIN 109-93", mais le 109-93 était en
réalité le **G2** (21/05). Le G3 n'avait jamais été joué au moment de la
codification. **Data leakage hallucinatoire**. La règle est invalidée.

---

## ✅ Patterns confirmés — TOUS EXPERIMENTAL n=1 en v4

### PC-1 : Double favoris à domicile en combiné boosté bwin
**Statut v4** : ⚠️ EXPERIMENTAL n=1
**Validé le** : 21/05/2026 (Ruud + Knicks WIN à 2,36 boostée)
**Description** : 2 favoris ≥ 78% à domicile dans 2 sports, combiné +20-30% boost bwin.
**Action v4** : **signal qualitatif dans rationale, pas de bonus +0.02
automatique**. Promotion à pattern actif si n ≥ 3 cas validés.

### PC-2 : NBA Game 2 home après G1 loss anormale
**Statut v4** : ⚠️ EXPERIMENTAL n=1
**Validé le** : 21/05/2026 (Knicks G2 vs Cavs)
**Description** : équipe favorite qui perd G1 stat dominantes bounce-back
G2 à 78% historique 20 ans (à vérifier indépendamment).
**Action v4** : signal qualitatif. Promotion possible si n ≥ 3.

### PC-3 : Promo bookmaker bwin sur événement premium
**Statut v4** : ⚠️ EXPERIMENTAL — observation à monitorer
**Description** : promos "gains boostés en cash" sur marchés liquides
fort volume = potentiel EV+ structurel.
**Action v4** : scan rapide promos bwin chaque matin, à inclure dans
la rationale s'il y en a une sur notre candidat.

### PC-4 : NBA G1 underdog H2H fort + repos différentiel
**Statut v4** : ⚠️ EXPERIMENTAL n=1
**Validé le** : 18/05/2026 (Spurs WIN G1 WCF à 2.70)
**Description** : G1 underdog 2.50-2.80 avec H2H favorable + repos ≥ +2j.
**Action v4** : signal qualitatif. **NE permet PLUS un tier FLOOR à cote
2.50-2.80** (F1-bis Branche A supprimé en v4).

---

## 📊 Sources fiables par sport (whitelist v4)

Voir `sources_catalogue.md` pour la matrice complète ACCESSIBLE / 403 /
SNIPPET-ONLY. Résumé top par sport :

### Tennis
1. Tennis Tonic, Last Word on Sports, Dimers, Stats Insider, Tennis Up to Date

### NBA
1. Bleacher Nation, Dimers, CBS Sports (snippets), FanDuel Research, Covers

### NHL
1. Covers, Lineups, Bleacher Nation, Yahoo Sports

### MLB
1. OddsShark, Action Network, tonyspicks, FanGraphs, Bleacher Nation

### Soccer
1. Goal.com, SportsGambler, CBS Sports, dailysports

### Sources sharps — citables mais data non-lisible
- Polymarket (URL trouvée OK, contenu JS)
- Pinnacle (login required)
- Betfair Exchange (login required)

---

## 🎯 Historique des picks résolus (référence)

### 20/05/2026 — Detroit Tigers @ Cleveland Guardians (MLB)
- Pick : Tigers ML 2.73 (boostée) — Proba estimée 0.42 — **LOSS**
- Leçon : AB-5 codifié (MLB ML > 2.50 sans matchup pitcher OK = trap)

### 21/05/2026 — Combiné Ruud + Knicks (Tennis + NBA)
- Pick : Combiné boosté bwin 2.36 (vs 1.82 sans boost) — Proba 0.63 — **WIN**
- Leçon : PC-1 et PC-2 validés (EXPERIMENTAL n=1)

### 22/05/2026 — Combiné Ruud + Olympiakos (Tennis + Euroleague)
- Pick : Combiné boosté bwin 2.25 — Proba 0.54 — **LOSS** (Ruud out SF)
- Leçon : AB-1 codifié (Top ATP J-2 avant GS = économie de force)

### 23/05/2026 — Navone vs Tien (test v3.3 — non placé)
- Verdict v3.3 : FLOOR (EV -1.8%, proba_shrunk 0.555)
- Verdict v4.0 : 🔴 **INSUFFISANT** (EV < +2% strict)
- **NOT_PLACED** : user n'a pas validé. Pivot v4.0 déclenché.

---

## 🔍 Anomalies à monitorer

### Pipeline backend dégradé
- Odds API quota 498/500 épuisé en mai 2026
- Sofascore 403 systématique
- CSV `daily_candidates.py` génère ≤ 132 bytes (vide)
- → Fonctionnement 100% WebSearch/WebFetch sur whitelist v4

### Période Grand Slam (24/05 - 09/06)
- Roland Garros commence 24/05/2026
- AB-1 actif sur top-10 ATP J-2/J-1
- Méfiance accrue sur previews tennis (qualifications, withdrawals)

### Période Conference Finals NBA + NHL
- Coverage analyses pros très dense → 5+ sources accessibles par match
- Privilégier ces sports tant qu'en phase finale

---

## 🛠️ Méthodes d'amélioration continue v4

### Après chaque pick paper résolu (win ou loss)
1. Vérifier 2 sources + quote textuelle (méthode v4 stricte)
2. Mettre à jour `paper_trading_log.md`
3. Analyser : hypothèse réalisée ? Si pattern nouveau émerge, l'ajouter
   ici en **EXPERIMENTAL n=1**
4. Si EXPERIMENTAL atteint n=3 validations → promotion à actif
5. Si EXPERIMENTAL échoue n=2 fois → suppression

### Cadence de revue
- **Hebdomadaire** (chaque samedi) : relecture des EXPERIMENTAL,
  vérifier si promotion ou suppression
- **Mensuelle** (le 23 de chaque mois) : audit complet calibration

---

## 📈 Calibration v4 — Bankroll virtuel paper

> Démarrage 24/05/2026 à 100,00 € virtuel.
> Outcomes vérifiés via 2 sources + quote (méthode v4).

| Date | Pick | Verdict | Cote | proba_shrunk | EV | Outcome | Bankroll après |
|---|---|---|---|---|---|---|---|
| (à venir) | — | — | — | — | — | — | 100.00 |

### Cible audit fin de cycle (23/06/2026)
- Hit rate global ≥ 55%
- Hit rate sur 🟢 RECOMMANDÉ ≥ 65%
- ROI virtuel ≥ +5%
- Si tous OK : promotion mode réel envisagée


## 🤖 Auto-learning history

> Historique des patchs auto-learning. Géré par `update_learnings.py`.

### Run 2026-05-26T10:40:34+00:00
- **Backup criteria.md** : `criteria.md.bak.20260526T104034Z`
- **global** (underestimate, +23.0pts × 3 runs) → Relâcher F2 de 0.02 OU diminuer poids book (agent trop conservateur)
- **sport:tennis** (underestimate, +33.2pts × 3 runs) → Ajouter -0.02 au shrinkage book pour tennis (modèle sous-estime — modèle plus confiant)
- **tier:single** (underestimate, +23.0pts × 3 runs) → Relâcher F2 pour single (proba_shrunk -0.02)

### Run 2026-05-26T10:40:44+00:00
- **Backup criteria.md** : `criteria.md.bak.20260526T104044Z`
- **global** (underestimate, +23.0pts × 3 runs) → Relâcher F2 de 0.02 OU diminuer poids book (agent trop conservateur)
- **sport:tennis** (underestimate, +33.2pts × 3 runs) → Ajouter -0.02 au shrinkage book pour tennis (modèle sous-estime — modèle plus confiant)
- **tier:single** (underestimate, +23.0pts × 3 runs) → Relâcher F2 pour single (proba_shrunk -0.02)
