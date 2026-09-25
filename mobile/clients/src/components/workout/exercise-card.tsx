import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, InsetPanel } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { HitTarget, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SetFeedback, WorkoutExercise, WorkoutSet } from '@/lib/plan-content';
import { Checkbox } from '@coachos/theme';

type ExerciseCardProps = {
  exercise: WorkoutExercise;
  feedbackBySet: Record<string, SetFeedback>;
  onOpenSet: (exercise: WorkoutExercise, set: WorkoutSet) => void;
  onToggleSet: (setId: string) => void;
};

/** One exercise; its sets are checkable rows in an inset tray, like the landing check-in card. */
export function ExerciseCard({ exercise, feedbackBySet, onOpenSet, onToggleSet }: ExerciseCardProps) {
  const theme = useTheme();
  const completedSets = exercise.sets.filter((set) => feedbackBySet[set.id]?.completed).length;
  const allDone = exercise.sets.length > 0 && completedSets === exercise.sets.length;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText type="heading">{exercise.name}</ThemedText>
          {exercise.note ? (
            <ThemedText type="small" themeColor="textSecondary">
              {exercise.note}
            </ThemedText>
          ) : null}
        </View>
        <Chip label={`${completedSets}/${exercise.sets.length}`} tone={allDone ? 'success' : 'green'} />
      </View>

      <InsetPanel>
        {exercise.sets.map((set) => {
          const feedback = feedbackBySet[set.id];
          const done = Boolean(feedback?.completed);
          const hasNotes = Boolean(feedback?.comment || feedback?.videoReference);

          return (
            <View key={set.id} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Checkbox
                checked={done}
                accessibilityLabel={`Mark ${exercise.name} set ${set.setNumber} complete`}
                onPress={() => onToggleSet(set.id)}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open notes for ${exercise.name} set ${set.setNumber}`}
                onPress={() => onOpenSet(exercise, set)}
                style={({ pressed }) => [styles.rowBody, pressed && styles.pressed]}>
                <View style={styles.setCopy}>
                  <ThemedText
                    type="smallBold"
                    themeColor={done ? 'textMuted' : 'textPrimary'}
                    style={done && styles.done}>
                    Set {set.setNumber} · {set.reps} reps
                  </ThemedText>
                  {set.rest ? (
                    <ThemedText type="meta" style={done && styles.done}>
                      Rest {set.rest}
                    </ThemedText>
                  ) : null}
                </View>
                <SymbolView
                  name={{
                    ios: hasNotes ? 'text.bubble.fill' : 'plus.bubble',
                    android: hasNotes ? 'chat' : 'add_comment',
                    web: hasNotes ? 'chat' : 'add_comment',
                  }}
                  size={18}
                  tintColor={hasNotes ? theme.primary : theme.textMuted}
                />
              </Pressable>
            </View>
          );
        })}
      </InsetPanel>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingLeft: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  rowBody: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.three,
    minWidth: HitTarget,
  },
  pressed: {
    opacity: 0.7,
  },
  setCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  done: {
    textDecorationLine: 'line-through',
  },
});
