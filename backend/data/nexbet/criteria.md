# NΞXBΞT analyst — Critères de filtrage

> Référence obligatoire pour l'agent. Tout candidat doit passer CHAQUE
> filtre pour entrer en short-list. Pas de pick produit si la short-list
> est vide après filtrage.

## Filtres durs (NON négociables)

### F1 — Cote
- **Min** : 1.50
- **Max** : 3.00 (au-delà = trop spéculatif, hors profil "safe")
- **Sweet spot** : 1.70 – 2.40
- **Pourquoi** : sous 1.50, l'EV est trop sensible aux erreurs d'estimation
  de proba ; au-dessus de 3.00, on sort du profil "safe favorite" et le
  variance devient trop forte sur le bankroll.

### F2 — Probabilité estimée (shrunk)
- **Min** : 0.62 (`proba_shrunk` ≥ 62%) — **relevé de 0.60 → 0.62 le 23/05/2026**
- **Recommandé** : 0.65 – 0.78
- **Plafond utile** : 0.85 (au-delà la cote sera trop basse pour respecter F1)
- **Pourquoi** : à 62%+ on a une marge de sécurité contre le biais
  d'optimisme. Le seuil 0.60 d'origine était trop sensible (un pick à
  0.61 = 1pt au-dessus du seuil, le moindre biais tuait l'EV).
- **Comment estimer** :
  1. `model_proba` = moyenne pondérée sources (sharp ×3, pro ×2,
     mainstream ×1)
  2. `proba_shrunk = (n_eff × model_proba + 2 × book_proba) / (n_eff + 2)`
     où `n_eff` = nombre de sources solides (max 5), `book_proba = 1/cote`
  3. Bonus/malus : pas de sharp = -0.03 ; PC déclenché = +0.02
- **Champ stocké** : `proba_shrunk` devient `model_probability` dans le
  JSON final (plus honnête que l'estimation brute).

### F3 — Expected Value
- **Min** : +7% (EV > 0.07) — **relevé de +5% → +7% le 23/05/2026**
- **Recommandé** : +10% à +25%
- **Formule** : `EV = (proba_shrunk × cote) − 1` (utiliser la proba
  shrunk, pas la model brute)
- **Pourquoi** : +5% laissait trop de bruit passer. +7% garantit un
  edge net même après variance d'estimation ±2pts.
- **Exception "boost bookmaker"** : si bwin / DraftKings / FanDuel offre un
  boost qui amène l'EV au-dessus de +30%, on peut accepter une proba
  shrunk légèrement plus basse (min 0.57 dans ce cas) car le boost
  compense.

### F4 — Sources externes
- **Min** : 3 sources pros indépendantes confirmant la lecture, **dont
  au moins 1 source sharp** (Polymarket, Pinnacle, Betfair Exchange) —
  **règle "1 sharp obligatoire" ajoutée le 23/05/2026**.
- Si aucune source sharp n'est accessible sur le pick : appliquer le
  malus `-0.03` sur `proba_shrunk` (cf F2) ET noter le risque dans la
  rationale.
- **Sources whitelist** (qualité prouvée) — voir learnings.md section
  "Sources fiables par sport". Privilégier dans cet ordre :
  - NBA : ESPN BPI, FiveThirtyEight, OddsShark, BleacherNation, NBC Sports
  - Tennis : ATP Tour officiel, Tennis Tonic, Stats Insider, Last Word
    on Sports, Dimers
  - NHL : OddsShark, Covers, Lineups, NHL.com, CBS Sports
  - MLB : OddsShark, FanGraphs, BaseballReference, Action Network
  - Soccer : FootballOranje, WhoScored, FBref, OPTAJoe, Football Whispers
- **Sources sharps (validation cross)** : Polymarket, Pinnacle line (si
  accessible). Si sharps divergent fortement du consensus public, c'est
  un signal — soit on suit les sharps, soit on note le désaccord dans
  les risques.

### F5 — Kickoff dans la fenêtre
- **Min** : 1h après l'heure courante (sinon plus de marge pour analyse,
  cote a déjà bougé)
- **Max** : 36h dans le futur (au-delà, line non stable, blessures
  inconnues)
- **Cas idéal** : 6h – 24h dans le futur (line établie, news intégrées,
  pas de rush).

### F6 — Liquidité du marché
- **Min** : 2 bookmakers majeurs offrent la cote (bwin + DraftKings
  minimum, idéalement + FanDuel ou Pinnacle).
- **Pourquoi** : 1 seul book = risque de cote artificielle / arb pas
  exploitable.

## Filtres souples (à pondérer)

### S1 — Pas de blessure incertaine sur joueur clé
Si un joueur majeur a un statut "questionnable" ou "game-time decision",
attendre une heure avant le match si possible, ou rejeter le pick.

### S2 — Pas de "trap game"
Trap = match où l'équipe favorite est sous-motivée (ex : déjà qualifiée,
match milieu de série de playoffs avec déjà 3-0 avance, jour de repos
avant gros match suivant).

