# NEXBET — Format de sortie obligatoire (v4.2 — Narratif user-first)

> **v4.2 du 24/05/2026** : refonte du format de sortie. **Deux artefacts
> distincts** sont désormais produits :
>
> 1. **Trace audit technique** dans `decisions/<date>.md` (calculs,
>    sources, anti-bias, pour audit méthodologique)
> 2. **Rapport user narratif** affiché dans la conversation (sport et
>    compétition explicites, bio joueurs, langage accessible, sans
>    jargon technique)
>
> Le user ne doit JAMAIS voir "proba_shrunk", "n_eff", "F4 KO" etc.
> dans le rapport conversation — ces termes vont dans la trace.

## 📋 Artefact 1 — Trace audit technique

Écrite dans `backend/data/nexbet/decisions/<YYYY-MM-DD>.md`. Format
inchangé depuis v4.1, contient :

### Sections obligatoires
1. **En-tête** : date, heure analyse, bankroll virtuel paper, méthodologie
2. **Étapes 1-5** : cartographie, pré-filtrage, analyse approfondie,
   anti-bias, calculs
3. **Pour chaque candidat TOP 5** :
   - Calculs : book_proba, model_proba (médiane), n_eff, proba_shrunk, EV
   - Sources : URLs complètes + quotes textuelles si extraites via snippet
   - Anti-bias : statut AB-1/2/4/5 + EXPERIMENTAL AB-3/PC
   - Verdict 🟢/🟡/🟠/🔴 + raison technique
4. **Auto-checks v4.2** : checklist validée (cf. nexbet-analyst.md)
5. **Décision user** + sources consultées + anomalies/doutes

### Template snippet WebSearch obligatoire (v4.1, formalisé v4.2)

Quand une source quantitative est lue via snippet (pas WebFetch direct),
la trace DOIT reproduire le snippet **verbatim** entre guillemets :

```markdown
**[Nom source]** ([URL]) cite **via snippet** :
> "Quote textuelle exacte du snippet, incluant le % chiffré"

→ proba modèle = 0.XX (compte 1× quanti dans n_eff)
```

Exemple réel J1 (24/05/2026) :

```markdown
**Stats Insider** (statsinsider.com.au) cite **via snippet** :
> "One predictive analytics model gives Kecmanovic a 64% chance to advance past R1"

→ proba modèle = 0.64
```

**Sans snippet textuel reproduit** → source rejetée, F4 KO sur ce
candidat. Pas de quanti acceptée sans traçabilité.

**Source agrégateur anonyme** (ex : "consensus 65%" sans composition) →
rejet F4 sauf si domaine identifiable explicitement.

Voir `decisions/2026-05-24.md` (J1 cycle paper) pour le template de
référence.

## 🎤 Artefact 2 — Rapport user narratif (NOUVEAU v4.2)

Affiché dans la conversation, lu par le user. **Aucun jargon
technique**. Format strict ci-dessous.

### Structure imposée

```markdown
# 🎾 Récap des matchs du jour — [Jour Date en français complet]

**[N] candidats analysés pour [contexte court].** Bankroll virtuel : **XX,XX€**.

---

## 🥇 Choix #1 — [Description naturelle de l'action en français]

### Le contexte
- **Sport** : [Tennis hommes / Hockey sur glace / Basketball NBA / etc.]
- **Compétition** : **[Nom complet — Roland Garros / NHL Stanley Cup Playoffs / etc.]** — [tour, série, manche]
- **Surface/Lieu** : [Terre battue / À domicile à Denver / etc.]
- **Heure** : [XXh Belgique] ([moment de la journée])
- **Cote bwin** : **X.XX** (mise X€ → gain potentiel +X,XX€)

### Qui joue
- 🇷🇸 **[Prénom Nom]** ([#ranking ATP/club], [âge] ans) — [contexte rapide : forme récente, spécialité, classement notable]
- 🇭🇺 **[Prénom Nom]** ([#ranking], [âge] ans) — [contexte rapide]

### Pourquoi on aime ce pari
- [Raison 1 en langage naturel : sources convergent, forme excellente, etc.]
- [Raison 2 : stat factuelle accessible — pas de "proba_shrunk 0.588"]
- [Raison 3 si applicable]

### Ce qui nous fait douter
- ⚠️ [Alerte 1 : H2H défavorable, blessure, etc.]
- ⚠️ [Alerte 2]
- ⚠️ [Alerte 3 si applicable]

### Verdict
**🟢 RECOMMANDÉ / 🟡 ACCEPTABLE / 🟠 BORDERLINE** — [explication en 1-2 phrases simples sans jargon].

---

## 🥈 Choix #2 — [Description] (idem structure)
## 🥉 Choix #3 — [Description] (idem structure ; si 🟠, ajouter "DÉCONSEILLÉ" dans le titre)

---

# 🎯 Ma recommandation

[Phrase claire selon Cas A/B/C, langage naturel] :
- **Cas A (au moins 1 🟢)** : "Mon choix : **[Pick]** (🟢, edge solide). Tu peux te lancer."
- **Cas B (que des 🟡)** : "Aucun pick fort aujourd'hui. Le moins risqué = **[Pick]** (🟡, edge correct mais marginal). **Tu peux skip sans regret.**"
- **Cas C (que des 🟠/🔴)** : "Rien de défendable aujourd'hui. **Skip recommandé.**"

| Décision | Mise | Si on gagne | Si on perd |
|---|---|---|---|
| ✅ **[Pick #1]** ([compétition heure]) | X,XX€ | +X,XX€ → XXX,XX€ | −X,XX€ → XX,XX€ |
| 🔄 **[Pick #2]** ([compétition heure]) | X,XX€ | +X,XX€ → XXX,XX€ | −X,XX€ → XX,XX€ |
| ❌ **Skip aujourd'hui** | 0€ | — | bankroll **XXX,XX€** inchangé |

**Tu décides quoi ?**
```

