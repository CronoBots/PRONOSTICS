# Dockerfile pour le bot Discord NXBT sur Fly.io.
# Python 3.12 slim = ~50MB base, image finale ~80MB après pip install.

FROM python:3.12-slim

WORKDIR /app

# Copie requirements en premier pour profiter du cache Docker layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie le reste du code
COPY . .

# Pas de port exposé : le bot Discord fait du websocket sortant uniquement
# (pas de serveur HTTP entrant à exposer)

CMD ["python", "bot.py"]
