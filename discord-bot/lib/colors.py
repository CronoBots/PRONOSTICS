"""
Palette de couleurs Discord embeds — alignée sur frontend Cobalt v5.

Discord prend des entiers (hex sans le #). Utilisé par tous les cogs
pour cohérence visuelle avec l'app web NEXBET.
"""

# Brand cobalt (couleur signature du logo)
COBALT = 0x2A4BFA
COBALT_DARK = 0x152082

# Sémantique gain/perte (universelle)
GREEN = 0x10D9A3
GREEN_DIM = 0x0FB088
RED = 0xFF4D6D
GOLD = 0xFCD34D

# Neutres
WHITE = 0xFFFFFF
BLACK = 0x0A0B12
GRAY = 0x6B7280


def color_for_verdict(verdict: str) -> int:
    """Map verdict NEXBET (🟢/🟡/🟠/🔴) → couleur Discord embed."""
    v = verdict.lower()
    if "recommand" in v or "🟢" in v:
        return GREEN
    if "acceptable" in v or "🟡" in v:
        return GOLD
    if "borderline" in v or "🟠" in v:
        return 0xFF8C42  # orange
    if "insuffisant" in v or "🔴" in v:
        return RED
    return COBALT


def color_for_outcome(outcome: str) -> int:
    """Map outcome (win/loss/pending/void) → couleur Discord embed."""
    o = outcome.lower()
    if o == "win":
        return GREEN
    if o == "loss":
        return RED
    if o == "void" or o == "refunded":
        return GRAY
    return COBALT  # pending = cobalt brand
