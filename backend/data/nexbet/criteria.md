# NΞXBΞT — Critères de filtrage (v4.3 — Recap-only + Narratif + AB-1 recadré)

> **v4.3 (24/05/2026 matin)** : recadrage AB-1 — désormais BLOCANT
> uniquement sur tournois warm-up ATP 250/500 à J-2/J-1 d'un GS, **PAS**
> sur les GS eux-mêmes. La règle initiale (n=1 Ruud à Geneva) était trop
> large. Extension F1 combo jambe individuelle 1.20-1.50.
> **v4.2 (24/05/2026)** : dual artefact obligatoire — trace technique +
> rapport user narratif.
> **v4.0 (23/05/2026)** : suppression des tiers PREMIUM/STANDARD/FLOOR,
> suppression de F1-bis Playoff Mode et BOOST MODE. Méthodologie
> simplifiée, EV minimum strict +2%, mode paper trading 30 jours.
> L'agent présente, le user décide.

## Filtres durs (NON négociables)

### F1 — Cote
- **Single** : 1.50 – 2.00 (sweet spot 1.65 – 1.90)
- **Combiné 2-3 jambes** : cote totale 1.60 – 2.50 (avec OU sans boost
  bwin — élargie de 2.20 à 2.50 en v4.3 pour permettre les triples
  combinés de favoris écrasants)
- **Combiné jambe individuelle** : 1.20 – 1.50 (proba implicite
  0.67 – 0.83 par jambe) — **élargi en v4.3** (était 1.20-1.45)
- **F1-bis SUPPRIMÉ** (Playoff Mode 2.00-2.50 supprimé — basé sur n=1
  Spurs + un faux outcome Knicks G3 confondu avec G2)

### F2 — Probabilité estimée (shrunk)
- **Minimum recommandable** : `proba_shrunk` ≥ 0.55
- **Cible RECOMMANDÉ** : `proba_shrunk` ≥ 0.60
- **Combo jambe individuelle** : `proba_shrunk` ≥ 0.72
- **Combo combinée** : ≥ 0.55 (produit des 2 jambes)
- **Plafond utile** : 0.85 (au-delà cote trop basse pour F1)

**Méthode de calcul (v4.1)** :
1. `book_proba = 1 / cote`
2. `model_proba = MÉDIANE des probas % chiffrées disponibles`
   - **Min 1 source quantitative + 3 sources convergentes** (voir F4
     v4.1 pour règle complète)
   - **Après dédup éditeur** (médiane interne sur articles d'un même
     domaine, comptée 1× ensuite)
   - Pas de pondération sharp×3 / pro×2 — médiane simple, résistance
     aux outliers
3. `w_book = 2` (FIXE — pas d'adaptatif. Sample n=6 insuffisant pour
   calibrer w_book ∈ {2,3,4})
4. `n_eff = min(nombre de sources quantitatives effectives après dédup, 5)`
   - Min 1, max 5. Sources qualitatives convergentes ne comptent PAS
     dans `n_eff` (mais valident F4 convergence)
5. `proba_shrunk = (n_eff × model_proba + 2 × book_proba) / (n_eff + 2)`
   - Si n_eff = 1 (une seule source quanti + 2-3 quali convergentes) :
     poids book ⅔, signal modèle ⅓ → garde-fou intégré contre source
     unique

**Bonus/malus** :
- **Pas de malus "no sharp"** : on n'a structurellement pas accès aux
  sharps via WebFetch (403). Pénaliser systématiquement = biais. Si on
  veut un signal sharp, le citer qualitativement dans la trace
- **AB-1/2/4/5 déclenché** : rejet immédiat (candidat exclu du TOP)
- **PC bonus +0.02** : SUPPRIMÉ en v4 (tous les PC sont EXPERIMENTAL n=1,
  pas de fondement statistique pour bonus mathématique)

### F3 — Expected Value (STRICT v4)
- **Minimum recommandable** : EV ≥ **+2%**
- **Cible RECOMMANDÉ** : EV ≥ **+5%**
- **Combo** : EV ≥ **+5%** (sans boost) OU ≥ **+15%** (avec boost bwin)
- **PAS de tolérance EV négatif** : un pick à EV < 0% est mathématiquement
  perdant à long terme. Le tier FLOOR de v3 (EV ≥ -2%) est supprimé.
- **Formule** : `EV = proba_shrunk × cote − 1`

### F4 — Sources externes (v4.1, ajusté 23/05 post test à blanc)
- **Minimum quantitatif** : ≥ **1 source pro** avec **proba % chiffrée
  explicite** (sinon model_proba incalculable → F4 KO)
