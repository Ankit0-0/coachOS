// First: error reporting has to be running before anything else can fail.
import { Sentry, useNavigationBreadcrumbs } from '@/lib/sentry';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { ErrorFallback } from '@/components/error-fallback';
import { AuthProvider, useAuth } from '@/contexts/auth';

SplashScreen.preventAutoHideAsync();

function isAuthRoute(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

function RootLayoutNav() {
  const { isSignedIn, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  useNavigationBreadcrumbs();

  // Inter is the app's only typeface, and every text style names one of these
  // families directly. Rendering before they resolve would show a frame of the
  // system font at Inter's metrics, so this gates the first paint alongside auth.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const isReady = !isLoading && fontsLoaded;

  // Keep the splash screen up until the session is restored and Inter is ready.
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}

// wrap() adds tap breadcrumbs ("crashed after tapping X") and ties the root to
// Sentry's native crash and session reporting.
export default Sentry.wrap(RootLayout);
