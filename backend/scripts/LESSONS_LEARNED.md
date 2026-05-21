# 📝 Lessons learned — analyse post-mortem des picks

> Journal des erreurs de méthodo et des leçons généralisables.
> Mis à jour après chaque défaite (et après chaque victoire chanceuse).

---

## 2026-05-20 — ❌ Detroit Tigers vs Cleveland Guardians (perdu)

### Le pick
- Detroit Tigers ML @ cote boostée 2,73 (cote normale 2,10)
- Proba estimée : 55%
- Mise : 5€
- Résultat : Cleveland gagne 3-2 en 10 manches

### Ce qui s'est passé
- Tanner Bibee (Cleveland, "lanceur road struggle") a en réalité dominé 8 IP, 1 ER, 4 hits
- Detroit a eu l'occasion en 9e (1ers et 2e, 0 out) → 3 strikeouts consécutifs
- Angel Martínez (Cleveland) triple en 10e vs Tyler Holton

### Scénario réalisé
- Variante de "Bibee a un soir 'on'" — risque #1 dans ma liste mais sous-pondéré

### Biais identifiés
1. **Confirmation bias** : j'ai construit une narrative "Bibee road struggles" et cherché stats confirmantes
2. **Anchoring sur cote boostée** : 2,73 boost a vendu le pick avant l'analyse
3. **Cherry-picking** : focus sur UNE stat (ERA 4,15 road) sans peser le talent global (Bibee top 30 MLB starter)
4. **Narrative fallacy** : "Detroit reçoit + Cleveland en road trip" = histoire cohérente mais peu prédictive

### Info manquante qui aurait changé la décision
- Probabilité conditionnelle "Bibee a une de ses meilleures sorties" = ~25% sur n'importe quel match donné, pas 5% comme j'avais implicitement supposé
- Pas regardé les **FIP/xFIP** de Bibee qui le placent au-dessus de son ERA road (signe que son ERA road était unlucky, pas révélateur)

### Source qui aurait dû être consultée
- **FanGraphs** pour le FIP de Bibee (Tier 2 baseball, je ne l'ai pas ouvert)
- **Baseball Savant Statcast** pour ses vélocités et expected stats

### Règle ajoutée au pipeline
1. ⚠️ **JAMAIS partir d'une narrative** pour ensuite chercher des stats qui la confirment.
   Toujours partir des stats brutes, laisser la conclusion émerger.
2. ⚠️ **Pour MLB picks**, consulter OBLIGATOIREMENT FanGraphs (FIP/xFIP) en plus de l'ERA.
   ERA seul = trompeur sur petits échantillons (10-15 matchs).
3. ⚠️ **Cote boostée ≠ value**. Le booster est marketing, pas un signal. Analyser au prix non-boosté.
4. ⚠️ **Régression à la moyenne** : un lanceur top-30 talent avec ERA road élevé sur 6 matchs est plus
   probable de régresser vers son talent que d'amplifier sa "tendance".

---

## 2026-05-19 — ✅ New York Knicks vs Cleveland Cavaliers (gagné)

### Le pick
- Knicks ML @ cote 2,00
- Proba estimée : 60%
- Résultat : Knicks 115-104 (comeback de -22 en 4Q + OT)

### Pourquoi c'était bon
- Brunson MVP-level confirmé
- MSG home court factor pris en compte
- Knicks ATS record contre les jeunes équipes

### Ce qui était de la chance (post-mortem honnête)
- Le comeback de -22 est extrêmement rare (~5% des cas en NBA playoffs). Sans ce comeback improbable, on perdait
- Le modèle a donné le bon outcome mais pour les mauvaises raisons
- **Leçon** : ne pas sur-extrapoler une victoire chanceuse. Le process était correct, le résultat est partiellement chance

### Règle ajoutée
- Pour les playoffs NBA, intégrer une variance plus haute dans les estimations (les playoff games sont moins prédictibles que la saison régulière)

---

## 2026-05-18 — ✅ San Antonio Spurs vs OKC Thunder G1 (gagné)

### Le pick
- Spurs ML @ cote ~2,70
- Résultat : Spurs 122-115 double OT, Wembanyama 41 pts 24 reb

### Pourquoi c'était bon
- Underdog avec edge identifié (Wembanyama mismatch défensif Holmgren)
- Pris la value bet à cote ≥ 2,00 avec edge réel

### Robustesse
- Process correct, résultat aligné. ✅

---

## 2026-05-17 — ✅ Svitolina vs Gauff finale Rome (gagné)

### Le pick
- Svitolina ML @ cote 2,30
- Résultat : Svitolina 6-4, 6-7, 6-2

### Pourquoi c'était bon
- Spécialiste clay vs joueuse moins à l'aise sur cette surface
- H2H favorable récent (2-0 en 2026 sur dur)
- Forme exceptionnelle (11V/12 sur terre depuis fin avril)

### Robustesse
- Process correct, identification d'un mismatch surface + forme. ✅

---

## 🎯 Méta-leçons (synthèse)

1. **Le process > le résultat** : un pick gagné par chance ne valide pas la méthode. Un pick perdu après bon process est statistiquement attendu.

2. **Garder l'humilité** : sur 100 picks à 75% de proba, on en perd 25. C'est OK. Le drawdown est intrinsèque au métier. Le seul indicateur fiable est la calibration sur 50+ picks.

3. **Diversifier les sources Tier 2** par sport :
   - MLB : FanGraphs + Baseball Savant + Baseball Reference (3 obligatoires)
   - NBA : Basketball Reference + Cleaning The Glass + NBA Stats
   - Tennis : Tennis Abstract + ATP/WTA official + 1 modèle ML
   - Soccer : FBref + Understat + Sofascore

4. **Tests mentaux à chaque pick** :
   - "Si je devais parier contre mon propre pick, quel serait mon meilleur argument ?"
   - "Quelle stat trahirait que je me trompe et que je l'ignore ?"
   - "Sur 10 fois ce match avec petits aléas, combien de fois gagne mon pick vraiment ?"

5. **L'ego est l'ennemi** : si je suis "confiant", je dois me demander pourquoi. La confiance émotionnelle ≠ confiance statistique.

---

*Document mis à jour après chaque pick. Format : leçon par date, méta-leçons en bas.*
