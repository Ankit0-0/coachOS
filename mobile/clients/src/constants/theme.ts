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
    accent: '#0F8B8D',
    accentSoft: '#E4F5F4',
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
    /** Data-series colours for the progress charts. */
    chartWorkout: '#3A7BFF',
    chartDiet: '#1FA971',
    /** Unfilled portion of a progress ring. */
    chartTrack: '#CBD4E1',
    /** Chart gridlines and axis labels. */
    chartGrid: '#DDE7FF',
    chartAxis: '#64748B',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#131416',
    backgroundSelected: '#26282C',
    textSecondary: '#B0B4BA',
    border: '#2A2D31',
    accent: '#6AD4D6',
    accentSoft: '#123133',
    success: '#7CD992',
    warning: '#F5B04C',
    surface: '#131416',
    surfaceSunken: '#1B1D21',
    onAccent: '#04211F',
    textMuted: '#787E87',
    danger: '#FF7A6E',
    dangerSoft: '#2A1512',
    chartWorkout: '#6E9BFF',
    chartDiet: '#4ADE9B',
    chartTrack: '#343841',
    chartGrid: '#23262D',
    chartAxis: '#8A9199',
  },
} as const;

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
