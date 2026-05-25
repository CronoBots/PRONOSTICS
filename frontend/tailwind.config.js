/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Palette "Aurora" — drivée par CSS variables (theme-aware light/dark).
        // Les hex de fallback préservent le rendu si une var n'est pas définie.
        bg: {
          base: "rgb(var(--bg-base-rgb) / <alpha-value>)",
          card: "rgb(var(--bg-card-rgb) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated-rgb) / <alpha-value>)",
        },
        accent: {
          // Palette NΞXBΞT v6 — Cyan AX (25/05/2026).
          // accent-blue est la COULEUR DE MARQUE — cyan du nouveau logo AX
          // (monogramme blanc + cyan sur fond noir). Brand + CTA primaire.
          // accent-green reste vert (sémantique gain universelle).
          green: "#10d9a3",      // gains / win / profit positif
          greenDim: "#0fb088",
          red: "#ff4d6d",        // pertes / loss
          blue: "#0DC2FA",       // CYAN AX — couleur de marque, CTA primaire, brand
          blueDim: "#0894C0",
          gold: "#fcd34d",       // accent premium
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        // Ombre plus subtile : utilisée sur le chart hero
        "card-soft": "0 4px 12px -6px rgba(0,0,0,0.35)",
        // Glow signature = cyan AX (#0DC2FA)
        glow: "0 0 32px 0 rgba(13,194,250,0.30)",
        // Conservé pour les composants qui veulent un halo vert (gains)
        "glow-green": "0 0 32px 0 rgba(16,217,163,0.25)",
      },
      backgroundImage: {
        // Pattern hexagonal subtil (utilisé en bg-hex pour les hero sections)
        // SVG inline = pas de file fetch supplémentaire
        "hex-pattern":
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 92' width='80' height='92'><polygon points='40,2 76,23 76,69 40,90 4,69 4,23' fill='none' stroke='%230DC2FA' stroke-opacity='0.08' stroke-width='1.5'/></svg>\")",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "ping-slow": "ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "count-up": "count-up 0.6s ease-out",
        confetti: "confetti 1.5s ease-out forwards",
      },
      keyframes: {
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        confetti: {
          "0%": { transform: "translateY(0) scale(0.8) rotate(0deg)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-120px) scale(1) rotate(180deg)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
