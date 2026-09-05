import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { MonthlyActivityCalendar, type DailyActivity } from '@/components/client-detail/MonthlyActivityCalendar';
import { WeightChart, type WeightPoint } from '@/components/client-detail/WeightChart';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  assignmentApi,
  coachClientApi,
  planApi,
  type CheckIn,
  type ClientProfile,
  type DietContent,
  type Plan,
  type PlanAssignment,
  type PlanType,
  type WeightEntry,
  type WorkoutContent,
} from '@/lib/api';
import { currentMonthRange, dayOfMonth, lastNDaysRange, longDateLabel, weekdayLabel } from '@/lib/dates';
import { planStatsLabel } from '@/lib/plan-format';

const WEIGHT_LOOKBACK_DAYS = 30;
const WEIGHT_CHART_POINTS = 7;
const MAX_RECENT_NOTES = 10;

type ClientDetailScreenProps = {
  clientId: string;
  name: string;
  email: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function workoutItemIds(plan: Plan | undefined): Set<string> {
  const ids = new Set<string>();
  if (!plan || plan.type !== 'WORKOUT') return ids;
  const content = plan.content as WorkoutContent;
  for (const exercise of content.exercises ?? []) {
    for (let set = 1; set <= exercise.sets; set += 1) {
      ids.add(`${exercise.id}-set${set}`);
    }
  }
  return ids;
}

function dietItemIds(plan: Plan | undefined): Set<string> {
  if (!plan || plan.type !== 'DIET') return new Set<string>();
  const content = plan.content as DietContent;
  return new Set((content.meals ?? []).map((meal) => meal.id));
}

function completedMatches(checkIn: CheckIn | undefined, validIds: Set<string>): number {
  if (!checkIn) return 0;
  return checkIn.completedItemIds.filter((id) => validIds.has(id)).length;
}

function planSummary(plan: Plan): string {
  const content = plan.content as WorkoutContent | DietContent;
  return content.summary;
}

export function ClientDetailScreen({ clientId, name, email }: ClientDetailScreenProps) {
  const theme = useTheme();
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [workoutCheckIns, setWorkoutCheckIns] = useState<CheckIn[]>([]);
  const [dietCheckIns, setDietCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pickerType, setPickerType] = useState<PlanType | null>(null);
  const [pickerPlans, setPickerPlans] = useState<{ own: Plan[]; defaults: Plan[] } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const month = currentMonthRange();

  const loadAll = useCallback(async () => {
    const weightRange = lastNDaysRange(WEIGHT_LOOKBACK_DAYS);
    try {
      const [assignmentRows, profileRow, weightRows] = await Promise.all([
        assignmentApi.listForClient(clientId),
        coachClientApi.getProfile(clientId),
        coachClientApi.listWeights(clientId, weightRange),
      ]);
      setAssignments(assignmentRows);
      setProfile(profileRow);
      setWeights(weightRows);

      // Check-ins are per-assignment, so they can only be fetched once the
      // client's active assignments are known.
      const activeWorkoutRow = assignmentRows.find((a) => a.status === 'ACTIVE' && a.plan.type === 'WORKOUT');
      const activeDietRow = assignmentRows.find((a) => a.status === 'ACTIVE' && a.plan.type === 'DIET');
      const [workoutRows, dietRows] = await Promise.all([
        activeWorkoutRow
          ? coachClientApi.listCheckIns(clientId, {
              assignmentId: activeWorkoutRow.id,
              from: month.from,
              to: month.to,
            })
          : Promise.resolve<CheckIn[]>([]),
        activeDietRow
          ? coachClientApi.listCheckIns(clientId, {
              assignmentId: activeDietRow.id,
              from: month.from,
              to: month.to,
            })
          : Promise.resolve<CheckIn[]>([]),
      ]);
      setWorkoutCheckIns(workoutRows);
      setDietCheckIns(dietRows);
    } catch {
      // Leave whatever loaded; the screen renders its empty states.
    } finally {
      setIsLoading(false);
    }
  }, [clientId, month.from, month.to]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const activeWorkout = assignments.find((a) => a.status === 'ACTIVE' && a.plan.type === 'WORKOUT');
  const activeDiet = assignments.find((a) => a.status === 'ACTIVE' && a.plan.type === 'DIET');
  // Fall back to the most recent past assignment so the card can still show
  // what they were last on (with its COMPLETED/PAUSED status).
  const latestWorkout = activeWorkout ?? assignments.find((a) => a.plan.type === 'WORKOUT');
  const latestDiet = activeDiet ?? assignments.find((a) => a.plan.type === 'DIET');

  const latestWeightEntry = weights.length > 0 ? weights[weights.length - 1] : undefined;
  const displayWeight = latestWeightEntry?.weightKg ?? profile?.weightKg ?? null;

  const workoutIds = workoutItemIds(activeWorkout?.plan);
  const dietIds = dietItemIds(activeDiet?.plan);

  const dailyActivity: DailyActivity[] = Array.from({ length: month.daysInMonth }, (_, index) => index + 1).map(
    (day) => {
      const workoutCheckIn = workoutCheckIns.find((checkIn) => dayOfMonth(checkIn.date) === day);
      const dietCheckIn = dietCheckIns.find((checkIn) => dayOfMonth(checkIn.date) === day);
      return {
        date: day,
        workoutCompleted: completedMatches(workoutCheckIn, workoutIds),
        workoutTotal: workoutIds.size,
        dietCompleted: completedMatches(dietCheckIn, dietIds),
        dietTotal: dietIds.size,
      };
    },
  );
  const completedDays = dailyActivity.filter(
    (entry) => entry.workoutCompleted > 0 || entry.dietCompleted > 0,
  ).length;

  const weightPoints: WeightPoint[] = weights
    .slice(-WEIGHT_CHART_POINTS)
    .map((entry) => ({ day: weekdayLabel(entry.date), value: entry.weightKg }));

  const recentNotes = [...workoutCheckIns, ...dietCheckIns]
    .filter((checkIn) => checkIn.notes && checkIn.notes.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_RECENT_NOTES);

  const openPicker = async (type: PlanType) => {
    if (pickerType === type) {
      setPickerType(null);
      return;
    }
    setPickerType(type);
    setPickerPlans(null);
    try {
      setPickerPlans(await planApi.list(type));
    } catch (error) {
      Alert.alert('Could not load plans', errorMessage(error));
      setPickerType(null);
    }
  };

  const handleAssign = async (planId: string) => {
    try {
      setIsAssigning(true);
      await assignmentApi.create({ clientId, planId });
      setPickerType(null);
      await loadAll();
    } catch (error) {
      Alert.alert('Could not assign plan', errorMessage(error));
    } finally {
      setIsAssigning(false);
    }
  };

  const renderPlanCard = (label: string, type: PlanType, assignment: PlanAssignment | undefined) => (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <Pressable onPress={() => openPicker(type)}>
          <ThemedText type="small" style={{ color: theme.accent }}>
            {assignment?.status === 'ACTIVE' ? 'Change plan' : 'Assign plan'}
          </ThemedText>
        </Pressable>
      </View>
      {assignment ? (
        <>
          <View style={styles.cardHeader}>
            <ThemedText type="small" style={styles.planTitle}>
              {assignment.plan.title}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor={assignment.status === 'ACTIVE' ? 'success' : 'textSecondary'}>
              {assignment.status}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {planSummary(assignment.plan)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {planStatsLabel(assignment.plan)}
          </ThemedText>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No {label.toLowerCase()} plan assigned yet.
        </ThemedText>
      )}
    </ThemedView>
  );

  return (
    <ScreenScaffold includeBottomTabInset>
      <DetailHeader title={name} subtitle={email} />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {profile?.onboardedAt ? `Client since ${longDateLabel(profile.onboardedAt)}` : 'Client since —'}
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Profile &amp; Goals
            </ThemedText>
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.statRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Height
                </ThemedText>
                <ThemedText type="small">
                  {profile?.heightCm != null ? `${profile.heightCm} cm` : 'Not set'}
                </ThemedText>
              </View>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <View style={styles.statRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Latest weight
                </ThemedText>
                <ThemedText type="small">
                  {displayWeight != null ? `${displayWeight} kg` : 'Not set'}
                </ThemedText>
              </View>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <View style={styles.goalsBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Goals
                </ThemedText>
                <ThemedText type="small">
                  {profile?.goals && profile.goals.trim().length > 0 ? profile.goals : 'Not set'}
                </ThemedText>
              </View>
            </ThemedView>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Current Plans
            </ThemedText>
            {renderPlanCard('Workout', 'WORKOUT', latestWorkout)}
            {renderPlanCard('Diet', 'DIET', latestDiet)}

            {pickerType ? (
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
                <ThemedText type="smallBold">
                  Choose a {pickerType === 'WORKOUT' ? 'workout' : 'diet'} plan
                </ThemedText>
                {!pickerPlans ? (
                  <ActivityIndicator color={theme.textSecondary} />
                ) : pickerPlans.own.length === 0 && pickerPlans.defaults.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No plans available yet — create one from Saved Plans.
                  </ThemedText>
                ) : (
                  <View style={styles.pickerList}>
                    {[...pickerPlans.own, ...pickerPlans.defaults].map((plan) => (
                      <Pressable
                        key={plan.id}
                        style={[styles.pickerRow, { borderColor: theme.border }]}
                        disabled={isAssigning}
                        onPress={() => handleAssign(plan.id)}>
                        <View style={styles.pickerRowText}>
                          <ThemedText type="small">{plan.title}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {planStatsLabel(plan)}
                            {plan.isDefault ? ' • Default' : ''}
                          </ThemedText>
                        </View>
                        {isAssigning ? <ActivityIndicator color={theme.textSecondary} size="small" /> : null}
                      </Pressable>
                    ))}
                  </View>
                )}
              </ThemedView>
            ) : null}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Progress History
            </ThemedText>

            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">Weight trend</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {latestWeightEntry ? `${latestWeightEntry.weightKg} kg latest` : 'No data yet'}
                </ThemedText>
              </View>
              <WeightChart data={weightPoints} />
            </ThemedView>

            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">{month.label} activity</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {completedDays}/{month.daysInMonth} days
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.workoutDot]} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Workout
                  </ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dietDot]} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Diet
                  </ThemedText>
                </View>
              </View>
              <MonthlyActivityCalendar entries={dailyActivity} daysInMonth={month.daysInMonth} />
            </ThemedView>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Recent Notes
            </ThemedText>
            {recentNotes.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No notes from this client yet.
              </ThemedText>
            ) : (
              recentNotes.map((checkIn) => (
                <ThemedView
                  key={checkIn.id}
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {longDateLabel(checkIn.date)}
                  </ThemedText>
                  <ThemedText type="small">{checkIn.notes}</ThemedText>
                </ThemedView>
              ))
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Payment
            </ThemedText>
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">Payment integration coming soon</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Billing, invoices, and subscription status for this client will live here.
              </ThemedText>
            </ThemedView>
          </View>
        </>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planTitle: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  goalsBlock: {
    paddingVertical: Spacing.one,
    gap: Spacing.half,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  workoutDot: {
    backgroundColor: '#3A7BFF',
  },
  dietDot: {
    backgroundColor: '#34D399',
  },
  pickerList: {
    gap: Spacing.two,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  pickerRowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
