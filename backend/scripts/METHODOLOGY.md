# 📊 Méthodologie WTF — Sélection du pick safe du jour

> **Document de référence** pour la sélection du pari quotidien.
> À appliquer chaque jour, sans exception. Toute déviation doit être documentée.
>
> **Principe directeur** : on préfère 30 min d'analyse pour 1 pick robuste
> que 5 min pour un pick "intuitif". La crédibilité de la plateforme repose
> sur la consistance des wins, pas sur la vitesse de publication.

---

## 🎯 Objectif

Pour chaque jour J, identifier **LE pari le plus susceptible de gagner**
parmi tous les marchés disponibles, avec :
- Probabilité estimée ≥ 70% (mode "Safe Pick" par défaut)
- Source d'edge identifiée (pourquoi le marché se trompe, ou pourquoi il
  ne se trompe pas mais notre niveau de certitude est très haut)
- Documentation transparente des risques (3-5 scénarios de défaite réalistes)

---

## ⏱ Investissement temps recommandé

| Phase | Durée min | Détail |
|---|---:|---|
| 1. Cartographie matchs J+0/J+1 | 5 min | Tous sports, tous bookmakers |
| 2. Pré-filtre quantitatif | 5 min | Cote 1.20-2.50, liquidité suffisante |
| 3. Analyse top 5-10 candidats | 15 min | 3 sources/candidat minimum |
| 4. Comparaison + sélection | 5 min | Tableau de risques, choix final |
| 5. Documentation pick | 5 min | Analyse 45+ points, sources cliquables |
| **Total minimum** | **35 min** | Pas de raccourci |

**Si moins de 30 min disponibles** → pas de pick publié ce jour-là.
La discipline > le volume. Une journée sans pick > un pick bâclé qui perd.

---

## 📡 Hiérarchie des sources

### Tier 1 — Sources primaires (toujours consulter)