- **Minimum global** : ≥ **3 sources pros convergentes** sur le même
  pick recommandé (quanti OU quali — un "we pick X" sans % compte comme
  source qualitative convergente si X est aussi notre pick)
- **Dédup éditeur** (NOUVEAU v4.1) : N articles du même domaine racine
  = **1 source effective**. Médiane interne sur les %, puis compté
  1× dans `n_eff`. Ex : `goal.com/top-apps` + `goal.com/tipsters`
  = 1 source. `tennis-tonic.com` + `lastwordonsports.com` = 2 sources
  (éditeurs distincts). En cas de doute sur le domaine racine,
  inspecter le footer/about pour identifier l'éditeur juridique.
- **Sources snippet** (NOUVEAU v4.1, formalisé) : une proba lue via
  snippet WebSearch (sans WebFetch direct) est **acceptée comme source
  quantitative** à condition que la trace l'identifie explicitement
  "via snippet" et reproduise le snippet textuel. Compte 1× quanti.
- Sources whitelist (testées accessibles) — voir `sources_catalogue.md`
  pour la liste à jour :
  - **Multi-sports** : bleachernation.com, covers.com, lineups.com,
    cbssports.com (snippets), fanduel.com/research
  - **NBA** : ESPN BPI (via snippets), BleacherNation
  - **NHL** : Covers, Lineups, OddsShark (snippets)
  - **Tennis** : Tennis Tonic, Last Word on Sports, Dimers,
    Stats Insider, Tennis Up to Date, rotowire.com (utile en GS)
  - **MLB** : OddsShark, Action Network (snippets), FanGraphs (snippets)
  - **Soccer** : Goal.com, SportsGambler, dailysports.net
- **Sources sharp via snippet** : Polymarket, Pinnacle proxy. Si le
  snippet contient un % chiffrable (ex : "Polymarket 59¢" → 59%),
  **autorisée comme source quantitative** (compte dans `n_eff`). Sinon
  citer URL en trace mais ignorer pour calcul.
- **Sources INACCESSIBLES** (403 confirmé) — à ne plus citer comme
  primaires : ATP/WTA officiels, Sofascore, TennisTemple

### F4 — Risques corrélation modèle (NOUVEAU v4.2)

Si 2 sources donnent **proba EXACTEMENT identique** (ex : Dimers 64% et
Stats Insider 64% sur le même match), suspecter modèle partagé ou
cross-citation. **Décision défensive** : compter 1× dans `n_eff` (au lieu
de 2×). Cf. J1 24/05 — Kecmanović analysé avec n_eff=1 défensif.

