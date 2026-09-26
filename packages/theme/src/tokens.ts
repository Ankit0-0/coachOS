import { Platform, type TextStyle } from 'react-native';

/**
 * Raw values. Components never read these directly — they go through the
 * semantic themes in themes.ts, so light and dark can differ per role.
 *
 * Brand hues are the landing page's, from landing-page/tailwind.config.ts.
 */
export const Palette = {
  // landing-page/tailwind.config.ts `forest`
  forest: '#183B32',
  forestDeep: '#10291F',
  // `cream`, `charcoal`, `muted`
  cream: '#F7F5EF',
  charcoal: '#252B28',
  muted: '#66716B',
  // `sage`
  sage: '#DDE7DC',
  sageSoft: '#EEF3ED',
  // `terracotta`: DEFAULT is fills and large type only; `deep` is text.
  terracotta: '#C96F4A',
  terracottaDeep: '#A2502E',
  terracottaSoft: '#F4E3D8',
  white: '#FFFFFF',

  // Warm dark, derived from the same hues for the dark theme.
  ink: '#131614',
  inkRaised: '#1B1F1C',
  inkInset: '#222723',
  inkLine: '#2D332F',
  paper: '#ECEAE3',
  sageLight: '#9FC1AE',
  sageMid: '#8FAE9D',
  terracottaLight: '#E59A79',
} as const;

/** Google's logo colours; fixed by its brand guidelines, never themed. */
export const GoogleLogoColors = {
  blue: '#4285F4',
  green: '#34A853',
  yellow: '#FBBC05',
  red: '#EB4335',
} as const;

/** 4-based, with 12 and 20 steps between the original ones. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 12,
  three: 16,
  threeHalf: 20,
  four: 24,
  five: 32,
  fiveHalf: 44,
  six: 64,
} as const;

/** Page gutter on every screen. */
export const ScreenPadding = Spacing.threeHalf;

/**
 * Radius by role, following the landing page's tiles: rounded-3xl cards,
 * rounded-2xl inner trays, rounded-xl rows.
 */
export const Radii = {
  /** Small controls: stepper buttons, tiny tags. */
  sm: 10,
  /** Buttons, inputs, rows inside an inset panel. */
  md: 14,
  /** Inset panel inside a card; icon tiles. */
  lg: 20,
  /** Outer cards. */
  xl: 24,
  pill: 999,
} as const;

/** Minimum touch target on either platform. */
export const HitTarget = 44;

/**
 * Landing: DM Sans for text, Manrope for headings (landing-page/app/layout.tsx).
 * Weight comes from the family name, never `fontWeight`: a runtime-loaded
 * family with a numeric weight gets a synthesised bold on some platforms.
 */
export const Fonts = {
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemibold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  display: 'Manrope_700Bold',
  displaySemibold: 'Manrope_600SemiBold',
  /** Dev build badge only. */
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) ?? 'monospace',
} as const;

/** Mobile type scale; every step pairs a size with a family. */
export const Type = {
  /** Screen title. */
  display: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  /** Big hero numbers and the rare oversized heading. */
  title: { fontFamily: Fonts.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.6 },
  /** Section title. */
  subtitle: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  /** Card title. */
  heading: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  smallBold: { fontFamily: Fonts.sansSemibold, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: Fonts.sansMedium, fontSize: 13, lineHeight: 18 },
  meta: { fontFamily: Fonts.sansMedium, fontSize: 13, lineHeight: 18 },
  chip: { fontFamily: Fonts.sansSemibold, fontSize: 12, lineHeight: 16 },
  numeric: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  button: { fontFamily: Fonts.sansSemibold, fontSize: 15, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

/**
 * Landing `shadow-card` (tailwind.config.ts), verbatim. Light theme only —
 * dark separates surfaces with the border instead.
 */
export const CardShadow = '0 1px 2px rgba(24, 59, 50, 0.06), 0 8px 24px -12px rgba(24, 59, 50, 0.18)';

export const MaxContentWidth = 800;
// Web: the app-tabs.web bar floats over content (8 + 52 + 8 padding and button, 1 border).
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 69 }) ?? 0;
