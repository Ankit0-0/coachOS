import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ClientPhotos } from '@/components/client-detail/ClientPhotos';
import { PlanPickerModal } from '@/components/client-detail/PlanPickerModal';
import { MonthNavigator } from '@/components/client-detail/MonthNavigator';
import { SubscriptionSection } from '@/components/client-detail/SubscriptionSection';
import { DayDetailModal, type DayDetailLoader } from '@/components/client-detail/DayDetailModal';
import { MonthlyActivityCalendar, type DailyActivity } from '@/components/client-detail/MonthlyActivityCalendar';
import { WeightChart } from '@/components/client-detail/WeightChart';
import { WeightRangeSelector } from '@/components/client-detail/WeightRangeSelector';
import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, InsetPanel } from '@/components/ui/card';
import { FieldRow } from '@/components/ui/field-row';
import { CALL_ICON, IconButton, MESSAGE_ICON } from '@/components/ui/icon-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Chip } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useRefresh, type RefreshHandle } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import {
  assignmentApi,
  coachClientApi,
  type CheckIn,
  type ClientProfile,
  type PlanAssignment,
  type PlanType,
  type ScheduleEntry,
  type WeightEntry,
} from '@/lib/api';
import { buildTelUrl, startCall } from '@/lib/call';
import { confirmDestructive } from '@/lib/confirm';
import { dayOfMonth, formatDateKey, lastNDaysRange, longDateLabel, monthRange, shortDateLabel } from '@/lib/dates';
import { formatPhone } from '@/lib/phone';
import { planStats, planSummary } from '@/lib/plan-format';
import { DEFAULT_WEIGHT_RANGE, weightRangeDates, type WeightRangeKey } from '@/lib/weight-range';
import { allWeightsRange, summarizeWeights } from '@/lib/weight-summary';
import { buildWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';

/** For the physique photos — the chart and the weight summary load their own ranges. */
const WEIGHT_LOOKBACK_DAYS = 30;

const DIET_LABELS = { VEGETARIAN: 'Vegetarian', NON_VEGETARIAN: 'Non-vegetarian' } as const;
const MAX_RECENT_NOTES = 3;
const MAX_PHOTOS_PER_GROUP = 6;

type ClientDetailScreenProps = {
  clientId: string;
  name: string;
  email: string;
};

/**
 * Only ids the backend says were scheduled that day count. A plan edited since
 * may no longer hold an id an old check-in has; those are ignored rather than
 * counted against a total they are not part of.
 */
function countScheduled(checkIn: CheckIn | undefined, ids: string[]): number {
  if (!checkIn) return 0;
  const scheduled = new Set(ids);
  return checkIn.completedItemIds.filter((id) => scheduled.has(id)).length;
}

export function ClientDetailScreen({ clientId, name, email }: ClientDetailScreenProps) {
  const theme = useTheme();
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  /** Every weigh-in, for latest and 7-day average; null if it didn't load. */
  const [allWeights, setAllWeights] = useState<WeightEntry[] | null>(null);
  // Every check-in in the month, across all assignments — not just the active
  // ones, so switching a client's plan doesn't erase their history here.
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  /** What the client was scheduled to do on each date of the month, resolved by the backend. */
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  /** Which plan type the assign sheet is open for; null when it's closed. */
  const [pickerType, setPickerType] = useState<PlanType | null>(null);
  /** A small notice under the header, since Alert is a no-op on React Native Web. */
  const [contactError, setContactError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const dismissContactError = useCallback(() => setContactError(null), []);
  const [chartRange, setChartRange] = useState<WeightRangeKey>(DEFAULT_WEIGHT_RANGE);
  /** Weigh-ins in the chart's selected range, separate from `weights` so switching range can't move the photos. */
  const [chartWeights, setChartWeights] = useState<WeightEntry[]>([]);
  const latestChartRequest = useRef(0);

  const now = new Date();
  const [viewedMonth, setViewedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const month = monthRange(viewedMonth.year, viewedMonth.month);
  const today = formatDateKey(now);
  // Past days and today open; the future has nothing to show.
  const lastPressableDay = month.to <= today ? month.daysInMonth : month.from > today ? 0 : dayOfMonth(today);
  /** The calendar day open in the detail modal. */
  const [openDate, setOpenDate] = useState<string | null>(null);
  // Just the one date, not the month again.
  const loadDay = useCallback<DayDetailLoader>(
    async (date) => {
      const [schedule, checkIns] = await Promise.all([
        coachClientApi.listSchedule(clientId, { from: date, to: date }),
        coachClientApi.listCheckIns(clientId, { from: date, to: date }),
      ]);
      return { schedule, checkIns };
    },
    [clientId],
  );
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
      const [assignmentRows, profileRow, weightRows, checkInRows, scheduleRows, allWeightRows] = await Promise.all([
        assignmentApi.listForClient(clientId),
        coachClientApi.getProfile(clientId),
        coachClientApi.listWeights(clientId, weightRange),
        coachClientApi.listCheckIns(clientId, { from: month.from, to: month.to }),
        coachClientApi.listSchedule(clientId, { from: month.from, to: month.to }),
        coachClientApi.listWeights(clientId, allWeightsRange()).catch(() => null),
      ]);
      setAssignments(assignmentRows);
      setProfile(profileRow);
      setWeights(weightRows);
      setAllWeights(allWeightRows);
      setCheckIns(checkInRows);
      setSchedule(scheduleRows);
    } catch {
      // Leave whatever loaded; the screen renders its empty states.
    } finally {
      setIsLoading(false);
    }
  }, [clientId, month.from, month.to]);

  // Range changes can overlap: only the latest request may land.
  const loadChartWeights = useCallback(async () => {
    const request = ++latestChartRequest.current;
    try {
      const rows = await coachClientApi.listWeights(clientId, weightRangeDates(chartRange));
      if (request === latestChartRequest.current) setChartWeights(rows);
    } catch {
      // Keep the chart that's on screen.
    }
  }, [clientId, chartRange]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );
  useFocusEffect(
    useCallback(() => {
      void loadChartWeights();
    }, [loadChartWeights]),
  );

  const subscriptionSection = useRef<RefreshHandle>(null);
  // Profile, plans, weights, check-ins and the chart, plus the subscription section's own load.
  const { isRefreshing, refresh } = useRefresh(loadAll, loadChartWeights, () =>
    subscriptionSection.current?.reload(),
  );
  const chartDates = weightRangeDates(chartRange);
  const latestChartEntry = chartWeights.length > 0 ? chartWeights[chartWeights.length - 1] : undefined;

  const activeWorkout = assignments.find((a) => a.status === 'ACTIVE' && a.plan.type === 'WORKOUT');
  const activeDiet = assignments.find((a) => a.status === 'ACTIVE' && a.plan.type === 'DIET');
  // Fall back to the most recent past assignment so the card can still show
  // what they were last on (with its COMPLETED/PAUSED status).
  // A plan the coach removed leaves the card empty rather than showing it again.
  const latestOf = (type: PlanType) => {
    const mostRecent = assignments.find((a) => a.plan.type === type);
    return mostRecent?.status === 'CANCELLED' ? undefined : mostRecent;
  };
  const latestWorkout = activeWorkout ?? latestOf('WORKOUT');
  const latestDiet = activeDiet ?? latestOf('DIET');

  // Logged weigh-ins only; the self-reported profile weight is shown apart as the starting weight.
  const weightSummary = allWeights ? summarizeWeights(allWeights) : null;

  // A check-in belongs to the plan that was assigned at the time, which may no
  // longer be the active one — so score each against its own plan.
  const planByAssignmentId = new Map(assignments.map((assignment) => [assignment.id, assignment.plan]));
  const checkInsOfType = (type: PlanType) =>
    checkIns.filter((checkIn) => planByAssignmentId.get(checkIn.assignmentId)?.type === type);
  const workoutCheckIns = checkInsOfType('WORKOUT');
  const dietCheckIns = checkInsOfType('DIET');

  // A rotating plan has a different item count — and rest days — per date, so
  // each day's denominator comes from the schedule rather than from the plan.
  const scheduleByDate = new Map<
    string,
    { workoutTotal: number; dietTotal: number; isRestDay: boolean; workoutIds: string[]; dietIds: string[] }
  >();
  for (const entry of schedule) {
    const row = scheduleByDate.get(entry.date) ?? {
      workoutTotal: 0,
      dietTotal: 0,
      isRestDay: false,
      workoutIds: [] as string[],
      dietIds: [] as string[],
    };
    if (entry.type === 'WORKOUT') {
      row.workoutTotal = entry.itemCount;
      row.isRestDay = entry.isRestDay;
      row.workoutIds = entry.itemIds;
    } else {
      row.dietTotal = entry.itemCount;
      row.dietIds = entry.itemIds;
    }
    scheduleByDate.set(entry.date, row);
  }

  const dailyActivity: DailyActivity[] = Array.from({ length: month.daysInMonth }, (_, index) => index + 1).map(
    (day) => {
      const dateKey = `${month.from.slice(0, 8)}${String(day).padStart(2, '0')}`;
      const scheduled = scheduleByDate.get(dateKey);
      const workoutCheckIn = workoutCheckIns.find((checkIn) => dayOfMonth(checkIn.date) === day);
      const dietCheckIn = dietCheckIns.find((checkIn) => dayOfMonth(checkIn.date) === day);
      return {
        date: day,
        workoutCompleted: countScheduled(workoutCheckIn, scheduled?.workoutIds ?? []),
        workoutTotal: scheduled?.workoutTotal ?? 0,
        dietCompleted: countScheduled(dietCheckIn, scheduled?.dietIds ?? []),
        dietTotal: scheduled?.dietTotal ?? 0,
        isRestDay: scheduled?.isRestDay ?? false,
      };
    },
  );
  // Rest days are not misses, so they are out of both sides of the ratio.
  const trainingDays = dailyActivity.filter((entry) => !entry.isRestDay);
  const completedDays = trainingDays.filter(
    (entry) => entry.workoutCompleted > 0 || entry.dietCompleted > 0,
  ).length;

  const allNotes = checkIns
    .filter((checkIn) => checkIn.notes && checkIn.notes.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const recentNotes = allNotes.slice(0, MAX_RECENT_NOTES);

  const openPhotos = (group: 'physique' | 'meal') =>
    router.push({ pathname: '/client-photos', params: { clientId, name, filter: group } });
  const openNotes = () => router.push({ pathname: '/client-notes', params: { clientId, name } });

  // Call and WhatsApp share the one number, so they show and hide together.
  const canContact = buildTelUrl(profile?.phone) !== null && buildWhatsAppUrl(profile?.phone) !== null;

  const handleCall = async () => {
    setContactError(null);
    const result = await startCall(profile?.phone);
    if (result.status === 'error') setContactError(result.message);
  };

  // Nothing prefilled: this opens a conversation, it doesn't send a message.
  const handleWhatsApp = async () => {
    setContactError(null);
    const result = await openWhatsApp(profile?.phone);
    if (result.status === 'error') setContactError(result.message);
  };

  const handleRemovePlan = async (label: string, assignment: PlanAssignment) => {
    const kind = label.toLowerCase();
    const confirmed = await confirmDestructive({
      title: `Remove ${kind} plan?`,
      message: `${name} will have no ${kind} plan until you assign a new one. Their past check-ins stay.`,
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;

    setPlanError(null);
    try {
      await assignmentApi.cancel(assignment.id);
      await loadAll();
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : 'Could not remove the plan. Please try again.');
    }
  };

  const renderPlanCard =(label: string, type: PlanType, assignment: PlanAssignment | undefined) => {
    const stats = assignment ? planStats(assignment.plan) : null;
    const isActive = assignment?.status === 'ACTIVE';

    return (
      <View style={[styles.planRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.planTitleRow}>
          <Chip label={label} tone={type === 'DIET' ? 'terracotta' : 'green'} />
          {assignment && stats ? (
            <Chip
              label={assignment.status === 'ACTIVE' ? 'Active' : assignment.status.toLowerCase()}
              tone={assignment.status === 'ACTIVE' ? 'success' : 'neutral'}
            />
          ) : null}
        </View>

        {assignment && stats ? (
          <View style={styles.planBody}>
            <ThemedText type="smallBold">{assignment.plan.title}</ThemedText>
            {planSummary(assignment.plan) ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {planSummary(assignment.plan)}
              </ThemedText>
            ) : null}
            <ThemedText type="meta">
              {[stats.primary, stats.secondary].filter(Boolean).join(' · ')}
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No {label.toLowerCase()} plan assigned yet.
          </ThemedText>
        )}

        <View style={styles.planActions}>
          <Button
            label={isActive ? 'Change plan' : 'Assign plan'}
            variant={isActive ? 'secondary' : 'primary'}
            size="sm"
            onPress={() => setPickerType(type)}
          />
          {isActive && assignment ? (
            <Button
              label="Remove"
              variant="ghost"
              size="sm"
              accessibilityLabel={`Remove ${label.toLowerCase()} plan`}
              onPress={() => void handleRemovePlan(label, assignment)}
            />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader
        title={name}
        subtitle={email}
        actions={
          canContact ? (
            <>
              <IconButton icon={CALL_ICON} label={`Call ${name}`} onPress={() => void handleCall()} />
              <IconButton icon={MESSAGE_ICON} label={`Message ${name} on WhatsApp`} onPress={() => void handleWhatsApp()} />
            </>
          ) : null
        }
      />
      <InlineNotice message={contactError} onDismiss={dismissContactError} />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <>
          <View style={styles.identity}>
            <Avatar name={name} size="md" imageUrl={profile?.avatarUrl ?? null} tone="warm" />
            <View style={styles.identityCopy}>
              <Chip label="Client" tone="terracotta" />
              {profile?.goals ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {profile.goals}
                </ThemedText>
              ) : null}
              <ThemedText type="meta">
                {profile?.onboardedAt ? `Client since ${longDateLabel(profile.onboardedAt)}` : 'Start date unknown'}
              </ThemedText>
              {/* Hidden, not disabled, without a usable number — this line says why instead. */}
              {canContact ? null : <ThemedText type="meta">Hasn’t added a phone number yet</ThemedText>}
            </View>
          </View>

          <Section title="Profile and goals">
            <Card padded={false} style={styles.fieldCard}>
              <FieldRow label="Phone" value={formatPhone(profile?.phone)} />
              <FieldRow label="Height" value={profile?.heightCm != null ? `${profile.heightCm} cm` : null} />
              <FieldRow label="Diet" value={profile?.dietPreference ? DIET_LABELS[profile.dietPreference] : null} />
              <FieldRow
                label="Latest weight"
                value={
                  weightSummary
                    ? `${weightSummary.latest.weightKg} kg (${shortDateLabel(weightSummary.latest.date)})`
                    : null
                }
              />
              <FieldRow
                label="7-day average"
                value={weightSummary ? `${weightSummary.sevenDayAverageKg} kg` : null}
              />
              <FieldRow label="Starting weight" value={profile?.weightKg != null ? `${profile.weightKg} kg` : null} />
              <FieldRow label="Goals" value={profile?.goals} stacked divider={false} />
            </Card>
          </Section>

          <Section title="Current plans">
            {planError ? (
              <ThemedText type="small" themeColor="danger">
                {planError}
              </ThemedText>
            ) : null}
            <Card style={styles.plansCard}>
              <InsetPanel>
                {renderPlanCard('Workout', 'WORKOUT', latestWorkout)}
                {renderPlanCard('Diet', 'DIET', latestDiet)}
              </InsetPanel>
            </Card>

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
                <ThemedText type="heading">Weight trend</ThemedText>
                {latestChartEntry ? (
                  <View style={styles.latestWeight}>
                    <ThemedText type="numeric">{latestChartEntry.weightKg}</ThemedText>
                    <ThemedText type="meta">kg</ThemedText>
                  </View>
                ) : (
                  <ThemedText type="meta">No data yet</ThemedText>
                )}
              </View>
              <View style={styles.chartBody}>
                <WeightRangeSelector value={chartRange} onChange={setChartRange} />
                <WeightChart entries={chartWeights} from={chartDates.from} to={chartDates.to} />
              </View>
            </Card>

            <Card style={styles.monthCard}>
              <MonthNavigator
                label={month.monthYearLabel}
                onPrevious={() => stepMonth(-1)}
                onNext={() => stepMonth(1)}
                isAtCurrentMonth={isAtCurrentMonth}
              />
              <ThemedText type="meta">
                {completedDays} of {trainingDays.length} training days logged
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
                onDayPress={(day) => setOpenDate(`${month.from.slice(0, 8)}${String(day).padStart(2, '0')}`)}
                lastPressableDay={lastPressableDay}
              />
            </Card>
            <DayDetailModal date={openDate} onClose={() => setOpenDate(null)} load={loadDay} />
          </Section>

          <ClientPhotos
            weights={weights}
            checkIns={checkIns}
            planByAssignmentId={planByAssignmentId}
            weightLookbackDays={WEIGHT_LOOKBACK_DAYS}
            monthLabel={month.monthYearLabel}
            limit={MAX_PHOTOS_PER_GROUP}
            onViewAll={openPhotos}
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
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      },
                    ]}>
                    <ThemedText type="meta">{longDateLabel(checkIn.date)}</ThemedText>
                    <ThemedText type="small">{checkIn.notes}</ThemedText>
                  </View>
                ))}
              </Card>
            )}
            {allNotes.length > MAX_RECENT_NOTES ? (
              <Pressable accessibilityRole="button" onPress={openNotes} hitSlop={12} style={styles.viewAll}>
                <ThemedText type="linkPrimary">View all {allNotes.length}</ThemedText>
              </Pressable>
            ) : null}
          </Section>

          <SubscriptionSection ref={subscriptionSection} clientId={clientId} />

          <Section title="Payment">
            <Card style={styles.textCard}>
              <ThemedText type="heading">Billing isn&apos;t connected yet</ThemedText>
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
  viewAll: {
    alignSelf: 'flex-start',
  },
  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  plansCard: {
    padding: Spacing.twoHalf,
  },
  planRow: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.twoHalf,
  },
  monthCard: {
    gap: Spacing.twoHalf,
  },
  textCard: {
    gap: Spacing.one,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityCopy: {
    flex: 1,
    gap: Spacing.one,
    alignItems: 'flex-start',
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
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  chartBody: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
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
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
  },
  noteRow: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
});
