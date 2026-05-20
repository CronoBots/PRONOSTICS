"""Template Python à copier-coller pour chaque nouveau pick.

Workflow :
  1. Lire ANALYSIS_FRAMEWORK.md (checklist complète)
  2. Copier le dict ci-dessous dans picks_data.py PICKS
  3. Remplir TOUTES les sections A-N (laisser vide les sections NA)
  4. Vérifier la check-list de fin du framework
  5. python scripts/build_history.py
  6. git commit && git push

Cible : 45-60 points d'analyse, structurés en 10-12 sections nommées.
"""

PICK_TEMPLATE = {
    "date": "YYYY-MM-DD",
    "sport": "football | basketball | tennis | mlb | nhl | nfl",
    "league": "Nom complet de la compétition",
    "home_team": "Équipe domicile (ou Joueur 1 en tennis)",
    "away_team": "Équipe visiteur (ou Joueur 2 en tennis)",
    "kickoff": "YYYY-MM-DDTHH:MM:SS+00:00",  # UTC
    "pick": "Équipe ou joueur sur lequel on parie",
    "odds": 2.00,                # cote décimale (idéalement ≥ 2.00)
    "model_probability": 0.55,   # notre estimation (0-1)
    "rationale": [
        # === A. LE MATCH ===
        "##🎯 Le match",
        "<Sport + compétition + format>",
        "<Date + heure UTC + équivalent heure FR>",
        "<Stade + capacité>",
        "<Enjeu pour les deux équipes>",
        "<Pari placé : '<équipe> vainqueur' ou autre>",

        # === B. BILAN SAISON ===
        "##📊 Bilan saison",
        "<Équipe A> : <V-D-N>, <classement>",
        "<Équipe B> : <V-D-N>, <classement>",
        "<Bilan domicile équipe A> vs <bilan road équipe B>",
        "<Différentiel points/buts récent>",

        # === C. STARS & EFFECTIF ===
        "##⭐ Stars / lineups",
        "<Star A> : <KPIs récents>, <statut santé>",
        "<Star B> : <KPIs récents>, <statut santé>",
        "<Lineup attendue équipe A>",
        "<Absences importantes équipe B>",

        # === D. STATS AVANCÉES ===
        "##💪 Stats avancées (à adapter selon sport)",
        "<Stat sport-spécifique 1 — Net Rating / ERA road / break points %>",
        "<Stat sport-spécifique 2>",
        "<Stat sport-spécifique 3>",
        "<Stat sport-spécifique 4>",

        # === E. H2H ===
        "##🤝 Head-to-Head",
        "<H2H carrière entre les 2>",
        "<H2H récent — 5 derniers>",
        "<H2H sur cette surface/stade/contexte>",
        "<Pattern identifié>",

        # === F. FORME RÉCENTE ===
        "##🔥 Forme récente",
        "<Équipe A — 5 derniers résultats>",
        "<Équipe B — 5 derniers résultats>",
        "<Tendance hausse/baisse>",

        # === G. REPOS & FATIGUE ===
        "##🛌 Repos & fatigue",
        "<Jours de repos équipe A>",
        "<Jours de repos équipe B>",
        "<Voyage / fuseau / altitude si pertinent>",
        "<Différentiel repos en points>",

        # === H. PSYCHOLOGIE ===
        "##🧠 Facteurs psychologiques",
        "<Motivation équipe A>",
        "<Pression / enjeu équipe B>",
        "<Historique 'big games' pour chacun>",
        "<Revenge / anniversary game ?>",

        # === I. CONDITIONS ===
        "##🌦️ Conditions",
        "<Météo si outdoor>",
        "<Heure du match (impact lumière, audience)>",
        "<Stade / pelouse / parquet>",
        "<Arbitre + historique>",

        # === J. MARCHÉ & COTES ===
        "##💰 Marché & cote",
        "<Cote moneyline + spread + total>",
        "<Line movement depuis l'ouverture>",
        "<Money split — public betting>",
        "<Sharp money signals>",

        # === K. CONSENSUS TIERS ===
        "##🌐 Consensus analystes",
        "<Modèle tiers 1 — FanGraphs / 538 / BPI>",
        "<Modèle tiers 2>",
        "<Expert pick — Lineups grade, Pickdawgz lock>",
        "<Sentiment Twitter sharp tipsters>",

        # === L. NOTRE PROBABILITÉ ===
        "##🧮 Notre probabilité & edge",
        "<Notre estimation chiffrée : XX%>",
        "<Proba implicite cote : XX% (= 1/cote)>",
        "<Edge en points : XX>",
        "<EV calculée : +XX%>",

        # === M. MISE & GESTION ===
        "##💵 Mise & gestion",
        "<Mise placée : X€ (Y% bankroll)>",
        "<Kelly recommandé : X€>",
        "<Gain potentiel net : +X€>",
        "<Perte potentielle : -X€>",

        # === N. RISQUES ===
        "##⚠️ Risques honnêtes",
        "<Scénario de défaite le plus probable>",
        "<Variance du sport>",
        "<Pourquoi le marché peut avoir raison>",
        "<Faiblesse de notre analyse>",
        "<Confidence rating : Low / Medium / High>",
    ],
    "sources": [
        "https://...",          # source officielle (ligue, fédération)
        "https://...",          # source analyse pro (Lineups, Pickdawgz)
        "https://...",          # source data (FanGraphs, BR, Tennis Abstract)
    ],
    "stake": 5.0,               # à ajuster selon Kelly
    "outcome": "pending",
}


# Template "result" à ajouter après le match :
RESULT_TEMPLATE = {
    "score_home": 0,            # ou string "6-4 6-2" en tennis
    "score_away": 0,
    "score_text": "Équipe X gagne A-B",
    "summary": "Narration courte du match (2-3 phrases)",
    "bet_outcome": "✅ <équipe>... — pari gagné, gain net +X€  |  ❌ pari perdu, perte 5€",
}
