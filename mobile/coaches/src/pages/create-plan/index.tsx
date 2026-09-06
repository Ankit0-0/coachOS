import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, planApi, type DietContent, type PlanType, type WorkoutContent } from '@/lib/api';

type ExerciseRow = { rowId: string; name: string; note: string; sets: string };
type MealRow = { rowId: string; label: string };

let rowIdCounter = 0;
function newRowId(): string {
  rowIdCounter += 1;
  return `row-${Date.now()}-${rowIdCounter}`;
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "You've reached the 10-plan limit for this type. Delete an existing plan before adding a new one.";
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function CreatePlanScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [type, setType] = useState<PlanType>('WORKOUT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Workout-only fields
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [workoutFocus, setWorkoutFocus] = useState('');
  const [workoutSummary, setWorkoutSummary] = useState('');
  const [exercises, setExercises] = useState<ExerciseRow[]>([{ rowId: newRowId(), name: '', note: '', sets: '3' }]);

  // Diet-only fields
  const [calories, setCalories] = useState('');
  const [dietFocus, setDietFocus] = useState('');
  const [dietSummary, setDietSummary] = useState('');
  const [meals, setMeals] = useState<MealRow[]>([{ rowId: newRowId(), label: '' }]);

  const [isSaving, setIsSaving] = useState(false);

  const addExercise = () => setExercises((rows) => [...rows, { rowId: newRowId(), name: '', note: '', sets: '3' }]);
  const removeExercise = (rowId: string) => setExercises((rows) => rows.filter((row) => row.rowId !== rowId));
  const updateExercise = (rowId: string, changes: Partial<ExerciseRow>) =>
    setExercises((rows) => rows.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)));

  const addMeal = () => setMeals((rows) => [...rows, { rowId: newRowId(), label: '' }]);
  const removeMeal = (rowId: string) => setMeals((rows) => rows.filter((row) => row.rowId !== rowId));
  const updateMeal = (rowId: string, label: string) =>
    setMeals((rows) => rows.map((row) => (row.rowId === rowId ? { ...row, label } : row)));

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give this plan a title.');
      return;
    }

    let content: WorkoutContent | DietContent;
    if (type === 'WORKOUT') {
      const validExercises = exercises.filter((row) => row.name.trim());
      if (!duration.trim() || !difficulty.trim() || !workoutFocus.trim() || !workoutSummary.trim() || validExercises.length === 0) {
        Alert.alert('Missing details', 'Fill in duration, difficulty, focus, summary, and at least one exercise.');
        return;
      }
      content = {
        duration: duration.trim(),
        focus: workoutFocus.trim(),
        summary: workoutSummary.trim(),
        difficulty: difficulty.trim(),
        exercises: validExercises.map((row, index) => ({
          id: slugify(row.name, `exercise-${index}`),
          name: row.name.trim(),
          note: row.note.trim(),
          sets: Math.max(1, Number.parseInt(row.sets, 10) || 1),
        })),
      };
    } else {
      const validMeals = meals.filter((row) => row.label.trim());
      if (!calories.trim() || !dietFocus.trim() || !dietSummary.trim() || validMeals.length === 0) {
        Alert.alert('Missing details', 'Fill in calories, focus, summary, and at least one meal.');
        return;
      }
      content = {
        calories: calories.trim(),
        focus: dietFocus.trim(),
        summary: dietSummary.trim(),
        meals: validMeals.map((row, index) => ({
          id: slugify(row.label, `meal-${index}`),
          label: row.label.trim(),
        })),
      };
    }

    try {
      setIsSaving(true);
      await planApi.create({
        type,
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        content,
      });
      router.back();
    } catch (error) {
      Alert.alert('Could not create plan', errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenScaffold>
      <DetailHeader title="Create Plan" subtitle="Build a reusable plan for your clients." />

      <View style={styles.typeRow}>
        <Pressable
          style={[
            styles.typePill,
            { borderColor: theme.border },
            type === 'WORKOUT' && { backgroundColor: theme.accent, borderColor: theme.accent },
          ]}
          onPress={() => setType('WORKOUT')}>
          <ThemedText type="smallBold" themeColor={type === 'WORKOUT' ? 'onAccent' : 'text'}>
            Workout
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.typePill,
            { borderColor: theme.border },
            type === 'DIET' && { backgroundColor: theme.accent, borderColor: theme.accent },
          ]}
          onPress={() => setType('DIET')}>
          <ThemedText type="smallBold" themeColor={type === 'DIET' ? 'onAccent' : 'text'}>
            Diet
          </ThemedText>
        </Pressable>
      </View>

      <Card style={styles.panel}>
        <ThemedText type="label" themeColor="textSecondary">
          Title
        </ThemedText>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. Lower body strength"
          placeholderTextColor={theme.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <ThemedText type="label" themeColor="textSecondary">
          Description (optional)
        </ThemedText>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder="Short description"
          placeholderTextColor={theme.textMuted}
          value={description}
          onChangeText={setDescription}
        />
      </Card>

      {type === 'WORKOUT' ? (
        <Card style={styles.panel}>
          <ThemedText type="label" themeColor="textSecondary">
            Duration
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. 45 min"
            placeholderTextColor={theme.textMuted}
            value={duration}
            onChangeText={setDuration}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Difficulty
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. Intermediate"
            placeholderTextColor={theme.textMuted}
            value={difficulty}
            onChangeText={setDifficulty}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Focus
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="What this plan targets"
            placeholderTextColor={theme.textMuted}
            value={workoutFocus}
            onChangeText={setWorkoutFocus}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Summary
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="One-line summary"
            placeholderTextColor={theme.textMuted}
            value={workoutSummary}
            onChangeText={setWorkoutSummary}
          />
        </Card>
      ) : (
        <Card style={styles.panel}>
          <ThemedText type="label" themeColor="textSecondary">
            Calories
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. 2,000 kcal"
            placeholderTextColor={theme.textMuted}
            value={calories}
            onChangeText={setCalories}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Focus
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="What this plan targets"
            placeholderTextColor={theme.textMuted}
            value={dietFocus}
            onChangeText={setDietFocus}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Summary
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="One-line summary"
            placeholderTextColor={theme.textMuted}
            value={dietSummary}
            onChangeText={setDietSummary}
          />
        </Card>
      )}

      <Card style={styles.panel}>
        <ThemedText type="smallBold">{type === 'WORKOUT' ? 'Exercises' : 'Meals'}</ThemedText>

        {type === 'WORKOUT'
          ? exercises.map((row) => (
              <View key={row.rowId} style={styles.rowEditor}>
                <TextInput
                  style={[styles.input, styles.rowInput, { borderColor: theme.border, color: theme.text }]}
                  placeholder="Exercise name"
                  placeholderTextColor={theme.textMuted}
                  value={row.name}
                  onChangeText={(value) => updateExercise(row.rowId, { name: value })}
                />
                <TextInput
                  style={[styles.input, styles.rowInput, { borderColor: theme.border, color: theme.text }]}
                  placeholder="Note (optional)"
                  placeholderTextColor={theme.textMuted}
                  value={row.note}
                  onChangeText={(value) => updateExercise(row.rowId, { note: value })}
                />
                <TextInput
                  style={[styles.input, styles.setsInput, { borderColor: theme.border, color: theme.text }]}
                  placeholder="Sets"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  value={row.sets}
                  onChangeText={(value) => updateExercise(row.rowId, { sets: value })}
                />
                <Pressable onPress={() => removeExercise(row.rowId)} style={styles.removeButton}>
                  <ThemedText type="small" themeColor="warning">
                    Remove
                  </ThemedText>
                </Pressable>
              </View>
            ))
          : meals.map((row) => (
              <View key={row.rowId} style={styles.rowEditor}>
                <TextInput
                  style={[styles.input, styles.rowInput, { borderColor: theme.border, color: theme.text }]}
                  placeholder="e.g. Breakfast: eggs, toast, fruit"
                  placeholderTextColor={theme.textMuted}
                  value={row.label}
                  onChangeText={(value) => updateMeal(row.rowId, value)}
                />
                <Pressable onPress={() => removeMeal(row.rowId)} style={styles.removeButton}>
                  <ThemedText type="small" themeColor="warning">
                    Remove
                  </ThemedText>
                </Pressable>
              </View>
            ))}

        <Pressable
          style={[styles.addButton, { borderColor: theme.border }]}
          onPress={type === 'WORKOUT' ? addExercise : addMeal}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            + Add {type === 'WORKOUT' ? 'exercise' : 'meal'}
          </ThemedText>
        </Pressable>
      </Card>

      <Button label="Create plan" onPress={handleCreate} loading={isSaving} fullWidth />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  typePill: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  panel: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
  rowEditor: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  rowInput: {
    flex: 1,
  },
  setsInput: {
    width: 64,
  },
  removeButton: {
    paddingHorizontal: Spacing.two,
  },
  addButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