### Règles de style narratif (v4.2)

**OBLIGATOIRE** :
- **Sport mentionné explicitement** dans chaque candidat (jamais juste "RG R1" — écrire "Tennis hommes — Roland Garros 1er tour")
- **Nom complet de la compétition** ("Roland Garros (Grand Chelem)" et pas "RG", "NHL Stanley Cup Playoffs — Finale de Conférence Ouest" et pas "WCF")
- **Drapeaux emoji** pour la nationalité des joueurs (🇷🇸 🇫🇷 🇺🇸 🇨🇦 🇧🇪 etc.)
- **Heure en Belgique** + moment de la journée ("11h Belgique, dimanche matin")
- **Bio joueurs accessible** : ranking, âge, nationalité, contexte récent ("Sort d'une série de 5 victoires", "vétéran de la terre battue", "rookie de l'année")
- **Langage de présentateur sport**, pas de bookmaker technique
- **Tutoiement** dans la recommandation finale ("Tu peux skip", "Tu décides")

**INTERDIT dans la conversation user** :
- ❌ `proba_shrunk`, `n_eff`, `book_proba`, `model_proba` (chiffres bruts)
- ❌ `F1`, `F2`, `F3`, `F4`, `F5`, `F6` (codes de filtres)
- ❌ `AB-1`, `PC-X`, `EV +X.X%` (présenter "edge calculé" simplement)
- ❌ `w_book`, `dédup éditeur`, `snippet WebSearch`
- ❌ Tableau avec "Champ | Valeur" et 10 lignes techniques
- ❌ URLs de sources brutes (les sources sont citées en bio "Selon Dimers et Stats Insider" pas en liste d'URLs)

**AUTORISÉ avec mesure** :
- ⚠️ "Cote 1.78 chez bwin" (cote acceptable car compréhensible)
- ⚠️ "+4.7% d'edge" si vraiment utile (sinon dire "edge correct mais marginal")
- ⚠️ "H2H 0-1" (acceptable en jargon tennis, mais préciser "historique face-à-face")
- ⚠️ "Mise 3€" (sans détail Kelly)

**Émojis verdict** :
- 🟢 RECOMMANDÉ (EV ≥ +5%, proba ≥ 0.60)
- 🟡 ACCEPTABLE (EV ≥ +2%, proba ≥ 0.55)
- 🟠 BORDERLINE / DÉCONSEILLÉ (EV entre 0 et +2%)
- 🚨 (utilisé dans Alerts pour les signaux MAJEURS — blessure star, série 3-1, etc.)
- ⚠️ (utilisé dans Alerts pour les warnings standards)

## 🤝 Articulation Trace ↔ Rapport user

L'agent produit **TOUJOURS les deux** à chaque run :

1. **D'abord** : la trace technique complète dans `decisions/<date>.md`
   (l'agent peut être audité par moi/devs sans relire la conversation)
2. **Ensuite** : le rapport narratif user-facing dans la réponse finale
   à l'utilisateur (lisible directement sur mobile)
3. **Si user valide** ✅ : ajout JSON dans `paper_trading_log.md` au
   format spec v4.1 (déjà documenté)

## Format JSON paper position (inchangé v4.1)

Si user valide (✅), append dans `paper_trading_log.md` :

```json
{
  "id": "paper_YYYYMMDD_NN",
  "date_proposed": "YYYY-MM-DD",
  "date_validated": "YYYY-MM-DD HH:MM Belgique",
  "verdict": "recommended | acceptable | borderline",
  "pick": "Description courte",
  "sport": "tennis | basketball | football | combo",
  "match": "Team A vs Team B",
  "kickoff_utc": "YYYY-MM-DDTHH:MM:SS+00:00",
  "odds_bwin": 1.78,
  "model_probability": 0.640,
  "book_probability": 0.562,
  "ev": 0.047,
  "stake_paper": 3.00,
  "sources": ["url1", "url2", "url3"],
  "anti_bias_notes": "AB-3 EXPERIMENTAL noted, no blocking",
  "outcome": "pending",
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

## Format outcome verification (inchangé v4.1)

Quand le match est joué (≥ 2h après kickoff), vérification stricte :

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

Si une seule source ou pas de quote précise → outcome reste PENDING.

## Anti-patterns interdits dans la sortie v4.2

JAMAIS dans la **conversation user** :
- Tableau technique "Champ | Valeur | book_proba 0.XXX"
- Termes méthodologiques (proba_shrunk, n_eff, F1-F6, AB-X, PC-X)
- URLs brutes en liste (les sources doivent être citées dans la prose)
- Verdict sans contexte sport+compétition
- Description match en sigles ("RG R1", "WCF G3" → écrire en clair)
- Pick unique sans présenter les alternatives TOP 3
- Recommandation sans tableau décision (mise/win/loss/bankroll)

JAMAIS dans la **trace `decisions/<date>.md`** :
- Format narratif (la trace doit rester technique pour audit)
- Omission des calculs détaillés
- Pas de mention des sources URLs complètes
