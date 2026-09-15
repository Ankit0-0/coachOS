import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { LockedState } from '@/components/locked-state';
import { PlanStateCard } from '@/components/plan-state-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { SetFeedbackPanel } from '@/components/workout/set-feedback-panel';
import { Spacing } from '@/constants/theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { trackingApi } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { formatDuration } from '@/lib/plan-units';
import {
  workoutContentOf,
  workoutExercisesFrom,
  type SetFeedback,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/lib/plan-content';

type SelectedSet = {
  exercise: WorkoutExercise;
  set: WorkoutSet;
};

const emptyFeedback: SetFeedback = {
  completed: false,
  comment: '',
  videoReference: '',
};

export function WorkoutDetailsScreen() {
  const theme = useTheme();
  const onboarding = useOnboardingStatus();
  const tracking = useTrackingAssignments();
  const workoutAssignment = tracking.workout;
  const assignmentId = workoutAssignment?.id;
  const content = useMemo(() => workoutContentOf(workoutAssignment), [workoutAssignment]);

  // Keyed by set id, which is also the check-in item id (`{exerciseId}-set{n}`).
  const [feedbackBySet, setFeedbackBySet] = useState<Record<string, SetFeedback>>({});
  const [selectedSet, setSelectedSet] = useState<SelectedSet | null>(null);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const exercises = useMemo(() => (content ? workoutExercisesFrom(content) : []), [content]);
  const totalSets = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const completedSets = exercises
    .flatMap((exercise) => exercise.sets)
    .filter((set) => feedbackBySet[set.id]?.completed).length;

  /**
   * Today's saved check-in, so progress survives restarts. Completion comes
   * from the server; set comments are local-only, so they're kept.
   */
  const loadToday = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const rows = await trackingApi.listCheckIns({
        assignmentId,
        from: todayKey(),
        to: todayKey(),
      });
      const completed = new Set(rows[0]?.completedItemIds ?? []);
      setFeedbackBySet((current) => {
        const next: Record<string, SetFeedback> = {};
        for (const [setId, feedback] of Object.entries(current)) {
          next[setId] = { ...feedback, completed: completed.has(setId) };
        }
        for (const setId of completed) {
          next[setId] = { ...(next[setId] ?? emptyFeedback), completed: true };
        }
        return next;
      });
    } catch {
      // Could not restore — keep whatever is on screen.
    }
  }, [assignmentId]);

  // Restored on focus (and again if the assignment changes), so ticks saved
  // elsewhere are reflected; pull-to-refresh calls it directly.
  useFocusEffect(
    useCallback(() => {
      void loadToday();
    }, [loadToday]),
  );

  const { isRefreshing, refresh } = useRefresh(onboarding.reload, tracking.reload, loadToday);

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
      <ScreenScaffold>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!onboarding.hasCoach) {
    return <LockedState title="Workout" refreshing={isRefreshing} onRefresh={refresh} />;
  }

  if (tracking.isLoading) {
    return (
      <ScreenScaffold>
        <DetailHeader title="Workout" subtitle="Loading your plan…" />
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  // Only fall through to the plan when there is a real, readable one.
  if (!workoutAssignment || !content || exercises.length === 0) {
    const failed = !workoutAssignment && tracking.error;
    return (
      <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
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
    <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title="Workout" subtitle={workoutAssignment.title} />

      {tracking.error ? (
        <PlanStateCard
          tone="danger"
          title="Couldn't refresh your plan"
          message={`${tracking.error.message} Showing the last version loaded.`}
        />
      ) : null}

      <ThemedView type="backgroundElement" style={[styles.summary, { borderColor: theme.border }]}>
        <View style={styles.summaryHeader}>
          <ThemedText type="smallBold" themeColor="accent">
            {formatDuration(content.duration)}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {completedSets}/{totalSets} sets checked
          </ThemedText>
        </View>
        {content.focus ? <ThemedText>{content.focus}</ThemedText> : null}
        <ThemedText type="small" themeColor="textSecondary">
          Tap a set row to add temporary comments or a video reference for your coach.
        </ThemedText>
      </ThemedView>

      <View style={styles.list}>
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            feedbackBySet={feedbackBySet}
            onOpenSet={(openedExercise, set) => setSelectedSet({ exercise: openedExercise, set })}
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
        <Pressable
          accessibilityRole="button"
          onPress={handleSaveWorkoutLog}
          disabled={isSavingLog}
          style={({ pressed }) => [
            styles.saveLogButton,
            { backgroundColor: theme.accent, opacity: isSavingLog ? 0.6 : pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold" themeColor="onAccent">
            {isSavingLog ? 'Saving…' : 'Save workout log'}
          </ThemedText>
        </Pressable>
      </View>

      <SetFeedbackPanel
        selectedSet={selectedSet}
        feedback={selectedSet ? getSetFeedback(selectedSet.set.id) : emptyFeedback}
        onChange={(feedback) => {
          if (!selectedSet) return;
          const next = { ...feedbackBySet, [selectedSet.set.id]: feedback };
          setFeedbackBySet(next);
          setSaveMessage(null);
          syncCheckIn(next);
        }}
        onClose={() => setSelectedSet(null)}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  footer: {
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  footerMessage: {
    textAlign: 'center',
  },
  saveLogButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
