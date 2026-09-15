import { useFocusEffect } from 'expo-router';
import { useCallback, useImperativeHandle, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import type { RefreshHandle } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, coachingRequestApi, type CoachingRequest } from '@/lib/api';
import { longDateLabel } from '@/lib/dates';

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

  async function respond(request: CoachingRequest, action: 'accept' | 'decline') {
    setActioningId(request.id);
    setError(null);
    try {
      if (action === 'accept') {
        await coachingRequestApi.accept(request.id);
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
    <Section title={`Requests (${requests.length})`}>
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        </View>
      ) : null}

      {requests.map((request) => {
        const isBusy = actioningId === request.id;
        return (
          <Card key={request.id} style={styles.card}>
            <View style={styles.header}>
              <View style={styles.who}>
                <ThemedText type="smallBold">{request.client?.name ?? 'A client'}</ThemedText>
                {request.client?.email ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {request.client.email}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="meta">{longDateLabel(request.createdAt)}</ThemedText>
            </View>

            {request.message ? (
              <View style={[styles.message, { backgroundColor: theme.surfaceSunken }]}>
                <ThemedText type="small">{request.message}</ThemedText>
              </View>
            ) : null}

            <View style={styles.actions}>
              <View style={styles.action}>
                <Button
                  label="Decline"
                  variant="secondary"
                  onPress={() => void respond(request, 'decline')}
                  disabled={isBusy}
                  fullWidth
                />
              </View>
              <View style={styles.action}>
                <Button label="Accept" onPress={() => void respond(request, 'accept')} loading={isBusy} fullWidth />
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
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  who: {
    flex: 1,
    gap: Spacing.half,
  },
  message: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
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
