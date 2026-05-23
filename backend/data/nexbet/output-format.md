# NΞXBΞT analyst — Format de sortie obligatoire

> L'agent doit produire EXACTEMENT ce format pour que le pick soit
> insérable directement dans `backend/scripts/picks_data.py` PICKS array
> sans modification structurelle.

## Format JSON principal (cas pick simple)

```json
{
  "date": "YYYY-MM-DD",
  "sport": "football | basketball | tennis | nfl | mlb | nhl | ice_hockey | rugby | soccer | combo",
  "league": "Ligue / tournoi / compétition (string descriptif lisible)",
  "home_team": "Nom équipe domicile",
  "away_team": "Nom équipe extérieur",
  "kickoff": "YYYY-MM-DDTHH:MM:SS+00:00",
  "pick": "Description courte du pari (ex: 'Carolina Hurricanes vainqueur du match')",
  "odds": 1.83,
  "odds_unboosted": null,
  "model_probability": 0.62,
  "headline": "1-2 phrases punchy qui résument le pourquoi du pick",
  "rationale": [
    "##🎯 Le match",
    "Description du contexte général en 1 paragraphe.",
    "Lieu, heure, enjeu.",
    "##📊 Contexte récent",
    "Forme, série, H2H, blessures importantes.",
    "##🔥 Pourquoi ce pari",
    "L'edge identifié, les patterns gagnants connus, les sources.",
    "##📈 Confiance — modèles externes",
    "ESPN BPI, FiveThirtyEight, Polymarket, autres : leurs probabilités.",
    "Notre estimation : X% (justification de pourquoi on s'aligne / diverge).",
    "Edge calculé : +Y points vs book.",
    "##💰 Cote & marché",
    "Cote sur bwin/DraftKings/FanDuel, où trouver. Mouvement de ligne.",
    "##🧮 EV & mise",
    "Calcul EV explicite. Kelly fraction. Mise retenue + justification.",
    "##⚠️ Risques honnêtes",
    "Risque 1 (proba estimée).",
    "Risque 2.",
    "Risque 3.",
    "Aucun ne fait passer la proba sous le seuil critique mais ils s'additionnent.",
    "##✅ Pourquoi c'est le pick du jour quand même",
    "Synthèse en 2-3 phrases : ce qui fait que malgré les risques, le profil correspond à ce qu'on cherche."
  ],
  "sources": [
    "https://exemple.com/source1",
    "https://exemple.com/source2",
    "https://exemple.com/source3"
  ],
  "stake": 5.0,
  "outcome": "pending"
}
```

## Format combiné (pick avec 2 jambes)

```json
{
  "date": "YYYY-MM-DD",
  "sport": "combo",
  "league": "Combiné — [Sport A jambe 1] + [Sport B jambe 2]",
  "home_team": "Joueur/Équipe A + Joueur/Équipe B",
  "away_team": "Adversaire A + Adversaire B",
  "kickoff": "YYYY-MM-DDTHH:MM:SS+00:00 (heure de la 1ère jambe)",
  "pick": "Combiné [JambeA] + [JambeB] (boosté bwin)",
  "odds": 2.249,
  "odds_unboosted": 1.82,
  "model_probability": 0.62,
  "headline": "...",
  "rationale": [
    "##🎯 Le combiné en 1 ligne",
    "..."
  ],
  "sources": [...],
  "stake": 5.0,
  "outcome": "pending",
  "legs": [
    {
      "sport": "tennis",
      "league": "ATP / WTA, tournoi, surface",
      "home_team": "Joueur A (NAT)",
      "away_team": "Adversaire (NAT)",
      "pick": "Joueur A vainqueur du match",
      "kickoff": "...",
      "odds": 1.28,
      "outcome": "pending",
      "notes": "Stats clés résumées en 1 phrase pour cette jambe."
    },
    {
      "sport": "basketball",
      "league": "NBA / Euroleague / autre",
      "home_team": "Team A",
      "away_team": "Team B",
      "pick": "Team A vainqueur du match",
      "kickoff": "...",
      "odds": 1.42,
      "outcome": "pending",
      "notes": "Stats clés résumées."
    }
  ]
}
```

