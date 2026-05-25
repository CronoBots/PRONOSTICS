# NEXBET analyst — Système d'analyse quotidienne

> Agent IA spécialisé qui produit chaque jour LE pick safe value bet
> selon une méthodologie reproductible et évolutive.

## 🎯 Pourquoi ce système

Un agent générique fait sa research from scratch chaque jour, sans
mémoire, donc :
- Risque de rater une opportunité
- Risque de refaire les mêmes erreurs (ex : picker Ruud J-2 avant
  Grand Slam, perdu le 22/05)
- Pas d'amélioration au fil du temps

Le système NEXBET analyst corrige ça avec :
1. **Méthode obligatoire** (`method.md`) → checklist 8 étapes que l'agent
   ne peut pas zapper
2. **Critères stricts** (`criteria.md`) → seuils numériques objectifs
3. **Mémoire long-terme** (`learnings.md`) → patterns + anti-bias qui
   s'enrichissent à chaque pick résolu
4. **Trace d'audit** (`decisions/<date>.md`) → post-mortem possible
   après chaque résultat

## 📂 Structure des fichiers

```
.claude/agents/
  nexbet-analyst.md          # Définition sub-agent + prompt système

backend/data/nexbet/
  README.md                  # ← Ce fichier
  method.md                  # Procédure obligatoire (8 étapes)
  criteria.md                # Filtres F1-F6 + règles de mise
  learnings.md               # Anti-bias + patterns + sources par sport
  output-format.md           # Format JSON strict du pick
  decisions/                 # Trace d'audit quotidienne
    2026-05-23.md
    2026-05-24.md
    ...
```

## 🚀 Comment l'utiliser

### 1. Lancer l'analyse du jour

Dans la conversation Claude Code, dis simplement :
> "Lance l'analyse NEXBET pour aujourd'hui"
> ou
> "Pick d'aujourd'hui ?"
> ou
> "Fais l'analyse du jour"

Claude va automatiquement déléguer au sub-agent `nexbet-analyst` qui :
- Lit les 4 fichiers de doc (method, criteria, learnings, format)
- Consulte les 5 derniers picks de `picks_data.py`
- Fait sa cartographie ≥ 15 matchs
- Filtre, analyse en profondeur le top 5 (3 WebFetch chacun)
- Produit le pick final OU "no pick today"
- Écrit la trace dans `decisions/<date>.md`

### 2. Valider le pick proposé

L'agent te présente 4 blocs :
1. **JSON Pick** (parsable, à insérer dans `picks_data.py`)
2. **Résumé FR 5 lignes** (pour quick read)
3. **Trace de décision** (déjà écrite dans le fichier)
4. **Confidence note** (auto-évaluation)

Tu valides → moi je l'ajoute à `picks_data.py`, regénère
`history.json` + `predictions/<date>.json`, commit et push.

### 3. Après le résultat (lendemain)

Quand le match est terminé, tu me dis l'outcome :
> "Le pick d'hier a gagné" (ou perdu, ou void)

Je :
1. Met à jour `picks_data.py` (outcome + result + score)
2. Regénère `history.json`
3. **Lis la trace `decisions/<date>.md`** + l'outcome
4. **Mets à jour `learnings.md`** :
   - Win → confirme/renforce les patterns identifiés
   - Loss → identifie ce qui a failli + ajoute anti-bias si pattern
     reproductible

C'est cette boucle qui fait que l'agent s'améliore au fil du temps.

## ⚙️ Architecture technique

### Définition du sub-agent

`.claude/agents/nexbet-analyst.md` utilise le format Claude Code
sub-agent :
- Frontmatter YAML : `name`, `description`, `tools`, `model: opus`
- Body : prompt système complet de l'agent

Le harness Claude Code scanne ce fichier au démarrage et expose
l'agent comme `subagent_type: nexbet-analyst` dans le `Agent` tool.

### Outils autorisés

L'agent a accès à : `WebSearch`, `WebFetch`, `Read`, `Write`, `Edit`,
`Bash`, `Grep`, `Glob`.

Il N'A PAS accès à : git push (volontairement — je garde la main sur
ce qui est commité).

### Model

`model: opus` — on utilise le modèle le plus capable car l'enjeu
financier est réel et la précision compte.

## 🧠 Comment learnings.md évolue

Au fil des picks, learnings.md accumule :

### Anti-bias rules (AB-X)
Règles dures : tout pick qui matche un AB est rejeté automatiquement.
Exemple confirmé : AB-1 "Top-10 ATP J-2 avant Grand Slam" (validé par
loss Ruud 22/05).

### Patterns confirmés (PC-X)
Patterns qui boostent la confiance. Exemple : PC-1 "Double favoris à
domicile combiné boosté bwin" (validé par win Ruud+Knicks 21/05).

### Sources fiables par sport
Liste classée par fiabilité prouvée. Évolue selon les écarts
observation vs prédiction.

### Historique narratif
Synthèse de chaque pick avec sa leçon clé.

## 📊 Métriques d'évolution

Au bout d'1 mois, on devrait observer :
- Nombre d'AB / PC dans learnings.md (croissance)
- Taux de succès des picks (cible : maintenir ≥ 65%)
- Réduction du nombre de "no pick today" (l'agent devient meilleur à
  identifier des picks valides)
- Réduction des picks marginaux (l'agent rejette plus vite les EV
  faibles)

## 🛠️ Maintenance

### Cadence
- **Quotidien** : lance l'analyse, valide, mets à jour outcome le
  lendemain
- **Hebdomadaire** : relis les patterns ajoutés, vérifie cohérence
- **Mensuel** : audit global, supprime patterns obsolètes, fusionne
  similaires

### Quand modifier method.md / criteria.md
- Quand tu identifies un nouveau filtre indispensable (ex : "vérifier
  forfait keeper de but" pour le foot)
- Quand un seuil s'avère trop strict ou trop laxiste (ex : abaisser
  proba min à 0.58 si trop de "no pick today")
- Quand tu ajoutes un nouveau sport au scope

### Quand modifier le sub-agent
- Quand on change la méthode (rare — la méthode doit être stable)
- Quand on ajoute / retire un outil
- Quand on change le model (sonnet ↔ opus selon les coûts)

## ❓ FAQ

**Q : L'agent peut-il se tromper sur la cote bwin actuelle ?**
R : Oui, surtout si la line a bougé après l'analyse. Toujours vérifier
la cote sur bwin AU MOMENT du placement réel du pari.

**Q : Que faire si l'agent dit "no pick today" mais qu'on veut absolument
parier ?**
R : Ne PAS forcer. Le "no pick today" est un signal valide. Si on parie
quand même, on est en pur gambling — hors profil NEXBET.

**Q : Puis-je modifier learnings.md manuellement ?**
R : Oui, mais ajouter une date de validation + référence (pick précédent
ou observation). Ne pas inventer des patterns sans evidence.

**Q : Que faire si la trace de décision révèle qu'un pick aurait dû être
rejeté ?**
R : Add l'AB correspondant dans learnings.md avec date et référence
au cas. C'est exactement comme ça que le système s'améliore.

**Q : Le sub-agent peut-il prendre une décision sans validation user ?**
R : Non. Il produit toujours le pick + la trace + la rationale, mais
moi (Claude principal) je n'écris jamais dans `picks_data.py` ni ne
commite avant ta validation explicite.
