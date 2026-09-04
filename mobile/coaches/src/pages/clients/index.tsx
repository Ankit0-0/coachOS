import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ClientListItem } from '@/components/clients/ClientListItem';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
      <DetailHeader title="Clients" subtitle="Everyone who has accepted your invite." />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : clients.length === 0 ? (
        <ThemedText themeColor="textSecondary">No clients yet.</ThemedText>
      ) : (
        <View style={styles.list}>
          {clients.map((invite) => (
            <ClientListItem
              key={invite.id}
              name={invite.client?.name ?? invite.clientEmail}
              email={invite.client?.email ?? invite.clientEmail}
            />
          ))}
        </View>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
});
