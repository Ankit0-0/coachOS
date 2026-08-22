import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function MyCoachScreen() {
  const theme = useTheme();

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          My Coach
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Your coaching hub
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Messages, weekly check-ins, and assigned plans will live here.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={[styles.panel, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Coach assignment</ThemedText>
        <ThemedText themeColor="textSecondary">
          No coach profile is connected yet. This placeholder keeps the navigation ready.
        </ThemedText>
      </ThemedView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  panel: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
