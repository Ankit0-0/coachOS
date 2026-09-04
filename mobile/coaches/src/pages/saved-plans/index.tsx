import { StyleSheet, View } from 'react-native';

import { DietPlansCard } from '@/components/saved-plans/DietPlansCard';
import { ExploreDietPlansCard } from '@/components/saved-plans/ExploreDietPlansCard';
import { ExploreWorkoutPlansCard } from '@/components/saved-plans/ExploreWorkoutPlansCard';
import { WorkoutPlansCard } from '@/components/saved-plans/WorkoutPlansCard';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function SavedPlansScreen() {
  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          Coach OS
        </ThemedText>
        <ThemedText type="subtitle" style={styles.headline}>
          Saved Plans
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Reusable workout and diet plans you can assign to clients.
        </ThemedText>
      </View>

      <WorkoutPlansCard />
      <DietPlansCard />

      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Explore Plans
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Prebuilt plans available to every coach — assign them as-is or use them as a starting point.
        </ThemedText>
      </View>

      <ExploreWorkoutPlansCard />
      <ExploreDietPlansCard />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
  },
  sectionHeader: {
    gap: Spacing.half,
    paddingTop: Spacing.two,
  },
});
