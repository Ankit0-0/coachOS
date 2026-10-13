import { useFocusEffect } from 'expo-router';
import { useCallback, useImperativeHandle, useState, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, InsetPanel, Row } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import type { RefreshHandle } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { coachClientApi } from '@/lib/api';
import { lastNDaysRange, shortDateLabel } from '@/lib/dates';
import { changeLabel, formatLift, strengthRows, type StrengthRow } from '@/lib/strength';

/** Long enough to see a training block's progress, short enough to stay current. */
const LOOKBACK_DAYS = 84;
const PREVIEW_COUNT = 5;

/**
 * What the client has lifted over the last 12 weeks, one row per exercise:
 * the latest top set, the best, and the change since the first session. Loads
 * on its own so the rest of the client page doesn't wait for it.
 */
export function StrengthSection({ clientId, ref }: { clientId: string; ref?: Ref<RefreshHandle> }) {
  const theme = useTheme();
  const [rows, setRows] = useState<StrengthRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(strengthRows(await coachClientApi.exerciseProgress(clientId, lastNDaysRange(LOOKBACK_DAYS))));
    } catch {
      // Keep whatever is on screen.
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Lets the client page's pull-to-refresh wait for this section too.
  useImperativeHandle(ref, () => ({ reload: load }), [load]);

  const visible = showAll ? rows : rows.slice(0, PREVIEW_COUNT);

  return (
    <Section
      title="Strength"
      {...(rows.length > PREVIEW_COUNT
        ? { actionLabel: showAll ? 'Show less' : 'View all', onActionPress: () => setShowAll((current) => !current) }
        : {})}>
      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : rows.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText type="heading">No lifts logged yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            When your client logs the weight and reps for a set, their progress on each exercise shows here.
          </ThemedText>
        </Card>
      ) : (
        <Card style={styles.listCard}>
          <InsetPanel>
            {visible.map((row) => {
              const change = changeLabel(row.changeKg);
              return (
                <Row key={row.name} chevron={false}>
                  <View style={styles.copy}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {row.name}
                    </ThemedText>
                    <ThemedText type="meta" numberOfLines={1}>
                      Latest {formatLift(row.latest)} · {shortDateLabel(row.latestDate)}
                    </ThemedText>
                    {row.best ? (
                      <ThemedText type="meta" numberOfLines={1}>
                        Best {formatLift(row.best)} · {shortDateLabel(row.best.date)}
                      </ThemedText>
                    ) : null}
                  </View>
                  {change ? (
                    <Chip
                      label={change}
                      tone={row.changeKg && row.changeKg > 0 ? 'success' : row.changeKg && row.changeKg < 0 ? 'warning' : 'neutral'}
                    />
                  ) : (
                    <Chip label={`${row.sessions} ${row.sessions === 1 ? 'session' : 'sessions'}`} tone="neutral" />
                  )}
                </Row>
              );
            })}
          </InsetPanel>
        </Card>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    gap: Spacing.one,
  },
  listCard: {
    padding: Spacing.twoHalf,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
});
