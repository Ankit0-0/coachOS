import { CardShadow, Palette } from './tokens';

/**
 * Every semantic role a component may colour something with. Both themes
 * satisfy this type, so a token missing from one is a compile error.
 */
export type Theme = {
  /** Page background. */
  bg: string;
  /** Cards on the page. */
  surface: string;
  /** Tray inside a card that holds rows (landing: the cream panel). */
  surfaceInset: string;
  border: string;
  /** Unchecked checkbox ring and other outlined controls (3:1). */
  borderStrong: string;
  /** Text field outline; the landing's forest/20 is 1.5:1, below WCAG 1.4.11. */
  borderInput: string;

  /** Headings; forest in light, as on the landing page. */
  textHeading: string;
  textPrimary: string;
  /** Body copy. */
  textSecondary: string;
  /** Meta, hints, units. */
  textMuted: string;

  primary: string;
  primaryPressed: string;
  onPrimary: string;

  accentWorkout: string;
  accentDiet: string;
  accentClient: string;

  /** Green chip: Coach, Workout, Diet; also selected/active tints. */
  chipBg: string;
  chipText: string;
  /** Terracotta chip: Client, attention. */
  chipWarmBg: string;
  chipWarmText: string;
  chipNeutralBg: string;
  chipNeutralText: string;

  calloutBg: string;
  calloutText: string;

  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  partial: string;
  partialBg: string;
  danger: string;
  dangerSoft: string;

  countBadge: string;
  onCountBadge: string;

  chartBar: string;
  chartEmpty: string;
  chartWorkout: string;
  chartDiet: string;
  chartGrid: string;
  chartAxis: string;

  tabActiveBg: string;
  focusRing: string;
  scrim: string;
  /** CSS box-shadow for raised cards, or 'none'. */
  cardShadow: string;
};

export type ThemeColor = {
  [K in keyof Theme]: K extends 'cardShadow' ? never : K;
}[keyof Theme];

export const light: Theme = {
  bg: Palette.cream,
  surface: Palette.white,
  surfaceInset: Palette.cream,
  // landing `border-forest/10`
  border: 'rgba(24, 59, 50, 0.12)',
  borderStrong: '#7A8580',
  borderInput: '#838D87',

  textHeading: Palette.forest,
  textPrimary: Palette.charcoal,
  // landing body copy is `text-charcoal/80`
  textSecondary: '#4F5552',
  textMuted: '#5E6963',

  primary: Palette.forest,
  primaryPressed: Palette.forestDeep,
  onPrimary: Palette.cream,

  accentWorkout: '#3F6B5A',
  accentDiet: Palette.terracotta,
  accentClient: Palette.terracotta,

  chipBg: Palette.sage,
  chipText: Palette.forest,
  chipWarmBg: Palette.terracottaSoft,
  chipWarmText: Palette.terracottaDeep,
  chipNeutralBg: '#EFEDE6',
  chipNeutralText: '#4F5552',

  calloutBg: Palette.terracottaSoft,
  calloutText: Palette.charcoal,

  success: '#2E6B4E',
  successBg: Palette.sage,
  warning: Palette.terracottaDeep,
  warningBg: '#F6E6DC',
  partial: '#7F6419',
  partialBg: '#F6EDC9',
  danger: '#B3362C',
  dangerSoft: '#F9E4E1',

  countBadge: Palette.terracottaDeep,
  onCountBadge: Palette.white,

  // landing ReviewVisual bars: `bg-forest/80` and `bg-forest/10`
  chartBar: '#46625B',
  chartEmpty: '#E8EBEA',
  chartWorkout: '#46625B',
  chartDiet: Palette.terracotta,
  chartGrid: 'rgba(24, 59, 50, 0.10)',
  chartAxis: '#5E6963',

  tabActiveBg: Palette.sage,
  // landing :focus-visible
  focusRing: Palette.terracotta,
  scrim: 'rgba(16, 41, 31, 0.36)',
  cardShadow: CardShadow,
};

export const dark: Theme = {
  bg: Palette.ink,
  surface: Palette.inkRaised,
  surfaceInset: Palette.inkInset,
  border: Palette.inkLine,
  borderStrong: '#6F7A74',
  borderInput: '#687269',

  textHeading: Palette.paper,
  textPrimary: Palette.paper,
  textSecondary: '#C3C6BF',
  textMuted: '#A2A69F',

  primary: Palette.sageLight,
  primaryPressed: Palette.sageMid,
  onPrimary: '#12201A',

  accentWorkout: Palette.sageMid,
  accentDiet: Palette.terracottaLight,
  accentClient: Palette.terracottaLight,

  // sage at 18%, terracotta at 20%, over `surface`
  chipBg: 'rgba(159, 193, 174, 0.18)',
  chipText: '#C3DCCD',
  chipWarmBg: 'rgba(201, 111, 74, 0.20)',
  chipWarmText: '#F2BCA4',
  chipNeutralBg: '#2A302C',
  chipNeutralText: '#C3C6BF',

  calloutBg: 'rgba(201, 111, 74, 0.16)',
  calloutText: Palette.paper,

  success: '#9FD0B3',
  successBg: 'rgba(159, 193, 174, 0.18)',
  warning: '#F2BCA4',
  warningBg: 'rgba(201, 111, 74, 0.20)',
  partial: '#E8CF86',
  partialBg: 'rgba(214, 178, 72, 0.18)',
  danger: '#FF9A8C',
  dangerSoft: 'rgba(255, 122, 110, 0.14)',

  countBadge: Palette.terracottaLight,
  onCountBadge: '#2A140B',

  chartBar: Palette.sageMid,
  chartEmpty: '#2A2F2B',
  chartWorkout: Palette.sageMid,
  chartDiet: Palette.terracottaLight,
  chartGrid: Palette.inkLine,
  chartAxis: '#A2A69F',

  tabActiveBg: 'rgba(159, 193, 174, 0.18)',
  focusRing: Palette.terracottaLight,
  scrim: 'rgba(0, 0, 0, 0.6)',
  cardShadow: 'none',
};

export const Themes = { light, dark } as const;
export type ColorSchemeName = keyof typeof Themes;