### S3 — Coaching matchup favorable
Vérifier que le coach de l'équipe pickée a un H2H favorable contre le
coach adverse OU qu'il est connu pour réagir bien dans la situation
courante (ex : Thibodeau adjustments G1→G2 documentés).

### S4 — État mental / momentum
Underdog avec gros momentum playoff (Cinderella run) est un signal de
prudence sur le favori. Vérifier si le favori est "complacent" après une
G1 win.

### S5 — Surface / conditions
Tennis : vérifier si la surface favorise le style du joueur.
Foot/baseball outdoor : vérifier météo (pluie, vent fort changent les
totals).

### S6 — Public money %
Si > 75% du public est sur notre side ET la line est restée stable, ça
peut être un "trap public" — vérifier avec Pinnacle ou sharps.

## Mise (stake)

### Standard
- **Mise par défaut** : 5,00 €
- **Mise sweet spot** : 5 – 10 € (entre 1/5 et 2/5 du bankroll cible 25€)

### Adjustement Kelly
- Si EV ≥ +20% ET proba ≥ 0.70 : autoriser mise jusqu'à 10 €
- Si EV ≥ +30% (cas boost bookmaker) ET proba ≥ 0.62 : autoriser jusqu'à
  bankroll × 0.30 (Kelly safe).
- Si EV entre +5% et +10% : limiter à 5 € (ne pas sur-miser sur edges
  marginaux).
- **Ne JAMAIS dépasser** 50% du bankroll courant en mise unique (cap dur).

### Référence
Voir Kelly criterion : `fraction_optimale = (proba × cote − 1) / (cote − 1)`.
Pour bankroll 25€, proba 0.65, cote 1.85 → fraction = 0.20 = 5€ (cohérent
avec notre mise standard).

## Combiné (parlay) — règles spécifiques

Un combiné est autorisé SI :
- **2 jambes maximum** (jamais 3+, variance trop élevée)
- **Chaque jambe** respecte individuellement F1 + F2 (proba ≥ 0.70 minimum
  pour chaque, sinon proba combinée < 0.50)
- **Probabilité combinée** ≥ 0.55 (= produit des probas individuelles)
- **Pas de corrélation** entre les jambes (sports différents ou ligues
  différentes idéal ; jamais 2 matchs du même tournoi le même jour)
- **Cote combinée** ≥ 1.80
- **EV combinée** ≥ +10%
- **Préférence** : si un combiné se présente AVEC boost bookmaker (bwin
  fait des promos régulières sur combos), il devient prioritaire vs pick
  solo équivalent.

## Cas de rejet (no pick today)

L'agent DOIT produire "no pick today" plutôt qu'un mauvais pick si :
- Aucun candidat ne passe F1+F2+F3+F4 simultanément
- Les top 3 candidats ont des sources qui divergent fortement
- Quota API épuisé ET impossible de vérifier les cotes en cross-bookmaker
- Plus de 3 défaites consécutives récentes ET pas de candidat à proba ≥ 0.75
  (mode "circuit breaker" pour protéger le bankroll)

Le message "no pick today" doit expliquer POURQUOI (quel filtre a tout
éliminé) et lister les 3 meilleurs candidats étudiés avec leur reason de
rejet, pour traçabilité.
