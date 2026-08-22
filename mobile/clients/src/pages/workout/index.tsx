import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { SetFeedbackPanel } from '@/components/workout/set-feedback-panel';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const workoutExercises = workoutDetails.exercises ?? [];
  const [feedbackBySet, setFeedbackBySet] = useState<Record<string, SetFeedback>>({});
  const [selectedSet, setSelectedSet] = useState<SelectedSet | null>(null);
  const totalSets = useMemo(
    () => workoutExercises.reduce((total, exercise) => total + exercise.sets.length, 0),
    [workoutExercises]
  );
  const completedSets = Object.values(feedbackBySet).filter((feedback) => feedback.completed).length;

  function getSetFeedback(setId: string) {
    return feedbackBySet[setId] ?? emptyFeedback;
  }

  function updateSetFeedback(setId: string, feedback: SetFeedback) {
    setFeedbackBySet((current) => ({
      ...current,
      [setId]: feedback,
    }));
  }

  function toggleSet(setId: string) {
    const currentFeedback = getSetFeedback(setId);

    updateSetFeedback(setId, {
      ...currentFeedback,
      completed: !currentFeedback.completed,
    });
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

      <SetFeedbackPanel
        selectedSet={selectedSet}
        feedback={selectedSet ? getSetFeedback(selectedSet.set.id) : emptyFeedback}
        onChange={(feedback) => {
          if (selectedSet) {
            updateSetFeedback(selectedSet.set.id, feedback);
          }
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
});
