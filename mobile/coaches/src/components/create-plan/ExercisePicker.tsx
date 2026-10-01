import { StyleSheet, View } from 'react-native';

import { LibraryPicker, type LibraryPickerConfig, type LibraryPickerProps } from '@/components/create-plan/LibraryPicker';
import { Chip } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';
import { exerciseLibraryApi, type LibraryExercise, type TrainingDay } from '@/lib/api';
import { muscleLabel, TRAINING_DAYS } from '@/lib/library';

const CONFIG: LibraryPickerConfig<LibraryExercise, TrainingDay> = {
  title: 'Choose exercise',
  searchPlaceholder: 'Search or type an exercise',
  saveLabel: 'Save to my exercises',
  savedLabel: 'Saved to your exercises',
  noun: 'exercises',
  filterLabel: 'Training day',
  filters: TRAINING_DAYS,
  groupOf: (exercise) => exercise.trainingDay,
  ungroupedLabel: 'Other',
  search: (q, trainingDay) => exerciseLibraryApi.search({ q, trainingDay }),
  save: (name) => exerciseLibraryApi.create({ name }),
  details: (exercise) =>
    exercise.primaryMuscles.length > 0 ? (
      <View style={styles.chips}>
        {exercise.primaryMuscles.map((muscle) => (
          <Chip key={muscle} label={muscleLabel(muscle)} tone="green" />
        ))}
      </View>
    ) : null,
};

/** Picks an exercise name from the library, or takes whatever was typed. */
export function ExercisePicker(props: LibraryPickerProps) {
  return <LibraryPicker config={CONFIG} {...props} />;
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
