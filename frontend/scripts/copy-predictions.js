#!/usr/bin/env node
/**
 * Copie backend/data/predictions/*.json vers frontend/public/data/predictions/.
 *
 * Exécuté automatiquement avant `next build` (script `prebuild` du package.json)
 * pour que les fichiers soient inclus dans l'export statique.
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "../../backend/data/predictions");
const DEST = path.resolve(__dirname, "../public/data/predictions");

function copy() {
  if (!fs.existsSync(SRC)) {
    console.warn(`[copy-predictions] Aucun dossier source trouvé : ${SRC}`);
    fs.mkdirSync(DEST, { recursive: true });
    return;
  }

  fs.mkdirSync(DEST, { recursive: true });
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
  }

  // Génère un index.json listant les dates disponibles
  const dates = files.map((f) => f.replace(".json", "")).sort().reverse();
  fs.writeFileSync(
    path.join(DEST, "index.json"),
    JSON.stringify({ dates, generatedAt: new Date().toISOString() }, null, 2),
  );

  console.log(`[copy-predictions] ${files.length} fichier(s) copié(s) vers ${DEST}`);
}

copy();
