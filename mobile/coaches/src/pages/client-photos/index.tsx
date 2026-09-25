import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { mealPhotos, physiquePhotos, PhotoGrid } from '@/components/client-detail/ClientPhotos';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radii, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { assignmentApi, coachClientApi, type CheckIn, type PlanAssignment, type WeightEntry } from '@/lib/api';
import { lastNDaysRange } from '@/lib/dates';

/** Wider than the detail page's month, which only shows the newest few. */
const HISTORY_DAYS = 365;

type Filter = 'all' | 'physique' | 'meal';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'physique', label: 'Physique' },
  { value: 'meal', label: 'Meal' },
];

export function ClientPhotosScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ clientId: string; name?: string; filter?: string }>();
  const clientId = params.clientId;
  const [filter, setFilter] = useState<Filter>(
    params.filter === 'physique' || params.filter === 'meal' ? params.filter : 'all',
  );

  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const range = lastNDaysRange(HISTORY_DAYS);
    try {
      const [weightRows, checkInRows, assignmentRows] = await Promise.all([
        coachClientApi.listWeights(clientId, range),
        coachClientApi.listCheckIns(clientId, range),
        assignmentApi.listForClient(clientId),
      ]);
      setWeights(weightRows);
      setCheckIns(checkInRows);
      setAssignments(assignmentRows);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load photos.');
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

  const planByAssignmentId = new Map(assignments.map((assignment) => [assignment.id, assignment.plan]));
  const photos = [
    ...(filter === 'meal' ? [] : physiquePhotos(weights)),
    ...(filter === 'physique' ? [] : mealPhotos(checkIns, planByAssignmentId)),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title="Photos" subtitle={params.name ? `${params.name} · last 12 months` : 'Last 12 months'} />

      <View style={styles.filters} accessibilityRole="tablist">
        {FILTERS.map((option) => {
          const selected = option.value === filter;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(option.value)}
              style={[
                styles.filter,
                { borderColor: theme.border },
                selected && { backgroundColor: theme.chipBg, borderColor: theme.primary },
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'textPrimary'}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : photos.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            No photos in the last 12 months.
          </ThemedText>
        </Card>
      ) : (
        <Card>
          <PhotoGrid photos={photos} />
        </Card>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filter: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
