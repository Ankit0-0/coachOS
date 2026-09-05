import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { PlanList } from '@/components/saved-plans/PlanList';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { useTheme } from '@/hooks/use-theme';
import { planApi, type Plan } from '@/lib/api';
import { planStatsLabel } from '@/lib/plan-format';

export function DietPlansScreen() {
  const theme = useTheme();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      planApi
        .list('DIET')
        .then((data) => {
          if (active) setPlans(data.own);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScreenScaffold>
      <DetailHeader title="Diet Plans" subtitle="All of your saved diet plans." />
      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <PlanList items={plans.map((plan) => ({ id: plan.id, title: plan.title, stats: planStatsLabel(plan) }))} />
      )}
    </ScreenScaffold>
  );
}
