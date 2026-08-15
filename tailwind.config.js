/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        brand: ['Bitcount', 'Bitcount Prop', 'Bitcount Grid', 'sans-serif'],
        display: ['Bitcount', 'Bitcount Prop', 'Bitcount Grid', 'sans-serif'],
        'brand-grid': ['"Bitcount Grid"', 'Bitcount', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Bitcount Grid"', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
