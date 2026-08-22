import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SetFeedback, WorkoutExercise, WorkoutSet } from '@/utils/dashboard-data';

type ExerciseCardProps = {
  exercise: WorkoutExercise;
  feedbackBySet: Record<string, SetFeedback>;
  onOpenSet: (exercise: WorkoutExercise, set: WorkoutSet) => void;
  onToggleSet: (setId: string) => void;
};

export function ExerciseCard({
  exercise,
  feedbackBySet,
  onOpenSet,
  onToggleSet,
}: ExerciseCardProps) {
  const theme = useTheme();
  const completedSets = exercise.sets.filter((set) => feedbackBySet[set.id]?.completed).length;

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText type="smallBold" themeColor="accent">
            {exercise.sets.length} sets
          </ThemedText>
          <ThemedText style={styles.title}>{exercise.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {exercise.note}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {completedSets}/{exercise.sets.length}
        </ThemedText>
      </View>

      <View style={[styles.tableHead, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.setColumn}>
          Set
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.valueColumn}>
          Weight
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.valueColumn}>
          Reps
        </ThemedText>
      </View>

      <View style={styles.rows}>
        {exercise.sets.map((set) => {
          const feedback = feedbackBySet[set.id];
          const hasNotes = Boolean(feedback?.comment || feedback?.videoReference);

          return (
            <View key={set.id} style={[styles.row, { borderColor: theme.border }]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(feedback?.completed) }}
                accessibilityLabel={`Mark ${exercise.name} set ${set.setNumber} complete`}
                onPress={() => onToggleSet(set.id)}
                style={[
                  styles.checkbox,
                  { borderColor: feedback?.completed ? theme.accent : theme.textSecondary },
                  feedback?.completed && { backgroundColor: theme.accent },
                ]}>
                {feedback?.completed && (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={14}
                    tintColor={theme.background}
                  />
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open notes for ${exercise.name} set ${set.setNumber}`}
                onPress={() => onOpenSet(exercise, set)}
                style={({ pressed }) => [styles.rowBody, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.setColumn}>
                  {set.setNumber}
                </ThemedText>
                <ThemedText type="small" style={styles.valueColumn}>
                  {set.weight}
                </ThemedText>
                <ThemedText type="small" style={styles.valueColumn}>
                  {set.reps}
                </ThemedText>
                <SymbolView
                  name={{
                    ios: hasNotes ? 'text.bubble.fill' : 'plus.bubble',
                    android: hasNotes ? 'chat' : 'add_comment',
                    web: hasNotes ? 'chat' : 'add_comment',
                  }}
                  size={18}
                  tintColor={hasNotes ? theme.accent : theme.textSecondary}
                />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
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
    gap: Spacing.half,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
  },
  tableHead: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingBottom: Spacing.two,
    paddingLeft: 40,
  },
  rows: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  setColumn: {
    width: 38,
  },
  valueColumn: {
    flex: 1,
  },
});
