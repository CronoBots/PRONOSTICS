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
