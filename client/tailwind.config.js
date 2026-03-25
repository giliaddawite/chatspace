/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#0f172a',
          800: '#111827',
          700: '#1f2937',
          600: '#0f766e',
        },
      },
      boxShadow: {
        glass: '0 8px 30px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};

