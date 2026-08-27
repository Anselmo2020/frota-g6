
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FACC15',
          yellowDark: '#EAB308',
          black: '#0F172A',
          surface: '#FFFFFF',
          bg: '#F8FAFC'
        }
      }
    },
  },
  plugins: [],
}
