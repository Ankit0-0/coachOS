import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ClientsSection } from '@/components/home/ClientsSection';
import { RequestsSection } from '@/components/home/RequestsSection';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRefresh, type RefreshHandle } from '@/hooks/use-refresh';
import { useDesktopLayout } from '@/hooks/use-theme';

export function HomeScreen() {
  const requests = useRef<RefreshHandle>(null);
  const roster = useRef<RefreshHandle>(null);
  // Both sections load independently; the spinner clears once both are done.
  const { isRefreshing, refresh } = useRefresh(
    () => requests.current?.reload(),
    () => roster.current?.reload(),
  );
  const isDesktop = useDesktopLayout();

  // Accepting a request reloads the roster so the new client shows at once.
  const requestsSection = <RequestsSection ref={requests} onAccepted={() => void roster.current?.reload()} />;

  return (
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh} wide>
      <View style={styles.header}>
        <ThemedText type="display">Clients</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Everyone you coach, and anyone you&apos;ve invited who hasn&apos;t replied yet.
        </ThemedText>
      </View>

      {/* Desktop: requests sit beside the roster, above the invite form. */}
      {isDesktop ? null : requestsSection}

      <ClientsSection ref={roster} aside={isDesktop ? requestsSection : null} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
});
