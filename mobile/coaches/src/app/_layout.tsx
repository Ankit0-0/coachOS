// First: error reporting has to be running before anything else can fail.
import { Sentry, useNavigationBreadcrumbs } from '@/lib/sentry';

import {
  FontAssets,
  ThemeProvider as AppearanceProvider,
  ThemedStatusBar,
  navigationColors,
  useAppearance,
  useTheme,
} from '@coachos/theme';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';

import { ErrorFallback } from '@/components/error-fallback';
import { AuthProvider, useAuth } from '@/contexts/auth';

SplashScreen.preventAutoHideAsync();

function isAuthRoute(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

function RootLayoutNav() {
  const { isSignedIn, isLoading } = useAuth();
  const { scheme, ready: appearanceReady } = useAppearance();
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  useNavigationBreadcrumbs();

  // Every text style names one of these families directly, so rendering before
  // they resolve would flash the system font. The stored appearance gates too,
  // or a dark-mode user would see a frame of the light theme.
  const [fontsLoaded] = useFonts(FontAssets);

  const isReady = !isLoading && fontsLoaded && appearanceReady;

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, ...navigationColors(theme) } };
  }, [scheme, theme]);

  // Keep the splash screen up until the session, fonts and appearance are ready.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Keep the user on the right side of the auth wall. This is what advances
  // the route after sign in/up and after restore, on native and web alike
  // (on web the URL itself must change, since routing is path-based).
  useEffect(() => {
    if (!isReady) return;
    const onAuthRoute = isAuthRoute(pathname);
    if (isSignedIn && onAuthRoute) {
      router.replace('/');
    } else if (!isSignedIn && !onAuthRoute) {
      router.replace('/auth');
    }
  }, [isReady, isSignedIn, pathname, router]);

  if (!isReady) {
    // Splash is still visible — render nothing to avoid a flash of the wrong
    // screen, or of the wrong typeface.
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <ThemedStatusBar />
      <Stack screenOptions={{ headerShown: false }}>
        {isSignedIn ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="auth" />}
      </Stack>
    </ThemeProvider>
  );
}

function RootLayout() {
  return (
    // A render error anywhere below shows a recoverable screen instead of a
    // blank one, and is reported to Sentry on the way.
    <AppearanceProvider storageKey="coachos.coach.appearance">
      <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </Sentry.ErrorBoundary>
    </AppearanceProvider>
  );
}

// wrap() adds tap breadcrumbs ("crashed after tapping X") and ties the root to
// Sentry's native crash and session reporting.
export default Sentry.wrap(RootLayout);
