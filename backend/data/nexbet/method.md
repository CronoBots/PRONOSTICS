# NΞXBΞT — Procédure obligatoire (v4.0 — Recap-only mode)

> **Pivot v4.0 du 23/05/2026** : l'agent ne décide plus. Il cartographie,
> analyse et présente un **TOP 3** chiffré au user, qui tranche. Aucun
> pick automatique n'est inséré dans `picks_data.py`. Mode **paper
> trading 30 jours** actif jusqu'au 23/06/2026. Aucun bet réel pendant
> cette période — toutes les positions sont théoriques.

## ⚡ Règles d'efficacité (conservées de v3)

1. **Parallélisme obligatoire** : tout appel indépendant (lectures
   fichiers, WebSearch cartographie) doit partir en UN SEUL message
   multi-tool.
2. **Watchlist écrite AVANT pré-filtrage** dans
   `decisions/<date>-watchlist.md` — auditabilité du funnel.
3. **`check_duplicate.py` sur chaque finaliste** avant Étape 3.
4. **Aucune décision automatique** — l'agent présente, le user tranche.

## Étape 0 — Init (lecture parallèle obligatoire)

Lancer **un seul message multi-Read** :
1. `backend/data/nexbet/criteria.md` (rappel des seuils v4)
2. `backend/data/nexbet/learnings.md` (patterns + anti-bias actifs)
3. `backend/data/nexbet/output-format.md` (format TOP 3)
4. `backend/data/nexbet/sources_catalogue.md` (whitelist accessible)
5. `backend/data/nexbet/paper_trading_log.md` (dernières positions virtuelles)
6. `backend/scripts/picks_data.py` (uniquement pour anti-dup)

Noter : date courante (UTC + Belgique), bankroll virtuel courant (paper),
bankroll réel courant (info contextuelle, **non utilisé** pour les
calculs de mise).

## Étape 1 — Cartographie (cast wide net)

Sports à scanner systématiquement selon la saison. Au minimum **15 matchs**
identifiés.

**Méthode parallèle** :
1. **Un seul message** avec N WebSearch parallèles, une recherche par
   sport actif.
2. Liste sortie : `| Match | Sport | Kickoff UTC | Cote favori |`
3. Marquer les matchs "premium" (playoffs, finales) — coverage pros
   plus dense.
4. **Sortie attendue** : tableau ≥ 15 lignes, daté.
5. **Écrire immédiatement** dans
   `decisions/<date>-watchlist.md`.

## Étape 2 — Pré-filtrage strict

Éliminer en bloc :
- Cote favori < 1.50 OU > 2.00 (single, F1 strict)
- Combo : cote totale > 2.20 OU < 1.60 (sans boost)
- Sport hors compétence
- Doublon avec pick récent (`check_duplicate.py`)
- Pas de coverage pro accessible dispo (F4 impossible)

**Réduction à max 5 candidats** sérieux.

## Étape 3 — Analyse approfondie (top 5, PARALLÈLE)

Pour chaque candidat, lancer **les 3 WebSearch + WebFetch parallèles dans
un seul message** :

1. **WebSearch** : preview + prédiction pro sur le match
2. **WebSearch** : modèle ML / probabilité explicite (Dimers, Stats
   Insider, BleacherNation)
3. **WebSearch** : injuries / lineup / news 24h

**Sources whitelist obligatoires** (testées accessibles, voir
`sources_catalogue.md`) :
- lastwordonsports.com
- bleachernation.com
- dimers.com
- statsinsider.com.au
- tennistonic.com
- covers.com
- lineups.com
- fanduel.com/research

**Sources INACCESSIBLES (à ne plus citer comme primaires)** :
- ATP/WTA officiels (403)
- Sofascore (403)
- TennisTemple (403)
- Polymarket / Pinnacle / Betfair via WebFetch (JS-rendered ou auth)

Si on veut citer une source sharp (Polymarket), uniquement via les URLs
trouvées en WebSearch ET en mentionnant explicitement que la proba
exacte n'a pas pu être lue.

**Extraire pour chaque candidat** :
- Cote sur 2-3 books (bwin priorité)
- Probabilité explicite par source si disponible
- H2H récent + forme 5 derniers
- Blessures, lineup confirmée si publiée

## Étape 4 — Application learnings + anti-bias

Pour chaque finaliste, croiser avec `learnings.md`. Règles actives v4 :

**Anti-bias BLOCANTS (rejet automatique)** :
- AB-1 : Top-10 ATP J-2/J-1 avant Grand Slam
- AB-2 : Perdant 1-3 série playoffs
- AB-4 : Combiné 3+ jambes
- AB-5 : MLB ML > 2.50 sans matchup pitcher exceptionnel

**Anti-bias EXPERIMENTAUX (note, pas blocking)** :
- AB-3 : Cinderella playoff momentum (n=1)
- AB-6 supprimé (overfit n=1)

**Patterns confirmés (boost de confiance, +0.02 proba_shrunk)** :
- Tous les PC sont **EXPERIMENTAL n=1 en v4** : utiliser comme signal
  qualitatif, pas comme bonus mathématique. (Pas de +0.02 automatique
  tant que n ≥ 3.)

## Étape 5 — Calculs simplifiés v4

Pour chaque candidat :

```
book_proba   = 1 / cote_bwin
model_proba  = MÉDIANE des probas sources accessibles (min 3)
                (si moins de 3 sources avec proba explicite : skip
                 candidat — F4 KO)
n_eff        = nombre de sources accessibles avec proba explicite (max 5)
w_book       = 2  (fixe — pas de w_book adaptatif, sample n=6 insuffisant)
proba_shrunk = (n_eff × model_proba + 2 × book_proba) / (n_eff + 2)
EV           = proba_shrunk × cote_bwin − 1
```

