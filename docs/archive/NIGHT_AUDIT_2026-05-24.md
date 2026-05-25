# 🌙 Récap audit nocturne — 24/05/2026

> Session de retraitement complet du repo pendant ton sommeil.
> Mandat : "retraiter toutes les infos, modifier le nécessaire pour ne plus
> avoir de choses mortes, redondantes ou contradictoires + vérifier si
> l'agent est optimal + pousser sans attendre confirmation".

---

## 🎯 Méthode

4 sub-agents Explore lancés en parallèle pour cartographier :
1. **Frontend audit** — dead code, redondances, contradictions i18n
2. **Backend audit** — scripts orphelins, fichiers data morts, méthodologie
3. **NEXBET methodology audit** — incohérences fichiers, bugs J1, optimalité agent
4. **Documentation audit** — README périmé, paths cassés, manques

Puis 4 vagues d'exécution + push.

---

## 🔧 Vague 1 — Cleanup obsolète (commit `dd03161`)

### Archivé
- `backend/data/nexbet/backtest_2026-05-23.md` (196 lignes, refs v3.3 :
  Tier FLOOR + F1-bis Playoff Mode + bonus PC + malus sharp) déplacé vers
  `backend/data/nexbet/archive/backtest_2026-05-23_v3-calibration.md`
  avec en-tête `[ARCHIVE v3.3]` explicite (warn refs obsolètes).

### Untracked + gitignored
- `.gitignore` : ajout `backend/data/candidates/*.debug.txt`
- `git rm --cached` des 3 anciens debug files (21/05, 22/05, 23/05)
  → ces fichiers sont auto-générés par `daily_candidates.py` et ne
  devraient pas polluer git.

---

## 📄 Vague 2 — Refonte README.md (commit `51b5eac`)

### Bugs corrigés
- 🚨 **Paths cassés** : `backend/data/predictions/` n'existe pas (cité
  lignes 40, 52, 93) → remplacé par `backend/data/history.json` +
  `backend/data/candidates/` + `backend/data/nexbet/decisions/`
- Architecture mise à jour avec la structure réelle (nexbet/, archive/,
  candidates/, comparison/)

### Sections ajoutées
- **🟦 Identité visuelle v5 Cobalt** (logo + palette + sémantique
  gain/perte préservée vert/rouge)
- **📊 Mode actuel : Paper trading (24/05 → 23/06/2026)** — bankroll
  virtuel 100€, bankroll réel 25€ gelé, lien vers paper_trading_log.md
- **Méthodologie NEXBET (v4.2)** — résumé F1-F6 + recap-only + dual
  artefact, lien vers method.md
- Note "The Odds API quota épuisé (498/500)" dans tableau config sources

---

## 🤖 Vague 3 — Méthodologie NEXBET unifiée v4.2 (commit `51b5eac`)

### Versions unifiées
Versions v4.0 / v4.1 / v4.2 étaient mélangées dans 5 fichiers. Unifié
partout en v4.2 avec changelog explicite.

### `.claude/agents/nexbet-analyst.md`
- Header `v4.0` → `v4.2`
- Description : ajout "dual artefact : trace technique + rapport user narratif"
- Section **"Versions et timeline"** ajoutée (v4.0/v4.1/v4.2 dates+changements)
- **Étape 7** renforcée : warning CRITIQUE que les DEUX artefacts (trace
  + rapport user) doivent exister à la fin du run. Référence bug J1 24/05
  (trace écrite, rapport user oublié → corrigé manuellement plus tard).
- Anti-patterns élargi :
  - Interdit publier réponse user sans trace écrite
  - Interdit terminer le run sans rapport user narratif
  - "Aggregator snippet" anonyme = F4 KO (exiger composition explicite)
  - 2 sources % EXACTEMENT identiques = 1× dans n_eff (défense corrélation)

### `backend/data/nexbet/learnings.md`
- Tableau **"Versions — changelog synthétique"** : v3.3 archivée, v4.0
  pivot 23/05 14h30, v4.1 hotfix 23/05 17h, v4.2 dual artefact 24/05

### `backend/data/nexbet/criteria.md`
- 2 nouvelles sections F4 :
  - **Risques corrélation modèle** : si 2 sources donnent % identique,
    suspecter modèle partagé → 1× dans n_eff
  - **Seuil EV ≥ +2% borderline** : EV pile +2.0% à +2.5% = réduire
    mise de 50% (1.50€ paper au lieu de 3€)

### `backend/data/nexbet/output-format.md`
- Section **"Template snippet WebSearch obligatoire"** avec exemple réel
  J1 (Stats Insider citant Kecmanović 64% via snippet)

### `backend/data/nexbet/method.md`
- Header v4.0 → v4.2
- Note **"Pipeline backend dégradé (mai 2026)"** : The Odds API quota
  épuisé, daily_candidates.py partiel/vide

### `backend/data/nexbet/sources_catalogue.md`
- Header v4.0 → v4.2
- Section **"Risques corrélation modèle"** : liste domaines suspects
  (Dimers+Stats Insider, Lineups+Covers, FanDuel+Action Network)
- Section **"Snippet agrégateur anonyme — INTERDIT"** (cf. bug J1
  Międedović 65% sans provenance)
- Prochain health-check programmé : 23/06/2026 (fin cycle paper)

---

## ⚙️ Vague 4 — Frontend DRY refactor (commit `6ceb13e`)

### Nouveaux fichiers
- **`frontend/src/lib/chartColors.ts`** : palette Recharts centralisée
  (`CHART_COLORS.{positive, negative, brand, brandDark, bg, ...}` +
  `CHART_TOOLTIP_STYLE`)
- **`frontend/src/lib/format.ts`** : `formatSignedAmount(value, suffix,
  decimals)` — centralise le pattern `+/- N.XX suffix`

