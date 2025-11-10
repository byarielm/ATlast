/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Changed from 'media' to 'class' for manual control
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        firefly: {
          glow: '#FCD34D', // close to amber-300
          amber: '#F59E0B', // close to amber-500
          orange: '#F97316', // close to orange-500
          pink: '#EC4899', // close to tailwind pink-500
          cyan: '#10D2F4', // close to tailwind cyan-300
        }
      },
      backgroundImage: {
      'firefly-banner':
        'linear-gradient(90deg, rgba(9,163,190,1) 0%, rgba(91,33,182,1) 33%, rgba(236,72,153,1) 67%, rgba(244,105,6,1) 100%)',
      'firefly-banner-dark':
        'linear-gradient(90deg, rgba(24,21,60,1) 0%, rgba(55,20,94,1) 33%, rgba(104,25,98,1) 67%, rgba(36,16,54,1) 100%)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.3' },
          '25%': { transform: 'translate(10px, -20px) scale(1.2)', opacity: '0.8' },
          '50%': { transform: 'translate(-5px, -40px) scale(1)', opacity: '0.5' },
          '75%': { transform: 'translate(15px, -25px) scale(1.1)', opacity: '0.9' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(251, 191, 36, 0.6), 0 0 60px rgba(251, 191, 36, 0.3)' },
        },
      },
    },
  },
  plugins: [],
}