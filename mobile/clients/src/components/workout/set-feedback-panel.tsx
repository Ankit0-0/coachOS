import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/pill';
import { CLOSE_ICON, IconButton } from '@/components/ui/icon-button';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Checkbox, TextField } from '@coachos/theme';
import type { SetFeedback, WorkoutExercise, WorkoutSet } from '@/lib/plan-content';

type SelectedSet = {
  exercise: WorkoutExercise;
  set: WorkoutSet;
};

type SetFeedbackPanelProps = {
  selectedSet: SelectedSet | null;
  feedback: SetFeedback;
  onChange: (feedback: SetFeedback) => void;
  onClose: () => void;
};

export function SetFeedbackPanel({
  feedback,
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
            <ThemedText type="label" themeColor="textSecondary">
              Comment for coach
            </ThemedText>
            <TextField
              multiline
              value={feedback.comment}
              onChangeText={(comment) => onChange({ ...feedback, comment })}
              placeholder="Pain, form, effort, or anything your coach should review."
              accessibilityLabel="Comment for coach"
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Video reference
            </ThemedText>

            <View style={styles.videoActions}>
              <View style={styles.videoButton}>
                <Button
                  label="Record video"
                  variant="secondary"
                  fullWidth
                  onPress={() => onChange({ ...feedback, videoReference: 'Recorded video captured locally' })}
                />
              </View>
              <View style={styles.videoButton}>
                <Button
                  label="Upload video"
                  variant="secondary"
                  fullWidth
                  onPress={() => onChange({ ...feedback, videoReference: 'Video uploaded locally' })}
                />
              </View>
            </View>

            {feedback.videoReference ? <Chip label={feedback.videoReference} tone="success" /> : null}
          </View>

          <Button label="Save note" onPress={onClose} />
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
  videoActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  videoButton: {
    flex: 1,
  },
});
