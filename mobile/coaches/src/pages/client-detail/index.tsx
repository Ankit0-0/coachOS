import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { MonthlyActivityCalendar, type DailyActivity } from '@/components/client-detail/MonthlyActivityCalendar';
import { WeightChart, type WeightPoint } from '@/components/client-detail/WeightChart';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { FieldRow } from '@/components/ui/field-row';
import { Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
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
import { planStats } from '@/lib/plan-format';

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

  const renderPlanCard = (label: string, type: PlanType, assignment: PlanAssignment | undefined) => {
    const stats = assignment ? planStats(assignment.plan) : null;

    return (
      <Card>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => openPicker(type)} hitSlop={8}>
            <ThemedText type="linkPrimary">
              {assignment?.status === 'ACTIVE' ? 'Change plan' : 'Assign plan'}
            </ThemedText>
          </Pressable>
        </View>

        {assignment && stats ? (
          <View style={styles.planBody}>
            <View style={styles.planTitleRow}>
              <ThemedText type="heading" style={styles.planTitle}>
                {assignment.plan.title}
              </ThemedText>
              <Pill
                label={assignment.status === 'ACTIVE' ? 'Active' : assignment.status.toLowerCase()}
                tone={assignment.status === 'ACTIVE' ? 'success' : 'neutral'}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {planSummary(assignment.plan)}
            </ThemedText>
            <View style={styles.planStats}>
              <ThemedText type="meta" themeColor="textSecondary">
                {stats.primary}
              </ThemedText>
              <ThemedText type="meta">{stats.secondary}</ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No {label.toLowerCase()} plan assigned yet.
          </ThemedText>
        )}
      </Card>
    );
  };

  return (
    <ScreenScaffold includeBottomTabInset>
      <DetailHeader title={name} subtitle={email} />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <>
          <View style={styles.identity}>
            <Avatar name={name} size="md" />
            <View style={styles.identityCopy}>
              <ThemedText type="smallBold">{name}</ThemedText>
              <ThemedText type="meta">
                {profile?.onboardedAt ? `Client since ${longDateLabel(profile.onboardedAt)}` : 'Start date unknown'}
              </ThemedText>
            </View>
          </View>

          <Section title="Profile and goals">
            <Card padded={false} style={styles.fieldCard}>
              <FieldRow label="Height" value={profile?.heightCm != null ? `${profile.heightCm} cm` : null} />
              <FieldRow label="Latest weight" value={displayWeight != null ? `${displayWeight} kg` : null} />
              <FieldRow label="Goals" value={profile?.goals} stacked divider={false} />
            </Card>
          </Section>

          <Section title="Current plans">
            {renderPlanCard('Workout', 'WORKOUT', latestWorkout)}
            {renderPlanCard('Diet', 'DIET', latestDiet)}

            {pickerType ? (
              <Card>
                <ThemedText type="smallBold">
                  Choose a {pickerType === 'WORKOUT' ? 'workout' : 'diet'} plan
                </ThemedText>
                {!pickerPlans ? (
                  <ActivityIndicator color={theme.textSecondary} />
                ) : pickerPlans.own.length === 0 && pickerPlans.defaults.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No plans available yet — create one from the Plans tab.
                  </ThemedText>
                ) : (
                  <View style={styles.pickerList}>
                    {[...pickerPlans.own, ...pickerPlans.defaults].map((plan) => {
                      const stats = planStats(plan);
                      return (
                        <Pressable
                          key={plan.id}
                          accessibilityRole="button"
                          disabled={isAssigning}
                          onPress={() => handleAssign(plan.id)}
                          style={({ pressed }) => [pressed && styles.pressed]}>
                          <Card variant="inset" style={styles.pickerRow}>
                            <View style={styles.pickerCopy}>
                              <ThemedText type="smallBold" numberOfLines={1}>
                                {plan.title}
                              </ThemedText>
                              <View style={styles.planStats}>
                                <ThemedText type="meta" themeColor="textSecondary">
                                  {stats.primary}
                                </ThemedText>
                                <ThemedText type="meta">{stats.secondary}</ThemedText>
                              </View>
                            </View>
                            {plan.isDefault ? <Pill label="Shared" tone="neutral" /> : null}
                            {isAssigning ? <ActivityIndicator color={theme.textSecondary} size="small" /> : null}
                          </Card>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </Card>
            ) : null}
          </Section>

          <Section title="Progress">
            <Card>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">Weight trend</ThemedText>
                {latestWeightEntry ? (
                  <View style={styles.latestWeight}>
                    <ThemedText type="numeric">{latestWeightEntry.weightKg}</ThemedText>
                    <ThemedText type="meta">kg</ThemedText>
                  </View>
                ) : (
                  <ThemedText type="meta">No data yet</ThemedText>
                )}
              </View>
              <WeightChart data={weightPoints} />
            </Card>

            <Card>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">{month.label}</ThemedText>
                <ThemedText type="meta">
                  {completedDays} of {month.daysInMonth} days logged
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.chartWorkout }]} />
                  <ThemedText type="meta" themeColor="textSecondary">
                    Workout
                  </ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.chartDiet }]} />
                  <ThemedText type="meta" themeColor="textSecondary">
                    Diet
                  </ThemedText>
                </View>
              </View>
              <MonthlyActivityCalendar entries={dailyActivity} daysInMonth={month.daysInMonth} />
            </Card>
          </Section>

          <Section title="Recent notes">
            {recentNotes.length === 0 ? (
              <Card>
                <ThemedText type="small" themeColor="textSecondary">
                  Nothing yet. Notes your client leaves on a check-in show up here.
                </ThemedText>
              </Card>
            ) : (
              <Card padded={false} style={styles.fieldCard}>
                {recentNotes.map((checkIn, index) => (
                  <View
                    key={checkIn.id}
                    style={[
                      styles.noteRow,
                      index < recentNotes.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border,
                      },
                    ]}>
                    <ThemedText type="meta">{longDateLabel(checkIn.date)}</ThemedText>
                    <ThemedText type="small">{checkIn.notes}</ThemedText>
                  </View>
                ))}
              </Card>
            )}
          </Section>

          <Section title="Payment">
            <Card>
              <ThemedText type="smallBold">Billing isn&apos;t connected yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Invoices and subscription status for this client will appear here.
              </ThemedText>
            </Card>
          </Section>
        </>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  fieldCard: {
    paddingHorizontal: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planBody: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  planTitle: {
    flex: 1,
  },
  planStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  latestWeight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickerList: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  pickerCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
  noteRow: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
});
