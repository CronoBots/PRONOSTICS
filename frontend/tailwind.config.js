/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Palette "Aurora" — sombre violacé, accent émeraude + violet électrique
        bg: {
          base: "#0a0b1e",       // deep void (violet-noir)
          card: "#14172c",       // slate purple
          elevated: "#1f2240",   // surface élevée
        },
        accent: {
          green: "#10d9a3",      // émeraude vive
          greenDim: "#0fb088",
          red: "#ff4d6d",        // rose punchy
          blue: "#7c5cff",       // violet électrique (distinctif)
          gold: "#fcd34d",       // accent premium
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 32px 0 rgba(124,92,255,0.25)",
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
    },
  },
  plugins: [],
};
