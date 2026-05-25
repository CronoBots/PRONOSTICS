# Watchlist NEXBET v3 — Samedi 23 mai 2026

**Heure d'analyse v3** : 23/05/2026 ~11h55 Belgique (09h55 UTC)
**Bankroll d'entrée** : 25,00 € (post-loss combiné Ruud+Olympiakos 22/05)
**Branche** : claude/agent-pickup-testing-PjfQi
**Méthodologie** : **v3** (commit 657099e) — tiering PREMIUM/STANDARD/FLOOR/COMBO + cote single 1.50-2.00 + 1 pick/jour garanti
**Contexte sport** : J-1 avant Roland Garros (démarre dim 24/05) → AB-1 actif sur top-10 ATP. Finales ATP/WTA clay du jour. NHL ECF G2 Habs/Canes. NBA ECF G3 Knicks/Cavs. MLB regular.

---

## Cartographie complète (≥ 15 events scannés en parallèle)

Recherches WebSearch lancées en parallèle (un seul message multi-tool) sur les 6 grands marchés du jour.

| # | Match | Sport / Compétition | Kickoff UTC | Cote favori (bwin) | Premium ? | Sharp dispo ? |
|---|-------|---------------------|-------------|--------------------|-----------|---------------|
| 1 | **Navone vs Tien** (Geneva Final) | ATP 250 Geneva (clay) | 13:00 | Navone 1.77 | Premium tennis | Polymarket illiquide |
| 2 | **Mboko vs Navarro** (Strasbourg Final) | WTA 500 Strasbourg (clay) | 12:00 | Mboko 1.57 | Premium WTA | Stats Insider 59% (mais conseille Navarro) |
| 3 | **Kalinina vs Marcinko** (Rabat Final) | WTA 250 Rabat (clay) | 12:00 | Kalinina 1.41 | Premium WTA | Aucun sharp dispo |
| 4 | **Hurricanes vs Canadiens G2** | NHL ECF | 23:00 | CAR ~1.48 (-205) | ✅ premium | Polymarket dispo |
| 5 | **Knicks @ Cavaliers G3** | NBA ECF | 24:00 (00:00 24/05) | CLE 1.66 / NYK 2.20 | ✅ premium | Polymarket + DraftKings |
| 6 | Hull vs Middlesbrough | Championship PO Final (Wembley) | 14:30 | équilibré | Premium foot | Betfair Exchange |
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

**Évènements hors fenêtre** :
- Roland Garros Day 1 (dim 24/05 09:00 UTC) — F5 limite, à monitorer demain
- UFC Topuria-Gaethje (dim 24/05)
- Euroleague Final (dim 24/05)
- F1 Monaco Qualifs (samedi mais hors profil)
- UEFA Conference League Final (mer 27/05)

---

## Funnel pré-filtrage v3 (cascade tier-based)

### Étape 2A : Filtre F1 single (1.50 ≤ cote ≤ 2.00)

