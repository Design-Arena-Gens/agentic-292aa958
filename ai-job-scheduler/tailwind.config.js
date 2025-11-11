/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        brand: {
          50: '#f2f6ff',
          100: '#e6ecff',
          200: '#c0d4ff',
          300: '#99bbff',
          400: '#4c8aff',
          500: '#1f63ff',
          600: '#154bd1',
          700: '#1039a3',
          800: '#0b2875',
          900: '#061847'
        }
      }
    }
  },
  plugins: []
};
