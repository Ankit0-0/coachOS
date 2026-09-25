/**
 * Tokens live in @coachos/theme (packages/theme), shared with the other app.
 * Colours come from `useTheme()`; this file re-exports the static scales.
 */

import '@/global.css';

import { Palette } from '@coachos/theme';

export {
  BottomTabInset,
  Fonts,
  HitTarget,
  MaxContentWidth,
  Radii,
  ScreenPadding,
  Spacing,
  Type,
  type Theme,
  type ThemeColor,
} from '@coachos/theme';

/**
 * Behind the launch wordmark. Fixed, not themed: it must match the native
 * splash in app.json, shown before the stored appearance is known.
 */
export const SplashBackground = Palette.forest;
