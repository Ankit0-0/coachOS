import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ClientListItem } from '@/components/clients/ClientListItem';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { coachInviteApi, type CoachInvite } from '@/lib/api';

export function ClientsScreen() {
  const theme = useTheme();
  const [clients, setClients] = useState<CoachInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      coachInviteApi
        .list('ACCEPTED')
        .then((invites) => {
          if (active) setClients(invites);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScreenScaffold>
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
        <Card padded={false}>
          {clients.map((invite, index) => (
            <ClientListItem
              key={invite.id}
              clientId={invite.clientId ?? invite.client?.id ?? ''}
              name={invite.client?.name ?? invite.clientEmail}
              email={invite.client?.email ?? invite.clientEmail}
              subscriptionStatus={invite.subscriptionStatus}
              divider={index < clients.length - 1}
            />
          ))}
        </Card>
      )}
    </ScreenScaffold>
  );
}