## Champs auto-calculés (NE PAS inclure dans l'output)

Ces champs sont calculés par `build_history.py` automatiquement, l'agent
N'A PAS à les fournir :

- `book_probability` = `1 / odds`
- `expected_value` = `model_probability × odds − 1`
- `profit` (computed quand outcome ≠ pending)
- `bankroll_after`
- `engine` (toujours `claude_curated@1.0`)

## Style des rationale

### Format markdown lite
Chaque entrée du tableau `rationale` est une string. On utilise des
markdown headers `##` avec emojis pour structurer visuellement. La
plateforme convertit ça en sections lisibles.

### Tone of voice
- **Factuel, sourcé** : éviter les superlatifs marketing
- **Honnête sur les risques** : section "##⚠️ Risques honnêtes" obligatoire
- **Belgo-friendly** : références à la cote bwin en priorité (le marché
  Belge), heure en heure belge mentionnée
- **Vocabulaire pro** : "EV", "edge", "moneyline", "ATS", "implicit
  probability", "H2H" — la cible utilise ces termes
- **Pas d'invention** : si un chiffre n'est pas sourcé, écrire
  "selon X source" ou ne pas le citer
- **Longueur** : 20-30 entrées rationale (assez pour défendre le pick,
  pas trop pour rester lisible)

### Headlines exemples (style à reproduire)

✅ Bien : *"Combiné 'double favoris' BOOSTÉ par bwin (1,82 → 2,36, +30%) —
Ruud (14-1 carrière à Geneva, 3 titres) + Knicks (10 wins consécutifs
à MSG, 23-3 SU comme favori −6,5+ home). Proba combinée ~63%, EV +49%
grâce au boost."*

✅ Bien : *"Carolina à domicile en mode 'must-react' après leur première
défaite des playoffs (6-2). Andersen a un GAA de 1.12 sur les 2
premières rondes, les Canes étaient 8-0 avant Game 1, et historiquement
Brind'Amour réagit fort après une défaite. Cote 1.83 = value à PNC Arena."*

❌ À éviter : *"Pari du jour 🔥🔥 incroyable opportunité ne pas
manquer !!!"* (marketing creux, aucune info actionable)

### Section ## obligatoires dans rationale (ordre conseillé)

1. **##🎯 Le match / Le combiné en 1 ligne** — contexte
2. **##📊 Stats / Contexte récent** — chiffres clés
3. **##🤝 H2H et profil tactique** (si applicable)
4. **##📈 Confiance — modèles externes** — sources + notre estimation
5. **##💰 Cote & marché** — cote + mouvement de ligne
6. **##🧮 EV & mise** — calculs explicites
7. **##⚠️ Risques honnêtes** — 3-5 risques identifiés, OBLIGATOIRE
8. **##✅ Pourquoi c'est le pick du jour quand même** — synthèse finale

## Sortie complète attendue par l'agent

L'agent produit dans sa réponse finale :

1. **Bloc 1 — Pick JSON** : entre ```json ... ``` (parsable directement)
2. **Bloc 2 — Résumé FR de 5 lignes** : pour copier-coller dans la
   conversation utilisateur, langage clair Belge
3. **Bloc 3 — Trace de décision** : à écrire dans
   `backend/data/nexbet/decisions/<YYYY-MM-DD>.md` (top candidats étudiés,
   rejets motivés, sources, anomalies)
4. **Bloc 4 — Confidence note** : 1 phrase auto-évaluative ("Confiance
   élevée car X + Y" ou "Confiance modérée car Z")

## En cas de "no pick today"

```markdown
# Aucun pick aujourd'hui — YYYY-MM-DD

**Raison principale** : [quel filtre a tout éliminé]

## Top 3 candidats étudiés et rejetés

1. **[Match]** — [cote] — Rejeté car [filtre raté + explication]
2. **[Match]** — [cote] — Rejeté car [filtre raté + explication]
3. **[Match]** — [cote] — Rejeté car [filtre raté + explication]

## Sources consultées
- [URLs]

## Note
[Recommandation : revenir demain / situation exceptionnelle / etc.]
```
