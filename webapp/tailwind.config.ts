import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

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
      animation: {
        'fade-in':       'fadeIn 0.5s ease-out forwards',
        'fade-in-up':    'fadeInUp 0.5s ease-out forwards',
        'scale-in':      'scaleIn 0.4s ease-out forwards',
        'slide-right':   'slideInRight 0.5s ease-out forwards',
        'float':         'float 3s ease-in-out infinite',
        'gradient-shift':'gradientShift 6s ease-in-out infinite',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'count-bounce':  'countBounce 0.5s ease-out forwards',
        'shimmer':       'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeInUp:     { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        float:        { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        gradientShift:{ '0%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' }, '100%': { backgroundPosition: '0% 50%' } },
        pulseGlow:    { '0%, 100%': { boxShadow: '0 0 0 0 rgba(248,81,50,0.25)' }, '50%': { boxShadow: '0 0 0 8px rgba(248,81,50,0)' } },
        countBounce:  { '0%': { transform: 'scale(0.6)', opacity: '0' }, '60%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      transitionTimingFunction: {
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [forms],
};

export default config;