| Match | Cote bwin | F1 single | Tier candidat | Dédup | Statut |
|-------|-----------|-----------|---------------|-------|--------|
| Hurricanes ML G2 | 1.48 | ❌ < 1.50 | hors single, → combo possible | ✅ | candidat COMBO leg |
| Kalinina ML Rabat | 1.41 | ❌ < 1.50 | hors single, → combo possible (cote 1.20-1.45) | ✅ | candidat COMBO leg |
| Cavaliers ML G3 | 1.66 | ✅ | STANDARD ? | ❌ pické 19/05 | **DUPLICATE → DROP** |
| Knicks ML G3 (away) | 2.20 | ❌ > 2.00 | hors single | ❌ pické 19/05 | DROP (F1 + dédup) |
| Navone ML Geneva | 1.77 | ✅ | candidat single | ✅ | **Finaliste 1** |
| Mboko ML Strasbourg | 1.57 | ✅ | candidat single | ✅ | **Finaliste 2** |
| Dodgers ML | 1.55 | ✅ | candidat single faible | ✅ | drop (no edge MLB sourcé) |
| Yankees ML | 1.69 | ✅ | candidat single faible | ✅ | drop (no edge MLB sourcé) |
| MLB autres | varies | ✅ pour favoris 1.50-2.00 | candidats single faibles | ✅ | drop (AB-5 + pas d'edge sharp) |
| Hull/Boro Wembley | équilibré | ⚠️ | one-off Wembley | ✅ | drop (info volatile) |
| Espanyol/Real Sociedad | équilibré | ⚠️ | no edge | ✅ | drop |

### Étape 2B : Analyse COMBO 2 jambes (F2 combo : chaque jambe proba ≥ 0.72, cote 1.20-1.45)

Candidats jambes COMBO :
- Kalinina (1.41) — proba estimée 0.72-0.78 (33-9 en 2026, 2 titres clay Antalya, n'a pas perdu un set, vs Marcinko #154 première finale clay)
- Hurricanes (1.48) — cote hors fenêtre 1.20-1.45, mais proche. Proba estimée 0.55-0.62 SEULEMENT (Habs 5-0 H2H récent, G1 perdu 6-2 à domicile, rust factor 11j, Polymarket Habs ECF 47%)
- Aucune autre cote 1.20-1.45 sur le board avec proba ≥ 0.72

**Tentatives de combo testées** :
- Kalinina (1.41, ~0.76) × Hurricanes (1.48, ~0.60) = cote 2.087 ✅ fenêtre 1.60-2.20, MAIS Hurricanes proba 0.60 < 0.72 (F2 KO sur la jambe)
- Kalinina (1.41) × Mboko (1.57) = cote 2.21 ❌ hors fenêtre. Mboko 1.57 hors 1.20-1.45 et proba ~0.57 < 0.72 (double KO)
- Kalinina (1.41) × Navone (1.77) = cote 2.50 ❌ hors fenêtre. Navone 1.77 hors 1.20-1.45 (jambe KO)

**Verdict COMBO** : aucun combo éligible v3 (toutes les configurations tombent soit sur proba jambe < 0.72, soit sur cote hors 1.20-1.45). Pas de boost bwin combo dispo non plus.

### Étape 2C : Anti-duplication via check_duplicate.py

- `check_duplicate.py "Mariano Navone" "Learner Tien"` → exit 0 ✅
- `check_duplicate.py "Carolina Hurricanes" "Montreal Canadiens"` → exit 0 ✅
- `check_duplicate.py "Victoria Mboko" "Emma Navarro"` → exit 0 ✅
- `check_duplicate.py "Anhelina Kalinina" "Petra Marcinko"` → exit 0 ✅
- (Cavs/Knicks G3 disqualifié implicitement par le pick du 19/05 dans le picks_data)

**Finalistes single** : Navone (Geneva final), Mboko (Strasbourg final).

---

## Notes de cartographie v3

- **AB-1 (top-10 ATP J-1 GS)** : NA pour Navone (#44) et Tien (#75/#20 — career-high #20 atteint le 18/05/26).
- **Risque "économie pré-RG" générique** : aucun des 2 finalistes Geneva n'est top-10 (Ruud était l'AB-1 hier), donc non pénalisé. Tien et Navone ont un GS à jouer dimanche mais ne sont pas dans la fenêtre des stars qui économisent (motivés par 1er titre / 2e titre).
- **PC-3 (promo bwin premium)** : aucune promo combo identifiée aujourd'hui.
- **WebFetch 403 persistant** (Dimers, Tennis Tonic, Stats Insider, LWOS, ATP Tour, Polymarket) — fallback WebSearch comme hier. À documenter en tech debt.
- **MLB** : 14 matchs scannés, aucun "premium", aucun edge sharp identifié → drop systématique en cohérence avec AB-5.
