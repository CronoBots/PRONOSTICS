# NΞXBΞT — Format de sortie obligatoire (v4.0 — Recap-only)

> **v4.0** : l'agent ne produit plus un "Pick JSON unique". Il présente
> un **TOP 3 ranking** chiffré, un verdict par candidat, et une
> recommandation conditionnelle. C'est le user qui tranche.

## Structure attendue de la réponse

L'agent doit produire **4 blocs obligatoires** dans cet ordre :

### Bloc 1 — Watchlist (auditabilité)

Tableau Markdown ≥ 15 lignes, déjà écrit dans
`decisions/<date>-watchlist.md`. La réponse à l'utilisateur peut référer
au fichier ou inclure une version réduite (top 10).

```markdown
| Match | Sport | Kickoff UTC | Cote favori | Coverage |
|---|---|---|---|---|
| Navone vs Tien | Tennis ATP | 13:00 | 1.77 | 4 sources |
| ... | ... | ... | ... | ... |
```

### Bloc 2 — TOP 3 candidats (analyse chiffrée)

Pour chaque candidat (ranking par EV décroissant), produire la fiche
suivante :

```markdown
### 🟢/🟡/🟠 #N — [Pick] (cote X.XX)

| Champ | Valeur |
|---|---|
| Match | Team A vs Team B |
| Compétition | League / Tournament |
| Kickoff | YYYY-MM-DD HH:MM UTC (HH:MM Belgique) |
| Cote bwin | X.XX |
| Book proba | 0.XXX |
| Model proba (médiane sources) | 0.XXX |
| Sources accessibles | N convergentes |
| `proba_shrunk` | 0.XXX (formule : (n_eff × model + 2 × book) / (n_eff + 2)) |
| EV | +X.X% |
| Verdict | 🟢 RECOMMANDÉ / 🟡 ACCEPTABLE / 🟠 BORDERLINE |
| Mise paper si validé | X.XX € |

**Sources accessibles** :
- Source 1 (lastwordonsports.com) : "quote ou proba explicite" — X%
- Source 2 (dimers.com) : "quote ou proba explicite" — X%
- Source 3 (bleachernation.com) : "quote ou proba explicite" — X%

**Alerts** :
- ⚠️ AB / PC patterns identifiés (si applicable)
- ⚠️ Risques honnêtes (3 max)

**Pourquoi ce verdict** :
1 paragraphe court (3-5 lignes) résumant l'analyse.
```

### Bloc 3 — Recommandation conditionnelle

Format strict selon la disponibilité de candidats 🟢 / 🟡 :

#### Cas A — Au moins 1 candidat 🟢 RECOMMANDÉ
```markdown
## 🎯 Recommandation conditionnelle

**Mon TOP : [Pick] (verdict 🟢, EV +X.X%, proba_shrunk X.XX)**

Justification : 3 sources convergentes, EV positif solide, anti-bias OK.

**À ta décision** :
- ✅ Valider → mise paper X € sur bankroll virtuel
- ❌ Skip → noté en trace, aucune position
- 🔄 Contre-pick → choisis un autre candidat (TOP 2 ou TOP 3)

**Bankroll virtuel paper avant** : XX.XX €
**Si win** : +X.XX € → XX.XX €
**Si loss** : -X.XX € → XX.XX €
```

#### Cas B — Aucun 🟢, au moins 1 🟡 ACCEPTABLE
```markdown
## ⚠️ Recommandation conditionnelle

**Aucun candidat 🟢 RECOMMANDÉ aujourd'hui.**

**Le moins pire : [Pick] (verdict 🟡, EV +X.X%, proba_shrunk X.XX)**

C'est jouable mais sans conviction forte. Tu peux skip sans regret.

**À ta décision** :
- ✅ Valider → mise paper X € (réduite par défaut sur 🟡)
- ❌ Skip recommandé → aucune position
- 🔄 Contre-pick → un autre TOP 2 / TOP 3 si tu vois quelque chose
```

#### Cas C — Aucun 🟢 ni 🟡 (que des 🟠 / 🔴)
```markdown
## 🛑 Recommandation conditionnelle

**Rien de défendable aujourd'hui.**

Le meilleur candidat dispo ([Pick]) est verdict 🟠 BORDERLINE
(EV +X.X%, proche du seuil 0%).

**Recommandation : SKIP cette journée.**

La discipline v4 rétablit "EV ≥ +2% strict". Aucun pick paper
aujourd'hui.
```

