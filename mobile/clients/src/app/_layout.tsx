import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

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

  // Keep the splash screen up until the auth session has been restored.
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Keep the user on the right side of the auth wall. This is what advances
  // the route after sign in/up and after restore, on native and web alike
  // (on web the URL itself must change, since routing is path-based).
  useEffect(() => {
    if (isLoading) return;
    const onAuthRoute = isAuthRoute(pathname);
    if (isSignedIn && onAuthRoute) {
      router.replace('/');
    } else if (!isSignedIn && !onAuthRoute) {
      router.replace('/auth');
    }
  }, [isLoading, isSignedIn, pathname, router]);

  if (isLoading) {
    // Splash is still visible — render nothing to avoid a flash of the wrong screen.
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

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
