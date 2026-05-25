# NEXBET — Paper Trading Log v4.0

> **Mode paper trading 30 jours** — démarrage 24/05/2026, fin prévue
> 23/06/2026. Pendant cette période, **aucun bet réel n'est placé**.
> Toutes les positions ci-dessous sont **virtuelles**.

## Paramètres du cycle

- **Date début** : 2026-05-24
- **Date fin** : 2026-06-23 (30 jours)
- **Bankroll virtuel initial** : 100,00 €
- **Bankroll réel parallèle** : 25,00 € (gelé — pas de bet pendant le cycle)
- **Méthodologie** : v4.0 (recap-only, EV ≥ +2% strict, outcome 2 sources)
- **Branche git** : `claude/agent-pickup-testing-PjfQi`

## Mises théoriques par verdict

| Verdict | Mise paper |
|---|---|
| 🟢 RECOMMANDÉ | 5,00 € |
| 🟡 ACCEPTABLE | 3,00 € |
| 🟠 BORDERLINE | 1,00 € (si user valide quand même) |
| 🔴 INSUFFISANT | 0 € (skip auto) |

## Critères de promotion vers mode bet réel

Audit le 23/06/2026 :
- ≥ 24 picks paper proposés au user
- ≥ 12 picks paper validés et résolus (avec 2 sources + quote)
- **Hit rate global ≥ 55%** sur les positions validées
- **Hit rate sur 🟢 RECOMMANDÉ ≥ 65%**
- **ROI virtuel cumulé ≥ +5%** (bankroll fin ≥ 105 €)

Si tous critères OK → promotion vers mode bet réel sur 25 € réels.
Si critères partiellement OK → itération v4.x + prolongation paper.
Si critères majoritairement KO → revue profonde méthodologie (v5).

## Règles outcome verification (strictes v4)

Pour marquer un outcome WIN/LOSS, exiger :

1. **2 sources distinctes** (pas 2 articles du même éditeur)
2. **Quote textuelle exacte** du score final dans chaque source
3. Format trace :
   ```
   Source A (URL) cite : "score textuel"
   Source B (URL) cite : "score textuel"
   → OUTCOME = WIN/LOSS
   ```

Si une seule source ou pas de quote précise → outcome reste PENDING.
Re-vérification le lendemain.

**Jamais d'inférence** (G2/G3, SF/Final, deviné).

---

## Positions virtuelles

### Format d'entrée

Chaque position validée par le user est appendée ici au format :

```json
{
  "id": "paper_YYYYMMDD_NN",
  "date_proposed": "YYYY-MM-DD",
  "date_validated": "YYYY-MM-DD HH:MM Belgique",
  "verdict": "recommended | acceptable | borderline",
  "pick": "Description courte",
  "sport": "tennis | nba | nhl | mlb | soccer | combo",
  "match": "Team A vs Team B",
  "kickoff_utc": "YYYY-MM-DDTHH:MM:SS+00:00",
  "odds_bwin": 1.77,
  "model_probability": 0.555,
  "book_probability": 0.565,
  "ev": -0.018,
  "stake_paper": 2.00,
  "sources": ["url1", "url2", "url3"],
  "anti_bias_notes": "...",
  "outcome": "pending | win | loss",
  "verification": {
    "source_a_url": null,
    "source_a_quote": null,
    "source_b_url": null,
    "source_b_quote": null,
    "verified_at": null
  },
  "bankroll_virtual_before": 100.00,
  "bankroll_virtual_after": null
}
```

### Log des positions

> **État au 2026-05-23** : aucune position virtuelle encore. Cycle
> démarre 24/05.

```json
[]
```

---

## Métriques cumulées (mise à jour automatique après chaque outcome)

| Métrique | Valeur courante | Cible audit 23/06 |
|---|---|---|
| Picks proposés (TOP 3 affichés) | 0 | ≥ 24 |
| Picks validés par user | 0 | ≥ 12 |
| Picks résolus (2 sources + quote) | 0 | ≥ 12 |
| Hit rate global | — | ≥ 55% |
| Hit rate 🟢 RECOMMANDÉ | — | ≥ 65% |
| Hit rate 🟡 ACCEPTABLE | — | ≥ 50% |
| ROI virtuel cumulé | 0% | ≥ +5% |
| Bankroll virtuel | 100,00 € | ≥ 105 € |

---

## Notes de cycle

### 2026-05-23 — Démarrage v4.0
- Pivot depuis v3.3 (8 problèmes structurels documentés dans `learnings.md`)
- Refonte complète : méthodo recap-only, EV ≥ +2% strict, sources whitelist
- Aucun pick placé ce jour (Navone v3.3 FLOOR non placé)
- Démarrage paper 24/05 avec bankroll virtuel 100 €

### (Append entries here as cycle progresses)

---

## Audit fin de cycle (à remplir le 23/06/2026)

> Section vide jusqu'à fin de cycle.

```markdown
## Audit 2026-06-23

- Picks proposés : N
- Picks validés : N
- Picks résolus : N
- Hit rate global : XX%
- Hit rate 🟢 : XX%
- Hit rate 🟡 : XX%
- ROI cumulé : ±X.X%
- Bankroll virtuel final : XX.XX €

### Décision
- [ ] Promotion mode réel (tous critères OK)
- [ ] Itération v4.x + prolongation paper (critères partiels)
- [ ] Revue profonde v5 (critères majoritairement KO)

### Patterns émergés
- ...

### Patterns invalidés
- ...
```
