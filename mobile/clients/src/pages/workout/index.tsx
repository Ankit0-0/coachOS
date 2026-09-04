import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { LockedState } from '@/components/locked-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { SetFeedbackPanel } from '@/components/workout/set-feedback-panel';
import { Spacing } from '@/constants/theme';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useTheme } from '@/hooks/use-theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { trackingApi } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { SetFeedback, WorkoutExercise, WorkoutSet, workoutDetails } from '@/utils/dashboard-data';

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
  const { hasCoach, isLoading: isCheckingOnboarding } = useOnboardingStatus();
  const workoutExercises = workoutDetails.exercises ?? [];
  const { workout: workoutAssignment } = useTrackingAssignments();
  const [feedbackBySet, setFeedbackBySet] = useState<Record<string, SetFeedback>>({});
  const [selectedSet, setSelectedSet] = useState<SelectedSet | null>(null);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const totalSets = useMemo(
    () => workoutExercises.reduce((total, exercise) => total + exercise.sets.length, 0),
    [workoutExercises]
  );
  const completedSets = Object.values(feedbackBySet).filter((feedback) => feedback.completed).length;

  function getSetFeedback(setId: string) {
    return feedbackBySet[setId] ?? emptyFeedback;
  }

  function buildCompletedItemIds(next: Record<string, SetFeedback>): string[] {
    const completed: string[] = [];
    for (const exercise of workoutExercises) {
      for (const set of exercise.sets) {
        if (next[set.id]?.completed) {
          completed.push(`${exercise.id}-set${set.setNumber}`);
        }
      }
    }
    return completed;
  }

  function syncCheckIn(next: Record<string, SetFeedback>) {
    if (!workoutAssignment) return;
    const completedItemIds = buildCompletedItemIds(next);
    trackingApi
      .saveCheckIn({
        assignmentId: workoutAssignment.id,
        date: todayKey(),
        completedItemIds,
      })
      .catch(() => {
        // Optimistic UI — the local toggle stays. A failed sync can be retried
        // by toggling again or on the next visit.
      });
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
    if (!workoutAssignment) {
      setSaveMessage('No active workout assignment found.');
      return;
    }
    try {
      setIsSavingLog(true);
      const completedItemIds = buildCompletedItemIds(feedbackBySet);
      await trackingApi.saveCheckIn({
        assignmentId: workoutAssignment.id,
        date: todayKey(),
        completedItemIds,
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

  // Restore today's already-completed sets so progress survives app restarts.
  const hasLoadedToday = useRef(false);
  useEffect(() => {
    if (!workoutAssignment || hasLoadedToday.current) return;
    hasLoadedToday.current = true;

    (async () => {
      try {
        const rows = await trackingApi.listCheckIns({
          assignmentId: workoutAssignment.id,
          from: todayKey(),
          to: todayKey(),
        });
        const checkIn = rows[0];
        if (!checkIn || checkIn.completedItemIds.length === 0) return;

        const addressableToSetId: Record<string, string> = {};
        for (const exercise of workoutExercises) {
          for (const set of exercise.sets) {
            addressableToSetId[`${exercise.id}-set${set.setNumber}`] = set.id;
          }
        }

        const restored: Record<string, SetFeedback> = {};
        for (const itemId of checkIn.completedItemIds) {
          const setId = addressableToSetId[itemId];
          if (setId) restored[setId] = { completed: true, comment: '', videoReference: '' };
        }
        setFeedbackBySet(restored);
      } catch {
        // Could not restore — leave today's screen empty.
      }
    })();
  }, [workoutAssignment, workoutExercises]);

  if (isCheckingOnboarding) {
    return (
      <ScreenScaffold>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!hasCoach) {
    return <LockedState title="Workout" />;
  }

  return (
    <ScreenScaffold>
      <DetailHeader title="Workout" subtitle={workoutDetails.title} />

      <ThemedView type="backgroundElement" style={[styles.summary, { borderColor: theme.border }]}>
        <View style={styles.summaryHeader}>
          <ThemedText type="smallBold" themeColor="accent">
            {workoutDetails.time}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {completedSets}/{totalSets} sets checked
          </ThemedText>
        </View>
        <ThemedText>{workoutDetails.focus}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Tap a set row to add temporary comments or a video reference for your coach.
        </ThemedText>
      </ThemedView>

      <View style={styles.list}>
        {workoutExercises.map((exercise) => (
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
          <ThemedText type="smallBold" style={styles.saveLogButtonText}>
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
  saveLogButtonText: {
    color: '#FFFFFF',
  },
});