| Catégorie | Source | URL | Type | Coût |
|---|---|---|---|---|
| Cotes | The Odds API | the-odds-api.com | API JSON | Gratuit 500 req/mois (clé GH Secret) |
| Cotes consensus | OddsPortal | oddsportal.com | Web | Gratuit |
| Probabilités marché réel | Polymarket | polymarket.com | Web | Gratuit |
| NBA stats officielles | NBA Stats | stats.nba.com/stats/* | API JSON | Gratuit, sans clé |
| NHL stats officielles | NHL Stats | statsapi.web.nhl.com | API JSON | Gratuit, sans clé |
| MLB stats officielles | MLB Stats | statsapi.mlb.com | API JSON | Gratuit, sans clé |

### Tier 2 — Sources analytiques (consulter ≥ 2)

| Catégorie | Source | Spécialité |
|---|---|---|
| NBA | basketball-reference.com | Box scores, advanced stats, historique |
| NBA | cleaning-the-glass.com | Stats de qualité contre playoff teams |
| Soccer | fbref.com | xG, xA, advanced metrics |
| Soccer | understat.com | xG temps réel |
| Tennis | tennis-abstract.com | Elo par surface, head-to-head profond |
| Tennis | tennisexplorer.com | Form curve, conditions |
| MLB | fangraphs.com | wOBA, FIP, projections |
| MLB | baseballsavant.mlb.com | Statcast (vélocité, exit velo) |
| NHL | moneypuck.com | xG, possession |
| NHL | naturalstattrick.com | Corsi, advanced |
| Multi-sports | sofascore.com | Form, H2H, lineups |

### Tier 3 — Modèles prédictifs externes (consensus check)

| Source | Coverage | Note |
|---|---|---|
| Stats Insider | Tennis, NBA, NHL, MLB | Bon modèle ML, accessible |
| Dimers.com | Multi-sports | Probabilités explicites |
| ESPN BPI/FPI | NBA/NFL | Modèles maison |
| FiveThirtyEight archives | NBA/NFL/MLB | Référence historique |
| Lineups.com | NBA/NFL/MLB | Sec mais utile |

### Tier 4 — Sources qualitatives (contexte uniquement)

| Type | Pourquoi |
|---|---|
| Articles de prévisualisation (CBS, ESPN, NBC) | Contexte, narratives, blessures |
| Twitter d'insiders | Lineups dernière minute, ambiance |
| Forums (r/sportsbook) | Sentiment marché |

### ⛔ Tier 0 — Sources interdites comme base d'analyse

- **Pickdawgz / BetMines / tipsters anonymes** → utiliser comme sanity-check uniquement, jamais comme source primaire
- **Cotes promotionnelles "boostées"** → noter le boost mais NE PAS l'utiliser pour estimer la probabilité réelle (cote boostée = cote artificielle)
- **Articles sponsorisés** → bias commercial

---

## 🔍 Pipeline étape par étape

### Étape 1 — Cartographie (5 min)

1. Pull The Odds API `/sports?all=true` → liste des sports actifs
2. Pour chaque sport actif intéressant, pull `/sports/{sport}/odds?markets=h2h&regions=eu,uk,us`
3. Constituer un CSV/dict de tous les matchs J+0 et J+1 avec :
   - sport, ligue, équipes, kickoff
   - cote 1X2 ou H2H par bookmaker
   - cote consensus (médiane)

**Output** : liste de ~50-200 candidats.

### Étape 2 — Pré-filtre quantitatif (5 min)

Filtres successifs :

1. **Liquidité** : ≥ 3 bookmakers majeurs cotent le match (sinon trop illiquide)
2. **Plage de cote** : favori entre 1.20 et 2.30 (au-delà = pas safe)
3. **Marché efficient** : écart max entre books ≤ 5% (sinon marché instable)
4. **Match a kickoff < 36h** (sinon trop d'incertitude)
5. **Sport avec data publique riche** (NBA/NHL/MLB/ATP/WTA/top-5 leagues soccer)

**Output** : ~10-30 candidats.

### Étape 3 — Analyse top 5-10 candidats (15 min)

Pour chaque candidat :

1. **Consulter ≥ 1 source Tier 1** (stats officielles)
2. **Consulter ≥ 2 sources Tier 2** (analytiques spécialisées)
3. **Vérifier ≥ 1 modèle Tier 3** (consensus check)
4. **Noter facteurs CONTRE le favori** (blessures, fatigue, déplacement, météo)
5. **Estimer probabilité indépendante** sur 3 méthodes :
   - Méthode A : Elo / ranking model
   - Méthode B : Forme récente (10 derniers matchs pondérés)
   - Méthode C : Consensus marché (médiane bookmakers, soustrait marge ~5%)
6. **Probabilité finale = médiane des 3 méthodes**, pas la moyenne (résistance aux outliers)

### Étape 4 — Sélection & comparaison (5 min)

Tableau récap :

| Match | Pick | Cote | Proba modèle | Proba marché | Edge | Risque-clé |
|---|---|---:|---:|---:|---:|---|
| ... | ... | ... | ... | ... | ... | ... |

**Critères de sélection** (par ordre de priorité) :
1. **Probabilité estimée ≥ 75%** (safety first)
2. **Convergence des sources** : si 3 modèles indépendants donnent ≥ 70%, validation
3. **Pas de risque majeur identifié** (blessure star, lineup incertain)
4. **Cote ≥ 1.50** si possible (sinon single ou combiné 2 jambes ≤)
5. **Sport avec historique de data fiable** (préférer NBA/tennis à eSports/cricket)

Si AUCUN candidat ne remplit les critères → **pas de pick aujourd'hui**.
Publier un message "Aucun pari safe identifié — discipline > volume."

### Étape 5 — Documentation du pick (5 min)

Suivre `ANALYSIS_FRAMEWORK.md` (15 sections A à O, ~45-60 points).

**Obligatoire** :
- Headline 1 phrase punchy
- 3+ sources cliquables vérifiées
- Section "Risques honnêtes" avec 3-5 scénarios de défaite
- Calcul EV transparent
- `comparison.top_alternatives` : 3-5 autres candidats sérieux écartés avec raison

---

## 🛡 Garde-fous anti-biais

### Biais identifiés (cas Tigers du 20/05)

1. **Confirmation bias** : J'avais une narrative "Bibee road struggles" et j'ai cherché des stats qui la soutiennent. J'aurais dû partir des stats et laisser la conclusion émerger.

2. **Cherry-picking** : Focus sur UNE stat négative (0-6 ERA road) sans peser le talent global (Bibee top 30 starter de la ligue).

3. **Anchoring sur les promos** : Cote "boostée" 2,73 m'avait "vendu" le pick avant l'analyse. Une cote boostée n'est PAS un signal de value, c'est du marketing.

4. **Narrative fallacy** : "Detroit reçoit, vs Cleveland en road trip" — histoire cohérente mais peu prédictive.

### Checklist pré-publication

Avant de publier le pick :

- [ ] Ai-je analysé ≥ 5 candidats avant de choisir celui-ci ? (sinon retour étape 3)
- [ ] Les 3 méthodes de calcul de proba convergent-elles à ±10 points ? (sinon trop d'incertitude)
- [ ] Puis-je nommer 3 scénarios de défaite réalistes ? (sinon analyse incomplète)
- [ ] Une personne avec opinion opposée pourrait-elle me convaincre ? (red team test mental)
- [ ] Suis-je en train de justifier OU d'analyser ? (formulation neutre dans le rationale)
- [ ] Le pick gagnerait-il toujours si on enlevait notre meilleur argument ? (robustesse)

Si réponse "non" à ≥ 2 questions → revoir l'analyse avant publication.

---

## 📈 Calibration & tracking

### Log obligatoire pour chaque pick

Au moment de la publication :
- Date, sport, pick, cote
- Probabilité estimée (méthode A, B, C, médiane)
- Sources principales utilisées (Tier 1/2/3)
- Risques identifiés (top 3)

Au moment du résultat :
- Outcome (win/loss/void)
- Score final + résumé 2 lignes
- **Analyse post-mortem** : si défaite, quel scénario s'est réalisé ? Étais-je calibré ?

### Métriques de calibration (revue mensuelle)

| Confiance déclarée | Taux de win réel attendu | Si écart > 10 pts |
|---|---:|---|
| 90%+ | ≥ 88% | Re-calibrer à la baisse |
| 80-89% | 75-90% | Ajuster modèles |
| 70-79% | 65-80% | Investigation |
| 60-69% | 55-70% | Acceptable (zone "value bet") |

**Objectif long terme** : taux de win observé doit matcher la probabilité moyenne déclarée à ±5 points.

---

## 🔄 Amélioration continue

Chaque pick perdu doit être documenté dans un `LESSONS_LEARNED.md` avec :

1. **Quel scénario s'est réalisé** ? (lié à ma liste de risques OU surprise totale)
2. **Quelle info manquante** aurait changé ma décision ?
3. **Quel biais** était à l'œuvre dans ma sélection ?
4. **Quelle source** aurait dû être consultée et ne l'a pas été ?
5. **Quelle règle ajouter** au pipeline pour éviter le même piège ?

À chaque ajout dans `LESSONS_LEARNED.md`, mettre à jour ce document
de méthodologie si la leçon est généralisable.

---

## 📊 Sources Web exploitables sans clé API (en attendant l'intégration)

Pour les jours où l'accès à The Odds API n'est pas possible (cette session
n'a pas la clé en env), exploiter via `WebSearch` + `WebFetch` :

### Cotes & marchés
- `oddsportal.com/{sport}/...` — agrégateur cotes multi-books
- `polymarket.com/event/...` — proba marché réel
- `sofascore.com/{sport}/match/...` — cotes + stats compactes
- `flashscore.com` — cotes + scores live

### Stats détaillées (sans clé)
- NBA : `stats.nba.com/stats/teamgamelog?TeamID={id}` (JSON)
- NHL : `statsapi.web.nhl.com/api/v1/teams/{id}/stats` (JSON)
- MLB : `statsapi.mlb.com/api/v1/teams/{id}/stats` (JSON)
- Tennis : `tennis-abstract.com/cgi-bin/...` (HTML mais structuré)
- Soccer : `fbref.com/en/comps/{id}/...` (HTML structuré)

### Modèles externes (free preview)
- `dimers.com/news/...prediction...` — modèle prob
- `lastwordonsports.com/.../predictions/` — analyse + pick
- `statsinsider.com.au/news/...prediction-{sport}-{league}` — ML model

---

## 🚦 Quand publier "Aucun pick aujourd'hui"

Conditions pour SKIP une journée (acceptable, voire recommandé) :

1. **Aucun match avec proba estimée ≥ 70%** dans la fenêtre 36h
2. **Toutes les analyses convergent vers cote < 1.30** (gain trop faible vs risque)
3. **Évènement majeur incertain** (météo extrême, blessures cascade non confirmées)
4. **Time disponible < 30 min** pour l'analyse
5. **Conflit de données entre sources Tier 1 et Tier 2** non résolu

Mieux vaut une journée vide qu'un pick mal analysé.

---

## 📋 Template d'analyse rapide (pour la phase 3)

Pour chaque candidat shortlisté :

```
Match : [Équipe A] vs [Équipe B] — [Compétition] — [Date H:M tz]
Pick analysé : [Sélection]
Cote bwin : [X.XX]

== Stats Tier 1 ==
- [Source 1] : [stat clé 1]
- [Source 2] : [stat clé 2]

== Tier 2 ==
- [Source 1] : [insight]
- [Source 2] : [insight]

== Tier 3 (consensus) ==
- [Modèle 1] : [proba]
- [Modèle 2] : [proba]

== Méthodes proba ==
A. Elo/Ranking : XX%
B. Forme récente : XX%
C. Marché consensus : XX%
Médiane : XX%

== Risques (top 3) ==
1. ...
2. ...
3. ...

== Verdict ==
PROBA = XX% | EV = XX% | Décision : RETAIN / DISCARD
```

---

*Document évolutif. Toute modification doit être commitée avec rationale.*
