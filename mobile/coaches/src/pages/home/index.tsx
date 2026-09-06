import { StyleSheet, View } from 'react-native';

import { ClientsSection } from '@/components/home/ClientsSection';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function HomeScreen() {
  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="display">Clients</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Everyone you coach, and anyone you&apos;ve invited who hasn&apos;t replied yet.
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
});
