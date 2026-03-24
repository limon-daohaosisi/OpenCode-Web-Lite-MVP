import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 18px 50px rgba(17, 24, 39, 0.08)'
      },
      colors: {
        ink: '#111827',
        mist: '#f5f1e8',
        sand: '#ede4d6',
        ember: '#b45309',
        pine: '#14532d'
      },
      fontFamily: {
        sans: [
          '"Space Grotesk"',
          '"IBM Plex Sans"',
          'ui-sans-serif',
          'system-ui'
        ]
      }
    }
  },
  plugins: []
} satisfies Config;
