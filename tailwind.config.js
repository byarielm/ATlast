/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // Changed from 'media' to 'class' for manual control
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
      animation: {
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.3" },
          "25%": {
            transform: "translate(10px, -20px) scale(1.2)",
            opacity: "0.8",
          },
          "50%": {
            transform: "translate(-5px, -40px) scale(1)",
            opacity: "0.5",
          },
          "75%": {
            transform: "translate(15px, -25px) scale(1.1)",
            opacity: "0.9",
          },
        },
      },
    },
  },
};
