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

export function WorkoutPlansScreen() {
  const theme = useTheme();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Shared by focus and pull-to-refresh, so a refresh reports failures the
  // same way the initial load does.
  const load = useCallback(async () => {
    try {
      const data = await planApi.list('WORKOUT');
      setPlans(data.own);
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
    <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title="Workout plans" subtitle="Every workout plan you've built." />
      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <PlanList
          items={plans.map(toPlanListEntry)}
          emptyLabel="No workout plans yet. Create one from the Plans tab."
        />
      )}
    </ScreenScaffold>
  );
}
