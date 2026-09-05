import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { DietPlansCard } from '@/components/saved-plans/DietPlansCard';
import { ExploreDietPlansCard } from '@/components/saved-plans/ExploreDietPlansCard';
import { ExploreWorkoutPlansCard } from '@/components/saved-plans/ExploreWorkoutPlansCard';
import { WorkoutPlansCard } from '@/components/saved-plans/WorkoutPlansCard';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
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
        <ThemedText type="smallBold" themeColor="accent">
          Coach OS
        </ThemedText>
        <View style={styles.headlineRow}>
          <ThemedText type="subtitle" style={styles.headline}>
            Saved Plans
          </ThemedText>
          <Pressable
            style={[styles.createButton, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/create-plan')}>
            <ThemedText type="smallBold" style={styles.createButtonLabel}>
              + Create plan
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText themeColor="textSecondary">
          Reusable workout and diet plans you can assign to clients.
        </ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <>
          <WorkoutPlansCard plans={workout.own} />
          <DietPlansCard plans={diet.own} />

          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Explore Plans
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Prebuilt plans available to every coach — assign them as-is or use them as a starting point.
            </ThemedText>
          </View>

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
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
  },
  createButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  createButtonLabel: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    gap: Spacing.half,
    paddingTop: Spacing.two,
  },
});
