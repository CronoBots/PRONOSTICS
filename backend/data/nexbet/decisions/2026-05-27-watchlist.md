# Watchlist NEXBET — mercredi 27 mai 2026 (Roland Garros Day 4 — R2)

**Heure analyse** : 2026-05-26 ~22h Belgique (J-1 RG Day 4)
**Demande user** : focus tennis Roland Garros uniquement (foot/NBA non scannés)
**Méthodologie** : v4.7 (SofaScore primaire — KO Cloudflare ce soir, fallback WebSearch whitelist)
**Bankroll virtuel paper** : 100,00 € (cycle démarre, aucune position résolue à ce jour)

## Note infra
SofaScore API 403 systématique ce soir (Cloudflare) sur `/sport/tennis/scheduled-events/2026-05-27` ET `/search/all` — incident à monitorer demain matin. API-Sports ne couvre pas tennis. Cartographie 100% WebSearch whitelist v4.7.

## Programme R2 — sample représentatif (≥ 15 lignes)

| Match | Sport | Tour | Heure (UTC) | Court | Cote favori | Coverage |
|---|---|---|---|---|---|---|
| Djokovic vs Royer | ATP | R2 | 09:00 | Chatrier | 1.08 (Djoko) | dense (LWOS, Stats Insider, Dimers, SI) |
| Świątek vs adversaire R2 | WTA | R2 | jour | Chatrier | ~1.05 (Świątek) | dense |
| Zverev vs Machac | ATP | R2 | night | Chatrier | ~1.30 (Zverev) | dense (LWOS, UbiTennis, tenngrand) |
| Rybakina vs Starodubtseva | WTA | R2 | jour | Lenglen | ~1.08 (Rybakina) | dense (TennisTemple, Puntodebreak) |
| de Minaur vs Blockx | ATP | R2 | 09:00 | Lenglen | 1.50 (de Minaur) | **WO — Blockx forfait** (ATP Tour) |
| Ruud vs Międedović | ATP | R2 | jour | Lenglen | 1.44 (Ruud) | dense (online-bookmakers, sportytrader) |
| Paolini vs adversaire | WTA | R2 | jour | Lenglen | ~1.20 (Paolini) | partielle |
| Bencic vs McNally | WTA | R2 | 09:00 | Mathieu | 1.29 (Bencic) | dense (Tennis Tonic, RotoWire) |
| Andreeva vs Bassols Ribera | WTA | R2 | 19:00 | Mathieu | 1.057 (Andreeva) | dense (scores24, Tennis Tonic) |
| Humbert vs Halys | ATP | R2 | jour | Mathieu | **1.62-1.68** (Humbert) | dense (Sportytrader, RDJ, OlympicsFR) |
| Rublev vs Carabelli | ATP | R2 | 13:00 | Mathieu | 1.29 (Rublev) | dense (Tennis Tonic, RotoWire) |
| Fonseca vs Prizmic | ATP | R2 | jour | Cat3 | ~1.50 (Fonseca) | dense (LWOS, tenngrand) |
| Bouzkova R2 | WTA | R2 | jour | Cat3 | n/a | partielle |
| Muchova / autre seed WTA R2 | WTA | R2 | jour | Cat3 | n/a | partielle |
| Tabilo / Cobolli ATP R2 | ATP | R2 | jour | Cat3 | n/a | partielle |
| Cazaux / Atmane FR R2 | ATP | R2 | jour | Cat3 | n/a | partielle |

## Pré-filtrage F0-F1 (sweet spot single 1.50-2.00, ou jambe combo 1.20-1.50)

**Éliminés F1 single (cote < 1.50)** :
- Djokovic 1.08, Świątek ~1.05, Rybakina ~1.08, Andreeva 1.057 → favoris écrasants
- Zverev ~1.30, Ruud 1.44, Bencic 1.29, Rublev 1.29 → sous fenêtre single

**Éliminé spécial** :
- de Minaur vs Blockx → **Walkover** (Blockx withdrew, ATP Tour confirmé)

**Survivants F1 single** :
- **Humbert vs Halys** (cote 1.62-1.68) — SEUL candidat single dans fenêtre 1.50-2.00 sur la cartographie identifiée

**Candidats potentiels combiné 2-3 jambes** (jambes 1.20-1.50, total 1.60-2.50) — recherche active v4.7 GS :
- Jambe A : **Świątek 1.05** + Jambe B : **Djokovic 1.08** = cote 1.13 → SOUS plancher 1.60
- Jambe A : **Andreeva 1.057** + Jambe B : **Rybakina 1.08** = cote 1.14 → SOUS plancher
- Triple : Świątek × Djokovic × Rybakina = 1.05 × 1.08 × 1.08 = 1.22 → encore SOUS plancher
- Pour atteindre 1.60+, il faut intégrer une jambe ≥ 1.30-1.40 :
  - **Combo 3 jambes** : Andreeva 1.057 × Djokovic 1.08 × **Ruud 1.44** = **1.65** ✓ (dans fenêtre 1.60-2.50)
  - **Combo 3 jambes** : Świątek 1.05 × Rybakina 1.08 × **Bencic 1.29** = **1.46** → SOUS plancher
  - **Combo 3 jambes** : Andreeva 1.057 × **Rublev 1.29** × **Bencic 1.29** = **1.76** ✓
  - **Combo 2 jambes** : **Humbert 1.65** × **Ruud 1.44** = **2.38** ✓ (cote totale)

⚠️ AB-4 BLOCANT v4 : "Combiné 3+ jambes interdit". Donc les combos 3 jambes ci-dessus sont **REJETÉS** méthodologiquement, même si ils ont marché J9 26/05 (Osaka+Darderi+Cerundolo, observation isolée hors méthode v4).

→ Le SEUL combo méthodologiquement valide reste **2 jambes** : Humbert × Ruud à 2.38, OU Humbert × Bencic à 2.13, OU Ruud × Bencic à 1.86.

## Top 5 candidats finalistes (analyse approfondie Étape 3)

1. **Humbert ML** vs Halys (single, cote ~1.65)
2. **Combo 2 jambes : Humbert + Ruud** (cote ~2.38)
3. **Combo 2 jambes : Ruud + Bencic** (cote ~1.86)
4. **Combo 2 jambes : Humbert + Bencic** (cote ~2.13)
5. **Ruud ML** vs Międedović (single 1.44 → HORS F1 single, mais analysé comme jambe combo)

Note : Andreeva 1.057 et Djokovic 1.08 trop écrasés pour apporter de l'EV en combo 2 jambes (×1.05 ≈ neutralise edge).
