import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ClientListItem } from '@/components/clients/ClientListItem';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { coachInviteApi, type CoachInvite } from '@/lib/api';

const PREVIEW_COUNT = 4;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function ClientsSection() {
  const theme = useTheme();
  const router = useRouter();
  const [clients, setClients] = useState<CoachInvite[]>([]);
  const [pending, setPending] = useState<CoachInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadInvites = useCallback(() => {
    Promise.all([coachInviteApi.list('ACCEPTED'), coachInviteApi.list('PENDING')])
      .then(([accepted, pendingInvites]) => {
        setClients(accepted);
        setPending(pendingInvites);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [loadInvites]),
  );

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a client email');
      return;
    }

    try {
      setIsSending(true);
      await coachInviteApi.create(trimmed);
      setEmail('');
      loadInvites();
    } catch (error) {
      Alert.alert('Could not send invite', errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const preview = clients.slice(0, PREVIEW_COUNT);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/clients')}
        style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Clients ({clients.length})
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.accent }}>
          View all
        </ThemedText>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : preview.length === 0 ? (
        <ThemedText themeColor="textSecondary">No clients yet. Invite one below.</ThemedText>
      ) : (
        <View style={styles.list}>
          {preview.map((invite) => (
            <ClientListItem
              key={invite.id}
              clientId={invite.clientId ?? invite.client?.id ?? ''}
              name={invite.client?.name ?? invite.clientEmail}
              email={invite.client?.email ?? invite.clientEmail}
            />
          ))}
        </View>
      )}

      <View style={styles.inviteRow}>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder="client@example.com"
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          editable={!isSending}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.inviteButton, { backgroundColor: theme.accent, opacity: isSending ? 0.6 : 1 }]}
          onPress={handleInvite}
          disabled={isSending}>
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <ThemedText type="smallBold" style={styles.inviteButtonLabel}>
              Send invite
            </ThemedText>
          )}
        </Pressable>
      </View>

      {pending.length > 0 ? (
        <View style={styles.pendingList}>
          {pending.map((invite) => (
            <View key={invite.id} style={styles.pendingRow}>
              <ThemedText type="small">{invite.clientEmail}</ThemedText>
              <ThemedText type="small" themeColor="warning">
                Pending
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    gap: Spacing.two,
  },
  inviteRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  inviteButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonLabel: {
    color: '#FFFFFF',
  },
  pendingList: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
