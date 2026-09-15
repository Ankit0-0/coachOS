/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F1F1EF',
    textSecondary: '#60646C',
    border: '#E9E9E7',
    /**
     * The landing page's #7ec8ff, darkened along the same hue (206°) until white
     * text passes WCAG AA: #0a6eb8 is 5.3:1 against white both ways, so it works
     * as a button fill with white labels and as accent text on light surfaces.
     * The pale original fails at 1.8:1 behind white text.
     */
    accent: '#0a6eb8',
    /** 22% of #7ec8ff over white; accent text on it is 4.7:1. */
    accentSoft: '#e3f3ff',
    success: '#2F8F46',
    warning: '#D97904',
    /** Raised card sitting on `background`. */
    surface: '#FFFFFF',
    /** Inset row nested inside a `surface` card. */
    surfaceSunken: '#FAFAFA',
    /** Text/icons placed on an `accent` fill. */
    onAccent: '#FFFFFF',
    /** Quietest tier of text — timestamps, units, hints. */
    textMuted: '#8A9099',
    danger: '#C0362C',
    dangerSoft: '#FDECEA',
    /** Data-series colours for the progress charts. Workout follows the accent. */
    chartWorkout: '#0a6eb8',
    chartDiet: '#1FA971',
    /** Unfilled portion of a progress ring. */
    chartTrack: '#CBD4E1',
    /** Chart gridlines and axis labels. */
    chartGrid: '#eaf6ff',
    chartAxis: '#64748B',
    /** Dims the screen behind a bottom sheet or modal. */
    scrim: 'rgba(5, 7, 10, 0.32)',
  },
  dark: {
    /**
     * Mirrors the CoachOS landing page (tailwind.config.ts): ink, panel, line,
     * muted, cream and accent. Tokens it doesn't define are derived from those.
     */
    text: '#f4f1ea', // cream
    background: '#05070a', // ink
    backgroundElement: '#0f141b', // panel
    backgroundSelected: '#1c232d', // line
    textSecondary: '#8b93a4', // muted
    border: '#1c232d', // line
    accent: '#7ec8ff',
    /** 14% of accent over ink; accent text on it is 8.9:1. */
    accentSoft: '#16222c',
    success: '#7CD992',
    warning: '#F5B04C',
    surface: '#0f141b', // panel
    /** Between panel and line, so a nested row still reads as inset. */
    surfaceSunken: '#151b23',
    /** Ink on the pale accent (11.1:1); white would be 1.8:1. */
    onAccent: '#05070a',
    textMuted: '#8b93a4', // muted
    danger: '#FF7A6E',
    dangerSoft: '#2A1512',
    chartWorkout: '#7ec8ff',
    chartDiet: '#4ADE9B',
    chartTrack: '#2a3039',
    chartGrid: '#1c232d', // line
    chartAxis: '#8b93a4', // muted
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

/**
 * The launch colour behind the app's wordmark — the landing page accent, with an ink wordmark. Fixed rather
 * than themed: it must match the native splash in app.json, which is shown
 * before the app knows whether the device is in light or dark mode.
 */
export const SplashBackground = '#7ec8ff';

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Inter is the only typeface either app uses. Weight comes from the family
 * name rather than `fontWeight`: with a family loaded at runtime, a numeric
 * weight makes some platforms synthesise a bold on top of an already-bold
 * face, which is why every text style below sets a family and no weight.
 */
export const Fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  /**
   * The one place a fixed-width face still earns its keep: the dev build
   * badge, where a version string shouldn't reflow as digits change.
   */
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) ?? 'monospace',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Corner radius by role, so a badge, a card, and an avatar aren't all
 * forced through the same value.
 */
export const Radii = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;
