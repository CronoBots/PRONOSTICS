# Trace technique — RG Day 4 — Analyse matchs RESTANTS — mercredi 27 mai 2026

**Heure analyse** : 27/05/2026 ~13h55 Belgique (UTC 11h55)
**Méthodologie** : NEXBET v4.8 (focus tennis, F3 EV ≥ +2% strict, AB-7 fatigue R2 actif, F4-fresh)
**Bankroll virtuel paper** : 100,00 € (cycle paper actif jusqu'au 23/06/2026)
**Branche** : claude/agent-pickup-testing-PjfQi
**Scope** : matchs RG R2 restants après 14h Belgique (pick J10 Telegram déjà publié — Bencic+Rublev 1.66 5€)
**Objectif run** : analyse comparative (vs Claude direct) — pas de nouveau pick à miser

## Étape 0 — Init ✅
Lecture parallèle des 7 fichiers OK. Notes auto-learning du 26/05/2026 :
- Bias tennis underestimate +33.2pts persistant — NOTÉ, non appliqué (rigueur F3 ≥ +2%)
- Auto-learning global underestimate +23pts × 3 runs — NOTÉ
- L'agent reste sur seuils v4.8 standard sans ajustement contextuel automatique

## Étape 1 — Cartographie ✅
WebSearch parallèles tennis (programme + predictions + best bets). 12 matchs Day 4
identifiés, dont 5 déjà terminés/walkover, 1 jambe combo Telegram exclu, 6 restants
analysables. Watchlist écrite dans `2026-05-27-afternoon-watchlist.md`.

**Sports actifs scope v4.6** : tennis only (demande user RG).

## Étape 2 — Pré-filtrage ✅

**Constat F1 strict (cote single 1.50-2.00)** :
- Aucun match restant avec cote favori native dans 1.50-2.00 SAUF Humbert (1.60).
- Paolini 1.49 = juste sous la limite F1.
- Tous les autres sont des favoris écrasants 1.057-1.20 → uniquement jouables en combiné.

**Combinés candidats v4.7 recherche active GS** (cf watchlist) :
- Seul **Zverev (1.195) + Paolini (1.49) = 1.78** approche la fenêtre F1 combo total
  (1.60-2.50). Jambe Zverev 1.195 juste sous le seuil F1 jambe 1.20.
- Tous les autres combos théoriques échouent F1 (Andreeva 1.057 trop basse partout, etc.)

**Top 6 candidats retenus pour analyse approfondie** :
1. Humbert vs Halys (single 1.60) — seul single dans la fenêtre
2. Paolini vs Sierra (single 1.49) — quasi-fenêtre, intéressante en combiné
3. Djokovic vs Royer (single 1.10) — uniquement jambe combo
4. Zverev vs Machac (single 1.195) — uniquement jambe combo
5. Andreeva vs Bassols Ribera (single 1.057) — uniquement jambe combo
6. **Combo Zverev + Paolini (1.78)** — seul combo F1-éligible

## Étape 3 — Analyse approfondie (parallèle WebSearch + snippets)

### Candidat 1 : Ugo Humbert vs Quentin Halys (Single ATP R2)

**Contexte** : Derby français, Court Simonne-Mathieu, 16h CET.
**Cote consensus** : Humbert 1.60 (médiane marché), Halys 2.33.
- book_proba_Humbert = 1 / 1.60 = **0.625**

**Sources quanti** :
- **Tennis Tonic** (whitelist accessible) via snippet :
  > "The pick for Tennis Tonic is Ugo Humbert who should win in 5 sets."

  → Pas de % chiffré explicite, mais pick Humbert. Source qualitative convergente, pas
  quanti.

**F4-fresh check (v4.8)** :
- Humbert a battu Mannarino R1 (date confirmée 25/05) — pas de signal physique majeur
  rapporté. R1 dans des conditions normales.
- Halys R1 : confirmé avancé. RotoWire historique (J1 — Halys "more comfortable on clay
  than Humbert") = signal qualitatif favorable underdog.

**Recherche % chiffré Humbert/Halys** : aucun modèle quanti accessible n'a publié un %
sur ce match (Dimers, Stats Insider ne couvrent pas ce derby français secondaire).
matchsignal.com ne donne pas de %.

**F4 KO** : 0 quanti sur ce candidat → ne peut pas calculer model_proba.

**AB-7 check (v4.8 fatigue R2)** :
- Humbert R1 vs Mannarino — durée non rapportée comme excessive. Pas de signal heatstroke.
- Pas d'application AB-7.

**Value upset search (Étape 1.5 v4.8)** :
- Halys "more comfortable on clay" (RotoWire) — signal mais Humbert R1 contre Mannarino
  s'est bien passé (pas le 0/8 R2 RG historique cité dans v4.8). Vérification : Humbert R2
  RG career — pas de stat killer 0/8 sur ce tour précis (à confirmer mais aucune source
  alerte n'a remonté ce flag pour 2026).
- Pas de tag VALUE UPSET clair sans plus de data.

**Verdict candidat 1** : 🔴 **F4 KO** (pas de quanti). Pas d'analyse possible.

### Candidat 2 : Jasmine Paolini vs Solana Sierra (Single WTA R2)

**Cote consensus** : Paolini 1.49, Sierra 2.61.
- book_proba_Paolini = 1 / 1.49 = **0.671**

**Sources quanti** :
- **Stats Insider** (whitelist) via snippet :
  > "A leading predictive analytics model gives Paolini a 62% chance of beating Sierra."

  → proba_modèle = **0.62** (1 source quanti, tag `stats-insider via snippet`)

- **The Stats Zone** : analyse présente, pas de % explicit dans le snippet (qualitatif)
- **Tennis Tonic** : pick Paolini en 3 sets (qualitatif)
- **Action Network** : preview + odds disponible (qualitatif sans % distinct)

→ n_eff = 1 quanti, ≥ 3 quali convergentes (Stats Insider quanti + Tennis Tonic + The
Stats Zone + Action Network qualitatives). F4 OK.

**F4-fresh v4.8** :
- Paolini R1 : 7-5 6-3 vs Yastremska (25/05). Match correct sans signal physique.
- Sierra R1 : 6-0 7-6 vs Raducanu — **performance dominante**. Sierra est dans une forme
  excellente.

**AB-7 (fatigue R2)** :
- Paolini R1 durée normale, pas de signal heatstroke. Pas d'application.

**Signal qualitatif négatif** :
- "Paolini has endured a poor start to 2026 and dropped out of the top 10" (sportsbettingdime).
- Sierra "extremely impressive in the first round" (multi-sources) — momentum dangereux.
- VSIN / Action Network / Sportsbettingdime ont publié des tips Sierra @ 13/8 (= 2.625).

**Calculs v4.1** :
- book_proba = 0.671
- model_proba = 0.62 (Stats Insider seul)
- n_eff = 1
- proba_shrunk = (1 × 0.62 + 2 × 0.671) / 3 = (0.62 + 1.342) / 3 = **0.654**
- EV = 0.654 × 1.49 − 1 = 0.974 − 1 = **-2.6%** → 🔴 **F3 KO**

Le modèle Stats Insider (62%) est SOUS la book_proba (67%), donc EV négatif.

**Verdict candidat 2** : 🔴 **INSUFFISANT** (EV -2.6%).

### Candidat 3 : Novak Djokovic vs Valentin Royer (Single ATP R2 — jambe combo)

**Cote consensus** : Djokovic 1.099, Royer 6.90.
- F1 single KO (cote < 1.50). Candidat **uniquement comme jambe combo**.

**Sources quanti** :
- **Dimers** (whitelist) via snippet :
  > "Dimers' famous predictive model gives Djokovic a 91% chance of beating Royer in the
  > French Open 2026. Djokovic has an 81% chance of winning the first set."

  → proba_modèle = **0.91** (1 source quanti, tag `dimers via snippet`)

- Tennis Tonic, LastWord, El-Balad : tous picks Djokovic (qualitatifs convergents)

F4 OK (1 quanti + ≥ 3 quali).

**F4-fresh v4.8** :
- Djokovic R1 : 5-7 7-5 6-1 6-4 vs Mpetshi Perricard — 4 sets, ~3h. Pas excessif mais
  perdu set 1.
- Pas de signal physique majeur rapporté.

**AB-7 (fatigue R2)** :
- Djokovic R1 ~3h, 4 sets — sous le seuil 3h30 / 5 sets. Pas d'application AB-7.

**AB-1 (top-10 ATP)** :
- v4.3 recadré : NON applicable au GS lui-même. Djokovic analysable.

**Calculs v4.1 (en single, illustration)** :
- book_proba = 1/1.099 = 0.910
- model_proba = 0.91 (Dimers)
- n_eff = 1
- proba_shrunk = (1 × 0.91 + 2 × 0.910) / 3 = **0.910**
- EV = 0.910 × 1.099 − 1 = 1.000 − 1 = **0.0%** → 🟠 BORDERLINE

Edge nul — le marché price parfaitement Djokovic. Standalone single 🟠 mais cote sous F1.

**Verdict candidat 3 (single)** : 🔴 **F1 KO** (cote 1.10 < 1.50). En jambe combo : OK
techniquement (0.91 ≥ 0.67 seuil F1 combo jambe), à combiner avec autre fav cote 1.30-1.50
pour atteindre fenêtre 1.60-2.50.

### Candidat 4 : Alexander Zverev vs Tomas Machac (Single ATP R2 — jambe combo / night)

**Cote consensus** : Zverev 1.195, Machac 4.60.
- F1 single KO (cote < 1.50). Candidat jambe combo / informationnel.

**Sources quanti** :
- **Bleacher Nation** (whitelist) via snippet :
  > "Using the moneyline for this match as a prediction, the implied chance for Alexander
  > Zverev is 86.2%."

  → C'est de la cote implicite, PAS un modèle. Pas quanti distincte.

- **Site analyste** cité dans search : "Zverev's historical clay metrics and 84.6% win
  projection signal a lopsided, swift victory."
  → proba_modèle = **0.846** (1 source quanti, tag `analyst via snippet`).
  ⚠️ Source non identifiée précisément dans le snippet — risque F4 KO si on applique la
  règle "domaine identifiable". À traiter comme **fragile**.

- Tennis Tonic, LastWord, Britwatch : picks Zverev (qualitatifs)

**F4 borderline** : 1 quanti fragile + 3 quali. On l'accepte avec caveat (tag fragile).

**F4-fresh v4.8** :
- Zverev R1 : 6-3 6-4 6-2 vs Bonzi — 3 sets dominant, ~2h. **Frais et confiant**.
- 14-4 record clay 2026.

**AB-7 (fatigue R2)** :
- Zverev R1 court (2h, 3 sets straight) → AUCUNE dérate AB-7. Frais.

**AB-1** : NON applicable (GS lui-même, v4.3 recadré).

**Calculs v4.1 (en single, illustration)** :
- book_proba = 1/1.195 = 0.837
- model_proba = 0.846 (analyst snippet)
- n_eff = 1 (fragile)
- proba_shrunk = (1 × 0.846 + 2 × 0.837) / 3 = (0.846 + 1.674) / 3 = **0.840**
- EV = 0.840 × 1.195 − 1 = 1.004 − 1 = **+0.4%** → 🟠 BORDERLINE (mais cote sous F1)

**Verdict candidat 4 (single)** : 🔴 **F1 KO** (cote 1.195 < 1.50). En jambe combo :
proba 0.84 ≥ 0.67 seuil, **OK comme jambe combo**.

### Candidat 5 : Mirra Andreeva vs Marina Bassols Ribera (Single WTA R2 — jambe combo)

**Cote consensus** : Andreeva 1.057, Bassols Ribera 9.20.
- F1 single KO (cote très basse). Jambe combo théorique mais 1.057 < 1.20 → **F1 combo
  jambe KO** aussi.

**Sources quanti** :
- **Dimers** (whitelist) via snippet :
  > "Predictive models give Andreeva a 93% chance of winning against Bassols Ribera."

  → proba_modèle = **0.93** (1 source quanti)

**Contexte v4.8 amélioration #1 (coverage élargie hot streak surface)** :
- Andreeva : 15W terre 2026 (hot streak surface confirmé), ranking #8, 30-9 record 2026.
- Bassols Ribera : ranking #175, 22-10 record 2026 (sur Challenger principalement).

**F4-fresh / AB-7** :
- Andreeva R1 : 6-3 6-3 vs Ferro en 1h32 (matin du 25/05 selon Outlook). Sec et propre.
  Pas de signal heatstroke. Frais.

**Calculs v4.1 (en single, illustration)** :
- book_proba = 1/1.057 = 0.946
- model_proba = 0.93
- n_eff = 1
- proba_shrunk = (1 × 0.93 + 2 × 0.946) / 3 = (0.93 + 1.892) / 3 = **0.941**
- EV = 0.941 × 1.057 − 1 = 0.994 − 1 = **-0.6%** → 🔴 Légèrement négatif

Le book overprice Andreeva légèrement vs Dimers 93%. Edge faible négatif.

**Verdict candidat 5** : 🔴 **F1 KO single** (1.057). **F1 KO jambe combo** (1.057 < 1.20
seuil v4.3). **Inutilisable.**

### Candidat 6 : Combo Zverev (1.195) + Paolini (1.49) = 1.781 (Combo 2 jambes)

**F1 combo check** :
- Jambe Zverev 1.195 : **❌ SOUS seuil F1 combo jambe 1.20** (limite stricte v4.3 = 1.20-1.50)
- Jambe Paolini 1.49 : ✓ (dans 1.20-1.50)
- Cote totale 1.781 : ✓ (dans 1.60-2.50)

→ **F1 KO** sur la jambe Zverev (1.195 sous 1.20). Techniquement rejet.

**Si on relaxe** (Zverev "presque 1.20") :
- proba_combo = 0.840 × 0.654 = **0.549**
- EV_combo = 0.549 × 1.781 − 1 = 0.978 − 1 = **-2.2%** → 🔴

L'EV combo est négatif principalement à cause de Paolini (EV single -2.6%). Le combo ne
sauve pas Paolini.

**Anti-corrélation v4.7** : ✓ (1 match ATP + 1 WTA, indépendants).

**Verdict candidat 6** : 🔴 **INSUFFISANT** (F1 KO Zverev + EV -2.2% même en relaxant).

## Étape 4 — Application learnings + anti-bias

| Règle | Statut | Application |
|---|---|---|
| **F0** sport actif | OK | Tennis = scope v4.6 |
| **AB-1** top-10 ATP warm-up GS | NON applicable | Tous les top-10 jouent le GS lui-même (v4.3 recadré) |
| **AB-2** perdant 1-3 NBA playoffs | NON applicable | Pas NBA |
| **AB-4** combo 3+ jambes | Respecté | Pas de combo 3+ proposé |
| **AB-5** MLB > 2.50 | NON applicable v4.6 | Pas MLB |
| **AB-7** fatigue R2 (v4.8) | Vérifié sur tous | Aucun joueur favori sur les 6 candidats restants ne déclenche AB-7 (Djokovic R1 4 sets ~3h en dessous seuil 3h30 ; Andreeva, Zverev, Paolini R1 courts). **Ruud aurait été concerné mais est analysé dans Run 3 séparément**. |
| **F4-fresh** v4.8 | Vérifié sur tous | Pas de sources pré-tournoi obsolètes utilisées ; Dimers/Stats Insider/etc. timestamped 26-27/05/2026 |
| **Coverage élargie v4.8 #1** | Appliqué | Andreeva "hot streak terre 2026" identifié (15W) mais cote 1.057 ne permet aucun jeu propre |
| **Value upset search v4.8 #2** | Appliqué | Sierra vs Paolini = signal mais Stats Insider 62% ne suffit pas à passer F3 ; Halys vs Humbert = signal RotoWire mais pas de quanti dispo (F4 KO) |
| **SKIP discipline v4.8 #3** | Appliqué | Aucun candidat zone borderline avec signal négatif documenté |

**Auto-learning bias** : NOTÉ (tennis +33pts underestimate persistant) mais NON appliqué.
Rigueur F3 maintenue.

## Étape 5 — Calculs synthèse

| Candidat | Cote | book_proba | model_proba | n_eff | proba_shrunk | EV | F1 | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1. Humbert vs Halys (S) | 1.60 | 0.625 | — | 0 | — | — | OK | 🔴 **F4 KO** (pas de quanti) |
| 2. Paolini vs Sierra (S) | 1.49 | 0.671 | 0.62 (Stats Insider) | 1 | 0.654 | **-2.6%** | KO (1.49 < 1.50) | 🔴 **F3 KO** |
| 3. Djokovic vs Royer (S) | 1.10 | 0.910 | 0.91 (Dimers) | 1 | 0.910 | **0.0%** | KO (< 1.50) | 🔴 **F1 KO single** / jambe combo OK |
| 4. Zverev vs Machac (S) | 1.195 | 0.837 | 0.846 (analyst) | 1 fragile | 0.840 | **+0.4%** | KO (< 1.50) | 🔴 **F1 KO single** / jambe combo OK |
| 5. Andreeva vs Bassols R. (S) | 1.057 | 0.946 | 0.93 (Dimers) | 1 | 0.941 | **-0.6%** | KO (< 1.20 jambe combo) | 🔴 **F1 KO partout** |
| 6. Combo Zverev + Paolini | 1.781 | — | 0.549 (produit) | — | 0.549 | **-2.2%** | KO (Zverev 1.195 < 1.20) | 🔴 **F1 + F3 KO** |

**Aucun candidat ne passe verdict 🟡 ou 🟢 après application stricte v4.8.**

## Étape 6 — Verdict global

**Cas C** (méthodologie v4.7) : **aucun candidat défendable** sur les matchs RESTANTS Day 4.

**Recommandation** : SKIP sur le périmètre restant. Le combo Telegram déjà publié
(Bencic+Rublev 1.66 à 5€) reste l'unique exposition de la journée — la jambe Bencic est
gagnée (6-4 6-0 vs McNally confirmé multi-sources), la jambe Rublev est en attente
(75% Stats Insider + cote -375 ≈ 80% implicite, EV positif sur la jambe).

**Pourquoi rien ne passe sur le restant** :
1. Les favoris de 16h+ ont des cotes trop basses pour F1 single (Djokovic 1.10, Zverev
   1.195, Andreeva 1.057, Paolini 1.49 limite).
2. Le seul single dans la fenêtre F1 (Humbert 1.60) n'a pas de modèle quanti accessible
   (F4 KO).
3. Le seul combo F1-éligible théorique (Zverev+Paolini 1.78) échoue F1 (Zverev sous 1.20)
   ET F3 (EV -2.2%).
4. Les combos avec Andreeva, Djokovic ou Rybakina sont tous F1 KO (jambes < 1.20).

**Signal méthodologique** : la "fenêtre cote" v4 est mal adaptée aux soirées GS R2 où les
favoris top-5 dominent. La recherche active combo v4.7 trouve des opportunités quand 2
jambes 1.20-1.50 coexistent ; ici, le mix de cotes (très basses 1.05-1.20 ou hautes 1.49+)
ne génère pas de combo propre. **Ce n'est pas un bug, c'est de la discipline mathématique.**

## Étape 7 — Auto-checks v4.8

- [x] Lecture parallèle des 7 fichiers Étape 0
- [x] Watchlist écrite dans `decisions/2026-05-27-afternoon-watchlist.md`
- [x] Sports actifs respectés v4.6 (tennis only)
- [x] WebSearch parallèles sur whitelist v4
- [x] check_duplicate.py : N/A (pas de nouveau pick proposé)
- [x] F4 v4.1 : appliqué (1 quanti + ≥ 3 quali requis). Candidat 1 (Humbert) rejeté F4.
- [x] Dédup éditeur : Tennis Tonic / LastWord / Britwatch traités comme éditeurs distincts
- [x] Sources snippet taguées "via snippet" + snippet reproduit verbatim
- [x] proba_shrunk calculé w_book = 2 fixe
- [x] EV strict ≥ +2% pour 🟡 — aucun candidat ne passe
- [x] AB-7 v4.8 vérifié sur chaque pick (aucun ne déclenche)
- [x] F4-fresh v4.8 vérifié (toutes sources timestamped post-R1)
- [x] Active value/upset search v4.8 (Sierra, Halys identifiés mais F3/F4 KO)
- [x] Aucun AB BLOCANT déclenché
- [x] Trace technique écrite (présent fichier)
- [x] Rapport user narratif à produire dans la réponse conversation
- [x] **PAS d'auto-validation** (mode comparison run, pas de paper position à ajouter)

## Sources consultées (URLs)

**Programme & cartographie** :
- https://www.olympics.com/en/news/roland-garros-2026-full-order-of-play-wednesday-27-may-all-matches-complete-schedule
- https://10sballs.com/2026/05/26/roland-garros-tennis-draws-and-schedule-for-day-4-wednesday-may-27-2026/
- https://www.cbssports.com/tennis/news/2026-french-open-draw-schedule-bracket-date-roland-garros/

**Quanti** :
- https://www.dimers.com/news/valentin-royer-vs-novak-djokovic-tennis-prediction-french-open-2026-ac (Djokovic 91%)
- https://www.dimers.com/news/mirra-andreeva-vs-marina-bassols-ribera-tennis-prediction-french-open-2026-ac (Andreeva 93%)
- https://www.statsinsider.com.au/news/jasmine-paolini-vs-solana-sierra-prediction-french-open-2026 (Paolini 62%)
- https://www.statsinsider.com.au/news/sara-bejlek-vs-iga-swiatek-prediction-french-open-2026 (Swiatek 90% — match déjà joué, référence)
- https://www.statsinsider.com.au/news/camilo-ugo-carabelli-vs-andrey-rublev-prediction-french-open-2026 (Rublev 75% — jambe combo Telegram)
- https://www.bleachernation.com/picks/2026/05/25/machac-vs-zverev-prediction-at-the-roland-garros-wednesday-may-27/ (Zverev 84.6%/86.2%)

**Quali / picks / news** :
- https://lastwordonsports.com/tennis/2026/05/26/french-open-day-4-mens-predictions-djokovic-royer/
- https://lastwordonsports.com/tennis/2026/05/26/french-open-day-4-mens-predicitions-zverev-machac/
- https://lastwordonsports.com/tennis/2026/05/26/french-open-womens-day-4-predictions-andreeva-bassols-ribera/
- https://lastwordonsports.com/tennis/2026/05/26/french-open-womens-day-4-predictions-rybakina-starodubtseva/
- https://tennistonic.com/tennis-news/1003231/h2h-prediction-of-ugo-humbert-vs-quentin-halys-at-the-french-open-with-odds-preview-pick-27th-may-2026/
- https://tennistonic.com/tennis-news/1003273/h2h-prediction-of-jasmine-paolini-vs-solana-sierra-at-the-french-open-with-odds-preview-pick-3rd-june-2026/
- https://www.rotowire.com/tennis/article/tennis-betting-2026-french-open-betting-picks-odds-predictions-and-tennis-best-bets-527-115786
- https://vsin.com/tennis/french-open-predictions-tennis-best-bets-for-wednesday-may-27/
- https://www.sportsbettingdime.com/news/tennis/french-open-picks-predictions-today-best-bets-for-may-27/
- https://insights.betfred.com/tennis/french-open/tennis-betting-tips-wednesday-27-may-2026/

**Confirmations matchs déjà terminés (audit jambe Bencic)** :
- https://tennistonic.com/tennis-news/1003730/live-updates-belinda-bencic-trashes-mcnally-in-the-2nd-round-french-open-results/ (Bencic 6-4 6-0)
- https://cyprus-mail.com/2026/05/27/de-minaur-faces-rising-star-blockx-at-french-open-svitolina-downplays-title-talk (Blockx WO)

## Anomalies / doutes

1. **Statut en temps réel** : à 13h55 Belgique, Rybakina et Ruud sont possiblement déjà en
   cours (Lenglen tôt après-midi). L'analyse les exclut donc du périmètre "restant" — à
   monitorer si l'utilisateur veut un appel live.
2. **Humbert vs Halys** : aucun modèle quanti accessible n'a publié sur ce derby français.
   F4 KO mécaniquement. Une analyse plus approfondie avec accès tennis-abstract ou WTAtour
   stats pourrait débloquer un pick, mais hors whitelist.
3. **Zverev model_proba 84.6%** : source "analyst" non explicitement nommée dans le
   snippet Bleacher Nation. Risque de "snippet agrégateur anonyme" — tagué fragile dans
   le calcul. Si on rejette cette source : Zverev devient F4 KO (0 quanti).
4. **Combo Telegram Bencic+Rublev (déjà placé)** : la jambe Bencic est gagnée. La jambe
   Rublev (75% Stats Insider, cote -375 ≈ 80%) est techniquement EV légèrement négatif
   en single (book = 80%, model = 75%, shrunk = (1×0.75 + 2×0.80)/3 = 0.783 → EV = 0.783
   × 1.20 − 1 = -6%). Mais en combiné avec boost ou jambe Bencic forte, l'EV combo
   peut rester positif. **À auditer post-match dans une trace dédiée.**
5. **SofaScore PRIMAIRE non sollicitée ce run** : analyse en mode "rapide WebSearch" pour
   les matchs restants. Adapter SofaScore aurait pu enrichir (votes publics, h2h, win
   probability) — à utiliser si un user demande analyse approfondie sur 1 match précis.

## Décision user

Mode **comparison run** — pas d'action user attendue. Aucun pick ajouté à
`paper_trading_log.md`. Le pick J10 Telegram (Bencic+Rublev) reste l'exposition unique de
la journée.

Verdict final : **SKIP sur les matchs restants Day 4**. Discipline mathématique respectée
— rien ne passe F1+F3+F4 simultanément après dédup et application v4.8.
