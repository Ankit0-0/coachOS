import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // The site: warm and light.
        forest: { DEFAULT: '#183B32', deep: '#10291F' },
        cream: '#F7F5EF',
        sage: { DEFAULT: '#DDE7DC', soft: '#EEF3ED' },
        // #C96F4A is 3.2:1 on cream — fills, rules and large type only.
        // `deep` is the text colour (5.2:1 on cream).
        terracotta: { DEFAULT: '#C96F4A', deep: '#A2502E', soft: '#F4E3D8' },
        charcoal: '#252B28',
        muted: '#66716B',
        /**
         * The app itself, for the phone mockups: the light theme the mobile
         * apps ship (`light` in packages/theme/src/themes.ts), named by the
         * same roles. Mockups use only these, so they look like the real
         * screens even where a value happens to match the site's.
         */
        app: {
          bg: '#F7F5EF',
          surface: '#FFFFFF',
          inset: '#F7F5EF',
          border: 'rgba(24, 59, 50, 0.12)',
          'border-strong': '#7A8580',
          'border-input': '#838D87',
          heading: '#183B32',
          text: '#252B28',
          secondary: '#4F5552',
          muted: '#5E6963',
          primary: '#183B32',
          'on-primary': '#F7F5EF',
          chip: '#DDE7DC',
          'chip-text': '#183B32',
          warm: '#F4E3D8',
          'warm-text': '#A2502E',
          neutral: '#EFEDE6',
          'neutral-text': '#4F5552',
          badge: '#A2502E',
          'chart-bar': '#46625B',
          'chart-empty': '#E8EBEA',
          'chart-diet': '#C96F4A',
          'chart-grid': 'rgba(24, 59, 50, 0.10)',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(24, 59, 50, 0.06), 0 8px 24px -12px rgba(24, 59, 50, 0.18)',
        lift: '0 2px 4px rgba(24, 59, 50, 0.06), 0 24px 48px -20px rgba(24, 59, 50, 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
