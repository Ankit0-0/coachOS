import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { EXPERIENCE_ICON, StatChip } from '@/components/explore/StatChip';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, InsetPanel, Row } from '@/components/ui/card';
import { FieldRow } from '@/components/ui/field-row';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Chip, Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { buildTelUrl, startCall } from '@/lib/call';
import { expiredInviteMessage, inviteSwitchWarning } from '@/lib/coach-switch';
import { confirmDestructive } from '@/lib/confirm';
import { longDateLabel } from '@/lib/dates';
import { experienceLabel } from '@/lib/explore';
import { formatPhone } from '@/lib/phone';
import { summariseSubscription } from '@/lib/subscription';
import { buildWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';
import {
  ApiError,
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
  /** A small notice under the contact buttons, since Alert is a no-op on React Native Web. */
  const [contactError, setContactError] = useState<string | null>(null);
  const dismissContactError = useCallback(() => setContactError(null), []);

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

  const coachExperience = coach ? experienceLabel(coach.yearsExperience ?? null) : null;
  // The API returns the client's latest period with any coach; only one with this coach belongs here.
  const subscriptionSummary =
    coach && subscription && subscription.coachId === coach.id ? summariseSubscription(subscription) : null;

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
    // One coach at a time: accepting ends the current one, so ask first, by name.
    if (invite.currentCoach) {
      const confirmed = await confirmDestructive({
        title: 'Switch coach?',
        message: inviteSwitchWarning(invite.currentCoach),
        confirmLabel: 'Continue',
      });
      if (!confirmed) return;
    }
    try {
      setActioningId(invite.id);
      await clientInviteApi.accept(invite.id);
      await loadData();
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 410 ? expiredInviteMessage(invite.coach?.name) : errorMessage(error);
      Alert.alert('Could not accept invite', message);
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

  const pendingSection = (
    <Section title="Pending invites">
      <Card style={styles.listCard}>
        <InsetPanel>
          {pendingInvites.map((invite) => (
            <Row key={invite.id} style={[styles.inviteRow, styles.wrapRow]}>
              <Avatar name={invite.coach?.name ?? 'A coach'} size="row" imageUrl={invite.coach?.avatarUrl ?? null} />
              <View style={styles.inviteInfo}>
                <ThemedText type="smallBold">{invite.coach?.name ?? 'A coach'}</ThemedText>
                <ThemedText type="meta" numberOfLines={1}>
                  {invite.coach?.email ?? ''}
                </ThemedText>
              </View>
              {/* Own line under the name, so a long name isn't squeezed. */}
              <View style={styles.pendingActions}>
                <View style={styles.pendingAction}>
                  <Button
                    label="Decline"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onPress={() => handleDecline(invite)}
                    disabled={actioningId === invite.id}
                  />
                </View>
                <View style={styles.pendingAction}>
                  <Button
                    label="Accept"
                    size="sm"
                    fullWidth
                    loading={actioningId === invite.id}
                    onPress={() => handleAccept(invite)}
                  />
                </View>
              </View>
            </Row>
          ))}
        </InsetPanel>
      </Card>
    </Section>
  );

  return (
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader
        title="Your coach"
        subtitle={
          coach ? "Here's the coach you're working with." : 'Once a coach invites you and you accept, they’ll show up here.'
        }
      />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : coach ? (
        <>
          <Card style={styles.coachCard}>
            <View style={styles.identity}>
              <Avatar name={coach.name} size="lg" imageUrl={coach.avatarUrl ?? null} />
              <View style={styles.identityCopy}>
                <ThemedText type="heading">{coach.name}</ThemedText>
                {coachExperience ? <StatChip icon={EXPERIENCE_ICON} label={coachExperience} /> : null}
              </View>
            </View>

            <View style={styles.contactLines}>
              <ThemedText type="small" themeColor="textSecondary">
                {coach.email}
              </ThemedText>
              {formatPhone(coach.phone) ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {formatPhone(coach.phone)}
                </ThemedText>
              ) : null}
            </View>

            {/* Hidden, not disabled, when the coach has no usable number. */}
            {buildTelUrl(coach.phone) && buildWhatsAppUrl(coach.phone) ? (
              <View style={styles.actionRow}>
                <View style={styles.action}>
                  <Button label="Call" onPress={() => void handleCall()} fullWidth />
                </View>
                <View style={styles.action}>
                  <Button label="WhatsApp" variant="secondary" onPress={() => void handleWhatsApp()} fullWidth />
                </View>
              </View>
            ) : null}
            <InlineNotice message={contactError} onDismiss={dismissContactError} />
          </Card>

          <Section title="About">
            <Card style={styles.aboutCard}>
              <ThemedText type="small" themeColor={coach.bio ? 'textPrimary' : 'textSecondary'}>
                {coach.bio ?? `${coach.name} hasn’t written a bio yet.`}
              </ThemedText>
              {coach.specialties && coach.specialties.length > 0 ? (
                <View style={styles.specialties}>
                  {coach.specialties.map((specialty) => (
                    <Chip key={specialty} label={specialty} tone="green" />
                  ))}
                </View>
              ) : null}
            </Card>
          </Section>

          {/* Only a period with this coach, and nothing at all without one: an
              open-ended relationship is normal, not a missing value. */}
          {subscriptionSummary ? (
            <Section title="Subscription">
              <Card padded={false} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHead}>
                  <ThemedText type="smallBold">{subscriptionSummary.detail}</ThemedText>
                  <Pill label={subscriptionSummary.label} tone={subscriptionSummary.tone} />
                </View>
                <FieldRow label="Started" value={subscriptionSummary.startLabel} />
                <FieldRow label={subscriptionSummary.endHeading} value={subscriptionSummary.endLabel} divider={false} />
              </Card>
            </Section>
          ) : null}

          {/* Another coach's invite: accepting it asks first, since it ends this relationship. */}
          {pendingInvites.length > 0 ? pendingSection : null}
        </>
      ) : pendingInvites.length > 0 ? (
        pendingSection
      ) : (
        <Card style={styles.emptyPanel}>
          <ThemedText type="heading">No coach yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Browse coaches and find the right fit for your goals.
          </ThemedText>
          <Button label="Explore coaches" fullWidth onPress={() => router.push('/explore-coaches')} />
        </Card>
      )}

      {!isLoading && sentRequests.length > 0 ? (
        <Section title="Requests you've sent">
          <Card style={styles.listCard}>
            <InsetPanel>
              {sentRequests.map((request) => (
                <Row key={request.id} style={styles.inviteRow}>
                  <View style={styles.inviteInfo}>
                    <ThemedText type="smallBold">{request.coach?.name ?? 'A coach'}</ThemedText>
                    <ThemedText type="meta">Waiting for a reply · sent {longDateLabel(request.createdAt)}</ThemedText>
                  </View>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    size="sm"
                    accessibilityLabel={`Cancel request to ${request.coach?.name ?? 'coach'}`}
                    loading={actioningId === request.id}
                    onPress={() => void handleCancelRequest(request)}
                  />
                </Row>
              ))}
            </InsetPanel>
          </Card>
        </Section>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  coachCard: {
    gap: Spacing.three,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityCopy: {
    flex: 1,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  contactLines: {
    gap: Spacing.half,
  },
  action: {
    flex: 1,
  },
  aboutCard: {
    gap: Spacing.three,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  subscriptionCard: {
    paddingHorizontal: Spacing.four,
  },
  subscriptionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  emptyPanel: {
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  emptyText: {
    textAlign: 'center',
  },
  listCard: {
    padding: Spacing.twoHalf,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  inviteRow: {
    paddingVertical: Spacing.twoHalf,
  },
  inviteInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  wrapRow: {
    flexWrap: 'wrap',
  },
  pendingActions: {
    flexBasis: '100%',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pendingAction: {
    flex: 1,
  },
});
