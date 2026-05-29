# Watchlist 2026-05-29 — Roland Garros Day 6 (R3)

**Date** : Vendredi 29 mai 2026
**Heure analyse** : ~12h Belgique (avant first match RG 11h Belgique)
**Bankroll virtuel paper** : 48.29€ (post J11 loss -7.61€)
**Sports actifs v4.6** : foot / basket / tennis
**Méthodo** : v4.8

## Cartographie sport par sport

### NBA — Conference Finals
**Pas de match le 29/05.** WCF Thunder-Spurs Game 7 = 30/05 (samedi). ECF terminé (Knicks sweep Cavs).

### Foot — Top 5 + finales européennes
**Pas de finale le 29/05.** CL Final PSG-Arsenal = 30/05 (samedi). EC Final Crystal Palace 1-0 Rayo Vallecano joué le 27/05.
Programme foot 29/05 : intersaison Europe + ligues mineures hors scope coverage pros — pas de candidat exploitable.

### Tennis — Roland Garros R3 (Day 6) — **focus exclusif**

| # | Match | Sport | Kickoff UTC | Cote favori (consensus) | Coverage |
|---|---|---|---|---|---|
| 1 | Djokovic vs Fonseca | Tennis ATP | 2026-05-29 ~14h | 1.55-1.65 Djoko | Très dense (5+ sources) |
| 2 | Swiatek vs Linette | Tennis WTA | 2026-05-29 ~11h | 1.20-1.30 Swiatek | Dense (5+) |
| 3 | Andreeva vs Bouzkova | Tennis WTA | 2026-05-29 11:10 | 1.20-1.25 Andreeva | Dense (5+) |
| 4 | Zverev vs Halys | Tennis ATP | 2026-05-29 18:15 (night) | 1.04-1.06 Zverev | Très dense |
| 5 | Ruud vs Paul | Tennis ATP | 2026-05-29 ~14h Lenglen | 1.50-1.60 Ruud | Dense |
| 6 | Rublev vs Borges | Tennis ATP | 2026-05-29 09:00 | 1.30-1.36 Rublev | Dense |
| 7 | De Minaur vs Mensik | Tennis ATP | 2026-05-29 11:50 | 1.30-1.42 deM | Dense (Dimers 80%, SI 77%) |
| 8 | Muchova vs ? | Tennis WTA | TBD | TBD | Moyenne |
| 9 | Svitolina vs ? | Tennis WTA | TBD | TBD | Moyenne |
| 10 | Tsitsipas vs Müller | Tennis ATP | TBD | Tsitsipas fav | Moyenne |
| 11 | Auger-Aliassime vs Altmaier | Tennis ATP | TBD | FAA fav | Moyenne |
| 12 | Sakkari vs Noskova | Tennis WTA | TBD | Noskova léger fav | Moyenne |
| 13 | Keys vs Vandewinkel | Tennis WTA | TBD | Keys fav | Moyenne |
| 14 | Pegula vs Birrell | Tennis WTA | TBD | Pegula fav | Moyenne |
| 15 | Cerundolo (vainqueur Sinner) vs ? | Tennis ATP | TBD | TBD | Moyenne |

**15 matchs identifiés sur tennis seul** — F0 OK (sport actif).

## Pré-filtrage F1 (cote 1.50-2.00 single OU 1.60-2.50 combo)

Singles éligibles fenêtre 1.50-2.00 :
- **Ruud vs Paul** : 1.50-1.60 → ✅ F1 OK
- **Djokovic vs Fonseca** : 1.55-1.65 → ✅ F1 OK
- Autres favoris < 1.50 → écartés du single

Combos candidats v4.7 GS active search (jambes 1.20-1.50, total 1.60-2.50, max 2 jambes AB-4) :
- **Andreeva 1.22 × Rublev 1.36 = 1.66** → ✅ F1 combo OK
- **De Minaur 1.42 × Rublev 1.36 = 1.93** → ✅ F1 combo OK
- **Andreeva 1.22 × De Minaur 1.42 = 1.73** → ✅ F1 combo OK
- Zverev 1.05 × Andreeva 1.22 = 1.28 → ❌ F1 KO (sous 1.60)
- Zverev jambe < 1.20 → ❌ pas éligible jambe combo F1

Anti-dup `picks_data.py` :
- Rublev déjà settlé J10 win (clos, plus de pending) → ✅ AB-9 OK
- Osaka loss J11 (clos)
- Aucun pari pending sur joueur du jour

**5 candidats sérieux retenus** :
1. Ruud single
2. Djokovic single
3. Combo Andreeva + Rublev
4. Combo De Minaur + Rublev
5. Combo Andreeva + De Minaur

## Sources consultées (cartographie)

- Olympics.com — Order of play RG Day 6
- RotoWire — Third-round picks
- Dimers — Predictions per match
- Stats Insider — Predictions per match
- SI Betting — Predictions per match
- VSIN — Friday best bets
- Pickswise — Day 6 picks
- DraftKings Network — Best bets Friday
- Last Word on Tennis — Men's + Women's Day 6
- Tennis Tonic — H2H + preview Swiatek-Linette, deM-Mensik
- Racing Post — Day 6 acca tips
- Bleacher Report — Day 5 results + Day 6 preview
- CNN — Ruud heatstroke R1 (référence AB-7)
- WTA Tour — Andreeva 17W/20 clay (référence v4.8 hot streak)
- Sports Mole, scores24, Pickswise, FanDuel sportsbook lines
