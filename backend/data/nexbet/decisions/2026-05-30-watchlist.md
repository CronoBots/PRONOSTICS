# NEXBET — Watchlist 2026-05-30 (samedi)

**Heure analyse** : 30/05/2026 ~12:25 Belgique (10:25 UTC)
**Bankroll réel parallèle** : 55,90€ (gelé pendant cycle paper — info contextuelle)
**Sports actifs v4.6** : ⚽ foot, 🏀 basket, 🎾 tennis
**Mode** : recap-only, EV ≥ +2% strict, dual artefact, output bookmaker-agnostic
**API-Sports** : INACTIF (clé absente) → mode dégradé WebSearch. SofaScore dispo (no key).

## Contexte du jour
- **Roland Garros Jour 7** — 3e tour (R3 / Round of 32) ATP + WTA
- **Finale UEFA Champions League** — PSG vs Arsenal (Budapest, Puskas Arena)
- **NBA Western Conference Finals Game 7** — Spurs @ Thunder (série 3-3)

## Cartographie (≥ 15 lignes)

| Match | Sport | Kickoff UTC | Cote favori (consensus) | Coverage |
|---|---|---|---|---|
| PSG vs Arsenal | ⚽ Foot | 2026-05-30T16:00 | PSG ~1.80 (90min) / ~1.67 (tie) | PREMIUM (finale UCL) |
| San Antonio Spurs @ OKC Thunder (G7) | 🏀 Basket | 2026-05-31T00:00 | OKC ~1.45-1.55 (ML, -3.5) | PREMIUM (G7 WCF) |
| Aryna Sabalenka vs Daria Kasatkina | 🎾 Tennis WTA | 2026-05-30T~13:00 | Sabalenka ~1.08 | DENSE (R3) |
| Coco Gauff vs Anastasia Potapova | 🎾 Tennis WTA | 2026-05-30T~16:00 | Gauff ~1.32 | DENSE (R3) |
| Flavio Cobolli vs Learner Tien | 🎾 Tennis ATP | 2026-05-30T~12:00 | Cobolli ~1.48 (-210) | DENSE (R3) |
| Felix Auger-Aliassime vs Brandon Nakashima | 🎾 Tennis ATP | 2026-05-30T~18:15 | FAA ~1.55-1.70 | DENSE (R3) |
| Naomi Osaka vs Iva Jovic | 🎾 Tennis WTA | 2026-05-30T11:00 | split (Osaka 1.96 / Jovic 1.84) | DENSE (R3) |
| Moise Kouame vs Alejandro Tabilo | 🎾 Tennis ATP | 2026-05-30T~12:00 | Tabilo fav | Moyenne (R3 wildcard) |
| Bahia vs Botafogo | ⚽ Foot Série A BR | 2026-05-30 | Bahia ~1.92 (52%) | Moyenne |
| Beijing Guoan vs Chongqing | ⚽ Foot CSL | 2026-05-30 | Beijing ~1.95 | Faible |
| Chongqing vs Beijing Guoan | ⚽ Foot CSL | 2026-05-30 | — | Faible |
| (autres R3 RG hommes/femmes) | 🎾 Tennis | 2026-05-30 | divers | variable |
| (doubles RG R2 mixte/H/F) | 🎾 Tennis | 2026-05-30 | hors scope coverage | faible |
| PSG -1 handicap / BTTS / U2.5 | ⚽ Foot dérivés | 2026-05-30T16:00 | marchés alt finale | PREMIUM |
| Combiné favoris tennis RG R3 (Sabalenka × Gauff) | 🎾 Tennis combo | 2026-05-30 | ~1.42 (1.08×1.32) | DENSE |

## Anti-dup (check_duplicate.py)
- PSG/Arsenal → OK (aucun pick récent)
- Spurs/OKC → flag DUPLICATE (faux positif : OKC apparaît dans pick 23/05 Wolves+Edwards G3 ; ici Spurs@OKC G7 = match ET marché distincts → traité comme NON-doublon, noté)
- Gauff/Potapova → OK
- Sabalenka/Kasatkina → OK
- Osaka/Jovic → flag DUPLICATE (Osaka picks 26/05 + 28/05, tous RÉSOLUS → AB-9 ne bloque pas, mais candidat faible : modèle split)
- Auger-Aliassime/Nakashima → OK

## Note outcome pending résolu ce run
- **J12 (29/05)** combo De Minaur -1.5 sets + Andreeva 2-0 @ 2.16 → **LOSS** (Mensik bat De Minaur 0-6 6-2 6-2 6-3 = jambe 1 perdue ; Andreeva 6-4 6-2 = jambe 2 OK mais sans incidence). 2 sources + quotes (Tennis Majors + Puntodebreak/RG). Net −5,00€.
