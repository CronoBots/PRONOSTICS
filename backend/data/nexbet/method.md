# NΞXBΞT analyst — Procédure obligatoire (checklist)

> Cette checklist est NON négociable. L'agent doit la suivre dans l'ordre
> et compléter chaque étape avant de passer à la suivante. Aucun
> raccourci, même si l'agent "pense" déjà connaître la réponse.

## Étape 0 — Init (lecture obligatoire)

Avant TOUTE recherche, l'agent doit :

1. Lire `backend/data/nexbet/criteria.md` (rappel des seuils)
2. Lire `backend/data/nexbet/learnings.md` (patterns + anti-bias)
3. Lire `backend/data/nexbet/output-format.md` (format JSON cible)
4. Lire les 5 derniers picks dans `backend/scripts/picks_data.py` (style
   + contexte récent)
5. Note la date courante et l'heure (UTC + Belgique)
6. Note le bankroll courant (dernier `bankroll_after` dans history)

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

**Méthode de cartographie** :
1. WebSearch : "[sport] schedule [date] [year]" pour chaque sport actif
2. Liste sortie : `[match] | [sport/ligue] | [kickoff UTC] | [favori
   approximatif si évident]`
3. Marquer les matchs "premium" (playoffs, finales, gros derby) — ils
   ont des analyses pros plus nombreuses
4. **Sortie attendue** : tableau Markdown avec ≥ 15 lignes, daté et
   timestampé

## Étape 2 — Pré-filtrage rapide

Réduire à **5–8 candidats sérieux** en éliminant :

- Matchs avec favori "trop favori" (cote < 1.30 sur principal book) →
  EV trop faible
- Matchs avec aucune info récente / line non publiée
- Matchs où les 2 équipes ont des dossiers similaires (cote ~ 1.90 / 1.90
  = pure cointoss, pas de value à exploiter)
- Matchs dans des compétitions inconnues / faible liquidité (ex : ligues
  mineures sans coverage pro)

**Sortie** : top 5–8 avec une cote indicative + 1 phrase "pourquoi
intéressant".

## Étape 3 — Analyse approfondie (top 5)

Pour CHAQUE candidat du top 5, faire 3 WebFetch sur des sources pros :

1. Site spécialisé sport (ESPN, ATP, NHL.com…)
2. Analyse pari pro (OddsShark, Covers, Lineups, Action Network,
   StatsInsider, BleacherNation…)
3. Source sharps / consensus (Polymarket si dispo, sinon Pinnacle line
   ou agrégateur de consensus pros type SportsBettingPolls)

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

## Étape 5 — Application des critères

Pour chaque finaliste, calculer formellement :
- `book_proba = 1 / cote_bwin`
- `model_proba = moyenne pondérée des estimations sources` (pondération :
  source sharp > source pro > source mainstream)
- `EV = model_proba × cote_bwin − 1`
- `Kelly_fraction = (model_proba × cote_bwin − 1) / (cote_bwin − 1)`

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
