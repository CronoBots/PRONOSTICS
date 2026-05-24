"""
/stats — stats globales NEXBET (depuis history.json réel).

Affiche win rate, ROI, drawdown max, etc. de l'historique complet
(picks réels résolus, pas seulement paper trading).
"""

import discord
from discord import app_commands
from discord.ext import commands

from lib.colors import COBALT, GREEN, RED
from lib.nexbet_data import get_history


class StatsCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="stats",
        description="Stats globales NΞXBΞT — win rate, ROI, drawdown, bankroll",
    )
    async def stats(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)

        history = await get_history()
        if not history or "stats" not in history:
            embed = discord.Embed(
                title="📊 Stats indisponibles",
                description="Impossible de fetch `backend/data/history.json` depuis GitHub.",
                color=RED,
            )
            await interaction.followup.send(embed=embed)
            return

        s = history["stats"]
        bankroll_positive = s["current_bankroll"] >= s["starting_bankroll"]
        color = GREEN if bankroll_positive else RED

        embed = discord.Embed(
            title="📊 Stats NΞXBΞT — Historique complet",
            description="Picks résolus depuis le démarrage de la plateforme.",
            color=color,
        )

        # KPI essentiels
        embed.add_field(
            name="💰 Bankroll",
            value=f"**{s['current_bankroll']:.2f} €** (départ {s['starting_bankroll']:.2f} €)",
            inline=False,
        )
        embed.add_field(
            name="📈 Progression",
            value=f"**{s['progression_percent']:+.2f}%**",
            inline=True,
        )
        embed.add_field(
            name="🎯 Réussite",
            value=f"**{s['win_rate']:.2f}%**",
            inline=True,
        )
        embed.add_field(
            name="💹 ROI",
            value=f"**{s['roi_percent']:+.2f}%**",
            inline=True,
        )

        # Détails
        embed.add_field(
            name="Paris",
            value=f"{s['total_picks']} total • 🟢 {s['won']} • 🔴 {s['lost']} • ⏳ {s['pending']}",
            inline=False,
        )
        embed.add_field(
            name="Bénéfice / Drawdown",
            value=f"**{s['profit']:+.2f} €** • DD max {s['drawdown_max']:.2f} €",
            inline=True,
        )
        embed.add_field(
            name="Cotes",
            value=f"Moy. {s['average_odds']:.2f} • Max gagnée {s.get('max_odds_won', 0):.2f}",
            inline=True,
        )
        embed.add_field(
            name="Série max",
            value=f"🔥 +{s.get('best_streak', 0)} • 🥶 {s.get('worst_streak', 0)}",
            inline=True,
        )

        embed.set_footer(text="NΞXBΞT v4.3 • Source: history.json")
        embed.url = "https://cronobots.github.io/PRONOSTICS/stats"

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(StatsCog(bot))
