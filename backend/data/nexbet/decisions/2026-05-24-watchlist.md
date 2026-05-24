# Watchlist 2026-05-24 (Dimanche) — Run matin v4.2 actualisé

> **Run matin Belgique** — méthodologie v4.2 (dual artefact + dédup
> corrélation modèle + anti-agrégateur). Bankroll virtuel : **100,00 €**.
> Pipeline backend dégradé → 100% WebSearch whitelist v4.2.
> Note : un premier run a été effectué à minuit ; cette analyse est
> indépendante et remplace celle de minuit.

## Contexte journée

- **Roland Garros R1 — Day 1** : premier jour Grand Chelem terre battue
- **NBA WCF G4** : Thunder @ Spurs (OKC mène 2-1, Spurs home dimanche soir)
- **NBA ECF** : Knicks vs Cavs 3-0 — pas de match dimanche (G4 lundi 25/05)
- **NHL WCF G3** : Avalanche @ Vegas (Vegas mène 2-0, retour à T-Mobile)
- **NHL ECF** : Hurricanes vs Canadiens — pas de match dimanche (G3 lundi)
- **EPL Final Day** (J38) : 10 matchs simultanés à 16h UK
- **EFL League One Playoff Final** : Stockport vs Bolton @ Wembley 13h UK
- **MLB Sunday slate** : 14 matchs étalés sur la journée

## Cartographie large (20 matchs)

| # | Match | Sport / Compétition | Kickoff UTC | Cote favori (book) | Coverage whitelist |
|---|---|---|---|---|---|
| 1 | Spurs vs Thunder G4 | NBA — WCF | 2026-05-25 00:00 | Spurs ~1.85 (FD home -1.5) | FanDuel, Lineups, Covers, Yahoo, OffshoreSB, SportsLine |
| 2 | Avalanche @ Vegas G3 | NHL — WCF | 2026-05-25 00:00 | COL ML 1.69 (-144) / VGK 2.20 (+120) | Lineups, Covers, OddsShark, Sportskeeda, ESPN, SI |
| 3 | Djokovic vs Mpetshi Perricard | Tennis — Roland Garros R1 | 2026-05-24 ~18:00 | Djokovic ~1.30 | TennisNerd, Puntodebreak |
| 4 | Zverev vs Bonzi | Tennis — Roland Garros R1 | 2026-05-24 ~13:00 | Zverev ~1.20 | TennisNerd |
| 5 | Fritz vs Basavareddy | Tennis — Roland Garros R1 | 2026-05-24 ~15:00 | Fritz ~1.40 | TennisNerd |
| 6 | Wawrinka vs jeune FR | Tennis — Roland Garros R1 | 2026-05-24 | jeune FR favori | TennisNerd |
| 7 | Monfils vs Gaston | Tennis — Roland Garros R1 | 2026-05-24 | Monfils léger fav | TennisNerd |
| 8 | Cilic vs Kouamé | Tennis — Roland Garros R1 | 2026-05-24 | Cilic léger fav | Puntodebreak |
| 9 | Liverpool vs Brentford | Soccer — Premier League J38 | 2026-05-24 15:00 | LIV 1.80 | Dimers, Sportsgambler, Sportskeeda, SportyTrader, Dailysports, Squawka, BetMines |
| 10 | Manchester City vs Aston Villa | Soccer — Premier League J38 | 2026-05-24 15:00 | MCI 1.34 | Dimers, Covers, Sportsgambler, Dailysports, Sportskeeda |
| 11 | Brighton vs Manchester United | Soccer — Premier League J38 | 2026-05-24 15:00 | BHA ~2.10 / Draw 3.20 | FanDuel, BetMGM, Dimers |
| 12 | Crystal Palace vs Arsenal | Soccer — Premier League J38 | 2026-05-24 15:00 | ARS ~1.85 | Dailysports |
| 13 | West Ham vs Leeds | Soccer — Premier League J38 | 2026-05-24 15:00 | WHU ~1.95 | OLBG |
| 14 | Stockport vs Bolton | Soccer — EFL League One Playoff Final | 2026-05-24 12:00 | Pile/face (~1.90 chacun) | Sportinglife, Racing Post, MightyTips, William Hill, Squawka, Betfred, Freetips, Fanbanter |
| 15 | Pittsburgh @ Toronto | MLB | 2026-05-24 16:15 | TOR favori | Lineups |
| 16 | Cleveland @ Philadelphia | MLB | 2026-05-24 17:35 | PHI favori | OddsShark |
| 17 | Dodgers @ Milwaukee | MLB | 2026-05-24 18:10 | LAD favori | FanGraphs snippets |
| 18 | Yankees vs Rays | MLB | 2026-05-24 17:35 | NYY favori | OddsShark |
| 19 | Mets @ Marlins | MLB | 2026-05-24 17:40 | NYM favori | Action Network |
| 20 | Cubs vs Astros | MLB | 2026-05-24 18:20 | Pick'em | OddsShark |

