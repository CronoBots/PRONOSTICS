# NΞXBΞT analyst — Procédure obligatoire (checklist v2)

> Cette checklist est NON négociable. L'agent doit la suivre dans l'ordre
> et compléter chaque étape avant de passer à la suivante. Aucun
> raccourci, même si l'agent "pense" déjà connaître la réponse.

## ⚡ Règles d'efficacité (v2 — 23/05/2026)

1. **Parallélisme obligatoire** : tout appel indépendant (lectures
   fichiers, WebSearch cartographie, WebFetch sur un même candidat)
   doit partir en UN SEUL message multi-tool. Réduit le temps total
   de ~50%.
2. **Short-circuit dès filtre F1-F6 KO** : si Étape 2 vide le pool,
   sortir "no pick today" sans faire l'Étape 3.
3. **Watchlist écrite AVANT pré-filtrage** dans
   `decisions/<date>-watchlist.md` — auditabilité du funnel.
4. **`check_duplicate.py` sur chaque finaliste** avant Étape 3.

## Étape 0 — Init (lecture parallèle obligatoire)

Avant TOUTE recherche, lancer **un seul message multi-Read** :

1. `backend/data/nexbet/criteria.md` (rappel des seuils F1-F6 + shrinkage)
2. `backend/data/nexbet/learnings.md` (patterns + anti-bias)
3. `backend/data/nexbet/output-format.md` (format JSON cible)
4. `backend/scripts/picks_data.py` (5 derniers picks pour style + anti-dup)
5. Noter date courante (UTC + Belgique) + bankroll courant.

## Étape 1 — Cartographie (cast wide net)

**Objectif** : lister TOUS les évènements sportifs majeurs des prochaines
36h, sans pré-filtrer. Au minimum **15 matchs** doivent être identifiés.

Sports à scanner systématiquement (selon saison) :
- 🏀 **NBA** : playoffs (rounds, conf finals, NBA Finals), saison régulière
- 🏒 **NHL** : Stanley Cup playoffs, saison régulière
- ⚾ **MLB** : saison régulière (162 matchs/an), playoffs October-November
- 🎾 **ATP / WTA** : tournois en cours (vérifier ATP Calendar pour
  les tournois live cette semaine — Grand Slams = priorité)
- ⚽ **Football** : Premier League / La Liga / Bundesliga / Ligue 1 /
  Serie A / Champions League / Europa League / Coupes nationales
- 🏈 **NFL** : saison régulière août-janvier, playoffs janvier, Super Bowl
  février ; preseason juillet-août
- 🏉 **Rugby** : Six Nations (jan-mar), Top 14, URC, Champions Cup
- 🥊 **Boxe / MMA** : UFC events (généralement samedi soir), événements
  boxe HBO/Showtime
- 🐎 Autres : F1 (dimanche), MotoGP, Euroleague basket, etc.

**Méthode de cartographie (PARALLÈLE)** :
1. **Un seul message** avec N WebSearch parallèles, une recherche par
   sport actif. Ne JAMAIS faire ces recherches en séquence.
2. Liste sortie : `[match] | [sport/ligue] | [kickoff UTC] | [favori
   approximatif si évident]`
3. Marquer les matchs "premium" (playoffs, finales, gros derby) — ils
   ont des analyses pros plus nombreuses
4. **Sortie attendue** : tableau Markdown avec ≥ 15 lignes, daté et
   timestampé
