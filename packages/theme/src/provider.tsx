import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { loadMode, saveMode } from './storage';
import { Themes, type ColorSchemeName, type Theme } from './themes';

export type AppearanceMode = 'system' | 'light' | 'dark';

/** Until the user picks; never written to storage, so a stored choice always wins. */
export const DEFAULT_APPEARANCE_MODE: AppearanceMode = 'light';

type ThemeContextValue = {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
  /** What `mode` resolves to right now. */
  scheme: ColorSchemeName;
  theme: Theme;
  /** False until the stored mode has loaded; keep the splash up until then. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Overrides the native appearance too, so the keyboard, alerts and native
 * tab bar match. No-op on web. Called before the state update that follows
 * it, so that render already reads the fresh system scheme.
 */
function applyNativeAppearance(mode: AppearanceMode) {
  if (typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

export function ThemeProvider({ storageKey, children }: { storageKey: string; children: ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>(DEFAULT_APPEARANCE_MODE);
  const [ready, setReady] = useState(false);
  const system = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    loadMode(storageKey).then((stored) => {
      if (cancelled) return;
      const initial = stored ?? DEFAULT_APPEARANCE_MODE;
      // Also when nothing is stored: native UI would otherwise follow the system.
      applyNativeAppearance(initial);
      setModeState(initial);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const setMode = useCallback(
    (next: AppearanceMode) => {
      applyNativeAppearance(next);
      setModeState(next);
      void saveMode(storageKey, next);
    },
    [storageKey],
  );

  const scheme: ColorSchemeName = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo(
    () => ({ mode, setMode, scheme, theme: Themes[scheme], ready }),
    [mode, setMode, scheme, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const noop = () => {};

/**
 * Outside a provider (an error boundary's fallback, say) this uses the
 * default mode instead of throwing, so the fallback can still render.
 */
function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const system = useColorScheme();
  if (context) return context;
  const mode = DEFAULT_APPEARANCE_MODE;
  const scheme: ColorSchemeName = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return { mode, setMode: noop, scheme, theme: Themes[scheme], ready: true };
}

/** The resolved semantic colours for the current scheme. */
export function useTheme(): Theme {
  return useThemeContext().theme;
}

/** Mode, setter and resolved scheme, for the appearance picker and root layout. */
export function useAppearance() {
  const { mode, setMode, scheme, ready } = useThemeContext();
  return { mode, setMode, scheme, ready };
}
