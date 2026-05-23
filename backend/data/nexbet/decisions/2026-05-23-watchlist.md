# Watchlist NΞXBΞT v2 — Samedi 23 mai 2026

**Heure d'analyse v2** : 23/05/2026 ~11h20 Belgique (09h20 UTC)
**Bankroll** : 25,00 € (post-loss combiné Ruud+Olympiakos 22/05)
**Branche** : claude/agent-pickup-testing-PjfQi
**Méthodologie** : v2 (commit f2741de — shrinkage + F2≥0.62 + F3≥+7% + 1 sharp obligatoire)
**Contexte sport** : J-1 avant Roland Garros (démarre dimanche 24/05) → AB-1 actif sur top-10 ATP. Final Four Euroleague (final dimanche). NBA ECF + NHL ECF en cours.

---

## Cartographie complète (≥ 15 events scannés en parallèle)

| # | Match | Sport / Compétition | Kickoff UTC | Cote favori (estim.) | Premium ? | Sharp dispo ? |
|---|-------|---------------------|-------------|----------------------|-----------|---------------|
| 1 | **Navone vs Tien** (Geneva Final) | ATP 250 Geneva (clay) | 13:00 | Navone 1.77 | Premium tennis | Polymarket peu liquide |
| 2 | **Mboko vs Navarro** (Strasbourg Final) | WTA 250 Strasbourg (clay) | 12:00 | Mboko 1.57 | Premium WTA | Stats Insider 59% |
| 3 | **Kalinina vs Marcinko** (Rabat Final) | WTA 250 Rabat (clay) | 12:00 | Kalinina 1.41 | Premium WTA | Aucun sharp dispo |
| 4 | **Hurricanes vs Canadiens G2** | NHL ECF | 23:00 | CAR ~1.48 (-205) | ✅ premium | Polymarket dispo |
| 5 | **Knicks @ Cavaliers G3** | NBA ECF | 24:00 (00:00 24/05) | CLE 1.66 (-2.5) | ✅ premium | Polymarket + FanDuel models |
| 6 | Hull vs Middlesbrough | Championship PO Final (Wembley) | 14:30 | équilibré | Premium foot | Betfair Exchange dispo |
| 7 | Espanyol vs Real Sociedad | La Liga J38 | 19:00 | équilibré | Final day | Betfair dispo mais peu liquide |
| 8 | Rays @ Yankees | MLB | 17:35 | NYY 1.69 | non | Pinnacle dispo |
| 9 | Astros @ Cubs | MLB | 18:20 | équilibré | non | Pinnacle dispo |
| 10 | Pirates @ Blue Jays | MLB | 19:07 | TOR favori | non | Pinnacle dispo |
| 11 | Tigers @ Orioles | MLB | 20:05 | BAL favori | non | Pinnacle dispo |
| 12 | Guardians @ Phillies | MLB | 20:05 | PHI favori | non | Pinnacle dispo |
| 13 | White Sox @ Giants | MLB | 22:05 | SF favori | non | Pinnacle dispo |
| 14 | Mariners @ Royals | MLB | 20:10 | équilibré | non | Pinnacle dispo |
| 15 | Twins @ Red Sox | MLB | 20:10 | BOS favori | non | Pinnacle dispo |
| 16 | Nationals @ Braves | MLB | 23:15 | ATL favori | non | Pinnacle dispo |
| 17 | Mets @ Marlins | MLB | 22:10 | NYM favori | non | Pinnacle dispo |
| 18 | Cardinals @ Reds | MLB | 23:15 | équilibré | non | Pinnacle dispo |
| 19 | Dodgers @ Brewers | MLB | 23:15 | LAD 1.55 | non | Pinnacle dispo |
| 20 | Rockies @ Diamondbacks | MLB | 02:10 | ARI favori lourd | non | Pinnacle dispo |
| 21 | Rangers @ Angels | MLB | 02:05 | équilibré | non | Pinnacle dispo |
| 22 | A's @ TBD | MLB | varies | varies | non | Pinnacle dispo |

**Évènements hors fenêtre** :
- Roland Garros Day 1 (dimanche 24/05 09:00 UTC) — F5 limite, à monitorer demain
- UFC Topuria-Gaethje (dimanche 24/05)
- Euroleague Final (dimanche 24/05)
- F1 Monaco Qualifs (samedi mais hors profil)
- UEFA Conference League Final (mercredi 27/05)

---

## Funnel pré-filtrage v2 (top 5 retenus pour Étape 2/3)

Critères stricts v2 :
- F1 : cote bwin 1.50 ≤ x ≤ 3.00
- F4 : ≥ 3 sources pros + ≥ 1 sharp (Polymarket / Pinnacle / Betfair Exchange)
- Élimination immédiate des cotes < 1.50 (Kalinina 1.41 → F1 KO direct)

1. **Navone vs Tien** Geneva Final — cote Navone 1.77 (F1 OK, modèle Dimers 58%)
2. **Hurricanes vs Canadiens G2** — cote CAR 1.48 (F1 KO, < 1.50) — ÉLIMINÉ
3. **Mboko vs Navarro** Strasbourg Final — cote Mboko 1.57 (F1 OK, Stats Insider 59%)
4. **Knicks @ Cavaliers G3** — cote CLE 1.66 ou NYK ~2.20 (F1 OK)
5. **Dodgers @ Brewers** — cote LAD 1.55 (F1 OK mais MLB AB-5 si > 2.50 NA, Sasaki ERA 5.09)

**Éliminés en bloc** :
- Kalinina (Rabat) cote 1.41 → F1 KO (sous 1.50)
- Hurricanes G2 cote 1.48 → F1 KO (sous 1.50)
- MLB sans pitcher matchup explicite (AB-5 + manque d'edge sourcé)
- Hull/Middlesbrough (info insuffisante, marché volatil one-off Wembley)
- Espanyol/Real Sociedad (no edge identifié)

---

## Notes de cartographie

- **Pas de Grand Slam aujourd'hui** (RG démarre demain dimanche)
- **AB-1** non applicable directement : Navone #44 et Tien #75 ne sont pas top-10 ATP
- **MAIS** "économie de forces pré-RG" reste un risque générique sur tout joueur ATP engagé à RG demain — à vérifier dans Étape 3
- **PC-3 (promo bwin)** : aucune promo combiné identifiée aujourd'hui (les boost bwin ce mois-ci demandent min 3 picks)
- **Footabll européen** quasi-terminé (sauf Wembley Championship PO Final)
- **MLB** : 14 matchs mais aucun "premium", coverage standard sans edge clair
