# NΞXBΞT analyst — Critères de filtrage

> Référence obligatoire pour l'agent. Tout candidat doit passer CHAQUE
> filtre pour entrer en short-list. Pas de pick produit si la short-list
> est vide après filtrage.

## Filtres durs (NON négociables)

### F1 — Cote (resserré v3 — 23/05/2026)
- **Single** : 1.50 – 2.00 (sweet spot 1.65 – 1.90)
- **Combiné 2 jambes** : cote totale finale 1.60 – 2.20
- **Combiné jambe individuelle** : 1.20 – 1.45 (= proba implicite 0.69 – 0.83
  par jambe, "presque sûre")
- **Pourquoi le resserrement** : profil utilisateur veut "presque sûr",
  cote au-dessus de 2.00 implique proba < 50% au book = trop risqué.
  Sous 1.50, EV trop sensible aux erreurs d'estimation.

### F2 — Probabilité estimée (shrunk) — par tier
- **Single PREMIUM** : `proba_shrunk` ≥ 0.62
- **Single STANDARD** : `proba_shrunk` ≥ 0.58
- **Single FLOOR** : `proba_shrunk` ≥ 0.55 (fallback "garantir 1 pick/jour")
- **Combo jambe individuelle** : `proba_shrunk` ≥ 0.72 ("presque sûre")
- **Combo combinée** : ≥ 0.55 (produit des 2 jambes)
- **Plafond utile** : 0.85 (au-delà cote trop basse pour respecter F1)
- **Comment estimer** :
  1. `model_proba` = moyenne pondérée sources (sharp ×3, pro ×2,
     mainstream ×1)
  2. `proba_shrunk = (n_eff × model_proba + 2 × book_proba) / (n_eff + 2)`
     où `n_eff` = nombre de sources solides (max 5), `book_proba = 1/cote`
  3. Bonus/malus : pas de sharp = -0.03 ; PC déclenché = +0.02
- **Champ stocké** : `proba_shrunk` devient `model_probability` dans le
  JSON final (plus honnête que l'estimation brute).

### F3 — Expected Value — par tier
- **Single PREMIUM** : EV ≥ +5%
- **Single STANDARD** : EV ≥ +2%
- **Single FLOOR** : EV ≥ -2% (on accepte un edge marginalement négatif
  uniquement si c'est l'option la plus safe disponible — la mise sera
  réduite à 1-2€)
- **Combo** : EV ≥ +8% (boost bwin recommandé pour atteindre ce seuil)
- **Formule** : `EV = (proba_shrunk × cote) − 1` (toujours proba shrunk,
  pas la model brute).

### F4 — Sources externes
- **Min PREMIUM/STANDARD** : 3 sources pros indépendantes, **dont 1 sharp
  recommandée** (Polymarket, Pinnacle, Betfair Exchange).
- **Min FLOOR** : 2 sources pros indépendantes suffisent.
- **Pas de sharp accessible** : malus `-0.03` sur `proba_shrunk` ET noter
  le risque dans la rationale. Pas blocking pour permettre 1 pick/jour
  même sur tournois mineurs où sharps illiquides (cf observation v2
  Geneva 23/05).
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

## Mise (stake) — par tier

| Tier | Conditions résumées | Mise | Communication |
|---|---|---|---|
| 🟢 **PREMIUM** | proba_shrunk ≥ 0.62, EV ≥ +5%, sharp dispo | 5 € | "Confiance ÉLEVÉE — Premium pick" |
| 🟡 **STANDARD** | proba_shrunk ≥ 0.58, EV ≥ +2% | 3 € | "Confiance MODÉRÉE — Standard pick" |
| 🟠 **FLOOR** | proba_shrunk ≥ 0.55, EV ≥ -2% | 1-2 € | "Confiance LIMITE — Daily floor pick" |
| 🔵 **COMBO** | 2 jambes proba ≥ 0.72 each, EV ≥ +8% | 5 € | "Combo presque sûr" |

### Adjustement Kelly
- Si EV ≥ +20% ET proba_shrunk ≥ 0.70 : autoriser mise jusqu'à 10 €
- Si EV ≥ +30% (cas boost bookmaker) ET proba_shrunk ≥ 0.62 : autoriser
  jusqu'à bankroll × 0.30 (Kelly safe).
- **Ne JAMAIS dépasser** 50% du bankroll courant en mise unique (cap dur).

### Référence
Kelly criterion : `fraction = (proba × cote − 1) / (cote − 1)`.

## Combiné (parlay) — règles spécifiques v3

Un combiné est autorisé SI :
- **2 jambes maximum** (jamais 3+, variance trop élevée)
- **Chaque jambe** : `proba_shrunk` ≥ 0.72 ET cote individuelle 1.20-1.45
- **Probabilité combinée** ≥ 0.55 (= produit des probas shrunk)
- **Cote combinée finale** : 1.60 – 2.20 (après boost si applicable)
- **EV combinée** ≥ +8% (boost bwin fortement recommandé pour atteindre)
- **Pas de corrélation** : sports différents ou ligues différentes
  obligatoire (jamais 2 matchs du même tournoi le même jour)
- **Préférence** : combiné AVEC boost bwin prioritaire vs single
  équivalent.

## Garantie "1 pick par jour" (v3 — 23/05/2026)

**Pivot de philosophie** : la promesse user est désormais "1 pick chaque
jour", pas "discipline > volume". L'agent doit toujours produire un pick,
en descendant la cascade des tiers jusqu'à trouver un candidat :

1. Essayer **PREMIUM** d'abord (single ou combo qui passent tout)
2. Sinon **STANDARD** (single avec proba_shrunk ≥ 0.58, EV ≥ +2%)
3. Sinon **FLOOR** (meilleur candidat dispo, mise réduite 1-2€)

Le tier choisi DOIT être indiqué :
- Dans le JSON : champ `tier` (string : `premium`, `standard`, `floor`,
  `combo`)
- Dans la confidence note : "Confiance [ÉLEVÉE/MODÉRÉE/LIMITE] — [tier]
  pick"
- Dans la trace : explication pourquoi pas un tier supérieur

## Cas RARE de "no pick today" (uniquement)

Seuls 3 scénarios autorisent encore le skip :
- **Aucun event sportif** dans la fenêtre 36h (cas extrême)
- **Circuit breaker bankroll** : 4 losses consécutives ET bankroll < 10€
- **Quota API + WebFetch + WebSearch tous KO** simultanément (panne tech)

Dans tous les autres cas, l'agent produit au minimum un pick FLOOR.
