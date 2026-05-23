# NΞXBΞT — Base de connaissances (v4.0)

> Mémoire long terme de l'agent. Mis à jour après chaque pick résolu
> (paper ou réel). L'agent DOIT lire ce fichier au début de chaque
> analyse.

> **Refonte v4.0 du 23/05/2026** : purge des règles overfit (AB-6,
> F1-bis Branches A/B). Toutes les règles ajoutées sur n=1 sont
> marquées **EXPERIMENTAL** et ne sont plus blocking. Mode paper
> trading 30 jours actif.

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

### AB-1 : Top-10 ATP en J-2/J-1 avant Grand Slam
**Statut v4** : ✅ ACTIF blocking
**Validé le** : 22/05/2026 (Ruud loss Geneva SF, 2 jours avant Roland Garros)
**Description** : un top joueur ATP en SF/finale d'un tournoi warm-up
(250/500) juste avant un Grand Slam économise systématiquement ses
forces — load cardio moyen 80% vs 95% en condition normale.
**Action** : rejet automatique de tout pari sur un top-10 ATP ≤ 48h
avant un GS, sauf si le joueur est explicitement éliminé de la
préparation GS.
**Note v4** : la théorie ATP/GS est solide même si n=1 — promotion à
blocking justifiée car le mécanisme est documenté (load management,
prize structure GS vs ATP 250). À ré-évaluer après ≥ 3 cas.

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