**Pas de malus sharp automatique** : si pas de Pinnacle/Polymarket
accessible, on l'accepte. C'est noté dans la trace mais pas pénalisé.

**Si AB-1/2/4/5 déclenché** : rejet immédiat (pas affiché dans top 3).

## Étape 6 — Verdict par candidat (présentation, pas décision)

Affecter à chaque candidat un **verdict** parmi :

| Verdict | Conditions | Couleur |
|---|---|---|
| 🟢 **RECOMMANDÉ** | EV ≥ +5%, proba_shrunk ≥ 0.60, ≥ 3 sources convergentes | Vert |
| 🟡 **ACCEPTABLE** | EV ≥ +2%, proba_shrunk ≥ 0.55 | Jaune |
| 🟠 **BORDERLINE** | EV entre 0% et +2%, proba_shrunk ≥ 0.55 | Orange |
| 🔴 **INSUFFISANT** | EV < 0% OU proba_shrunk < 0.55 OU F4 KO | Rouge |

**Aucun tier "FLOOR" autorisé** : EV < 0% = INSUFFISANT, fin de
discussion. Pas de mise théorique avec EV négatif.

## Étape 7 — Sortie obligatoire (format TOP 3)

Voir `output-format.md`. Structure imposée :

1. **Section Watchlist** : tableau cartographie complet
2. **Section TOP 3 candidats** : ranking par EV décroissant
   - Pour chaque : cote, model_proba, EV, verdict, sources, alerts
3. **Section Recommandation conditionnelle** :
   - Si ≥ 1 candidat 🟢 RECOMMANDÉ → "Mon TOP = X (verdict 🟢). À toi de
     valider."
   - Si seulement 🟡 ACCEPTABLE → "Aucun candidat 🟢 aujourd'hui. Le moins
     pire est X (🟡). Tu peux skip ou valider."
   - Si seulement 🟠 / 🔴 → "Rien de défendable aujourd'hui. Skip recommandé."
4. **Section Anti-bias** : règles actives sur le pick proposé
5. **Section Paper trading** : si le user valide, mise théorique appliquée
   au bankroll virtuel (criteria.md table mises)

## Étape 8 — Décision user + trace

L'utilisateur répond :
- ✅ **VALIDÉ** → ajouter au `paper_trading_log.md` comme position
  virtuelle (mode paper trading)
- ❌ **SKIP** → noter "skip user" dans trace
- 🔄 **CONTRE-PICK** → user choisit un autre candidat de la liste

**Trace écrite** dans `decisions/<date>.md` (toujours) :
- Heure d'analyse
- Top 5 candidats avec calculs complets
- Verdict de l'agent
- Décision finale du user
- Sources consultées (toutes URLs)
- Anomalies / doutes

**Commit + push** sur la branche courante.

## Étape 9 — Outcome verification (lendemain ou plus tard)

**RÈGLE STRICTE v4** : tout outcome `win` / `loss` exige **2 sources
distinctes** avec **quote textuelle exacte** du score final.

Format trace outcome :
```
Source A (URL) cite : "Player X defeated Player Y, 6-3 6-4"
Source B (URL) cite : "Final score: X def. Y 6-3 6-4"
→ OUTCOME = WIN (sur le pick X)
```

Si une seule source disponible ou pas de quote précise → outcome
**reste PENDING**. Aucune inférence (G2 vs G3, SF vs Final). Pas de
mise à jour bankroll virtuel.

**Vérification mensuelle obligatoire** (review mode paper) :
- Hit rate par verdict (🟢/🟡)
- ROI virtuel cumulé
- Audit des calibrations (proba estimée vs outcome réel)

## Cas spéciaux v4

### Aucun candidat passe F1 (cote 1.50-2.00)
Output : "Aucun candidat dans la fenêtre cote 1.50-2.00 aujourd'hui."
+ top 3 rejetés listés avec raison. **Pas de fallback FLOOR**.

### Tous candidats verdict 🔴
Output : "Rien de défendable aujourd'hui. Skip recommandé."
+ top 3 listés. Le user peut quand même override.

### Source single point of failure
Si 2/3 sources accessibles d'une même famille (ex : tennis tonic, last
word on sports — deux sites du même éditeur ?) → noter dans la trace
le risque de corrélation des sources.

## Conditions de sortie du mode paper (vers bet réel)

Après 30 jours (≥ 24 picks paper, dont ≥ 12 verdict 🟢 + 🟡 résolus) :
- Si **hit rate global ≥ 55%** ET **ROI virtuel ≥ +5%** → promotion
  vers mode réel
- Si non → itération méthodologie v4.x ou prolongation paper

Décision documentée dans `paper_trading_log.md` section "Audit fin de
cycle".

## Anti-patterns interdits (v4)

JAMAIS :
- Insérer un pick dans `picks_data.py` automatiquement (mode paper)
- Marquer un outcome sans 2 quotes textuelles distinctes
- Citer Sofascore, ATP/WTA officiels comme source primaire (403)
- Recommander un candidat avec EV < +2%
- Sortir un "TOP 1 unique" sans présenter les alternatives
- Appliquer un boost de proba via PC (tous EXPERIMENTAL n=1 en v4)
- Sauter la lecture `learnings.md`
- Sauter l'écriture `decisions/<date>.md` et `paper_trading_log.md`
