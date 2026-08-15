/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        brand: ['"Bitcount Prop Double"', '"Bitcount"', 'sans-serif'],
        display: ['"Bitcount Prop Double"', '"Bitcount"', 'sans-serif'],
        sans: ['"Bitcount Grid Single"', '"Bitcount Grid"', 'monospace'],
        secondary: ['"Bitcount Grid Single"', '"Bitcount Grid"', 'monospace'],
        mono: ['"Bitcount Grid Single"', '"Bitcount Grid"', 'monospace'],
      },
    },
  },
  plugins: [],
}
