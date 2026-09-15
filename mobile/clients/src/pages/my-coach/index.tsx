import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { buildTelUrl, startCall } from '@/lib/call';
import { longDateLabel } from '@/lib/dates';
import { formatPhone } from '@/lib/phone';
import { buildWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';
import {
  clientInviteApi,
  clientSubscriptionApi,
  coachRequestApi,
  type ClientInvite,
  type CoachRequest,
  type ClientSubscription,
  type InvitePerson,
} from '@/lib/api';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * The full coach screen, pushed from Home's coach strip — or, before there is
 * a coach, from the locked state, since pending invites are accepted here.
 */
export function MyCoachScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [coach, setCoach] = useState<InvitePerson | null>(null);
  const [pendingInvites, setPendingInvites] = useState<ClientInvite[]>([]);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(null);
  /** Requests this client sent from Explore that a coach hasn't answered yet. */
  const [sentRequests, setSentRequests] = useState<CoachRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  /** Inline, since Alert is a no-op on React Native Web. */
  const [contactError, setContactError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [accepted, pending, currentSubscription, requests] = await Promise.all([
        clientInviteApi.list('ACCEPTED'),
        clientInviteApi.list('PENDING'),
        // Null for an open-ended relationship, and a failure here shouldn't
        // take the whole screen down over a secondary detail.
        clientSubscriptionApi.get().catch(() => null),
        // Secondary too: the invites above are what gets a client started.
        coachRequestApi.list('PENDING').catch(() => [] as CoachRequest[]),
      ]);
      setCoach(accepted[0]?.coach ?? null);
      setPendingInvites(pending);
      setSubscription(currentSubscription);
      setSentRequests(requests);
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

  // Same loader as the initial load, so a failed refresh reports the same way.
  const { isRefreshing, refresh } = useRefresh(loadData);

  const handleCall = async () => {
    setContactError(null);
    const result = await startCall(coach?.phone);
    if (result.status === 'error') setContactError(result.message);
  };

  // Nothing prefilled: this opens a conversation, it doesn't send a message.
  const handleWhatsApp = async () => {
    setContactError(null);
    const result = await openWhatsApp(coach?.phone);
    if (result.status === 'error') setContactError(result.message);
  };

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

  const handleCancelRequest = async (request: CoachRequest) => {
    try {
      setActioningId(request.id);
      await coachRequestApi.cancel(request.id);
      setSentRequests((current) => current.filter((item) => item.id !== request.id));
    } catch (error) {
      // Already answered or cancelled elsewhere: the reload shows where it landed.
      Alert.alert('Could not cancel request', errorMessage(error));
      await loadData();
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
    <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader
        title="Your coach"
        subtitle={
          coach ? "Here's the coach you're working with." : 'Once a coach invites you and you accept, they’ll show up here.'
        }
      />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : coach ? (
        <ThemedView type="backgroundElement" style={[styles.panel, { borderColor: theme.border }]}>
          <View style={styles.identity}>
            <Avatar name={coach.name} size="md" imageUrl={coach.avatarUrl ?? null} />
            <View style={styles.identityCopy}>
              <ThemedText type="smallBold">{coach.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {coach.email}
              </ThemedText>
              {formatPhone(coach.phone) ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {formatPhone(coach.phone)}
                </ThemedText>
              ) : null}
            </View>
          </View>

          {/* Nothing renders when there is no record: an open-ended
              relationship is normal, not a missing value. */}
          {subscription ? (
            <ThemedText type="small" themeColor={subscription.status === 'ACTIVE' ? 'textSecondary' : 'warning'}>
              {subscription.status === 'ACTIVE'
                ? `Active until ${longDateLabel(subscription.endDate)}`
                : subscription.status === 'CANCELLED'
                  ? `Cancelled on ${longDateLabel(subscription.endDate)}`
                  : `Expired on ${longDateLabel(subscription.endDate)}`}
            </ThemedText>
          ) : null}

          {/* Hidden, not disabled, when the coach has no usable number. */}
          {buildTelUrl(coach.phone) && buildWhatsAppUrl(coach.phone) ? (
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                style={[styles.actionButton, { backgroundColor: theme.accent }]}
                onPress={() => void handleCall()}>
                <ThemedText type="smallBold" themeColor="onAccent">
                  Call
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => void handleWhatsApp()}>
                <ThemedText type="smallBold" themeColor="text">
                  Message on WhatsApp
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
          {contactError ? (
            <ThemedText type="small" themeColor="danger">
              {contactError}
            </ThemedText>
          ) : null}
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
                    <ActivityIndicator color={theme.onAccent} size="small" />
                  ) : (
                    <ThemedText type="small" themeColor="onAccent">
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
            <ThemedText type="smallBold" themeColor="onAccent">
              Explore coaches
            </ThemedText>
          </Pressable>
        </ThemedView>
      )}

      {!isLoading && sentRequests.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="smallBold">Requests you&apos;ve sent</ThemedText>
          {sentRequests.map((request) => (
            <ThemedView key={request.id} type="backgroundElement" style={[styles.inviteRow, { borderColor: theme.border }]}>
              <View style={styles.inviteInfo}>
                <ThemedText type="smallBold">{request.coach?.name ?? 'A coach'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Waiting for a reply · sent {longDateLabel(request.createdAt)}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Cancel request to ${request.coach?.name ?? 'coach'}`}
                style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => void handleCancelRequest(request)}
                disabled={actioningId === request.id}>
                {actioningId === request.id ? (
                  <ActivityIndicator color={theme.textSecondary} size="small" />
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Cancel
                  </ThemedText>
                )}
              </Pressable>
            </ThemedView>
          ))}
        </View>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityCopy: {
    flex: 1,
    gap: Spacing.half,
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
});
