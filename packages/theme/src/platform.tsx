import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { StatusBar } from 'expo-status-bar';

import { useAppearance, useTheme } from './provider';
import type { Theme } from './themes';

/** Pass to `useFonts`; keys match `Fonts` in tokens.ts. */
export const FontAssets = {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  Manrope_600SemiBold,
  Manrope_700Bold,
};

/** Status bar icons that read against the current background. */
export function ThemedStatusBar() {
  const { scheme } = useAppearance();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

/** React Navigation `colors`, so headers and scene backgrounds switch with the theme. */
export function navigationColors(theme: Theme) {
  return {
    primary: theme.primary,
    background: theme.bg,
    card: theme.surface,
    text: theme.textPrimary,
    border: theme.border,
    notification: theme.countBadge,
  };
}

/** Colours for expo-router's NativeTabs: surface bar, sage pill on the active tab. */
export function useTabBarColors() {
  const theme = useTheme();
  return {
    backgroundColor: theme.surface,
    indicatorColor: theme.tabActiveBg,
    iconColor: { default: theme.textMuted, selected: theme.primary },
    labelStyle: {
      default: { color: theme.textMuted },
      selected: { color: theme.primary },
    },
  };
}