### Migrations
8 hex codes Recharts hard-codés dans 4 composants → CHART_COLORS :
- `StatsHero.tsx` : trendColor
- `BankrollChart.tsx` : pill label, ligne, tooltip background
- `AnalyzerSport.tsx` : tooltip background, Cell fills, color logic

`fmtSigned` local dans `AnalyzerGeneral.tsx` → import alias
`formatSignedAmount as fmtSigned` (suppression 4 lignes dupliquées).

Build OK. Bundle size identique (string literals constants).

---

## 📊 Résumé global

```
3 nouveaux commits sur main (+ 1 merge):
  866b7a9 — workflow daily candidates 2026-05-24 (auto)
  dd03161 — cleanup obsolète v3.3
  51b5eac — docs + nexbet méthodo v4.2
  6ceb13e — frontend DRY refactor
  d797de2 — merge audit nuit

18 fichiers modifiés/créés/déplacés
+ 365 / -191 LOC nettes

0 régression frontend (build vérifié)
0 régression méthodo (cohérence v4.2 validée par audit)
```

---

## ✅ Ce qui est résolu

| Findings audit | Statut |
|---|---|
| `backtest_2026-05-23.md` v3.3 contamination | ✅ Archivé avec warn |
| README paths cassés `predictions/` | ✅ Corrigés vers `nexbet/decisions/` |
| Paper trading non documenté en racine | ✅ Section dédiée README |
| Palette Cobalt v5 non documentée | ✅ Section dédiée README |
| Versions v4.0/v4.1/v4.2 mélangées | ✅ Unifié partout en v4.2 |
| Changelog NEXBET absent | ✅ Tableau dans learnings.md |
| Auto-checks J1 (rapport user oublié) | ✅ Warning critique étape 7 |
| Aggregator snippet anonyme J1 | ✅ Interdit explicitement v4.2 |
| Corrélation modèle non documentée | ✅ Règle F4 v4.2 ajoutée |
| 8 hex Recharts hard-codés | ✅ `lib/chartColors.ts` |
| `fmtSigned` dupliqué x3 | ✅ `lib/format.ts` |
| `.debug.txt` non gitignored | ✅ Ajouté .gitignore |
| Branche `continuer-LvQAg` mergée | ⚠️ Tentative suppression échouée (réseau) |

---

## ⏳ Reste à faire (non bloquant)

### Priorité basse (next session)
1. **Daily candidates workflow** : le workflow `daily-candidates.yml`
   commit toujours le `.debug.txt`. Soit modifier le workflow YAML pour
   exclure `*.debug.txt` du commit, soit modifier `daily_candidates.py`
   pour ne plus le générer. Pour l'instant le `.gitignore` couvre les
   nouveaux ajouts locaux, mais le workflow peut overrider.

2. **Branches GitHub** : `claude/continuer-LvQAg` mergée à 86/0 peut
   être supprimée via l'UI GitHub (le `git push origin --delete` a
   échoué côté réseau cette nuit). Les 2 autres (`resume-discussion-2QS5m`,
   `sports-betting-platform-i8cXW`) contiennent du code unique non
   mergé → **garder en l'état**, j'y ai pas touché.

3. **Types Outcome / PersonalOutcome** : finding audit frontend
   (Outcome vs PersonalOutcome dupliqués dans `lib/types.ts`). Refactor
   low-priority, n'impacte pas l'utilisateur.

4. **Tooltip styles AnalyzerPeriode/General** : variants inline non
   harmonisés vers `CHART_TOOLTIP_STYLE`. Cosmétique.

5. **Refondre `backend/scripts/README.md`** : audit docs a signalé que
   sa "Phase 3 — à venir" est confuse. Pas urgent.

### Si tu veux pousser plus loin
- **Calibration Brier hebdo** : automatiser le calcul + alerte si Brier
  > 0.235 (seuil paper trading)
- **Notification push** quand l'agent NEXBET termine un run (Web Push)
- **Refresh manifest PWA** avec le nouveau logo cobalt (apple-touch-icon
  déjà fait, mais manifest.json à check)

---

## 📋 État du cycle paper trading

- **Démarrage** : 24/05/2026 00:00 ✅
- **Bankroll virtuel** : 100,00 € (initial, inchangé)
- **Bankroll réel** : 25,00 € GELÉ pendant le cycle
- **J1 24/05** : trace `decisions/2026-05-24.md` écrite, TOP 3 présenté
  (Kecmanović 🟡, Międedović 🟡, Colorado 🟠), **décision user en attente**.
  Aucune position virtuelle créée pour l'instant.
- **Format rapport user v4.2** validé et appliqué dans la conversation.

À ton réveil : si tu veux valider un pick J1 (Kecmanović ou Międedović en
🟡 ACCEPTABLE), l'analyse est prête. Sinon Cas B "skip sans regret" reste
défendable.

---

## ✅ Ce qui marche déjà parfaitement (héritage NIGHT_AUDIT_2026-05-22)

- Auth Supabase (création compte, login, logout, profile auto-créé)
- Schéma DB (4 migrations, 0 warning security)
- Pipeline daily candidates auto (workflow GH Actions — quotidien 06h UTC)
- App PWA responsive iPhone/desktop
- Picks history avec combinés détaillés
- Premium gating sur `/today`
- Onboarding 3 slides au premier login
- i18n FR/EN parfaitement alignée (636 clés)
- Palette Cobalt v5 + logo intégrés partout
- Méthodologie NEXBET v4.2 cohérente et auditée
- Trace JOUR par jour dans `decisions/<date>.md` (audit-grade)

---

Bonne matinée ☀️ — café au réveil et tu décides de la position J1.
