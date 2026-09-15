import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ClientPhotos } from '@/components/client-detail/ClientPhotos';
import { PlanPickerModal } from '@/components/client-detail/PlanPickerModal';
import { MonthNavigator } from '@/components/client-detail/MonthNavigator';
import { SubscriptionSection } from '@/components/client-detail/SubscriptionSection';
import { MonthlyActivityCalendar, type DailyActivity } from '@/components/client-detail/MonthlyActivityCalendar';
import { WeightChart, type WeightPoint } from '@/components/client-detail/WeightChart';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldRow } from '@/components/ui/field-row';
import { Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { useRefresh, type RefreshHandle } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import {
  assignmentApi,
  coachClientApi,
  type CheckIn,
  type ClientProfile,
  type DietContent,
  type Plan,
  type PlanAssignment,
  type PlanType,
  type WeightEntry,
  type WorkoutContent,
} from '@/lib/api';
import { dayOfMonth, lastNDaysRange, longDateLabel, monthRange, weekdayLabel } from '@/lib/dates';
import { formatPhone } from '@/lib/phone';
import { planStats, planSummary } from '@/lib/plan-format';
import { buildWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';

const WEIGHT_LOOKBACK_DAYS = 30;
const WEIGHT_CHART_POINTS = 7;
const MAX_RECENT_NOTES = 10;

type ClientDetailScreenProps = {
  clientId: string;
  name: string;
  email: string;
};

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

export function ClientDetailScreen({ clientId, name, email }: ClientDetailScreenProps) {
  const theme = useTheme();
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  // Every check-in in the month, across all assignments — not just the active
  // ones, so switching a client's plan doesn't erase their history here.
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  /** Which plan type the assign sheet is open for; null when it's closed. */
  const [pickerType, setPickerType] = useState<PlanType | null>(null);
  /** Inline, since Alert is a no-op on React Native Web. */
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);

  const now = new Date();
  const [viewedMonth, setViewedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const month = monthRange(viewedMonth.year, viewedMonth.month);
  const isAtCurrentMonth =
    viewedMonth.year === now.getFullYear() && viewedMonth.month === now.getMonth();

  const stepMonth = (delta: number) =>
    setViewedMonth((current) => {
      // Date normalises an out-of-range month into the next/previous year.
      const shifted = new Date(current.year, current.month + delta, 1);
      return { year: shifted.getFullYear(), month: shifted.getMonth() };
    });

  const loadAll = useCallback(async () => {
    const weightRange = lastNDaysRange(WEIGHT_LOOKBACK_DAYS);
    try {
      const [assignmentRows, profileRow, weightRows, checkInRows] = await Promise.all([
        assignmentApi.listForClient(clientId),
        coachClientApi.getProfile(clientId),
        coachClientApi.listWeights(clientId, weightRange),
        coachClientApi.listCheckIns(clientId, { from: month.from, to: month.to }),
      ]);
      setAssignments(assignmentRows);
      setProfile(profileRow);
      setWeights(weightRows);
      setCheckIns(checkInRows);
    } catch {
      // Leave whatever loaded; the screen renders its empty states.
    } finally {
      setIsLoading(false);
    }
  }, [clientId, month.from, month.to]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const subscriptionSection = useRef<RefreshHandle>(null);
  // Profile, plans, weights and check-ins, plus the subscription section's own load.
  const { isRefreshing, refresh } = useRefresh(loadAll, () => subscriptionSection.current?.reload());

  const activeWorkout = assignments.find((a) => a.status === 'ACTIVE' && a.plan.type === 'WORKOUT');
  const activeDiet = assignments.find((a) => a.status === 'ACTIVE' && a.plan.type === 'DIET');
  // Fall back to the most recent past assignment so the card can still show
  // what they were last on (with its COMPLETED/PAUSED status).
  const latestWorkout = activeWorkout ?? assignments.find((a) => a.plan.type === 'WORKOUT');
  const latestDiet = activeDiet ?? assignments.find((a) => a.plan.type === 'DIET');

  const latestWeightEntry = weights.length > 0 ? weights[weights.length - 1] : undefined;
  const displayWeight = latestWeightEntry?.weightKg ?? profile?.weightKg ?? null;

  // A check-in belongs to the plan that was assigned at the time, which may no
  // longer be the active one — so score each against its own plan.
  const planByAssignmentId = new Map(assignments.map((assignment) => [assignment.id, assignment.plan]));
  const checkInsOfType = (type: PlanType) =>
    checkIns.filter((checkIn) => planByAssignmentId.get(checkIn.assignmentId)?.type === type);
  const workoutCheckIns = checkInsOfType('WORKOUT');
  const dietCheckIns = checkInsOfType('DIET');

  const dailyActivity: DailyActivity[] = Array.from({ length: month.daysInMonth }, (_, index) => index + 1).map(
    (day) => {
      const workoutCheckIn = workoutCheckIns.find((checkIn) => dayOfMonth(checkIn.date) === day);
      const dietCheckIn = dietCheckIns.find((checkIn) => dayOfMonth(checkIn.date) === day);
      const workoutIds = workoutItemIds(
        workoutCheckIn ? planByAssignmentId.get(workoutCheckIn.assignmentId) : undefined,
      );
      const dietIds = dietItemIds(dietCheckIn ? planByAssignmentId.get(dietCheckIn.assignmentId) : undefined);
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

  const recentNotes = checkIns
    .filter((checkIn) => checkIn.notes && checkIn.notes.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_RECENT_NOTES);

  const canWhatsApp = buildWhatsAppUrl(profile?.phone) !== null;

  // Nothing prefilled: this opens a conversation, it doesn't send a message.
  const handleWhatsApp = async () => {
    setWhatsAppError(null);
    const result = await openWhatsApp(profile?.phone);
    if (result.status === 'error') setWhatsAppError(result.message);
  };

  const renderPlanCard =(label: string, type: PlanType, assignment: PlanAssignment | undefined) => {
    const stats = assignment ? planStats(assignment.plan) : null;

    return (
      <Card>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => setPickerType(type)} hitSlop={8}>
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
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title={name} subtitle={email} />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <>
          <View style={styles.identity}>
            <Avatar name={name} size="md" imageUrl={profile?.avatarUrl ?? null} />
            <View style={styles.identityCopy}>
              <ThemedText type="smallBold">{name}</ThemedText>
              <ThemedText type="meta">
                {profile?.onboardedAt ? `Client since ${longDateLabel(profile.onboardedAt)}` : 'Start date unknown'}
              </ThemedText>
              {/* Hidden, not disabled, without a usable number — this line says why instead. */}
              {canWhatsApp ? null : <ThemedText type="meta">Hasn’t added a phone number yet</ThemedText>}
            </View>
            {canWhatsApp ? (
              <Button label="Message on WhatsApp" variant="secondary" size="sm" onPress={() => void handleWhatsApp()} />
            ) : null}
          </View>
          {whatsAppError ? (
            <ThemedText type="small" themeColor="danger">
              {whatsAppError}
            </ThemedText>
          ) : null}

          <Section title="Profile and goals">
            <Card padded={false} style={styles.fieldCard}>
              <FieldRow label="Phone" value={formatPhone(profile?.phone)} />
              <FieldRow label="Height" value={profile?.heightCm != null ? `${profile.heightCm} cm` : null} />
              <FieldRow label="Latest weight" value={displayWeight != null ? `${displayWeight} kg` : null} />
              <FieldRow label="Goals" value={profile?.goals} stacked divider={false} />
            </Card>
          </Section>

          <Section title="Current plans">
            {renderPlanCard('Workout', 'WORKOUT', latestWorkout)}
            {renderPlanCard('Diet', 'DIET', latestDiet)}

            <PlanPickerModal
              type={pickerType}
              clientId={clientId}
              currentPlanId={(pickerType === 'DIET' ? activeDiet : activeWorkout)?.planId ?? null}
              onClose={() => setPickerType(null)}
              onAssigned={loadAll}
            />

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
              <MonthNavigator
                label={month.monthYearLabel}
                onPrevious={() => stepMonth(-1)}
                onNext={() => stepMonth(1)}
                isAtCurrentMonth={isAtCurrentMonth}
              />
              <ThemedText type="meta" style={styles.monthSummary}>
                {completedDays} of {month.daysInMonth} days logged
              </ThemedText>
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
              <MonthlyActivityCalendar
                entries={dailyActivity}
                daysInMonth={month.daysInMonth}
                firstWeekday={month.firstWeekday}
              />
            </Card>
          </Section>

          <ClientPhotos
            weights={weights}
            checkIns={checkIns}
            planByAssignmentId={planByAssignmentId}
            weightLookbackDays={WEIGHT_LOOKBACK_DAYS}
            monthLabel={month.monthYearLabel}
          />

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

          <SubscriptionSection ref={subscriptionSection} clientId={clientId} />

          <Section title="Payment">
            <Card>
              <ThemedText type="smallBold">Billing isn&apos;t connected yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Invoices and receipts will appear here. Subscription periods are tracked above.
              </ThemedText>
            </Card>
          </Section>
        </>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  monthSummary: {
    marginTop: Spacing.two,
  },
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
  noteRow: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
});
