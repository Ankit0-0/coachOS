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
         * The app itself, for the phone mockups: the dark theme the mobile
         * apps ship (mobile/*\/src/constants/theme.ts). Mockups use only these,
         * so they look like the real screens, not like the site.
         */
        app: {
          ink: '#05070a',
          panel: '#0f141b',
          sunken: '#151b23',
          line: '#1c232d',
          muted: '#8b93a4',
          text: '#f4f1ea',
          accent: '#7ec8ff',
          'accent-soft': '#16222c',
          success: '#7CD992',
          diet: '#4ADE9B',
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
