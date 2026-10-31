/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: { DEFAULT: '#6D1A36', dark: '#4A0F24', light: '#8E2B4D' },
        cream: { DEFAULT: '#F8F0E3', soft: '#FFF8EE', deep: '#EADBC3' },
        pink: { DEFAULT: '#D8A7B1', light: '#EBCBD1', dark: '#B77F8B' },
        ink: '#3B0D1E',
        status: { paid: '#52775D', overdue: '#6D1A36', draft: '#B77F8B', pending: '#8E2B4D' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 10px 32px rgba(74, 15, 36, 0.075)',
      },
      borderRadius: { panel: '22px' },
    },
  },
  plugins: [],
};
