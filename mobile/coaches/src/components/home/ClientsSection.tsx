import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useImperativeHandle, useState, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ClientListItem } from '@/components/clients/ClientListItem';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, InsetPanel, Row } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import type { RefreshHandle } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { coachInviteApi, type CoachInvite } from '@/lib/api';
import { SegmentedControl, TextField } from '@coachos/theme';

const PREVIEW_COUNT = 4;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/** `ref.reload()` reloads the roster, e.g. on pull-to-refresh or after accepting a request. */
export function ClientsSection({ ref }: { ref?: Ref<RefreshHandle> }) {
  const theme = useTheme();
  const router = useRouter();
  const [clients, setClients] = useState<CoachInvite[]>([]);
  const [pending, setPending] = useState<CoachInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  /** Null means an open-ended relationship: no subscription record is created. */
  const [durationMonths, setDurationMonths] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  // Inline rather than Alert, which is a no-op on React Native Web — routed
  // through Alert, none of these messages appeared in a browser at all.
  const [formError, setFormError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      const [accepted, pendingInvites] = await Promise.all([
        coachInviteApi.list('ACCEPTED'),
        coachInviteApi.list('PENDING'),
      ]);
      setClients(accepted);
      setPending(pendingInvites);
    } catch {
      // As before: keep the roster on screen.
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Lets the screen's pull-to-refresh wait for the roster to finish loading.
  useImperativeHandle(ref, () => ({ reload: loadInvites }), [loadInvites]);

  useFocusEffect(
    useCallback(() => {
      void loadInvites();
    }, [loadInvites]),
  );

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError('Add the email address your client signs in with.');
      return;
    }

    try {
      setIsSending(true);
      setFormError(null);
      await coachInviteApi.create(trimmed, durationMonths ?? undefined);
      setEmail('');
      setDurationMonths(null);
      void loadInvites();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const preview = clients.slice(0, PREVIEW_COUNT);
  const hasMore = clients.length > PREVIEW_COUNT;

  return (
    <View style={styles.container}>
      <Section
        title="Roster"
        trailing={clients.length > 0 ? <Chip label={`${clients.length}`} tone="terracotta" /> : undefined}
        {...(hasMore ? { actionLabel: 'View all', onActionPress: () => router.push('/clients') } : {})}>
        {isLoading ? (
          <ActivityIndicator color={theme.textSecondary} />
        ) : preview.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText type="heading">No clients yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Invite someone below and they&apos;ll appear here once they accept.
            </ThemedText>
          </Card>
        ) : (
          <Card style={styles.listCard}>
            <InsetPanel>
              {preview.map((invite) => (
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
      </Section>

      <Section title="Invite a client">
        <Card style={styles.inviteCard}>
          <View style={styles.inviteRow}>
            <TextField
              style={styles.emailInput}
              accessibilityLabel="Client email"
              placeholder="client@example.com"
              value={email}
              onChangeText={setEmail}
              editable={!isSending}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button label="Send" onPress={handleInvite} loading={isSending} />
          </View>

          <View style={styles.durationBlock}>
            <ThemedText type="label" themeColor="textSecondary">
              Subscription length
            </ThemedText>
            <SegmentedControl
              options={DURATION_SEGMENTS}
              value={durationKey(durationMonths)}
              onChange={(key) => setDurationMonths(key === 'none' ? null : Number(key))}
              disabled={isSending}
              accessibilityLabel="Subscription length"
            />
          </View>

          {formError ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
              <ThemedText type="small" themeColor="danger">
                {formError}
              </ThemedText>
            </View>
          ) : null}

          {pending.length > 0 ? (
            <InsetPanel>
              {pending.map((invite) => (
                <Row key={invite.id}>
                  <ThemedText type="small" numberOfLines={1} style={styles.pendingEmail}>
                    {invite.clientEmail}
                  </ThemedText>
                  <Chip label="Awaiting reply" tone="warning" />
                </Row>
              ))}
            </InsetPanel>
          ) : null}
        </Card>
      </Section>
    </View>
  );
}

type DurationKey = '1' | '3' | '6' | '12' | 'none';

/** Short labels so five segments fit a phone; the full wording is read out. */
const DURATION_SEGMENTS: { value: DurationKey; label: string; accessibilityLabel: string }[] = [
  { value: '1', label: '1 mo', accessibilityLabel: '1 month' },
  { value: '3', label: '3 mo', accessibilityLabel: '3 months' },
  { value: '6', label: '6 mo', accessibilityLabel: '6 months' },
  { value: '12', label: '12 mo', accessibilityLabel: '12 months' },
  { value: 'none', label: 'Ongoing', accessibilityLabel: 'No fixed period' },
];

function durationKey(months: number | null): DurationKey {
  return months === null ? 'none' : (String(months) as DurationKey);
}

const styles = StyleSheet.create({
  durationBlock: {
    gap: Spacing.two,
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
  emptyCard: {
    gap: Spacing.one,
  },
  listCard: {
    padding: Spacing.twoHalf,
  },
  inviteCard: {
    gap: Spacing.three,
  },
  emailInput: {
    flex: 1,
  },
  container: {
    gap: Spacing.four,
  },
  inviteRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  pendingEmail: {
    flexShrink: 1,
  },
});
