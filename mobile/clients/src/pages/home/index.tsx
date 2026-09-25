import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { CoachStrip } from '@/components/home/CoachStrip';
import { LockedState } from '@/components/locked-state';
import { PlanCard, type HomePlanCard } from '@/components/plan-card';
import { PlanStateCard } from '@/components/plan-state-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, InsetPanel, Row } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useTodaySchedule } from '@/hooks/use-schedule';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { trackingApi, type WeightEntry } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { pickAndUploadImage } from '@/lib/image-upload';
import { cycleDayLabel, dietDayOf, parseDietContent, parseWorkoutContent, workoutDayOf } from '@/lib/plan-content';
import { formatCalories, formatDuration } from '@/lib/plan-units';
import { parseWeightInput } from '@/lib/weight';
import { IconTile, TextField } from '@coachos/theme';

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const onboarding = useOnboardingStatus();
  const tracking = useTrackingAssignments();
  // Today's day of each cycle, resolved by the backend.
  const schedule = useTodaySchedule();
  const { workout: workoutAssignment, diet: dietAssignment } = tracking;
  const workoutAssignmentId = workoutAssignment?.id;
  const dietAssignmentId = dietAssignment?.id;
  /** Set ids ticked in today's workout check-in, for its progress ring. */
  const [workoutCheckedIds, setWorkoutCheckedIds] = useState<string[]>([]);
  /** Meal ids ticked in today's diet check-in, for its progress ring. */
  const [dietCheckedIds, setDietCheckedIds] = useState<string[]>([]);
  /**
   * What's already saved for today, read back from the API. Without it the card
   * only knew what had been typed since it mounted, so a saved weight showed as
   * an empty box and a saved photo vanished on the next launch.
   */
  const [todayEntry, setTodayEntry] = useState<WeightEntry | null>(null);
  /** A freshly picked local file, previewed until it's saved. */
  const [physiqueImage, setPhysiqueImage] = useState<string | null>(null);
  /** The S3 key behind it — this is what the weight entry actually stores. */
  const [physiqueKey, setPhysiqueKey] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  /** What the client has typed; null until they edit, so the field shows today's saved weight. */
  const [weightValue, setWeightValue] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  /** Today's ticked items for each plan, so both cards draw the same ring. */
  const loadTodayProgress = useCallback(async () => {
    const todaysTicks = async (assignmentId: string | undefined, set: (ids: string[]) => void) => {
      if (!assignmentId) {
        set([]);
        return;
      }
      try {
        const rows = await trackingApi.listCheckIns({ assignmentId, from: todayKey(), to: todayKey() });
        set(rows[0]?.completedItemIds ?? []);
      } catch {
        // Progress is secondary; the card still opens the plan without it.
      }
    };
    await Promise.all([
      todaysTicks(workoutAssignmentId, setWorkoutCheckedIds),
      todaysTicks(dietAssignmentId, setDietCheckedIds),
    ]);
  }, [workoutAssignmentId, dietAssignmentId]);

  const loadTodayUpdate = useCallback(async () => {
    try {
      const [entry] = await trackingApi.listWeights({ from: todayKey(), to: todayKey() });
      setTodayEntry(entry ?? null);
    } catch {
      // Secondary: the card still lets the client log today's update.
    }
  }, []);

  // Refetched on focus so the rings reflect what was ticked on the plan screens,
  // and today's update reflects a weigh-in logged from History.
  useFocusEffect(
    useCallback(() => {
      void loadTodayProgress();
      void loadTodayUpdate();
    }, [loadTodayProgress, loadTodayUpdate]),
  );

  const { isRefreshing, refresh } = useRefresh(
    onboarding.reload,
    tracking.reload,
    schedule.reload,
    loadTodayProgress,
    loadTodayUpdate,
  );

  const shownWeight = weightValue ?? (todayEntry ? String(todayEntry.weightKg) : '');
  const shownPhoto = physiqueImage ?? todayEntry?.photoUrl ?? null;

  // Cards only for plans the client is actually on, showing the day of the
  // cycle that falls today — never a sample plan, never a fixed day.
  const planCards: HomePlanCard[] = [];
  const workoutToday = schedule.workout;
  const workoutDay = workoutDayOf(workoutToday);
  if (workoutAssignment && workoutToday) {
    const setsDone = workoutCheckedIds.filter((id) => workoutToday.itemIds.includes(id)).length;
    const exerciseCount = workoutDay?.exercises.length ?? 0;
    planCards.push({
      id: 'workout',
      kind: 'Workout',
      title: workoutToday.title,
      dayLabel: cycleDayLabel(workoutToday),
      isRestDay: workoutToday.isRestDay,
      // The day's label is already in `dayLabel`; the plan's own summary says what it is for.
      summary: parseWorkoutContent(workoutAssignment.content)?.summary ?? '',
      chips: workoutToday.isRestDay
        ? []
        : [
            formatDuration(workoutDay?.duration ?? ''),
            `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}`,
            `${workoutToday.itemCount} ${workoutToday.itemCount === 1 ? 'set' : 'sets'}`,
          ].filter(Boolean),
      route: '/workout',
      iconName: { ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' },
      progressPercent: workoutToday.itemCount > 0 ? (setsDone / workoutToday.itemCount) * 100 : 0,
      progressLabel: workoutToday.isRestDay
        ? 'Rest day — nothing to do'
        : `${setsDone} of ${workoutToday.itemCount} sets done today`,
    });
  }

  const dietToday = schedule.diet;
  const dietDay = dietDayOf(dietToday);
  if (dietAssignment && dietToday) {
    const mealsDone = dietCheckedIds.filter((id) => dietToday.itemIds.includes(id)).length;
    planCards.push({
      id: 'diet',
      kind: 'Diet',
      title: dietToday.title,
      dayLabel: cycleDayLabel(dietToday),
      isRestDay: dietToday.isRestDay,
      summary: parseDietContent(dietAssignment.content)?.summary ?? '',
      chips: dietToday.isRestDay
        ? []
        : [
            formatCalories(dietDay?.calories ?? ''),
            `${dietToday.itemCount} ${dietToday.itemCount === 1 ? 'meal' : 'meals'}`,
          ].filter(Boolean),
      route: '/diet',
      iconName: { ios: 'fork.knife.circle', android: 'restaurant', web: 'restaurant' },
      progressPercent: dietToday.itemCount > 0 ? (mealsDone / dietToday.itemCount) * 100 : 0,
      progressLabel: `${mealsDone} of ${dietToday.itemCount} meals done today`,
    });
  }

  const pickPhysiquePhoto = async () => {
    if (isUploadingPhoto) return;

    setSavedMessage(null);
    setIsUploadingPhoto(true);
    let result;
    try {
      result = await pickAndUploadImage('weight');
    } finally {
      setIsUploadingPhoto(false);
    }

    // Cancelling leaves any photo already attached in place.
    if (result.status === 'cancelled') return;
    if (result.status === 'error') {
      setSavedMessage(result.message);
      return;
    }

    setPhysiqueImage(result.uri);
    setPhysiqueKey(result.key);
  };

  const handleSaveUpdate = async () => {
    // Checked here so an out-of-range weight gets a reason, not the API's bare 400.
    const weight = parseWeightInput(shownWeight);
    if (weight.status === 'invalid') {
      setSavedMessage(weight.message);
      return;
    }
    try {
      setIsSaving(true);
      const entry = await trackingApi.saveWeight({
        date: todayKey(),
        weightKg: weight.kg,
        // Only sent when a photo was picked, so saving a weight on its own
        // never clears a photo added earlier in the day.
        ...(physiqueKey ? { photoKey: physiqueKey } : {}),
      });
      // The saved entry is now what the card shows: its weight in the field and
      // its photo as a signed URL, so the local preview and the draft can go.
      setTodayEntry(entry);
      setWeightValue(null);
      setPhysiqueImage(null);
      setPhysiqueKey(null);
      setSavedMessage('Saved to today\u2019s update.');
    } catch (error) {
      setSavedMessage(
        error instanceof Error ? error.message : 'Could not save your update. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (onboarding.isLoading) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <ActivityIndicator color={theme.textMuted} />
      </ScreenScaffold>
    );
  }

  if (!onboarding.hasCoach) {
    return <LockedState title="Home" refreshing={isRefreshing} onRefresh={refresh} />;
  }

  return (
    <ScreenScaffold
      includeBottomTabInset
      refreshing={isRefreshing}
      onRefresh={refresh}
      pinnedHeader={onboarding.coach ? <CoachStrip coach={onboarding.coach} /> : null}>
      <View style={styles.header}>
        <ThemedText type="display">Ready for today?</ThemedText>
        <ThemedText themeColor="textSecondary">
          {planCards.length > 0
            ? 'Here is what your coach has lined up for today.'
            : 'Your plans will show up here as soon as your coach assigns them.'}
        </ThemedText>
      </View>

      <Section title="Today">
        {tracking.isLoading || schedule.isLoading ? (
          <ActivityIndicator color={theme.textMuted} />
        ) : planCards.length > 0 ? (
          <View style={styles.cards}>
            {tracking.error ? (
              <PlanStateCard
                tone="danger"
                title="Couldn't refresh your plans"
                message={`${tracking.error.message} Showing the last version loaded.`}
              />
            ) : null}
            {planCards.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </View>
        ) : tracking.error ? (
          <PlanStateCard
            tone="danger"
            title="Couldn't load your plans"
            message={`${tracking.error.message} Pull down to try again.`}
          />
        ) : (
          <PlanStateCard
            title="No plans assigned yet"
            message="Your coach hasn't assigned a workout or diet plan. Pull down to check again."
          />
        )}
      </Section>

      <Card style={styles.updateCard}>
        <View style={styles.updateTitle}>
          <ThemedText type="heading">Today&apos;s update</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Log a weigh-in or a physique photo. Your coach sees it.
          </ThemedText>
        </View>

        <InsetPanel>
          <Row>
            <ThemedText type="smallBold" style={styles.label}>
              Physique photo
            </ThemedText>
            <Button
              label={shownPhoto ? 'Change' : 'Upload'}
              variant="secondary"
              size="sm"
              loading={isUploadingPhoto}
              accessibilityLabel={shownPhoto ? 'Change physique photo' : 'Upload physique photo'}
              onPress={() => void pickPhysiquePhoto()}
            />
          </Row>

          {shownPhoto ? (
            <Image
              source={{ uri: shownPhoto }}
              accessibilityLabel="Physique photo for today"
              style={[styles.previewImage, { backgroundColor: theme.surface }]}
            />
          ) : null}

          <Row>
            <ThemedText type="smallBold" style={styles.label}>
              Weight
            </ThemedText>
            <TextField
              value={shownWeight}
              onChangeText={setWeightValue}
              placeholder="Add kg"
              keyboardType="decimal-pad"
              accessibilityLabel="Today's weight in kilograms"
              style={styles.weightInput}
            />
          </Row>
        </InsetPanel>

        {savedMessage ? (
          <ThemedText
            type="small"
            themeColor={savedMessage.startsWith('Saved') ? 'success' : 'warning'}
            numberOfLines={2}>
            {savedMessage}
          </ThemedText>
        ) : null}
        <Button label={isSaving ? 'Saving…' : 'Save update'} loading={isSaving} onPress={handleSaveUpdate} />
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open history"
        onPress={() => router.push('/history')}
        style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.historyCard}>
          <IconTile icon={{ ios: 'chart.line.uptrend.xyaxis', android: 'show_chart', web: 'show_chart' }} />
          <View style={styles.historyCopy}>
            <ThemedText type="heading">History</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Previous weigh-ins, physique updates, and your check-in calendar.
            </ThemedText>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={18}
            tintColor={theme.textMuted}
          />
        </Card>
      </Pressable>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  cards: {
    gap: Spacing.three,
  },
  updateCard: {
    gap: Spacing.three,
  },
  updateTitle: {
    gap: Spacing.one,
  },
  label: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: Radii.md,
  },
  weightInput: {
    width: 110,
  },
  pressed: {
    opacity: 0.85,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  historyCopy: {
    flex: 1,
    gap: Spacing.one,
  },
});
