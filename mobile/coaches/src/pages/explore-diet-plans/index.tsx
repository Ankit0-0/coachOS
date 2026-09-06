import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { PlanList } from '@/components/saved-plans/PlanList';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { useTheme } from '@/hooks/use-theme';
import { planApi, type Plan } from '@/lib/api';
import { toPlanListEntry } from '@/lib/plan-format';

export function ExploreDietPlansScreen() {
  const theme = useTheme();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      planApi
        .list('DIET')
        .then((data) => {
          if (active) setPlans(data.defaults);
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
      <DetailHeader title="Shared diet plans" subtitle="Prebuilt plans any coach can assign." />
      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <PlanList items={plans.map(toPlanListEntry)} emptyLabel="No shared diet plans are available yet." />
      )}
    </ScreenScaffold>
  );
}
