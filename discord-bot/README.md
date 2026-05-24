# 🤖 NΞXBΞT Discord Bot

Bot Discord pour la communauté NEXBET (pronostics sportifs paper trading).

## ✨ Fonctionnalités v1 (MVP)

| Commande | Description |
|---|---|
| `/picks` | Affiche le rapport NEXBET du jour (TOP 3 candidats) |
| `/bankroll` | État du bankroll virtuel paper trading (100€ initial) |
| `/stats` | Stats globales — win rate, ROI, drawdown, bankroll historique |
| `/result` | Annonce le résultat d'un pick (admin only) |

Toutes les commandes utilisent des embeds **cobalt v5** (cohérent avec l'app web).

## 🆔 Identifiants du bot NΞXBΞT (publics)

- **Application ID** : `1508193166635958332`
- **Public Key** : `63b44e092bff944881c32565701bbe800861578adb5593cdf6981165c17f53a1`
- **Bot Token** : 🔒 SECRET — configurer dans `.env` ou Railway env vars, jamais commit

## 🔗 URLs d'invitation prêtes à l'emploi

Choisis selon les permissions voulues :

### 🟢 MVP (lecture seule + slash commands)
Permissions : Send Messages, Embed Links, Read Message History, Use Slash Commands, Add Reactions
```
https://discord.com/api/oauth2/authorize?client_id=1508193166635958332&scope=bot+applications.commands&permissions=84032
```

### 🟡 Modération communauté (recommandé pour public)
Ajoute : Manage Messages, Manage Roles, Moderate Members (timeout)
```
https://discord.com/api/oauth2/authorize?client_id=1508193166635958332&scope=bot+applications.commands&permissions=1099780063040
```

### 🔴 Admin complet (à utiliser uniquement pour tests)
```
https://discord.com/api/oauth2/authorize?client_id=1508193166635958332&scope=bot+applications.commands&permissions=8
```

Clique l'URL → choisis ton serveur → **Authorize**.

## 🚀 Setup en 5 minutes

### 1. Créer le bot sur Discord Developer Portal (si pas déjà fait)

1. https://discord.com/developers/applications → **New Application** → "NEXBET Bot"
2. Onglet **Bot** → **Reset Token** → copier le token (à mettre dans `.env`)
3. **Privileged Gateway Intents** → activer **Server Members Intent**
4. Inviter le bot via une des URLs ci-dessus

### 2. Installation locale (pour tester)

```bash
cd discord-bot
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Éditer .env : coller ton DISCORD_BOT_TOKEN
# (Optionnel) DISCORD_GUILD_ID = ID de ton serveur (clic droit serveur → "Copy Server ID" en mode dev)

python bot.py
```

Le bot devrait afficher `Connecté en tant que NEXBET Bot#XXXX`.

Test : dans ton serveur, tape `/picks` → tu dois voir le bot autocomplete.

### 3. Déploiement 24/7 sur Railway (gratuit)

Le bot doit tourner en continu pour répondre aux commandes. Options :

#### Option A — Fly.io (recommandé, free tier 3 VMs)

**Pré-requis** : installer `flyctl` CLI sur ton Mac

```bash
brew install flyctl
flyctl auth signup       # créer un compte (CB demandée pour anti-abus, $0 tant que free tier)
# OU si déjà un compte :
flyctl auth login
```

**Déploiement (depuis le dossier `discord-bot/`)** :

```bash
cd discord-bot

# 1. Initialise l'app Fly.io (utilise le fly.toml existant)
flyctl launch --no-deploy --copy-config --name nexbet-bot --region cdg

# 2. Injecte le bot token en secret (NE jamais commit en clair)
flyctl secrets set DISCORD_BOT_TOKEN=ton_nouveau_token_ici

# 3. Deploy
flyctl deploy

# 4. Vérifie les logs
flyctl logs
```

Tu dois voir : `Connecté en tant que NEXBET Bot#XXXX`.

**Ressources free tier** : 3 VMs shared-cpu-1x 256MB. Le bot utilise ~80MB. Largement dans la marge.

**Commands utiles** :
- `flyctl status` — état du bot
- `flyctl logs` — logs en live
- `flyctl secrets list` — vars d'env
- `flyctl deploy` — redéployer après modif code (git push n'auto-deploy pas)
- `flyctl ssh console` — shell dans la VM

#### Option B — Self-host sur ton Mac (fallback no-CB)

Si tu ne veux pas créer de compte Fly.io, tu peux faire tourner le bot
directement sur ton Mac via `tmux` (persiste si tu fermes le terminal) :

```bash
git clone https://github.com/CronoBots/PRONOSTICS.git
cd PRONOSTICS/discord-bot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Crée .env avec ton bot token
cp .env.example .env
# Édite .env : remplis DISCORD_BOT_TOKEN

# Lance dans tmux (survit à la fermeture du terminal)
brew install tmux  # si pas installé
tmux new -s nexbet-bot
python bot.py

# Détacher tmux : Ctrl+B puis D
# Réattacher plus tard : tmux attach -t nexbet-bot
# Stopper : tmux kill-session -t nexbet-bot
```

⚠️ **Le Mac doit rester allumé et connecté à internet**. Si tu le mets
en veille, le bot se déconnecte.

#### Option C — Replit (free tier, mais doit être pingé pour rester actif)
1. Importer le repo
2. Variables d'env : `DISCORD_BOT_TOKEN`
3. Run : `cd discord-bot && python bot.py`
4. Setup UptimeRobot pour ping toutes les 5 min

## 🏗 Architecture

```
discord-bot/
├── bot.py              # Entry point (loading cogs, sync slash commands)
├── cogs/
│   ├── picks.py        # /picks
│   ├── bankroll.py     # /bankroll
│   ├── stats.py        # /stats
│   └── result.py       # /result (admin)
├── lib/
│   ├── colors.py       # Palette cobalt v5 + helpers verdict/outcome
│   └── nexbet_data.py  # Fetch GitHub raw avec cache 5 min
├── requirements.txt    # discord.py, dotenv, aiohttp
├── .env.example        # Template (à copier en .env)
├── Procfile            # Railway worker
└── runtime.txt         # Python 3.12 (pour Heroku-like)
```

## 🔮 Roadmap v2

- [ ] **Webhook auto NEXBET** : poste le rapport user narratif dans `#pick-du-jour` dès que l'agent termine
- [ ] **Notifications outcome** : poste auto quand un pick devient win/loss
- [ ] **Carte image bankroll** : `/stats` génère un PNG avec graph (Pillow + matplotlib)
- [ ] **Setup serveur auto** : commande admin `/setup` qui crée toute la structure (channels, rôles, AutoMod)
- [ ] **Système niveaux/XP** : leveling pour engagement communauté
- [ ] **Rôles premium auto** : gating via Stripe webhook (quand prêt)

## 🐛 Troubleshooting

**Le bot se connecte mais les commandes slash n'apparaissent pas**
- Sans `DISCORD_GUILD_ID`, la sync globale prend ~1h. Définir GUILD_ID pour sync instantané.
- Vérifier que le bot a la permission `applications.commands` à l'invitation.

**`MissingPermissions` sur `/result`**
- Cette commande est restreinte aux admins par défaut. Modifier `@app_commands.default_permissions(administrator=True)` dans `cogs/result.py` si besoin.

**Le bot ne fetch pas les données**
- Vérifier que le repo `CronoBots/PRONOSTICS` est public (sinon ajouter `GITHUB_TOKEN`).
- Le cache est 5 min — utiliser `clear_cache()` ou redémarrer pour forcer refresh.
