// Palette de couleurs pour les charts Recharts (composants qui ne peuvent
// pas utiliser les classes Tailwind, donc hard-coded ici en source unique).
//
// Sémantique : aligné sur frontend/tailwind.config.js + globals.css.
// - positive : vert (gains, win, profit) — accent-green
// - negative : rouge (pertes, loss) — accent-red
// - brand    : cyan AX (couleur de marque v6) — accent-blue
// - bg       : surface de carte chart (theme dark)
//
// Si la palette change dans Tailwind/globals.css, mettre à jour CES valeurs.

export const CHART_COLORS = {
  positive: "#10d9a3",
  negative: "#ff4d6d",
  brand: "#0DC2FA",
  brandDark: "#0894C0",
  bg: "#14172c",
  gridDark: "rgba(255,255,255,0.06)",
  gridLight: "rgba(255,255,255,0.25)",
  axisText: "rgba(255,255,255,0.85)",
} as const;

// Style commun pour les Recharts Tooltip (3 composants utilisaient la même
// config copy-pastée).
export const CHART_TOOLTIP_STYLE = {
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
} as const;

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: "rgba(255,255,255,0.75)",
} as const;
