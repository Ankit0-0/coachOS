import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MonthlyActivityCalendar, type DailyActivity } from '@/components/history/MonthlyActivityCalendar';
import { WeightChart, type WeightPoint } from '@/components/history/WeightChart';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { trackingApi, type CheckIn, type TrackingAssignment, type WeightEntry } from '@/lib/api';
import { currentMonthRange, dayOfMonth, lastNDaysRange, todayKey, weekdayLabel } from '@/lib/dates';

type WorkoutPlanContent = { exercises: { id: string; sets: number }[] };
type DietPlanContent = { meals: { id: string }[] };

function workoutItemIds(assignment?: TrackingAssignment): Set<string> {
  const content = assignment?.content as unknown as WorkoutPlanContent | undefined;
  const ids = new Set<string>();
  for (const exercise of content?.exercises ?? []) {
    for (let n = 1; n <= exercise.sets; n += 1) {
      ids.add(`${exercise.id}-set${n}`);
    }
  }
  return ids;
}

function dietItemIds(assignment?: TrackingAssignment): Set<string> {
  const content = assignment?.content as unknown as DietPlanContent | undefined;
  return new Set((content?.meals ?? []).map((meal) => meal.id));
}

function completedMatches(checkIn: CheckIn | undefined, validIds: Set<string>): number {
  if (!checkIn) return 0;
  return checkIn.completedItemIds.filter((id) => validIds.has(id)).length;
}

export function HistoryScreen() {
  const theme = useTheme();
  const { workout: workoutAssignment, diet: dietAssignment } = useTrackingAssignments();

  const [workoutCheckIns, setWorkoutCheckIns] = useState<CheckIn[]>([]);
  const [dietCheckIns, setDietCheckIns] = useState<CheckIn[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weightInput, setWeightInput] = useState('');
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);
  const [weightMessage, setWeightMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const month = currentMonthRange();
      const week = lastNDaysRange(7);
      try {
        const [workoutRows, dietRows, weightRows] = await Promise.all([
          workoutAssignment
            ? trackingApi.listCheckIns({
                assignmentId: workoutAssignment.id,
                from: month.from,
                to: month.to,
              })
            : Promise.resolve<CheckIn[]>([]),
          dietAssignment
            ? trackingApi.listCheckIns({
                assignmentId: dietAssignment.id,
                from: month.from,
                to: month.to,
              })
            : Promise.resolve<CheckIn[]>([]),
          trackingApi.listWeights(week),
        ]);
        if (!active) return;
        setWorkoutCheckIns(workoutRows);
        setDietCheckIns(dietRows);
        setWeights(weightRows);
      } catch {
        // Leave the current state as-is; the user can pull the screen again.
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [workoutAssignment, dietAssignment]);

  const month = currentMonthRange();
  const workoutIds = workoutItemIds(workoutAssignment);
  const dietIds = dietItemIds(dietAssignment);

  const dailyActivity: DailyActivity[] = Array.from(
    { length: month.daysInMonth },
    (_, index) => index + 1,
  ).map((day) => {
    const workoutCheckIn = workoutCheckIns.find((checkIn) => dayOfMonth(checkIn.date) === day);
    const dietCheckIn = dietCheckIns.find((checkIn) => dayOfMonth(checkIn.date) === day);
    return {
      date: day,
      workoutCompleted: completedMatches(workoutCheckIn, workoutIds),
      workoutTotal: workoutIds.size,
      dietCompleted: completedMatches(dietCheckIn, dietIds),
      dietTotal: dietIds.size,
    };
  });

  const completedDays = dailyActivity.filter(
    (entry) => entry.workoutCompleted > 0 || entry.dietCompleted > 0,
  ).length;

  const weightPoints: WeightPoint[] = weights.map((entry) => ({
    day: weekdayLabel(entry.date),
    value: entry.weightKg,
  }));
  const average =
    weightPoints.length > 0
      ? weightPoints.reduce((sum, point) => sum + point.value, 0) / weightPoints.length
      : null;

  const handleLogWeight = async () => {
    const kg = Number.parseFloat(weightInput);
    if (!Number.isFinite(kg) || kg <= 0) {
      setWeightMessage('Enter a weight in kilograms (e.g. 70.5).');
      return;
    }
    try {
      setIsLoggingWeight(true);
      setWeightMessage(null);
      await trackingApi.saveWeight({ date: todayKey(), weightKg: kg });
      setWeightInput('');
      const week = lastNDaysRange(7);
      const updated = await trackingApi.listWeights(week);
      setWeights(updated);
      setWeightMessage('Saved today\u2019s weight.');
    } catch (error) {
      setWeightMessage(
        error instanceof Error ? error.message : 'Could not save the weight. Please try again.',
      );
    } finally {
      setIsLoggingWeight(false);
    }
  };

  return (
    <ScreenScaffold>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          History
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Weight trend
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={[styles.chartCard, { borderColor: theme.border }]}>
        <View style={styles.chartHeader}>
          <ThemedText type="smallBold">Weekly weight</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isLoading ? 'Loading…' : average !== null ? `${average.toFixed(1)} kg avg` : 'No data yet'}
          </ThemedText>
        </View>

        <WeightChart data={weightPoints} />

        <View style={styles.weightForm}>
          <TextInput
            style={[
              styles.weightInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            placeholder="Today's weight (kg)"
            placeholderTextColor={theme.textSecondary}
            editable={!isLoggingWeight}
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleLogWeight}
            disabled={isLoggingWeight}
            style={({ pressed }) => [
              styles.logButton,
              { backgroundColor: theme.accent, opacity: isLoggingWeight ? 0.6 : pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText type="smallBold" style={styles.logButtonText}>
              {isLoggingWeight ? 'Saving…' : 'Save weight'}
            </ThemedText>
          </Pressable>
        </View>
        {weightMessage ? (
          <ThemedText
            type="small"
            themeColor={weightMessage.startsWith('Saved') ? 'success' : 'warning'}
            style={styles.weightMessage}>
            {weightMessage}
          </ThemedText>
        ) : null}
      </ThemedView>

      <ThemedView type="backgroundElement" style={[styles.activityCard, { borderColor: theme.border }]}>
        <View style={styles.activityHeader}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {month.label}
          </ThemedText>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.summaryText}>
          Target achieved {completedDays}/{month.daysInMonth} days
        </ThemedText>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.workoutDot]} />
            <ThemedText type="small" themeColor="textSecondary">Workout</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.dietDot]} />
            <ThemedText type="small" themeColor="textSecondary">Diet</ThemedText>
          </View>
        </View>

        <MonthlyActivityCalendar entries={dailyActivity} daysInMonth={month.daysInMonth} />
      </ThemedView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
  title: { fontSize: 32, lineHeight: 38 },
  chartCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  weightInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  logButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    color: '#FFFFFF',
  },
  weightMessage: {
    textAlign: 'center',
  },
  activityCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  activityHeader: { alignItems: 'center' },
  summaryText: { marginBottom: Spacing.one },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  workoutDot: { backgroundColor: '#3A7BFF' },
  dietDot: { backgroundColor: '#34D399' },
});
