import { StyleSheet, View } from 'react-native';

import { PlanCard } from '@/components/plan-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { todaysPlanCards } from '@/utils/dashboard-data';

export function HomeScreen() {
  const theme = useTheme();

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          Coach OS
        </ThemedText>
        <ThemedText type="subtitle" style={styles.headline}>
          Ready for today?
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Your coach has lined up the two things that matter most today: training and food.
        </ThemedText>
      </View>

      <ThemedView type="accentSoft" style={styles.progressPanel}>
        <View>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            Daily focus
          </ThemedText>
          <ThemedText style={styles.progressTitle}>Move well, eat steady, recover tonight.</ThemedText>
        </View>
        <View style={styles.progressStats}>
          <ThemedText type="smallBold">2 blocks</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Estimated 55 min total effort
          </ThemedText>
        </View>
      </ThemedView>

      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Today
        </ThemedText>
      </View>

      <View style={styles.cards}>
        {todaysPlanCards.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </View>
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
  progressPanel: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  progressTitle: {
    fontSize: 18,
    lineHeight: 26,
    paddingTop: Spacing.one,
  },
  progressStats: {
    gap: Spacing.half,
  },
  sectionHeader: {
    marginBottom: -Spacing.two,
  },
  cards: {
    gap: Spacing.three,
  },
});
