import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';

type ErrorFallbackProps = {
  /** Remounts the app below the boundary. */
  resetError: () => void;
};

/**
 * What the root error boundary shows in place of a blank screen. The error has
 * already gone to Sentry by the time this renders.
 */
export function ErrorFallback({ resetError }: ErrorFallbackProps) {
  // The error may have happened before the first screen hid the splash, which
  // would otherwise leave this hidden behind it.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.copy}>
        <ThemedText type="subtitle">Something went wrong</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          The app hit a problem it couldn’t recover from. It’s been reported. Try again, and if it keeps
          happening, restart the app.
        </ThemedText>
      </View>
      <Button label="Try again" onPress={resetError} fullWidth />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  copy: {
    gap: Spacing.two,
  },
});
