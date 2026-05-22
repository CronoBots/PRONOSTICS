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

## 2026-05-22 — ❌ Combiné Ruud + Olympiakos (PERDU sur Ruud)

### Le pick
- Combiné 2 jambes BOOSTÉ bwin : Ruud (Geneva SF) @ 1,22 + Olympiakos (Euroleague F4 SF) @ 1,42 = cote boostée 2,249
- Mise 8,63€, EV +20,6%, proba combinée 53,6%
- Résultat : **Navone d. Ruud** en demi-finale Geneva → combiné perdu sur la 1ère jambe

### Pourquoi c'était DÉFAVORABLE (analyse a posteriori)
- **Facteur sous-pondéré : calendrier Grand Chelem.** Roland Garros démarrait le **dimanche 24/05**, soit 2 jours après cette SF Geneva. Pour un joueur top 15 ATP comme Ruud (2× finaliste RG), le titre Geneva 250 a une valeur **moindre** que le risque de blessure ou de fatigue avant le Grand Chelem.
- Le risque était **identifié** dans le pick (Risque #1 : "fatigue cumulée + Roland Garros qui arrive dimanche → possibilité de match en mode économie") mais pas suffisamment **pricé** dans notre proba (estim 80% → réelle plus proche de 65-70%).
- Mariano Navone, lui, n'avait AUCUN intérêt à économiser : il n'est PAS dans le main draw Roland Garros (rang 44 ATP), donc Geneva = son tournoi le plus important du printemps. Asymétrie de motivation totalement sous-estimée.
- H2H Ruud vs Navone (1-0 sur dur) n'était PAS un indicateur valide pour clay + contexte Grand Slam.

### Robustesse du process
- ✅ Cartographie exhaustive faite (22 ligues/tournois balayés)
- ✅ Sources Tier 1 + 2 consultées (Dimers, Last Word, ATP Tour)
- ✅ Risque #1 documenté dans le pick (fatigue + RG)
- ❌ **Risque pas suffisamment pricé** : on a documenté le risque mais on l'a quand même fait, parce que la cote boostée 2,249 nous donnait +EV même à 53,6%
- ❌ **Asymétrie de motivation** : on a comparé les niveaux mais pas les enjeux relatifs. Navone joue sa saison, Ruud joue une mise en jambe.

### Leçons actionnables (à intégrer à METHODOLOGY.md)

**🔑 Règle "Tournoi warm-up avant Grand Chelem" :**
- Pour les SF/F de tournois ATP/WTA 250 dans les 7 jours précédant un Grand Chelem (Roland Garros, Wimbledon, US Open, Australian Open) :
  - Si **favori est top 20 ET dans le main draw** du Grand Chelem suivant → **soustraire 10-15%** de la proba implicite "modèle"
  - Si **outsider n'est PAS dans le main draw** (top 100+ classement, ou qualif uniquement) → **ajouter 5-10%** de proba à l'outsider (motivation maximale)
  - Si **les 2 joueurs sont en main draw GS** → pas d'ajustement (motivation équivalente)

**🔑 Règle "Asymétrie de motivation" plus large :**
- Avant de pricer un favori, demander : "Quel est l'enjeu du match pour chacun des 2 joueurs/équipes ?"
  - Match de saison régulière dans une longue série vs match couperet → asymétrie
  - Tournoi tier 2 pour favori vs tournoi tier 1 pour outsider → asymétrie inverse
  - Joueur fatigué de tournoi précédent vs joueur frais → ajustement physique

**🔑 Règle "Boost ≠ permission de prendre plus de risque" :**
- Le boost bookmaker augmente le rendement, pas la proba de gain
- Tentation : "EV élevée → on prend même à 53% proba combinée"
- Réalité : 46% de chance de perdre = perdre 1 fois sur 2 sur la durée. Pas confortable pour un combiné "safe pick"
- **Nouveau seuil minimum** : combinés à proba ≥ 60% uniquement, même si boost rend l'EV séduisante

### Action concrète pour la prochaine fois
1. **Avant chaque pick tennis** : vérifier le calendrier ATP/WTA des Grands Chelems sous 7 jours
2. **Avant chaque combiné** : check les 2 risques d'asymétrie de motivation
3. **Pour boost bwin** : appliquer un facteur de prudence (réduire la proba estimée de 5% pour compenser le biais "l'EV nous a séduits")

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
