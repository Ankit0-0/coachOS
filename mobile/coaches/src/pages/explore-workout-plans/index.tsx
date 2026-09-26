import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { PlanList } from '@/components/saved-plans/PlanList';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { planApi, type Plan } from '@/lib/api';
import { toPlanListEntry } from '@/lib/plan-format';

export function ExploreWorkoutPlansScreen() {
  const theme = useTheme();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Shared by focus and pull-to-refresh, so a refresh reports failures the
  // same way the initial load does.
  const load = useCallback(async () => {
    try {
      const data = await planApi.list('WORKOUT');
      setPlans(data.defaults);
    } catch {
      // As before: keep what's on screen; the list shows its empty state.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const { isRefreshing, refresh } = useRefresh(load);

  return (
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title="Shared workout plans" subtitle="Prebuilt plans any coach can assign." />
      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <PlanList items={plans.map(toPlanListEntry)} emptyLabel="No shared workout plans are available yet." />
      )}
    </ScreenScaffold>
  );
}
