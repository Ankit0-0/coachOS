import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MonthNavigator } from '@/components/history/MonthNavigator';
import { MonthlyActivityCalendar, type DailyActivity } from '@/components/history/MonthlyActivityCalendar';
import { WeightChart } from '@/components/history/WeightChart';
import { WeightRangeSelector } from '@/components/history/WeightRangeSelector';
import { LockedState } from '@/components/locked-state';
import { PlanStateCard } from '@/components/plan-state-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useScheduleRange } from '@/hooks/use-schedule';
import { useTheme } from '@/hooks/use-theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { useRefresh } from '@/hooks/use-refresh';
import { trackingApi, type CheckIn, type WeightEntry } from '@/lib/api';
import { dayOfMonth, monthRange, todayKey } from '@/lib/dates';
import { confirmDestructive } from '@/lib/confirm';
import { pickAndUploadImage } from '@/lib/image-upload';
import { parseWeightInput } from '@/lib/weight';
import { DEFAULT_WEIGHT_RANGE, weightRangeDates, type WeightRangeKey } from '@/lib/weight-range';

export function HistoryScreen() {
  const theme = useTheme();
  const onboarding = useOnboardingStatus();
  const { hasCoach, isLoading: isCheckingOnboarding } = onboarding;
  const tracking = useTrackingAssignments();
  const { workout: workoutAssignment, diet: dietAssignment } = tracking;

  const [workoutCheckIns, setWorkoutCheckIns] = useState<CheckIn[]>([]);
  const [dietCheckIns, setDietCheckIns] = useState<CheckIn[]>([]);
  /** Every weigh-in in the chart's selected range, which always ends today. */
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [weightRange, setWeightRange] = useState<WeightRangeKey>(DEFAULT_WEIGHT_RANGE);
  const [isLoadingWeights, setIsLoadingWeights] = useState(true);
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

  const [weightInput, setWeightInput] = useState('');
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);
  const [weightMessage, setWeightMessage] = useState<string | null>(null);
  /** An optional progress photo for today's weigh-in. */
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const workoutAssignmentId = workoutAssignment?.id;
  const dietAssignmentId = dietAssignment?.id;
  // Month and range changes can overlap: only the latest request of each kind may land.
  const latestActivityRequest = useRef(0);
  const latestWeightRequest = useRef(0);

  const loadActivity = useCallback(async () => {
    const request = ++latestActivityRequest.current;
    try {
      const [workoutRows, dietRows] = await Promise.all([
        workoutAssignmentId
          ? trackingApi.listCheckIns({ assignmentId: workoutAssignmentId, from: month.from, to: month.to })
          : Promise.resolve<CheckIn[]>([]),
        dietAssignmentId
          ? trackingApi.listCheckIns({ assignmentId: dietAssignmentId, from: month.from, to: month.to })
          : Promise.resolve<CheckIn[]>([]),
      ]);
      if (request !== latestActivityRequest.current) return;
      setWorkoutCheckIns(workoutRows);
      setDietCheckIns(dietRows);
      setLoadError(null);
    } catch (error) {
      if (request !== latestActivityRequest.current) return;
      // Keep what is on screen and say so, on first load and on refresh alike.
      setLoadError(error instanceof Error ? error.message : 'Could not load your history.');
    }
  }, [workoutAssignmentId, dietAssignmentId, month.from, month.to]);

  // The dates are worked out per request, so a screen left open past midnight
  // still ends its range on the new today.
  const loadWeights = useCallback(async () => {
    const request = ++latestWeightRequest.current;
    try {
      const rows = await trackingApi.listWeights(weightRangeDates(weightRange));
      if (request !== latestWeightRequest.current) return;
      setWeights(rows);
      setLoadError(null);
    } catch (error) {
      if (request !== latestWeightRequest.current) return;
      setLoadError(error instanceof Error ? error.message : 'Could not load your weight history.');
    } finally {
      if (request === latestWeightRequest.current) setIsLoadingWeights(false);
    }
  }, [weightRange]);

  // Reloads on focus, and whenever the viewed month or the chart's range changes.
  useFocusEffect(
    useCallback(() => {
      void loadActivity();
    }, [loadActivity]),
  );
  useFocusEffect(
    useCallback(() => {
      void loadWeights();
    }, [loadWeights]),
  );

  // What was scheduled on each date of the month, resolved by the backend — a
  // rotating plan has a different item count (and rest days) per date.
  const schedule = useScheduleRange(month.from, month.to);

  const { isRefreshing, refresh } = useRefresh(
    onboarding.reload,
    tracking.reload,
    schedule.reload,
    loadActivity,
    loadWeights,
  );
  const chartRange = weightRangeDates(weightRange);
  /** Today's saved weigh-in, if any. Every range ends today, so it is always in `weights`. */
  const todayEntry = weights.find((entry) => entry.date === todayKey());

  const scheduleByDate = new Map<string, { workoutTotal: number; dietTotal: number; isRestDay: boolean; workoutIds: string[]; dietIds: string[] }>();
  for (const entry of schedule.entries) {
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

  /**
   * Only ids that were scheduled that day count. A plan edited since may no
   * longer contain an id an old check-in holds; those are ignored rather than
   * counted against a total they do not belong to.
   */
  function countScheduled(checkIn: CheckIn | undefined, ids: string[]): number {
    if (!checkIn) return 0;
    const scheduled = new Set(ids);
    return checkIn.completedItemIds.filter((id) => scheduled.has(id)).length;
  }

  const dailyActivity: DailyActivity[] = Array.from(
    { length: month.daysInMonth },
    (_, index) => index + 1,
  ).map((day) => {
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
  });

  // Rest days are not misses, so they are out of both sides of the ratio.
  const trainingDays = dailyActivity.filter((entry) => !entry.isRestDay);
  const completedDays = trainingDays.filter(
    (entry) => entry.workoutCompleted > 0 || entry.dietCompleted > 0,
  ).length;
  const restDays = dailyActivity.length - trainingDays.length;

  const average =
    weights.length > 0 ? weights.reduce((sum, entry) => sum + entry.weightKg, 0) / weights.length : null;

  /**
   * The local file while one is pending, otherwise whatever today's saved entry
   * already has — so a photo logged earlier in the day is still visible.
   */
  const photoDisplayUri = photoUri ?? todayEntry?.photoUrl ?? null;

  const handlePickPhoto = async () => {
    if (isUploadingPhoto) return;

    setWeightMessage(null);
    setIsUploadingPhoto(true);
    let result;
    try {
      result = await pickAndUploadImage('weight');
    } finally {
      setIsUploadingPhoto(false);
    }

    // Cancelling keeps whatever photo was already attached.
    if (result.status === 'cancelled') return;
    if (result.status === 'error') {
      setWeightMessage(result.message);
      return;
    }

    setPhotoUri(result.uri);
    setPhotoKey(result.key);
  };

  const handleRemovePhoto = async () => {
    // Picked but never saved: nothing to delete on the server.
    if (photoUri) {
      setPhotoUri(null);
      setPhotoKey(null);
      return;
    }
    if (!todayEntry?.photoUrl) return;

    const confirmed = await confirmDestructive({
      title: 'Remove progress photo?',
      message: "This deletes today's photo for good. Your weight stays logged.",
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;

    const previous = todayEntry;
    setWeightMessage(null);
    setWeights((current) => current.map((row) => (row.date === previous.date ? { ...row, photoUrl: null } : row)));
    try {
      const entry = await trackingApi.saveWeight({ date: previous.date, weightKg: previous.weightKg, photoKey: null });
      setWeights((current) => [...current.filter((row) => row.date !== entry.date), entry]);
    } catch (error) {
      setWeights((current) => [...current.filter((row) => row.date !== previous.date), previous]);
      setWeightMessage(error instanceof Error ? error.message : 'Could not remove the photo. Please try again.');
    }
  };

  const handleLogWeight = async () => {
    // Checked here so an out-of-range weight gets a reason, not the API's bare 400.
    const weight = parseWeightInput(weightInput);
    if (weight.status === 'invalid') {
      setWeightMessage(weight.message);
      return;
    }
    try {
      setIsLoggingWeight(true);
      setWeightMessage(null);
      const entry = await trackingApi.saveWeight({
        date: todayKey(),
        weightKg: weight.kg,
        // Only sent when a photo was picked this session, so logging a weight
        // on its own never clears a photo added earlier.
        ...(photoKey ? { photoKey } : {}),
      });
      setWeightInput('');
      // Today's entry carries the saved photo as a signed URL now, so the local file can go.
      setPhotoUri(null);
      setPhotoKey(null);
      // On screen straight from the response; the reload after confirms it against the range.
      setWeights((current) => [...current.filter((row) => row.date !== entry.date), entry]);
      void loadWeights();
      setWeightMessage('Saved today\u2019s weight.');
    } catch (error) {
      setWeightMessage(
        error instanceof Error ? error.message : 'Could not save the weight. Please try again.',
      );
    } finally {
      setIsLoggingWeight(false);
    }
  };

  if (isCheckingOnboarding) {
    return (
      <ScreenScaffold>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!hasCoach) {
    return <LockedState title="History" refreshing={isRefreshing} onRefresh={refresh} />;
  }

  return (
    <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          History
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Weight trend
        </ThemedText>
      </View>

      {loadError ? (
        <PlanStateCard
          tone="danger"
          title="Couldn't load your history"
          message={`${loadError} Pull down to try again.`}
        />
      ) : null}

      <ThemedView type="backgroundElement" style={[styles.chartCard, { borderColor: theme.border }]}>
        <View style={styles.chartHeader}>
          <ThemedText type="smallBold">Weight</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isLoadingWeights ? 'Loading…' : average !== null ? `${average.toFixed(1)} kg avg` : 'No data yet'}
          </ThemedText>
        </View>

        <WeightRangeSelector value={weightRange} onChange={setWeightRange} />

        <WeightChart entries={weights} from={chartRange.from} to={chartRange.to} />

        <View style={styles.weightForm}>
          <TextInput
            style={[
              styles.weightInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            placeholder={todayEntry ? `Today: ${todayEntry.weightKg} kg` : "Today's weight (kg)"}
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
            <ThemedText type="smallBold" themeColor="onAccent">
              {isLoggingWeight ? 'Saving…' : 'Save weight'}
            </ThemedText>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photoDisplayUri ? 'Change progress photo' : 'Add progress photo'}
          onPress={() => void handlePickPhoto()}
          disabled={isUploadingPhoto || isLoggingWeight}
          style={({ pressed }) => [
            styles.photoButton,
            { borderColor: theme.border, opacity: isUploadingPhoto ? 0.6 : pressed ? 0.8 : 1 },
          ]}>
          {isUploadingPhoto ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {photoDisplayUri ? 'Change progress photo' : 'Add a progress photo (optional)'}
            </ThemedText>
          )}
        </Pressable>

        {photoDisplayUri ? (
          <>
            <Image
              source={{ uri: photoDisplayUri }}
              accessibilityLabel="Progress photo for today"
              style={[styles.photoPreview, { backgroundColor: theme.surfaceSunken }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove progress photo"
              onPress={() => void handleRemovePhoto()}
              hitSlop={8}
              style={styles.removePhoto}>
              <ThemedText type="small" themeColor="danger">
                Remove photo
              </ThemedText>
            </Pressable>
          </>
        ) : null}

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
          <MonthNavigator
            label={month.monthYearLabel}
            onPrevious={() => stepMonth(-1)}
            onNext={() => stepMonth(1)}
            isAtCurrentMonth={isAtCurrentMonth}
          />
        </View>

        {!tracking.isLoading && !workoutAssignment && !dietAssignment ? (
          // Weigh-ins above don't depend on a plan; plan activity does.
          <PlanStateCard
            title="No plans assigned yet"
            message="Your coach hasn't assigned a workout or diet plan, so there's no plan activity to show."
          />
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.summaryText}>
              Target achieved {completedDays}/{trainingDays.length} training days
              {restDays > 0 ? ` · ${restDays} rest ${restDays === 1 ? 'day' : 'days'}` : ''}
            </ThemedText>

            {/* Only the plan types this client actually has. */}
            <View style={styles.legendRow}>
              {workoutAssignment ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.chartWorkout }]} />
                  <ThemedText type="small" themeColor="textSecondary">Workout</ThemedText>
                </View>
              ) : null}
              {dietAssignment ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.chartDiet }]} />
                  <ThemedText type="small" themeColor="textSecondary">Diet</ThemedText>
                </View>
              ) : null}
            </View>

            <MonthlyActivityCalendar
              entries={dailyActivity}
              daysInMonth={month.daysInMonth}
              firstWeekday={month.firstWeekday}
            />
          </>
        )}
      </ThemedView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  removePhoto: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
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
  photoButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  photoPreview: {
    width: '100%',
    height: 140,
    borderRadius: Spacing.two,
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
});
