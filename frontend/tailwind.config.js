/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f7ff",
          100: "#e1ecff",
          500: "#3563ff",
          600: "#1f4ad9",
          700: "#1639ad",
        },
      },
    },
  },
  plugins: [],
};
