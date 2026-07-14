/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F1E4',
        paperCard: '#FFFCF5',
        paperDark: '#EEE3CB',
        ink: '#2B2A28',
        inkSoft: '#6B6357',
        navy: '#2C3550',
        navySoft: '#414C6E',
        rust: '#B6442A',
        sage: '#4F7942',
        gold: '#B8860B',
        line: '#D8C9A3',
      },
      fontFamily: {
        serif: ['"Noto Serif Thai"', 'serif'],
        sans: ['"Noto Sans Thai"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