Si snippet "agrégateur" générique (ex : "consensus betting sites 65%"),
exiger **composition explicite** (d'où vient ce 65% ?). Si la source
originaire est ambiguë → **F4 KO** sur ce candidat. Pas de quanti
acceptée sans domaine identifiable.

### F4 — Seuil EV ≥ +2% : comportement aux limites

Un pick avec EV exactement +2.0% à +2.5% est **techniquement
ACCEPTABLE** (🟡) selon la formule. MAIS la marge d'erreur en
estimation `proba_shrunk` (~±1-2%) suggère un edge réel très faible.

**Guidance pratique** :
- EV +2.0% à +2.5% : 🟡 ACCEPTABLE mais **réduire mise de 50%** (1,50 €
  au lieu de 3,00 € en paper)
- Documenter dans rationale : "Borderline, edge marginal — sensible à
  l'erreur d'estimation"
- User peut skip sans regret

Exemple J1 (24/05) : Međedović EV +2.0% pile → 🟡 avec caveat.
- Si < 1 quanti OU < 3 convergentes (après dédup éditeur) → **F4 KO**

### F5 — Kickoff dans la fenêtre
- **Min** : 1h après l'heure courante
- **Max** : 36h dans le futur
- **Idéal** : 6h – 24h

### F6 — Liquidité du marché
- **Min** : 2 bookmakers majeurs (bwin + 1 autre)
- 1 seul book = risque cote artificielle, rejet

## Filtres souples (à pondérer en trace)

### S1 — Blessure incertaine sur joueur clé
Si "questionnable" / "GTD" sur joueur majeur, attendre 1h avant kickoff
si possible, ou flag dans verdict.

### S2 — Trap game
Equipe favorite sous-motivée (qualifiée, repos avant gros match suivant).

### S3 — Coaching matchup
H2H coach vs coach (Thibodeau ajustements G1→G2 par ex).

### S4 — Cinderella momentum
Underdog avec 5+ wins inattendus en playoffs → prudence sur favori.

### S5 — Surface / météo
Tennis : style vs surface. Outdoor : pluie / vent.

### S6 — Public money %
Si > 75% public ET line stable → trap public possible.

## Verdict par candidat (v4 — l'agent présente)

| Verdict | EV | proba_shrunk | Notes |
|---|---|---|---|
| 🟢 **RECOMMANDÉ** | ≥ +5% | ≥ 0.60 | Mise théorique 5€ paper si user valide |
| 🟡 **ACCEPTABLE** | ≥ +2% | ≥ 0.55 | Mise théorique 3€ paper si user valide |
| 🟠 **BORDERLINE** | 0 à +2% | ≥ 0.55 | Mise théorique 1€ paper si user valide (avertir) |
| 🔴 **INSUFFISANT** | < 0% OU < 0.55 OU F4 KO | — | Ne pas présenter dans TOP 3 visible (mais lister rejets en trace) |

**Tier FLOOR de v3 SUPPRIMÉ** : on n'accepte plus EV ≥ -2%. La discipline
mathématique est rétablie.

## Mise théorique (mode paper trading uniquement)

| Verdict | Mise paper |
|---|---|
| 🟢 RECOMMANDÉ | 5,00 € |
| 🟡 ACCEPTABLE | 3,00 € |
| 🟠 BORDERLINE | 1,00 € |
| 🔴 INSUFFISANT | 0 € (pas de position) |

**Bankroll virtuel paper** : commence à 100,00 € le 24/05/2026. Évolue
selon outcomes vérifiés (règle 2 sources + quote, voir method.md
Étape 9).

**Pas de Kelly criterion en v4** : la pondération Kelly suppose un modèle
calibré. Notre modèle n'a pas été calibré sur ≥ 30 picks → Kelly serait
prématuré. Mises fixes par verdict.

## Cas spéciaux v4

### Aucun candidat dans F1 (cote 1.50-2.00)
**Output** : "Aucun candidat dans la fenêtre cote 1.50-2.00 aujourd'hui."
Pas de fallback. Pas de paper position.

### Aucun candidat 🟢 ou 🟡
**Output** : "Aucun candidat défendable aujourd'hui." Top 3 affiché
quand même (informationnel) avec verdict 🟠/🔴. User peut override mais
recommandation = skip.

### Promotion vers mode bet réel
Après 30 jours paper :
- Audit dans `paper_trading_log.md`
- Hit rate ≥ 55% sur 🟢+🟡 résolus + ROI virtuel ≥ +5% → promotion
- Sinon → itération v4.x ou prolongation paper

## Anti-bias actifs v4 (synthèse — détail dans learnings.md)

### BLOCANTS (rejet automatique)
- **AB-1** : Top-10 ATP J-2/J-1 avant Grand Slam
- **AB-2** : Perdant 1-3 série playoffs (sauf cote ≥ 2.50 + proba ≥ 0.75)
- **AB-4** : Combiné 3+ jambes
- **AB-5** : MLB ML cote > 2.50 sans matchup pitcher exceptionnel

### EXPERIMENTAL (note dans trace, pas blocking)
- **AB-3** : Cinderella playoff momentum (n=1)

### SUPPRIMÉS en v4
- **AB-6** : "Sources pros divergentes" — overfit n=1 sur cas Olympiakos
- **F1-bis Branche A** : G1 underdog H2H + repos — overfit n=1 Spurs
- **F1-bis Branche B** : G2+ momentum série — overfit n=0 (basé sur
  faux outcome Knicks G3 confondu avec G2)

### Patterns PC (tous EXPERIMENTAL n=1 en v4)
- PC-1, PC-2, PC-3, PC-4 : utiliser comme signaux qualitatifs dans la
  rationale, pas comme bonus mathématique. Promotion à BLOCKING ou
  bonus si n ≥ 3 cas validés.

## Combiné (parlay) — règles v4

Un combiné est autorisé SI :
- **2 jambes max** (jamais 3+, AB-4)
- **Chaque jambe** : `proba_shrunk` ≥ 0.72 ET cote individuelle 1.20-1.45
- **Probabilité combinée** ≥ 0.55
- **Cote combinée** : 1.60 – 2.20 (avec OU sans boost — pas d'élargissement)
- **EV combinée** : ≥ +5% (sans boost) ou ≥ +15% (avec boost ≥ +20%)
- **Pas de corrélation** : sports/ligues différents, jamais 2 matchs du
  même tournoi
