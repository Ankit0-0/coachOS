import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DietPlansCard } from '@/components/saved-plans/DietPlansCard';
import { ExploreDietPlansCard } from '@/components/saved-plans/ExploreDietPlansCard';
import { ExploreWorkoutPlansCard } from '@/components/saved-plans/ExploreWorkoutPlansCard';
import { WorkoutPlansCard } from '@/components/saved-plans/WorkoutPlansCard';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { planApi, type Plan } from '@/lib/api';

type PlanGroup = { own: Plan[]; defaults: Plan[] };

const EMPTY_GROUP: PlanGroup = { own: [], defaults: [] };

export function SavedPlansScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [workout, setWorkout] = useState<PlanGroup>(EMPTY_GROUP);
  const [diet, setDiet] = useState<PlanGroup>(EMPTY_GROUP);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([planApi.list('WORKOUT'), planApi.list('DIET')])
        .then(([workoutPlans, dietPlans]) => {
          if (!active) return;
          setWorkout(workoutPlans);
          setDiet(dietPlans);
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
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="display">Plans</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Build a plan once, then assign it to as many clients as you like.
        </ThemedText>
      </View>

      <Button label="New plan" onPress={() => router.push('/create-plan')} fullWidth />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <>
          <WorkoutPlansCard plans={workout.own} />
          <DietPlansCard plans={diet.own} />
          <ExploreWorkoutPlansCard plans={workout.defaults} />
          <ExploreDietPlansCard plans={diet.defaults} />
        </>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
});
