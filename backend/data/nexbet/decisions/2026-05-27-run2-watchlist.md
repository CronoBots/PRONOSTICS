# NEXBET — Watchlist 2026-05-27 (run 2 — test reproductibilité)

> Analyse lancée 2026-05-26 ~22h45 Belgique pour les matchs du mercredi
> 2026-05-27. Run 2 du même prompt soir (test variance). Run 1 = TOP1
> combo Ruud+Bencic. Je ne regarde PAS run 1.
> Focus v4.6 : tennis only (demande explicite user RG Day 4).

## Contexte

- **Tournoi** : Roland Garros 2026, Day 4 = 2e tour (R2/Round of 64) ATP + WTA
- **Sport actif scope v4.6** : tennis uniquement (demande user spécifique)
- **Pas de scan foot/NBA** (perimeter user)
- **Bankroll virtuel paper** : 100,00 €
- **Stack sources v4.7** : SofaScore primary (KO ce soir — adapter
  `fetch_scheduled_events` lève AttributeError 'str isoformat'), fallback
  WebSearch whitelist (Last Word on Sports, Bleacher Nation, Stats
  Insider, Tennis Tonic, RotoWire, Lineups, CBS Sports snippets,
  Sportytrader, Sports Mole, Tenngrand…)
- **AB-1** : non blocant pour les top-10 ATP DANS le GS lui-même (v4.3)
- **Combinés** : recherche active pendant fenêtre RG (v4.7)

## Programme RG Day 4 — matchs identifiés (≥ 15 lignes obligatoire)

Cotes = consensus marché médiane lue dans snippets multi-bookmakers
(TAB, FanDuel, DraftKings, Bet365, etc.) — **jamais citer un book
spécifique dans le rapport user (v4.7)**.

| # | Match | Tour | Court / heure UTC | Cote favori (consensus) | Coverage |
|---|---|---|---|---|---|
| 1 | Novak Djokovic vs Valentin Royer | R2 ATP | Chatrier ~16h UTC | Djokovic ~1.10 | TRÈS dense (Tennis Tonic, Dimers, Stats Insider, LWOS, Sports Mole) |
| 2 | Alexander Zverev vs Tomas Machac | R2 ATP | Chatrier night | Zverev ~1.16 (-625) | Dense (LWOS, Bleacher Nation, Sports Mole, Britwatch, Tenngrand, Sportytrader) |
| 3 | Iga Swiatek vs Sara Bejlek | R2 WTA | Chatrier 10h UTC | Swiatek ~1.03 (-3030) | Dense (Bleacher Nation, RotoWire, LWOS) |
| 4 | Elena Rybakina vs Yuliia Starodubtseva | R2 WTA | Lenglen | Rybakina ~1.07 | Dense (Flashscore, RotoWire, Tennis Up to Date) |
| 5 | Casper Ruud vs Hamad Medjedovic | R2 ATP | Lenglen 06h30 UTC | Ruud favori léger (~1.50-1.60 ?) — sources divergent ; Stats Insider prédit MEDJEDOVIC 64% | Dense (CNN, LWOS, Tennis Up to Date, RotoWire) — **ALERTE: Ruud "zombie" heat R1 5 sets** |
| 6 | Jasmine Paolini vs adversaire R2 (Wang Xinyu probable) | R2 WTA | Lenglen | Paolini ~1.25-1.35 (blessure pied signalée) | Moyenne |
| 7 | Alex De Minaur vs Alexander Blockx | R2 ATP | Court non précisé 09h UTC | De Minaur 1.50-1.55 (Stats Insider 66%, DK -189) | Dense (Sportytrader, Stats Insider, RotoWire, Lineups) |
| 8 | Mirra Andreeva vs Marina Bassols Ribera | R2 WTA | Simonne-Mathieu | Andreeva ~1.10 | Moyenne (Tennis Majors, Outlook) |
| 9 | Belinda Bencic vs Caty McNally | R2 WTA | Simonne-Mathieu 11h UTC | Bencic ~1.29 (-345/-333) Tennis Tonic 77% | Dense (Tennis Tonic, RotoWire) |
| 10 | Joao Fonseca vs Dino Prizmic | R2 ATP | 09h UTC | Fonseca 1.53-1.57 (Stats Insider 61%, ops 55%) — pros divisés | Très dense (Bleacher Nation, LWOS, Tenngrand, Stats Insider, oddspedia, Sports Mole) |
| 11 | Andrey Rublev vs Camilo Ugo Carabelli | R2 ATP | TBD | Rublev ~1.20 (-420) | Dense (RotoWire) |
| 12 | Ugo Humbert vs Quentin Halys | R2 ATP all-French | Simonne-Mathieu | Humbert ~1.50 (qualifié favori léger) | Moyenne |
| 13 | Hailey Baptiste — match R2 WTA (suite Cinderella R1) | R2 WTA | TBD | favori inconnu | Faible (profootballnetwork) |
| 14 | Cilic out — Kouame R2 ? | R2 ATP | TBD | match Kouame R2 | Faible |
| 15 | Bandecchi R2 (Cinderella WTA) | R2 WTA | TBD | underdog | Faible |
| 16 | Pegula R2 (post Birrell) | R2 WTA | TBD | Pegula favorite forte | Moyenne |

