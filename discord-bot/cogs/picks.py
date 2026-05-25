"""
/picks — affiche le rapport NEXBET du jour.

Fetch la trace decisions/<today>.md depuis GitHub et affiche un embed
résumé avec les candidats du jour. Si l'agent n'a pas encore tourné,
indique le statut.
"""

import discord
from discord import app_commands
from discord.ext import commands

from lib.colors import COBALT, GRAY
from lib.nexbet_data import get_latest_decision


class PicksCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="picks",
        description="Affiche le rapport NEXBET du jour (TOP 3 candidats analysés)",
    )
    async def picks(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)

        trace = await get_latest_decision()
        if not trace:
            embed = discord.Embed(
                title="🛌 Pas encore d'analyse aujourd'hui",
                description=(
                    "L'agent NEXBET n'a pas encore tourné pour ce jour.\n\n"
                    "Lance `/nexbet-analyst` côté Claude Code ou attends "
                    "le run automatique du matin."
                ),
                color=GRAY,
            )
            await interaction.followup.send(embed=embed)
            return

        # Extrait les sections clés de la trace markdown (heuristique simple)
        title_line = next(
            (l for l in trace.splitlines() if l.startswith("# ")),
            "# Trace NEXBET du jour",
        )
        title = title_line.lstrip("# ").strip()

        # Premier paragraphe après le titre = résumé
        lines = trace.splitlines()
        summary_lines: list[str] = []
        capture = False
        for line in lines:
            if line.startswith("# "):
                capture = True
                continue
            if capture:
                if line.startswith("#") or line.startswith("---"):
                    break
                if line.strip():
                    summary_lines.append(line.strip())
        summary = " ".join(summary_lines)[:500] or "Trace disponible — voir détails."

        embed = discord.Embed(
            title=title,
            description=summary,
            color=COBALT,
            url=f"https://github.com/CronoBots/PRONOSTICS/blob/main/backend/data/nexbet/decisions/{title.split('—')[-1].strip().lower().replace(' ', '-')}.md"
            if "—" in title else None,
        )
        embed.set_footer(text="NEXBET v4.3 • Paper trading 100€ virtuel")
        embed.add_field(
            name="📂 Trace complète",
            value="`backend/data/nexbet/decisions/<date>.md` sur le repo",
            inline=False,
        )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(PicksCog(bot))
