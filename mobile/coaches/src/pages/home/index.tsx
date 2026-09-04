import { StyleSheet, View } from 'react-native';

import { ClientsSection } from '@/components/home/ClientsSection';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function HomeScreen() {
  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          Coach OS
        </ThemedText>
        <ThemedText type="subtitle" style={styles.headline}>
          Welcome back
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Keep track of your clients and grow your roster.
        </ThemedText>
      </View>

      <ClientsSection />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
  },
});