## Pré-filtrage F1 — fenêtre cote single 1.50-2.00

**Hors-fenêtre (cote < 1.50) — rejetés F1 single mais candidats potentiels combinés** :
- Djokovic 1.10
- Zverev 1.16
- Swiatek 1.03
- Rybakina 1.07
- Andreeva 1.10
- Rublev 1.20
- Bencic 1.29
- Paolini ~1.30

**Dans la fenêtre F1 single (1.50-2.00)** :
- Fonseca 1.53-1.57 ✅
- De Minaur 1.50-1.55 ✅
- Humbert ~1.50 (à vérifier) — coverage faible, probable F4 KO
- Ruud ? — sources contradictoires (Stats Insider prédit Medjedovic
  favori 64% mais cote ouverte Ruud favori), drapeau rouge

**Pistes combinés (jambes 1.20-1.50 v4.3)** :
- Bencic 1.29 + Rublev 1.20 = 1.55 (sous la borne 1.60) — INSUFFISANT seul
- Bencic 1.29 + Paolini 1.30 = 1.68 (✓ fenêtre 1.60-2.50) — possible
- Andreeva 1.10 + Rublev 1.20 + Bencic 1.29 = 1.70 (3 jambes ✗ AB-4 blocant)
- Djokovic 1.10 + Zverev 1.16 = 1.28 (sous la borne) — INSUFFISANT
- Bencic 1.29 + Rybakina 1.07 = 1.38 (sous la borne) — INSUFFISANT
- **Bencic 1.29 + De Minaur 1.52 = 1.96 (✓ fenêtre)** — candidat
- **Bencic 1.29 + Fonseca 1.55 = 2.00 (✓ fenêtre)** — candidat
- Paolini 1.30 + De Minaur 1.52 = 1.98 (✓ mais Paolini blessure pied → minoré)
- Andreeva 1.10 + De Minaur 1.52 = 1.67 (✓) — candidat
- Andreeva 1.10 + Bencic 1.29 = 1.42 (sous la borne) — INSUFFISANT
- Rybakina 1.07 + De Minaur 1.52 = 1.63 (✓) — candidat

## Candidats retenus pour analyse approfondie (max 5)

1. **Single — De Minaur ML vs Blockx** (cote 1.52) — sweet spot, 66% Stats Insider
2. **Single — Fonseca ML vs Prizmic** (cote 1.55) — sweet spot, 61% Stats Insider mais pros divisés
3. **Combo 2 jambes — Bencic + De Minaur** (cote ~1.96) — fav écrasante WTA + sweet spot ATP
4. **Combo 2 jambes — Rybakina + De Minaur** (cote ~1.63) — TS2 WTA + sweet spot ATP
5. **Combo 2 jambes — Andreeva + De Minaur** (cote ~1.67) — TS8 WTA + sweet spot ATP

**Écartés en pré-filtrage** :
- Djokovic, Zverev, Swiatek, Rybakina, Andreeva, Rublev, Paolini singles : cote < 1.50 → F1 KO single
- Ruud single : signaux contradictoires (Stats Insider donne Medjedovic favori 64%, mais
  marché ouvre Ruud favori). Drapeau rouge — Ruud "zombie" heat R1
  5 sets vs Safiullin, fatigue probable. Source confusion → écarté
  prudemment (risque F4 divergence pick)
- Combos 3+ jambes : AB-4 blocant