### Bloc 4 — Trace + commit

Trace écrite dans `decisions/<date>.md` (toujours, même si skip) :
- Heure analyse
- Top 5 candidats étudiés avec calculs complets
- Verdict par candidat
- Décision finale du user (✅ / ❌ / 🔄)
- Sources consultées (URLs)
- Anomalies / doutes
- Si pick validé : mise paper, bankroll virtuel après

**Format trace TOP 5** (un bloc par candidat) :
```markdown
### Candidat N — [Pick] (cote X.XX)

**Calculs** :
- book_proba = 1 / X.XX = 0.XXX
- model_proba (médiane sources) = 0.XXX (sources : ...)
- n_eff = N
- proba_shrunk = (N × 0.XXX + 2 × 0.XXX) / (N + 2) = 0.XXX
- EV = 0.XXX × X.XX − 1 = +X.X%

**Sources accessibles** :
- URL 1 → proba explicite ou quote
- URL 2 → proba explicite ou quote
- URL 3 → proba explicite ou quote

**Anti-bias** :
- AB-1/2/4/5 status (déclenché ou NA)
- AB-3 status (EXPERIMENTAL)
- PC patterns identifiés (EXPERIMENTAL)

**Verdict** : 🟢/🟡/🟠/🔴 — raison
```

## Format JSON paper position (uniquement si user valide)

Après validation user (✅), append dans `paper_trading_log.md` :

```json
{
  "date": "YYYY-MM-DD",
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
  "anti_bias_notes": "AB-3 EXPERIMENTAL noted, no blocking",
  "outcome": "pending",
  "verification": {
    "source_a": null,
    "source_b": null,
    "quote_a": null,
    "quote_b": null,
    "verified_at": null
  },
  "bankroll_virtual_before": 100.00,
  "bankroll_virtual_after": null
}
```

**Champs `verification`** remplis uniquement quand outcome confirmé
par **2 sources distinctes avec quote textuelle** (voir method.md
Étape 9).

## Format outcome verification

Quand le match est joué et que l'outcome doit être marqué :

```markdown
### Outcome verification — [Pick] — [Date]

**Source A** ([URL]) cite textuellement :
> "Quote exacte avec le score final"

**Source B** ([URL]) cite textuellement :
> "Quote exacte avec le score final"

→ **OUTCOME = WIN/LOSS** sur le pick "[Description]"
→ Mise paper : X.XX €
→ Gain/perte : ±X.XX € (cote X.XX)
→ Bankroll virtuel après : XX.XX €
```

**Si une seule source disponible ou pas de quote précise** :
```markdown
### Outcome verification — PENDING — [Pick] — [Date]

Sources tentées :
- URL 1 : pas de quote score final
- URL 2 : URL 403 / pas accessible

→ Outcome reste PENDING. Re-vérification demain.
```

**JAMAIS d'inférence** (G2/G3, SF/Final, score deviné).

## Sections rationale (si user valide et veut copie pour bwin)

Si le user valide le pick et veut le partager / le placer en réel
(après les 30 jours paper), produire un **rationale court** (10-15
lignes) sur demande explicite. Pas obligatoire en mode paper.

Style :
- **Factuel, sourcé** : éviter superlatifs marketing
- **Honnête sur les risques** : 2-3 risques min
- **Belgo-friendly** : cote bwin, heure belge
- **Vocabulaire pro** : EV, edge, H2H, ATS

## Anti-patterns interdits dans la sortie v4

JAMAIS :
- Produire un "Pick JSON unique" sans Bloc TOP 3 alternatives
- Présenter un candidat verdict 🔴 dans le TOP 3 visible (rejets en
  trace seulement)
- Recommander explicitement un candidat 🟠 BORDERLINE sans avertir
  "skip recommandé"
- Auto-valider un pick (insertion automatique dans picks_data.py)
- Marquer un outcome sans quote textuelle x2
- Omettre la section "Recommandation conditionnelle"
- Citer Sofascore / ATP / WTA officiels comme source primaire
- Appliquer un boost de proba PC (tous EXPERIMENTAL n=1)