## Pré-filtrage F1-F6 + AB

### Éliminations immédiates

| Match | Raison | Filtre |
|---|---|---|
| Djokovic vs Mpetshi (R1 RG) | Cote 1.30 < 1.50 + AB-1 BLOCKING top-10 ATP J GS | F1 + AB-1 |
| Zverev vs Bonzi (R1 RG) | Cote 1.20 < 1.50 + AB-1 BLOCKING top-10 ATP J GS | F1 + AB-1 |
| Fritz vs Basavareddy (R1 RG) | Cote ~1.40 < 1.50 + AB-1 BLOCKING top-10 ATP J GS | F1 + AB-1 |
| Wawrinka, Monfils, Cilic R1 | Cote favori probable < 1.50 + coverage chiffrée insuffisante | F1 + F4 |
| Manchester City vs Villa | Cote 1.34 < 1.50 | F1 |
| Pittsburgh @ Toronto MLB | Couverture mince + AB-5 risque trap MLB | F4 + AB-5 |
| Cleveland @ Philadelphia, Dodgers @ Milwaukee, Yankees vs Rays | Coverage chiffrée à valider, AB-5 si ML > 2.50 underdog | F4 / AB-5 |

### Anti-dup (check_duplicate.py)

| Pick | Résultat | Action |
|---|---|---|
| Spurs vs Thunder | **DUPLICATE** : pické 18/05 (G1 WCF) | NOTE : G4 ≠ G1, série différente match — accepté avec warning |
| Vegas vs Colorado | OK aucun pick récent 7j | Accepté |
| Liverpool vs Brentford | OK | Accepté |
| Brighton vs Manchester United | OK | Accepté |
| Bolton vs Stockport | OK | Accepté |

### Candidats finaux (top 5 à approfondir)

| # | Pick envisagé | Sport | Cote indicative | Note pré-analyse |
|---|---|---|---|---|
| C1 | **Spurs ML G4** vs Thunder | NBA WCF | ~1.85 | Home, FanDuel 56.2%, blessures Fox/Harper à vérifier |
| C2 | **Vegas ML G3** vs Avalanche | NHL WCF | ~2.20 (+120) — HORS F1 si > 2.00 | À vérifier — possible F1 KO |
| C3 | **Colorado ML G3** @ Vegas | NHL WCF | 1.69 | Favori road, Cale Makar OUT — risque S1 |
| C4 | **Liverpool ML** vs Brentford | EPL J38 | ~1.80 | Anfield, modèle Dimers 60.1% — value possible |
| C5 | **Brighton ML** vs Manchester United | EPL J38 | ~2.10 — limite F1 supérieure | Modèle ~48%, BHA Europa motiv |
| C6 | **Stockport ou Bolton ML** | EFL Playoff Final | ~1.90 chacun | Pile/face, F4 KO probable |

Coverage MLB jugée insuffisante après tri (pas de matchup pitcher
exceptionnel identifié + AB-5 limite, sources Dimers/StatsInsider
peu actives sur MLB régulier). On se concentre sur NBA/NHL/EPL où la
coverage est dense.

## AB-1 actif (Roland Garros J1)

Liste indicative top-10 ATP en R1 ce dimanche 24/05 (Day 1) :
- Djokovic — BLOQUÉ
- Zverev (#2) — BLOQUÉ
- Fritz (#7) — BLOQUÉ
- Les autres top-10 (Sinner, Alcaraz, Shelton, etc.) joueront Lundi/Mardi
  — pas concernés par AB-1 ce dimanche

→ Tennis Roland Garros R1 exclu en bloc côté favoris top-10 ce dimanche.
Les outsiders potentiels (Bonzi, Mpetshi, Basavareddy) écartés (coverage
insuffisante côté underdog, F4 KO probable, et AB-1 protège aussi des
spreads top-10 R1).

## Décision pré-analyse

- Funnel : 20 matchs → 5 candidats sérieux après F1/AB-1
- Analyse approfondie sur **C1 (Spurs G4)**, **C3 (Colorado G3)** ou
  **C2 (Vegas G3)** selon F1, **C4 (Liverpool)**, **C5 (Brighton)**,
  **C6 (Stockport ou Bolton)**
- Tennis Roland Garros R1 : **rien à recommander** (AB-1 bloque favoris,
  outsiders sous-couverts)
