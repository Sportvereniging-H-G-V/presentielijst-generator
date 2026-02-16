import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './src/**/*.css'],
  theme: {
    extend: {
      colors: {
        slate: colors.slate,
        red: colors.red,
        indigo: colors.indigo,
      },
      screens: {
        print: { raw: 'print' },
      },
    },
  },
  plugins: [],
};
