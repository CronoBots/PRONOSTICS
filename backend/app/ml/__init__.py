"""Hooks pour modèles ML à brancher quand suffisamment d'historique est constitué.

L'idée : chaque modèle ML expose la même interface que les engines heuristiques.
Quand un modèle ML est jugé prêt, on l'enregistre dans `app/engines/__init__.py`
à la place (ou en ensemble avec) l'heuristique du sport correspondant.

Pistes :
- Football : Poisson bivarié pour estimer P(home_goals, away_goals)
- Tennis   : Elo glissant par surface + différentiel de service
- NBA      : régression Ridge sur features avancées (PER, off/def rating)
- NFL/MLB/NHL : Elo + ajustement starter (QB / pitcher / goalie)
"""
