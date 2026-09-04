import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clientInviteApi, type ClientInvite, type InvitePerson } from '@/lib/api';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function notAvailableYet(action: string) {
  Alert.alert(action, 'Not available yet.');
}

export function MyCoachScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [coach, setCoach] = useState<InvitePerson | null>(null);
  const [pendingInvites, setPendingInvites] = useState<ClientInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [accepted, pending] = await Promise.all([
        clientInviteApi.list('ACCEPTED'),
        clientInviteApi.list('PENDING'),
      ]);
      setCoach(accepted[0]?.coach ?? null);
      setPendingInvites(pending);
    } catch (error) {
      Alert.alert('Could not load your coach', errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAccept = async (invite: ClientInvite) => {
    try {
      setActioningId(invite.id);
      await clientInviteApi.accept(invite.id);
      await loadData();
    } catch (error) {
      Alert.alert('Could not accept invite', errorMessage(error));
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (invite: ClientInvite) => {
    try {
      setActioningId(invite.id);
      await clientInviteApi.decline(invite.id);
      setPendingInvites((current) => current.filter((item) => item.id !== invite.id));
    } catch (error) {
      Alert.alert('Could not decline invite', errorMessage(error));
    } finally {
      setActioningId(null);
    }
  };

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
          {coach
            ? "Here's the coach you're working with."
            : 'Once a coach invites you and you accept, they’ll show up here.'}
        </ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : coach ? (
        <ThemedView type="backgroundElement" style={[styles.panel, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">{coach.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {coach.email}
          </ThemedText>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.accent }]}
              onPress={() => notAvailableYet('Call')}>
              <ThemedText type="smallBold" style={styles.actionButtonLabel}>
                Call
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => notAvailableYet('Message')}>
              <ThemedText type="smallBold" themeColor="text">
                Message
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      ) : pendingInvites.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="smallBold">Pending invites</ThemedText>
          {pendingInvites.map((invite) => (
            <ThemedView key={invite.id} type="backgroundElement" style={[styles.inviteRow, { borderColor: theme.border }]}>
              <View style={styles.inviteInfo}>
                <ThemedText type="smallBold">{invite.coach?.name ?? 'A coach'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {invite.coach?.email ?? ''}
                </ThemedText>
              </View>
              <View style={styles.inviteActions}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.accent }]}
                  onPress={() => handleAccept(invite)}
                  disabled={actioningId === invite.id}>
                  {actioningId === invite.id ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <ThemedText type="small" style={styles.actionButtonLabel}>
                      Accept
                    </ThemedText>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => handleDecline(invite)}
                  disabled={actioningId === invite.id}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Decline
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))}
        </View>
      ) : (
        <ThemedView type="backgroundElement" style={[styles.panel, styles.emptyPanel, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">No coach yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Browse coaches and find the right fit for your goals.
          </ThemedText>
          <Pressable
            style={[styles.exploreButton, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/explore-coaches')}>
            <ThemedText type="smallBold" style={styles.actionButtonLabel}>
              Explore coaches
            </ThemedText>
          </Pressable>
        </ThemedView>
      )}
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
    gap: Spacing.two,
  },
  emptyPanel: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  exploreButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  inviteRow: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLabel: {
    color: '#FFFFFF',
  },
});
