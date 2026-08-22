import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SetFeedback, WorkoutExercise, WorkoutSet } from '@/utils/dashboard-data';

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

  if (!selectedSet) {
    return null;
  }

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <ThemedView type="background" style={[styles.panel, { borderColor: theme.border }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="smallBold" themeColor="accent">
                Set {selectedSet.set.setNumber}
              </ThemedText>
              <ThemedText style={styles.title}>{selectedSet.exercise.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {selectedSet.set.weight} · {selectedSet.set.reps} reps
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close set notes"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, { borderColor: theme.border }, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={18}
                tintColor={theme.text}
              />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: feedback.completed }}
            onPress={() => onChange({ ...feedback, completed: !feedback.completed })}
            style={[styles.completeRow, { borderColor: theme.border }]}>
            <View
              style={[
                styles.checkbox,
                { borderColor: feedback.completed ? theme.accent : theme.textSecondary },
                feedback.completed && { backgroundColor: theme.accent },
              ]}>
              {feedback.completed && (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={14}
                  tintColor={theme.background}
                />
              )}
            </View>
            <ThemedText style={styles.completeText}>Completed as planned</ThemedText>
          </Pressable>

          <View style={styles.field}>
            <ThemedText type="smallBold">Comment for coach</ThemedText>
            <TextInput
              multiline
              value={feedback.comment}
              onChangeText={(comment) => onChange({ ...feedback, comment })}
              placeholder="Add pain, form, effort, or anything coach should review."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                styles.commentInput,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">Video reference</ThemedText>
            <TextInput
              value={feedback.videoReference}
              onChangeText={(videoReference) => onChange({ ...feedback, videoReference })}
              placeholder="Paste a video link or temporary file name."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.doneButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Save temporary note
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  dismissArea: {
    flex: 1,
  },
  panel: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A8ADB5',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  completeRow: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: {
    flex: 1,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 22,
  },
  commentInput: {
    minHeight: 110,
  },
  doneButton: {
    borderRadius: Spacing.two,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
