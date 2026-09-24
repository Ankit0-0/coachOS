import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { coachClientApi, type CheckIn } from '@/lib/api';
import { lastNDaysRange, longDateLabel } from '@/lib/dates';

/** Wider than the detail page's month, which only shows the newest few. */
const HISTORY_DAYS = 365;

export function ClientNotesScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ clientId: string; name?: string }>();
  const clientId = params.clientId;

  const [notes, setNotes] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await coachClientApi.listCheckIns(clientId, lastNDaysRange(HISTORY_DAYS));
      setNotes(
        rows
          .filter((checkIn) => checkIn.notes && checkIn.notes.trim().length > 0)
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load notes.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const { isRefreshing, refresh } = useRefresh(load);

  return (
    <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title="Notes" subtitle={params.name ? `${params.name} · last 12 months` : 'Last 12 months'} />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : notes.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            No notes in the last 12 months.
          </ThemedText>
        </Card>
      ) : (
        <Card padded={false}>
          {notes.map((checkIn, index) => (
            <View
              key={checkIn.id}
              style={[
                styles.row,
                index < notes.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}>
              <ThemedText type="meta">{longDateLabel(checkIn.date)}</ThemedText>
              <ThemedText type="small">{checkIn.notes}</ThemedText>
            </View>
          ))}
        </Card>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
    padding: Spacing.three,
  },
});
