"""
NEXBET Discord Bot — entry point.

Bot de la communauté NEXBET (pronostics sportifs paper trading).
- Commandes slash interactives (/picks, /bankroll, /stats, /result)
- Embeds palette cobalt v5 (cohérent avec l'app web)
- Fetch données depuis GitHub raw (le bot fonctionne partout, repo public)

Setup : cf README.md
"""

import logging
import os
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

# Charge .env (DISCORD_BOT_TOKEN obligatoire)
load_dotenv()

TOKEN = os.getenv("DISCORD_BOT_TOKEN")
if not TOKEN:
    raise RuntimeError(
        "DISCORD_BOT_TOKEN manquant — créer un .env (cf .env.example)"
    )

GUILD_ID = os.getenv("DISCORD_GUILD_ID")  # optional — sync slash commands plus vite si renseigné

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("nexbet")

# Intents minimaux (lecture messages + guilds suffisent pour slash commands)
intents = discord.Intents.default()
intents.message_content = False  # pas besoin sauf si commandes texte legacy
intents.members = True            # pour rôles auto et bienvenue


class NexbetBot(commands.Bot):
    def __init__(self):
        super().__init__(
            command_prefix="!",  # legacy fallback, on utilise principalement slash
            intents=intents,
            description="Bot NEXBET — pronostics sportifs paper trading",
        )

    async def setup_hook(self):
        # Charge tous les cogs du dossier cogs/
        cogs_dir = Path(__file__).parent / "cogs"
        for cog_file in cogs_dir.glob("*.py"):
            if cog_file.stem.startswith("_"):
                continue
            module = f"cogs.{cog_file.stem}"
            try:
                await self.load_extension(module)
                log.info("Cog chargé : %s", module)
            except Exception as e:
                log.error("Erreur cog %s : %s", module, e)

        # Sync slash commands (instantané si GUILD_ID, sinon ~1h global)
        if GUILD_ID:
            guild = discord.Object(id=int(GUILD_ID))
            self.tree.copy_global_to(guild=guild)
            synced = await self.tree.sync(guild=guild)
            log.info("Slash commands sync sur guild %s : %d commandes", GUILD_ID, len(synced))
        else:
            synced = await self.tree.sync()
            log.info("Slash commands sync globalement : %d commandes (propagation ~1h)", len(synced))

    async def on_ready(self):
        log.info("Connecté en tant que %s (id=%s)", self.user, self.user.id)
        log.info("Présent sur %d serveur(s)", len(self.guilds))
        # Status "Watching paper trading"
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="le cycle paper trading 100€",
            )
        )


def main():
    bot = NexbetBot()
    bot.run(TOKEN, log_handler=None)  # on utilise notre propre logging config


if __name__ == "__main__":
    main()
