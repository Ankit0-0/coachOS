import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ClientsSection } from '@/components/home/ClientsSection';
import { RequestsSection } from '@/components/home/RequestsSection';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function HomeScreen() {
  // Bumped when a request is accepted, so the roster shows the new client at once.
  const [rosterVersion, setRosterVersion] = useState(0);

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="display">Clients</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Everyone you coach, and anyone you&apos;ve invited who hasn&apos;t replied yet.
        </ThemedText>
      </View>

      <RequestsSection onAccepted={() => setRosterVersion((version) => version + 1)} />

      <ClientsSection refreshKey={rosterVersion} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
});