5. **Écrire immédiatement** dans
   `backend/data/nexbet/decisions/<date>-watchlist.md` — auditabilité
   du funnel (combien d'events scannés vs retenus).

## Étape 2 — Pré-filtrage rapide

Réduire à **5–8 candidats sérieux** en éliminant :

- Matchs avec favori "trop favori" (cote < 1.30 sur principal book) →
  EV trop faible
- Matchs avec aucune info récente / line non publiée
- Matchs où les 2 équipes ont des dossiers similaires (cote ~ 1.90 / 1.90
  = pure cointoss, pas de value à exploiter)
- Matchs dans des compétitions inconnues / faible liquidité (ex : ligues
  mineures sans coverage pro)

**Sortie** : top 5 max avec une cote indicative + 1 phrase "pourquoi
intéressant".

**Anti-duplication** : avant de garder un finaliste, exécuter
`python backend/scripts/check_duplicate.py "<home_team>" "<away_team>"`.
Exit code ≠ 0 → drop (match déjà pické < 7j).

**Short-circuit** : si 0 finaliste après pré-filtrage → sortir directement
"no pick today" SANS faire Étape 3. Inutile de fetcher en profondeur
des candidats déjà morts.

## Étape 3 — Analyse approfondie (top 5, PARALLÈLE)

Pour CHAQUE candidat, lancer **les 3 WebFetch dans un seul message
multi-tool** (gain ~3× sur le temps de l'étape) :

1. Site spécialisé sport (ESPN, ATP, NHL.com…)
2. Analyse pari pro (OddsShark, Covers, Lineups, Action Network,
   StatsInsider, BleacherNation…)
3. **Source sharp OBLIGATOIRE** (Polymarket, Pinnacle proxy, Betfair
   Exchange). Si absente, malus -0.03 sur `proba_shrunk` (cf F2/F4).

**Extraire pour chaque match** :
- Cote sur 3+ books (bwin obligatoire si possible, sinon DK/FanDuel)
- Probabilité estimée par chaque source (souvent données explicitement
  ou déductible via la cote implicite recommandée)
- H2H récent (3 dernières confrontations)
- Forme récente des deux équipes (5 derniers matchs)
- Blessures clés (injury report fresh)
- Facteurs contextuels : home/away advantage, surface (tennis), météo
  (outdoor sports), trajet/repos, motivation (déjà qualifié ou non)
- Coaching matchup + tendances coach dans la situation
- Cas spéciaux : boost bookmaker dispo, ligne qui a bougé fortement
  dans la journée

## Étape 4 — Consultation des learnings

**Pour chaque finaliste**, croiser avec `learnings.md` :
- Y a-t-il un pattern qui valide ce pick ? (boost EV)
- Y a-t-il un anti-pattern qui invalide ? (rejet automatique)
- Le sport / la situation a-t-il un track record dans les picks passés ?

**Exemples concrets** (mis à jour via learnings.md) :
- "ATP top-10 J-2 avant Grand Slam" → flag rouge (cas Ruud 22/05)
- "NBA Game 2 home après blow loss G1" → flag vert (cas Knicks 21/05)
- "Combiné boosté bwin double favoris à domicile" → flag vert si proba
  combinée ≥ 0.60 (cas Ruud+Knicks 21/05)
- "Underdog Cinderella playoffs" → flag jaune sur le favori opposé

## Étape 5 — Calculs formels + shrinkage (NOUVEAU v2)

Pour chaque finaliste, calculer dans cet ordre :

```
book_proba   = 1 / cote_bwin
model_proba  = moyenne pondérée (sharp ×3, pro ×2, mainstream ×1)
n_eff        = nombre de sources solides (max 5)
proba_shrunk = (n_eff × model_proba + 2 × book_proba) / (n_eff + 2)
```

**Ajustements** sur `proba_shrunk` :
- Pas de source sharp : `-0.03`
- PC-1/2/3 déclenché : `+0.02`
- AB-1/2/3/4 déclenché : rejet immédiat

Puis :
```
EV    = proba_shrunk × cote_bwin − 1
Kelly = (proba_shrunk × cote_bwin − 1) / (cote_bwin − 1)
```

**`proba_shrunk` devient `model_probability` dans le JSON final.**

**Garder uniquement** les candidats qui respectent les 6 filtres durs
de `criteria.md` (F1-F6).

Si après ce filtre il reste :
- **0 candidat** → produire "no pick today" + justification + top 3 rejetés
- **1 candidat** → c'est le pick
- **2+ candidats** → choisir celui avec le meilleur ratio
  `(EV × proba)` (priorise les picks à la fois +EV ET safe), tie-break sur
  la qualité des sources

## Étape 6 — Considérer le combiné

Si 2 picks indépendants passent tous les filtres avec proba individuelle
≥ 0.70 ET un bookmaker offre un boost sur le combiné, calculer :
- `proba_combo = p1 × p2`
- `cote_combo = c1 × c2 × (1 + boost)` (boost typique +20-30% bwin)
- `EV_combo = proba_combo × cote_combo − 1`

Si `EV_combo > max(EV_pick1, EV_pick2) × 1.5` ET proba_combo ≥ 0.55, le
combiné devient le pick prioritaire. Sinon, garder le solo.

**Règle d'or combiné** : jamais 3 jambes, jamais corrélé (même
tournoi/ligue), jamais sans boost (sans boost le combiné perd vs picks
indépendants).

## Étape 7 — Composition du pick final

Produire l'output au format `output-format.md` :
1. Objet JSON `Pick` complet (insérable directement dans
   `picks_data.py PICKS`)
2. Headline (1-2 lignes)
3. Rationale (20-30 entrées, format markdown lite)
4. Sources (3-6 URLs concrètes)
5. Champs calculés : stake (selon Kelly ajusté), potential_profit, etc.

## Étape 8 — Trace de décision

Écrire un fichier `backend/data/nexbet/decisions/<YYYY-MM-DD>.md`
contenant :
- Heure de l'analyse
- Top 5 candidats étudiés (avec leur cote / proba / EV)
- Pick choisi + raison
- Picks rejetés + raisons
- Sources consultées (toutes, pas seulement celles citées dans le pick)
- Notes (anomalies détectées, doutes restants)

Ce fichier permet de **reviewer la décision après coup** quand le
résultat est connu, et alimente la mise à jour de `learnings.md`.

## Cas spéciaux

### Quota Odds API épuisé
Sauter les calls automatiques, fonctionner 100% via WebSearch +
WebFetch sur les sites pros. Mentionner dans la trace de décision
"Mode manuel (Odds API down)".

### Aucun match qualifié
Output "no pick today" + ENCORE explication détaillée. C'est OK de
sauter un jour ; "la discipline > le volume" est la marque de fabrique
NΞXBΞT.

### Désaccord fort entre sources sharps et public
Si Polymarket et le book grand public sont à > 10 points de proba
implicite d'écart, c'est un signal. Soit suivre les sharps (souvent
mieux informés), soit noter le désaccord dans les risques et baisser
la mise.

### Boost bookmaker exceptionnel découvert tard
Si en cours d'analyse on découvre un boost bwin de +30% sur un pick à
proba 0.62, refaire le calcul EV avec le boost — il peut transformer un
candidat médiocre en pick prioritaire.

### Multiple Grand Slams simultanés
Période 24-mai-2026 est juste avant Roland Garros. Méfiance accrue sur
les picks ATP J-2/J-1 (cf learnings.md "Ruud Geneva SF 22/05 loss").
