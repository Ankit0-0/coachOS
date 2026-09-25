import { useFocusEffect } from 'expo-router';
import { useCallback, useImperativeHandle, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { CountBadge } from '@coachos/theme';

import { SubscriptionPeriodPicker } from '@/components/subscription-period-picker';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import type { RefreshHandle } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, coachingRequestApi, type CoachingRequest } from '@/lib/api';
import { longDateLabel } from '@/lib/dates';
import { defaultPeriod, type PeriodDraft, periodError, periodInput } from '@/lib/subscription-period';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 423) {
    return 'Your account is waiting for approval, so you can’t take on clients yet.';
  }
  if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
    return 'That request was already answered or withdrawn.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

type RequestsSectionProps = {
  /** Called after an accept, so the roster can reload and show the new client. */
  onAccepted?: () => void;
  ref?: Ref<RefreshHandle>;
};

/**
 * Clients who found this coach in Explore and asked to join. Renders nothing
 * when there are none, so coaches who aren't listed never see an empty box.
 */
export function RequestsSection({ onAccepted, ref }: RequestsSectionProps) {
  const theme = useTheme();
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The request being accepted: its card shows the period step before confirming. */
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodDraft>(() => defaultPeriod());

  const load = useCallback(async () => {
    try {
      setRequests(await coachingRequestApi.list('PENDING'));
    } catch {
      // Secondary to the roster; a failed load just shows no requests this time.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useImperativeHandle(ref, () => ({ reload: load }), [load]);

  function startAccepting(request: CoachingRequest) {
    setPeriod(defaultPeriod());
    setAcceptingId(request.id);
  }

  async function respond(request: CoachingRequest, action: 'accept' | 'decline') {
    if (action === 'accept' && periodError(period)) return;
    setActioningId(request.id);
    setError(null);
    try {
      if (action === 'accept') {
        await coachingRequestApi.accept(request.id, periodInput(period));
        setAcceptingId(null);
        onAccepted?.();
      } else {
        await coachingRequestApi.decline(request.id);
      }
      setRequests((current) => current.filter((item) => item.id !== request.id));
    } catch (err) {
      setError(errorMessage(err));
      await load();
    } finally {
      setActioningId(null);
    }
  }

  if (requests.length === 0 && !error) return null;

  return (
    <Section title="Requests" trailing={<CountBadge count={requests.length} accessibilityLabel={`${requests.length} pending`} />}>
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        </View>
      ) : null}

      {requests.map((request) => {
        const isBusy = actioningId === request.id;
        const isAccepting = acceptingId === request.id;
        return (
          <Card key={request.id} style={styles.card}>
            <View style={styles.header}>
              <Avatar name={request.client?.name ?? 'A client'} size="row" tone="warm" />
              <View style={styles.who}>
                <ThemedText type="smallBold">{request.client?.name ?? 'A client'}</ThemedText>
                {request.client?.email ? (
                  <ThemedText type="meta" numberOfLines={1}>
                    {request.client.email}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="meta">{longDateLabel(request.createdAt)}</ThemedText>
            </View>

            {request.message ? (
              <View style={[styles.message, { backgroundColor: theme.surfaceInset }]}>
                <ThemedText type="small">{request.message}</ThemedText>
              </View>
            ) : null}

            {isAccepting ? (
              <SubscriptionPeriodPicker value={period} onChange={setPeriod} disabled={isBusy} />
            ) : null}

            <View style={styles.actions}>
              <View style={styles.action}>
                {isAccepting ? (
                  <Button label="Back" variant="secondary" onPress={() => setAcceptingId(null)} disabled={isBusy} fullWidth />
                ) : (
                  <Button
                    label="Decline"
                    variant="secondary"
                    onPress={() => void respond(request, 'decline')}
                    disabled={isBusy}
                    fullWidth
                  />
                )}
              </View>
              <View style={styles.action}>
                {isAccepting ? (
                  <Button label="Confirm" onPress={() => void respond(request, 'accept')} loading={isBusy} fullWidth />
                ) : (
                  <Button label="Accept" onPress={() => startAccepting(request)} disabled={isBusy} fullWidth />
                )}
              </View>
            </View>
          </Card>
        );
      })}
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  who: {
    flex: 1,
    gap: Spacing.half,
  },
  message: {
    borderRadius: Radii.md,
    padding: Spacing.twoHalf,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
});
