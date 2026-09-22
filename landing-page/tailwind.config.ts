import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#05070a',
        panel: '#0f141b',
        line: '#1c232d',
        muted: '#8b93a4',
        cream: '#f4f1ea',
        accent: '#7ec8ff'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(126,200,255,0.12), 0 20px 60px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
} satisfies Config;
