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
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: '#E6E6EB',
    accent: '#0F8B8D',
    accentSoft: '#E4F5F4',
    success: '#2F8F46',
    warning: '#D97904',
    /** Raised card sitting on `background`. */
    surface: '#F2F4F7',
    /** Inset row nested inside a `surface` card. */
    surfaceSunken: '#E4E8EE',
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
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    border: '#33363B',
    accent: '#6AD4D6',
    accentSoft: '#123133',
    success: '#7CD992',
    warning: '#F5B04C',
    surface: '#17181C',
    surfaceSunken: '#212328',
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

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  /** Fills the gap between `five` (32) and `six` (64) for section rhythm. */
  fiveHalf: 44,
} as const;

/**
 * Corner radius by role, so a badge, a card, and an avatar aren't all
 * forced through the same value.
 */
export const Radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
