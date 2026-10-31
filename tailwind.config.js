/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './FRONTEND/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        royal: {
          DEFAULT: '#1D4ED8',
          deep: '#1E3A8A',
        },
        tomato: {
          DEFAULT: '#E03124',
          hover: '#C92519',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
