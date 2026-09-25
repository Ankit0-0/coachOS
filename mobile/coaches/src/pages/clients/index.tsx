import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ClientListItem } from '@/components/clients/ClientListItem';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Card, InsetPanel } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { coachInviteApi, type CoachInvite } from '@/lib/api';

export function ClientsScreen() {
  const theme = useTheme();
  const [clients, setClients] = useState<CoachInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Shared by focus and pull-to-refresh, so a refresh reports failures the
  // same way the initial load does.
  const load = useCallback(async () => {
    try {
      const invites = await coachInviteApi.list('ACCEPTED');
      setClients(invites);
    } catch {
      // As before: keep what's on screen; the list shows its empty state.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const { isRefreshing, refresh } = useRefresh(load);

  return (
    <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader
        title="Roster"
        subtitle={clients.length === 1 ? '1 client' : `${clients.length} clients`}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : clients.length === 0 ? (
        <Card>
          <ThemedText type="smallBold">No clients yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Invite someone from the Clients tab and they&apos;ll appear here once they accept.
          </ThemedText>
        </Card>
      ) : (
        <Card style={styles.listCard}>
          <InsetPanel>
            {clients.map((invite) => (
              <ClientListItem
                key={invite.id}
                clientId={invite.clientId ?? invite.client?.id ?? ''}
                name={invite.client?.name ?? invite.clientEmail}
                email={invite.client?.email ?? invite.clientEmail}
                avatarUrl={invite.client?.avatarUrl}
                subscriptionStatus={invite.subscriptionStatus}
              />
            ))}
          </InsetPanel>
        </Card>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  listCard: {
    padding: Spacing.twoHalf,
  },
});
