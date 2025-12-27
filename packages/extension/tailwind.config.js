/** @type {import('tailwindcss').Config} */
export default {
  // Use class-based dark mode to match web app
  darkMode: "class",

  // Scan popup HTML and TypeScript files
  content: [
    "./src/popup/**/*.{html,ts}",
    "./src/content/**/*.ts",
  ],

  // Extend with same custom config as web app
  theme: {
    extend: {
      colors: {
        firefly: {
          glow: "#FCD34D",
          amber: "#F59E0B",
          orange: "#F97316",
          pink: "#EC4899",
          cyan: "#10D2F4",
        },
        cyan: { 250: "#72EEFD" },
        purple: { 750: "#6A1DD1" },
        yellow: { 650: "#C56508" },
        orange: { 650: "#DF3F00" },
        pink: { 650: "#CD206A" },
      },
      backgroundImage: ({ theme }) => ({
        "firefly-banner": `linear-gradient(to right, ${theme("colors.yellow.400")}, ${theme("colors.orange.500")}, ${theme("colors.pink.600")})`,
        "firefly-banner-dark": `linear-gradient(to right, ${theme("colors.yellow.600")}, ${theme("colors.orange.600")}, ${theme("colors.pink.700")})`,
      }),
    },
  },
};
