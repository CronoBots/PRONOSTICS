#!/usr/bin/env node
/**
 * Copie backend/data/*.json vers frontend/public/data/.
 *
 * Exécuté automatiquement avant `next build` (script `prebuild`)
 * pour que les fichiers soient inclus dans l'export statique.
 *
 * Copie :
 *   - backend/data/predictions/*.json → frontend/public/data/predictions/
 *   - backend/data/history.json       → frontend/public/data/history.json
 */
const fs = require("fs");
const path = require("path");

const BACKEND_DATA = path.resolve(__dirname, "../../backend/data");
const PUBLIC_DATA = path.resolve(__dirname, "../public/data");

function copyPredictions() {
  const src = path.join(BACKEND_DATA, "predictions");
  const dest = path.join(PUBLIC_DATA, "predictions");
  fs.mkdirSync(dest, { recursive: true });

  if (!fs.existsSync(src)) {
    console.warn(`[copy-data] Aucun dossier predictions : ${src}`);
    return 0;
  }

  const files = fs.readdirSync(src).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }

  const dates = files.map((f) => f.replace(".json", "")).sort().reverse();
  fs.writeFileSync(
    path.join(dest, "index.json"),
    JSON.stringify({ dates, generatedAt: new Date().toISOString() }, null, 2),
  );
  return files.length;
}

function copyHistory() {
  const src = path.join(BACKEND_DATA, "history.json");
  const dest = path.join(PUBLIC_DATA, "history.json");
  fs.mkdirSync(PUBLIC_DATA, { recursive: true });

  if (!fs.existsSync(src)) {
    console.warn(`[copy-data] Pas de history.json à copier`);
    fs.writeFileSync(
      dest,
      JSON.stringify(
        { picks: [], stats: {}, generated_at: new Date().toISOString() },
        null,
        2,
      ),
    );
    return false;
  }
  fs.copyFileSync(src, dest);
  return true;
}

function copyInsights() {
  // Copies all <date>.json, <date>.fr.json, <date>.en.json (v2 i18n).
  const src = path.join(BACKEND_DATA, "insights");
  const dest = path.join(PUBLIC_DATA, "insights");
  fs.mkdirSync(dest, { recursive: true });
  if (!fs.existsSync(src)) return 0;
  const files = fs.readdirSync(src).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  return files.length;
}

const n = copyPredictions();
const ok = copyHistory();
const i = copyInsights();
console.log(`[copy-data] predictions copiées: ${n}, history: ${ok ? "ok" : "vide"}, insights: ${i}`);
