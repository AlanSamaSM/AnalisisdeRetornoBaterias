import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef3f1',
          100: '#fee4df',
          200: '#ffcdc4',
          300: '#ffa999',
          400: '#ff7a61',
          500: '#f85132',
          600: '#e63312',
          700: '#c2260a',
          800: '#a0230e',
          900: '#842313',
          950: '#480e04',
        },
      },
    },
  },
  plugins: [],
};

export default config;
