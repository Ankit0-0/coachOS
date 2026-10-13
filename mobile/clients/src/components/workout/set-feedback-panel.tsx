import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/pill';
import { CLOSE_ICON, IconButton } from '@/components/ui/icon-button';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Checkbox, TextField } from '@coachos/theme';
import type { SetLog } from '@/lib/api';
import { shortDateLabel } from '@/lib/dates';
import type { SetFeedback, WorkoutExercise, WorkoutSet } from '@/lib/plan-content';
import { formatSetLog, parseSetLog } from '@/lib/set-log';

type SelectedSet = {
  exercise: WorkoutExercise;
  set: WorkoutSet;
};

type SetFeedbackPanelProps = {
  selectedSet: SelectedSet | null;
  feedback: SetFeedback;
  /** The last earlier session of this exercise, set by set; null when there isn't one. */
  lastTime: { date: string; sets: SetLog[] } | null;
  onChange: (feedback: SetFeedback) => void;
  onClose: () => void;
};

export function SetFeedbackPanel({
  feedback,
  lastTime,
  onChange,
  onClose,
  selectedSet,
}: SetFeedbackPanelProps) {
  const theme = useTheme();
  // The sheet sits on the bottom edge: clear of the navigation bar, at least as roomy as before.
  const insets = useSafeAreaInsets();

  if (!selectedSet) {
    return null;
  }

  const toggleCompleted = () => onChange({ ...feedback, completed: !feedback.completed });
  const isInvalid = parseSetLog(feedback.weightKg, feedback.reps) === undefined;
  // The same set last time, or the last set they did if this one is new.
  const previous = lastTime ? (lastTime.sets[selectedSet.set.setNumber - 1] ?? lastTime.sets[lastTime.sets.length - 1]) : null;
  const previousText = formatSetLog(previous);

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Close set notes" />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.threeHalf),
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Chip label={`Set ${selectedSet.set.setNumber}`} tone="green" />
              <ThemedText type="subtitle">{selectedSet.exercise.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {selectedSet.set.reps} reps · {selectedSet.set.rest} rest
              </ThemedText>
            </View>
            <IconButton icon={CLOSE_ICON} label="Close set notes" onPress={onClose} />
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: feedback.completed }}
            onPress={toggleCompleted}
            style={[styles.completeRow, { backgroundColor: theme.surfaceInset }]}>
            <Checkbox checked={feedback.completed} accessibilityLabel="Completed as planned" />
            <ThemedText type="smallBold" style={styles.completeText}>
              Completed as planned
            </ThemedText>
          </Pressable>

          <View style={styles.field}>
            <View style={styles.liftRow}>
              <View style={styles.liftField}>
                <ThemedText type="label" themeColor="textSecondary">
                  Weight (kg)
                </ThemedText>
                <TextField
                  value={feedback.weightKg}
                  onChangeText={(weightKg) => onChange({ ...feedback, weightKg })}
                  placeholder={previous?.weightKg != null ? String(previous.weightKg) : '0'}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Weight lifted, in kilograms"
                  maxLength={6}
                />
              </View>
              <View style={styles.liftField}>
                <ThemedText type="label" themeColor="textSecondary">
                  Reps
                </ThemedText>
                <TextField
                  value={feedback.reps}
                  onChangeText={(reps) => onChange({ ...feedback, reps })}
                  placeholder={selectedSet.set.reps !== '—' ? selectedSet.set.reps : '0'}
                  keyboardType="number-pad"
                  accessibilityLabel="Reps done"
                  maxLength={4}
                />
              </View>
            </View>
            {isInvalid ? (
              <ThemedText type="meta" themeColor="danger">
                Use numbers only, like 42.5 kg and 8 reps.
              </ThemedText>
            ) : previousText ? (
              <ThemedText type="meta">
                Last time ({shortDateLabel(lastTime?.date ?? '')}): {previousText}
              </ThemedText>
            ) : (
              <ThemedText type="meta">Leave the weight empty for bodyweight exercises.</ThemedText>
            )}
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Comment for your coach
            </ThemedText>
            <TextField
              multiline
              value={feedback.comment}
              onChangeText={(comment) => onChange({ ...feedback, comment })}
              placeholder="Pain, form, effort, or anything your coach should review."
              accessibilityLabel="Comment for your coach"
              maxLength={500}
            />
            <ThemedText type="meta">Your coach sees this with today’s log.</ThemedText>
          </View>

          <Button label="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  panel: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.threeHalf,
    gap: Spacing.threeHalf,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radii.pill,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one + Spacing.half,
  },
  completeRow: {
    borderRadius: Radii.md,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  completeText: {
    flex: 1,
  },
  field: {
    gap: Spacing.two,
  },
  liftRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  liftField: {
    flex: 1,
    gap: Spacing.two,
  },
});
