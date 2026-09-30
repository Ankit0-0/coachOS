import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ClientListItem } from '@/components/clients/ClientListItem';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Card, InsetPanel } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useDesktopLayout, useTheme } from '@/hooks/use-theme';
import { coachInviteApi, type CoachInvite } from '@/lib/api';

function ClientRow({ invite }: { invite: CoachInvite }) {
  return (
    <ClientListItem
      clientId={invite.clientId ?? invite.client?.id ?? ''}
      name={invite.client?.name ?? invite.clientEmail}
      email={invite.client?.email ?? invite.clientEmail}
      avatarUrl={invite.client?.avatarUrl}
      subscriptionStatus={invite.subscriptionStatus}
    />
  );
}

export function ClientsScreen() {
  const theme = useTheme();
  const isDesktop = useDesktopLayout();
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
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh} wide>
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
          {isDesktop ? (
            // Two columns, read down the first and then the second.
            <InsetPanel style={styles.columns}>
              {[clients.slice(0, Math.ceil(clients.length / 2)), clients.slice(Math.ceil(clients.length / 2))].map(
                (column, index) => (
                  <View key={index} style={styles.column}>
                    {column.map((invite) => (
                      <ClientRow key={invite.id} invite={invite} />
                    ))}
                  </View>
                ),
              )}
            </InsetPanel>
          ) : (
            <InsetPanel>
              {clients.map((invite) => (
                <ClientRow key={invite.id} invite={invite} />
              ))}
            </InsetPanel>
          )}
        </Card>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  listCard: {
    padding: Spacing.twoHalf,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // The tray's own row gap.
  column: {
    flex: 1,
    gap: Spacing.two,
  },
});
