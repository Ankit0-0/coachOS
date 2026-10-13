import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { LockedState } from '@/components/locked-state';
import { PlanStateCard } from '@/components/plan-state-card';
import { RestDayCard } from '@/components/rest-day-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { SetFeedbackPanel } from '@/components/workout/set-feedback-panel';
import { Spacing } from '@/constants/theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useTodaySchedule } from '@/hooks/use-schedule';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { trackingApi, type ExerciseHistory, type SetLog } from '@/lib/api';
import { addDays, todayKey } from '@/lib/dates';
import { formatDuration } from '@/lib/plan-units';
import { ProgressBar } from '@coachos/theme';
import {
  cycleDayLabel,
  workoutDayOf,
  workoutExercisesFrom,
  type SetFeedback,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/lib/plan-content';
import { lastSessionFor, parseSetLog, setLogText } from '@/lib/set-log';

/** How far back the "last time" hint looks for an exercise. */
const HISTORY_LOOKBACK_DAYS = 120;

type SelectedSet = {
  exercise: WorkoutExercise;
  set: WorkoutSet;
};

const emptyFeedback: SetFeedback = {
  completed: false,
  comment: '',
  weightKg: '',
  reps: '',
};

export function WorkoutDetailsScreen() {
  const theme = useTheme();
  const onboarding = useOnboardingStatus();
  const tracking = useTrackingAssignments();
  // Which day of the cycle today is comes from the backend, never from a date
  // calculation here.
  const schedule = useTodaySchedule();
  const today = schedule.workout;
  const workoutAssignment = tracking.workout;
  const assignmentId = workoutAssignment?.id;
  const day = useMemo(() => workoutDayOf(today), [today]);

  // Keyed by set id, which is also the check-in item id (`{exerciseId}-set{n}`).
  const [feedbackBySet, setFeedbackBySet] = useState<Record<string, SetFeedback>>({});
  const [selectedSet, setSelectedSet] = useState<SelectedSet | null>(null);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  /** The open set as it was when the sheet opened, so closing saves only what changed. */
  const feedbackAtOpen = useRef<SetFeedback>(emptyFeedback);
  /** Recent sessions per exercise, for the set sheet's "last time" hint. Empty until loaded, or if it fails. */
  const [history, setHistory] = useState<ExerciseHistory[]>([]);

  const exercises = useMemo(() => (day ? workoutExercisesFrom(day) : []), [day]);
  const totalSets = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const completedSets = exercises
    .flatMap((exercise) => exercise.sets)
    .filter((set) => feedbackBySet[set.id]?.completed).length;

  /** Today's saved check-in (ticks and set comments), so progress survives restarts. */
  const loadToday = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const rows = await trackingApi.listCheckIns({
        assignmentId,
        from: todayKey(),
        to: todayKey(),
      });
      const completed = new Set(rows[0]?.completedItemIds ?? []);
      const comments = rows[0]?.itemNotes ?? {};
      const logs = rows[0]?.setLogs ?? {};
      const restored = (setId: string): SetFeedback => ({
        completed: completed.has(setId),
        comment: comments[setId] ?? '',
        ...setLogText(logs[setId]),
      });
      setFeedbackBySet((current) => {
        const next: Record<string, SetFeedback> = {};
        for (const setId of new Set([...Object.keys(current), ...completed, ...Object.keys(comments), ...Object.keys(logs)])) {
          next[setId] = restored(setId);
        }
        return next;
      });
    } catch {
      // Could not restore — keep whatever is on screen.
    }
  }, [assignmentId]);

  // Only a hint: without it the sheet simply shows no "last time" line.
  const loadHistory = useCallback(async () => {
    const today = todayKey();
    try {
      setHistory(await trackingApi.exerciseHistory({ from: addDays(today, -HISTORY_LOOKBACK_DAYS), to: today }));
    } catch {
      // Keep what loaded before.
    }
  }, []);

  // Restored on focus (and again if the assignment changes), so ticks saved
  // elsewhere are reflected; pull-to-refresh calls it directly.
  useFocusEffect(
    useCallback(() => {
      void loadToday();
      void loadHistory();
    }, [loadToday, loadHistory]),
  );

  const { isRefreshing, refresh } = useRefresh(
    onboarding.reload,
    tracking.reload,
    schedule.reload,
    loadToday,
    loadHistory,
  );

  function buildCompletedItemIds(next: Record<string, SetFeedback>): string[] {
    return exercises
      .flatMap((exercise) => exercise.sets)
      .filter((set) => next[set.id]?.completed)
      .map((set) => set.id);
  }

  function syncCheckIn(next: Record<string, SetFeedback>) {
    if (!workoutAssignment) return;
    trackingApi
      .saveCheckIn({
        assignmentId: workoutAssignment.id,
        date: todayKey(),
        completedItemIds: buildCompletedItemIds(next),
      })
      .catch(() => {
        // Optimistic UI — the local toggle stays. A failed sync can be retried
        // by toggling again or on the next visit.
      });
  }

  function getSetFeedback(setId: string) {
    return feedbackBySet[setId] ?? emptyFeedback;
  }

  function toggleSet(setId: string) {
    const currentFeedback = getSetFeedback(setId);
    const next = {
      ...feedbackBySet,
      [setId]: { ...currentFeedback, completed: !currentFeedback.completed },
    };
    setFeedbackBySet(next);
    setSaveMessage(null);
    syncCheckIn(next);
  }

  function openSet(exercise: WorkoutExercise, set: WorkoutSet) {
    feedbackAtOpen.current = getSetFeedback(set.id);
    setSelectedSet({ exercise, set });
  }

  /**
   * Closing the sheet saves the set's comment and what was lifted, if either
   * changed. Logging numbers also ticks the set off: it was done.
   */
  function closeSet() {
    const open = selectedSet;
    setSelectedSet(null);
    if (!open || !workoutAssignment) return;
    const before = feedbackAtOpen.current;
    const feedback = getSetFeedback(open.set.id);

    const comment = feedback.comment.trim();
    const commentChanged = comment !== before.comment.trim();
    const log = parseSetLog(feedback.weightKg, feedback.reps);
    const previousLog = parseSetLog(before.weightKg, before.reps);
    const logChanged = log !== undefined && JSON.stringify(log) !== JSON.stringify(previousLog ?? null);

    let next = feedbackBySet;
    if (log === undefined) {
      // Put back what was there, rather than leave a number on screen that was never saved.
      next = { ...feedbackBySet, [open.set.id]: { ...feedback, weightKg: before.weightKg, reps: before.reps } };
      setFeedbackBySet(next);
      setSaveMessage('That weight or rep count isn’t a number, so it wasn’t saved. Open the set to fix it.');
    } else if (log && !feedback.completed) {
      next = { ...feedbackBySet, [open.set.id]: { ...feedback, completed: true } };
      setFeedbackBySet(next);
    }
    if (!commentChanged && !logChanged && next === feedbackBySet) return;

    trackingApi
      .saveCheckIn({
        assignmentId: workoutAssignment.id,
        date: todayKey(),
        completedItemIds: buildCompletedItemIds(next),
        ...(commentChanged ? { itemNotes: { [open.set.id]: comment || null } } : {}),
        ...(logChanged ? { setLogs: { [open.set.id]: log as SetLog | null } } : {}),
      })
      .catch(() => {
        setSaveMessage('This set couldn’t be saved. Open it and close it again to retry.');
      });
  }

  const handleSaveWorkoutLog = async () => {
    if (!workoutAssignment) return;
    try {
      setIsSavingLog(true);
      await trackingApi.saveCheckIn({
        assignmentId: workoutAssignment.id,
        date: todayKey(),
        completedItemIds: buildCompletedItemIds(feedbackBySet),
      });
      setSaveMessage('Workout log saved to your history.');
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : 'Could not save the workout log. Please try again.',
      );
    } finally {
      setIsSavingLog(false);
    }
  };

  if (onboarding.isLoading) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!onboarding.hasCoach) {
    return <LockedState title="Workout" refreshing={isRefreshing} onRefresh={refresh} />;
  }

  if (tracking.isLoading || schedule.isLoading) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <DetailHeader title="Workout" subtitle="Loading your plan…" />
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  // A rest day is scheduled, not missing: it gets its own state.
  if (today?.isRestDay) {
    return (
      <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
        <DetailHeader title="Workout" subtitle={today.title} />
        <RestDayCard cycleLabel={cycleDayLabel(today)} />
      </ScreenScaffold>
    );
  }

  // Only fall through to the plan when there is a real, readable one.
  if (!workoutAssignment || !today || exercises.length === 0) {
    const failed = !workoutAssignment && tracking.error;
    return (
      <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
        <DetailHeader title="Workout" subtitle={failed ? 'Something went wrong' : 'No plan yet'} />
        {failed ? (
          <PlanStateCard
            tone="danger"
            title="Couldn't load your workout plan"
            message={`${tracking.error?.message ?? 'Check your connection.'} Pull down to try again.`}
          />
        ) : (
          <PlanStateCard
            title="Your coach hasn't assigned a workout plan yet"
            message="When they do, your exercises will appear here. Pull down to check again."
          />
        )}
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title="Workout" subtitle={workoutAssignment.title} />

      {tracking.error ? (
        <PlanStateCard
          tone="danger"
          title="Couldn't refresh your plan"
          message={`${tracking.error.message} Showing the last version loaded.`}
        />
      ) : null}

      <Card style={styles.summary}>
        <View style={styles.summaryChips}>
          <Chip label={`Workout · ${cycleDayLabel(today)}`} tone="green" />
          {day?.duration ? <Chip label={formatDuration(day.duration)} tone="neutral" /> : null}
        </View>
        {day?.label ? <ThemedText type="heading">{day.label}</ThemedText> : null}
        <ProgressBar
          value={totalSets > 0 ? completedSets / totalSets : 0}
          color="chartWorkout"
          label={`${completedSets} of ${totalSets} sets checked`}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Tap a set to log the weight and reps, or to leave your coach a comment.
        </ThemedText>
      </Card>

      <View style={styles.list}>
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            feedbackBySet={feedbackBySet}
            onOpenSet={openSet}
            onToggleSet={toggleSet}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {saveMessage ? (
          <ThemedText
            type="small"
            themeColor={saveMessage.startsWith('Workout log saved') ? 'success' : 'warning'}
            style={styles.footerMessage}>
            {saveMessage}
          </ThemedText>
        ) : null}
        <Button
          label={isSavingLog ? 'Saving…' : 'Save workout log'}
          loading={isSavingLog}
          onPress={handleSaveWorkoutLog}
        />
      </View>

      <SetFeedbackPanel
        selectedSet={selectedSet}
        feedback={selectedSet ? getSetFeedback(selectedSet.set.id) : emptyFeedback}
        lastTime={selectedSet ? lastSessionFor(history, selectedSet.exercise.name, todayKey()) : null}
        onChange={(feedback) => {
          if (!selectedSet) return;
          const previous = getSetFeedback(selectedSet.set.id);
          const next = { ...feedbackBySet, [selectedSet.set.id]: feedback };
          setFeedbackBySet(next);
          setSaveMessage(null);
          // Ticks sync at once; the comment and the numbers are sent once, when the sheet closes.
          if (feedback.completed !== previous.completed) syncCheckIn(next);
        }}
        onClose={closeSet}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: Spacing.twoHalf,
  },
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
  footer: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  footerMessage: {
    textAlign: 'center',
  },
});
