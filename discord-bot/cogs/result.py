"""
/result — note manuelle d'un outcome de pick paper (admin only).

Permet à l'admin du serveur de poster un message annonçant qu'un pick
a été résolu (WIN/LOSS/VOID). N'écrit pas dans paper_trading_log.md
(cette responsabilité reste à l'agent NEXBET côté backend) — juste un
relais Discord pour communication communauté.
"""

import discord
from discord import app_commands
from discord.ext import commands

from lib.colors import color_for_outcome


class ResultCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="result",
        description="Annonce le résultat d'un pick NEXBET (admin only)",
    )
    @app_commands.describe(
        pick="Description courte du pick (ex: 'Kecmanović ML RG R1')",
        outcome="Résultat",
        profit_eur="Gain/perte en € (signé : +2.34 ou -3.00)",
    )
    @app_commands.choices(
        outcome=[
            app_commands.Choice(name="🟢 Win", value="win"),
            app_commands.Choice(name="🔴 Loss", value="loss"),
            app_commands.Choice(name="⚪ Void (remboursé)", value="void"),
        ]
    )
    @app_commands.default_permissions(administrator=True)
    async def result(
        self,
        interaction: discord.Interaction,
        pick: str,
        outcome: app_commands.Choice[str],
        profit_eur: float,
    ):
        color = color_for_outcome(outcome.value)
        emoji = {"win": "🟢", "loss": "🔴", "void": "⚪"}[outcome.value]
        sign = "+" if profit_eur >= 0 else ""

        embed = discord.Embed(
            title=f"{emoji} Outcome — {pick}",
            color=color,
        )
        embed.add_field(name="Résultat", value=outcome.name, inline=True)
        embed.add_field(
            name="Gain/Perte",
            value=f"**{sign}{profit_eur:.2f} €**",
            inline=True,
        )
        embed.set_footer(
            text=f"Annoncé par {interaction.user.display_name} • NEXBET v4.3"
        )

        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(ResultCog(bot))
