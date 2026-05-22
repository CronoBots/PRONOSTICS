# 📊 Archive comparaison Workflow vs Claude

Chaque fichier `{YYYY-MM-DD}.md` archive la comparaison entre :
- Le ranking quantitatif du workflow `daily_candidates.py` (CSV trié par `safety_score`)
- L'analyse contextuelle de Claude en conversation (top 3-5 candidats)

## Format

```markdown
# Comparaison 2026-MM-DD

## Workflow top 5 (CSV safety_score)
| Rang | Sport | Match | Cote | Edge | Safety |
|---|---|---|---|---|---|
| 1 | tennis | … | … | … | … |
...

## Claude top 5 (analyse web)
| Rang | Sport | Match | Cote | Proba | EV |
|---|---|---|---|---|---|
| 1 | tennis | … | … | … | … |
...

## Convergence / Divergence
- 🟢 Pick #1 identique : oui/non
- 🔴 Sports manqués par workflow : Euroleague (XYZ), IPL (XYZ)
- 🟡 Sports manqués par Claude : (rare, à creuser)

## Décision finale
- Pick choisi : …
- Source du pick : Claude / Workflow / Consensus
- Justification de l'écart si pas de consensus : …
```

## Objectif d'usage

- **Court terme** : forcer Claude à consulter le workflow systématiquement.
- **Moyen terme** : repérer les biais récurrents (Claude rate-il toujours le MLB ? Le workflow rate-il toujours les WTA mineurs ?).
- **Long terme** : data pour décider si on doit étendre Odds API ou ajuster la méthodo Claude.

Revue mensuelle : sur 30 jours, compter % de convergence + win rate par source.
