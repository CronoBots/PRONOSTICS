"""
/bankroll — état du bankroll virtuel paper trading.

Fetch paper_trading_log.md, parse les positions et calcule le bankroll
actuel. Affiche aussi le bankroll réel gelé (info contextuelle).
"""

import re

import discord
from discord import app_commands
from discord.ext import commands

from lib.colors import COBALT, GREEN, RED, color_for_outcome
from lib.nexbet_data import get_paper_log


def parse_bankroll(log_md: str) -> tuple[float, float, int, int, int]:
    """
    Parse paper_trading_log.md pour extraire :
    (bankroll_actuel, bankroll_initial, n_total, n_win, n_loss)

    Format JSON dans le markdown : bloc ```json { ... } ``` par position.
    """
    initial = 100.00
    # Cherche "bankroll_virtual_before" et "bankroll_virtual_after" dans les blocs JSON
    befores = re.findall(r'"bankroll_virtual_before"\s*:\s*([\d.]+)', log_md or "")
    afters = re.findall(
        r'"bankroll_virtual_after"\s*:\s*([\d.]+|null)', log_md or ""
    )

    if not befores:
        return initial, initial, 0, 0, 0

    # Bankroll actuel = dernier "after" non-null, sinon dernier "before"
    current = initial
    for a in afters:
        if a != "null":
            current = float(a)

    n_win = len(re.findall(r'"outcome"\s*:\s*"win"', log_md or ""))
    n_loss = len(re.findall(r'"outcome"\s*:\s*"loss"', log_md or ""))
    n_total = len(befores)

    return current, initial, n_total, n_win, n_loss


class BankrollCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="bankroll",
        description="État du bankroll virtuel paper trading NEXBET (100€ initial)",
    )
    async def bankroll(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)

        log_md = await get_paper_log()
        current, initial, n_total, n_win, n_loss = parse_bankroll(log_md or "")

        progression = ((current / initial) - 1) * 100
        color = GREEN if current >= initial else (RED if current < initial else COBALT)
        sign = "+" if progression >= 0 else ""

        embed = discord.Embed(
            title="💰 Bankroll Virtuel NEXBET",
            description=(
                f"**Cycle paper trading actif** (24/05 → 23/06/2026)\n"
                f"Bankroll réel **25,00 €** gelé pendant le cycle."
            ),
            color=color,
        )
        embed.add_field(
            name="Bankroll actuel",
            value=f"**{current:.2f} €**",
            inline=True,
        )
        embed.add_field(
            name="Initial",
            value=f"{initial:.2f} €",
            inline=True,
        )
        embed.add_field(
            name="Progression",
            value=f"{sign}{progression:.2f}%",
            inline=True,
        )
        embed.add_field(
            name="Positions",
            value=f"**{n_total}** placée(s)",
            inline=True,
        )
        embed.add_field(
            name="Gagnées",
            value=f"🟢 {n_win}",
            inline=True,
        )
        embed.add_field(
            name="Perdues",
            value=f"🔴 {n_loss}",
            inline=True,
        )
        embed.set_footer(text="NEXBET v4.3 • Source: paper_trading_log.md")

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(BankrollCog(bot))
