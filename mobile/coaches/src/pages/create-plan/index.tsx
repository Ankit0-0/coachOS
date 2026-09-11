import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  planApi,
  type DietContent,
  type Plan,
  type PlanType,
  type WorkoutContent,
} from '@/lib/api';

/**
 * `id` is the plan-content id this row already had when it was loaded.
 * Check-ins record which items a client completed by that id, so an edit must
 * carry it through — re-deriving it from the name would silently orphan every
 * past check-in the moment a coach fixes a typo. Rows added in this session
 * have no id yet and get one on save.
 */
type ExerciseRow = {
  rowId: string;
  id?: string;
  name: string;
  note: string;
  sets: string;
  reps: string;
  rest: string;
};
type MealRow = { rowId: string; id?: string; label: string };

type Mode = 'create' | 'edit' | 'view';

let rowIdCounter = 0;
function newRowId(): string {
  rowIdCounter += 1;
  return `row-${Date.now()}-${rowIdCounter}`;
}

function emptyExercise(): ExerciseRow {
  return { rowId: newRowId(), name: '', note: '', sets: '3', reps: '', rest: '' };
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}

export function CreatePlanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = typeof params.planId === 'string' && params.planId ? params.planId : null;

  const [mode, setMode] = useState<Mode>(planId ? 'view' : 'create');
  const [isLoading, setIsLoading] = useState(Boolean(planId));
  const [loadFailed, setLoadFailed] = useState(false);

  const [type, setType] = useState<PlanType>('WORKOUT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Workout-only fields
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [workoutFocus, setWorkoutFocus] = useState('');
  const [workoutSummary, setWorkoutSummary] = useState('');
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyExercise()]);

  // Diet-only fields
  const [calories, setCalories] = useState('');
  const [dietFocus, setDietFocus] = useState('');
  const [dietSummary, setDietSummary] = useState('');
  const [meals, setMeals] = useState<MealRow[]>([{ rowId: newRowId(), label: '' }]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  // Inline rather than Alert, which is a no-op on React Native Web — routed
  // through Alert these messages simply never appear in a browser.
  const [formError, setFormError] = useState<string | null>(null);

  const isReadOnly = mode === 'view';

  /**
   * Placeholders are hints for someone typing. On a read-only plan there is
   * nothing to type, and a greyed "8-10" sitting in an empty Reps field reads
   * as though the plan actually says 8-10 — so empty fields show a dash.
   */
  const placeholderFor = (hint: string) => (isReadOnly ? '—' : hint);

  const prefill = useCallback((plan: Plan) => {
    setType(plan.type);
    setTitle(plan.title);
    setDescription(plan.description ?? '');

    if (plan.type === 'WORKOUT') {
      const content = plan.content as WorkoutContent;
      setDuration(content.duration);
      setDifficulty(content.difficulty);
      setWorkoutFocus(content.focus);
      setWorkoutSummary(content.summary);
      setExercises(
        content.exercises.map((exercise) => ({
          rowId: newRowId(),
          id: exercise.id,
          name: exercise.name,
          note: exercise.note ?? '',
          sets: String(exercise.sets),
          reps: exercise.reps ?? '',
          rest: exercise.rest ?? '',
        })),
      );
    } else {
      const content = plan.content as DietContent;
      setCalories(content.calories);
      setDietFocus(content.focus);
      setDietSummary(content.summary);
      setMeals(content.meals.map((meal) => ({ rowId: newRowId(), id: meal.id, label: meal.label })));
    }
  }, []);

  useEffect(() => {
    if (!planId) return;
    let active = true;

    planApi
      .get(planId)
      .then((plan) => {
        if (!active) return;
        prefill(plan);
        // Defaults are shared library plans the backend refuses to let a coach
        // edit (403). Showing them read-only mirrors that rule in the UI
        // instead of letting someone fill in a form that can only fail.
        const isOwn = !plan.isDefault && plan.createdById === user?.id;
        setMode(isOwn ? 'edit' : 'view');
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [planId, prefill, user?.id]);

  const addExercise = () => setExercises((rows) => [...rows, emptyExercise()]);
  const removeExercise = (rowId: string) => setExercises((rows) => rows.filter((row) => row.rowId !== rowId));
  const updateExercise = (rowId: string, changes: Partial<ExerciseRow>) =>
    setExercises((rows) => rows.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)));

  const addMeal = () => setMeals((rows) => [...rows, { rowId: newRowId(), label: '' }]);
  const removeMeal = (rowId: string) => setMeals((rows) => rows.filter((row) => row.rowId !== rowId));
  const updateMeal = (rowId: string, label: string) =>
    setMeals((rows) => rows.map((row) => (row.rowId === rowId ? { ...row, label } : row)));

  /** Returns the content to save, or null after setting the reason it can't be built. */
  const buildContent = (): WorkoutContent | DietContent | null => {
    if (type === 'WORKOUT') {
      const validExercises = exercises.filter((row) => row.name.trim());
      if (
        !duration.trim() ||
        !difficulty.trim() ||
        !workoutFocus.trim() ||
        !workoutSummary.trim() ||
        validExercises.length === 0
      ) {
        setFormError('Fill in duration, difficulty, focus, summary, and at least one exercise.');
        return null;
      }
      return {
        duration: duration.trim(),
        focus: workoutFocus.trim(),
        summary: workoutSummary.trim(),
        difficulty: difficulty.trim(),
        exercises: validExercises.map((row, index) => ({
          id: row.id ?? slugify(row.name, `exercise-${index}`),
          name: row.name.trim(),
          note: row.note.trim(),
          sets: Math.max(1, Number.parseInt(row.sets, 10) || 1),
          ...(row.reps.trim() ? { reps: row.reps.trim() } : {}),
          ...(row.rest.trim() ? { rest: row.rest.trim() } : {}),
        })),
      };
    }

    const validMeals = meals.filter((row) => row.label.trim());
    if (!calories.trim() || !dietFocus.trim() || !dietSummary.trim() || validMeals.length === 0) {
      setFormError('Fill in calories, focus, summary, and at least one meal.');
      return null;
    }
    return {
      calories: calories.trim(),
      focus: dietFocus.trim(),
      summary: dietSummary.trim(),
      meals: validMeals.map((row, index) => ({
        id: row.id ?? slugify(row.label, `meal-${index}`),
        label: row.label.trim(),
      })),
    };
  };

  const handleSave = async () => {
    setFormError(null);

    if (!title.trim()) {
      setFormError('Give this plan a title.');
      return;
    }

    const content = buildContent();
    if (!content) return;

    try {
      setIsSaving(true);
      if (mode === 'edit' && planId) {
        await planApi.update(planId, {
          title: title.trim(),
          description: description.trim(),
          content,
        });
      } else {
        await planApi.create({
          type,
          title: title.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          content,
        });
      }
      // The list screens reload on focus, so going back shows the new state.
      router.back();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError(
          "You've reached the 10-plan limit for this type. Delete an existing plan before adding a new one.",
        );
      } else if (error instanceof ApiError && error.status === 403) {
        setFormError('This is a shared plan from the library, so it can’t be edited.');
      } else {
        setFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!planId) return;
    setFormError(null);

    try {
      setIsDeleting(true);
      await planApi.remove(planId);
      router.back();
    } catch (error) {
      // On delete, a 409 means exactly one thing: a client is still active on
      // this plan. The response carries no body, so the call site supplies the
      // meaning rather than echoing a bare status at the coach.
      if (error instanceof ApiError && error.status === 409) {
        setFormError(
          'A client is currently assigned to this plan. Assign them a different plan first, then delete this one.',
        );
      } else {
        setFormError(error instanceof Error ? error.message : 'Could not delete this plan. Try again.');
      }
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenScaffold>
        <DetailHeader title="Plan" subtitle="Loading…" />
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (loadFailed) {
    return (
      <ScreenScaffold>
        <DetailHeader title="Plan" subtitle="This plan could not be opened." />
        <Card>
          <ThemedText type="smallBold">We couldn&apos;t load that plan</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.errorCopy}>
            It may have been deleted, or the connection dropped.
          </ThemedText>
          <Button label="Go back" variant="secondary" onPress={() => router.back()} />
        </Card>
      </ScreenScaffold>
    );
  }

  const header =
    mode === 'create'
      ? { title: 'Create Plan', subtitle: 'Build a reusable plan for your clients.' }
      : mode === 'edit'
        ? { title: 'Edit Plan', subtitle: 'Changes apply to every client already on this plan.' }
        : { title: 'View Plan', subtitle: 'A shared plan from the library. Assign it as-is.' };

  const inputStyle = [
    styles.input,
    { borderColor: theme.border, color: theme.text },
    isReadOnly && { backgroundColor: theme.surfaceSunken },
  ];

  return (
    <ScreenScaffold>
      <DetailHeader title={header.title} subtitle={header.subtitle} />

      {/* The type is fixed once a plan exists — its stored content has to keep
          matching it, and the backend rejects a mismatch. */}
      {mode === 'create' ? (
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
      ) : null}

      <Card style={styles.panel}>
        <ThemedText type="label" themeColor="textSecondary">
          Title
        </ThemedText>
        <TextInput
          style={inputStyle}
          placeholder={placeholderFor('e.g. Lower body strength')}
          placeholderTextColor={theme.textMuted}
          value={title}
          onChangeText={setTitle}
          editable={!isReadOnly}
        />

        <ThemedText type="label" themeColor="textSecondary">
          Description (optional)
        </ThemedText>
        <TextInput
          style={inputStyle}
          placeholder={placeholderFor('Short description')}
          placeholderTextColor={theme.textMuted}
          value={description}
          onChangeText={setDescription}
          editable={!isReadOnly}
        />
      </Card>

      {type === 'WORKOUT' ? (
        <Card style={styles.panel}>
          <ThemedText type="label" themeColor="textSecondary">
            Duration
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={placeholderFor('e.g. 45 min')}
            placeholderTextColor={theme.textMuted}
            value={duration}
            onChangeText={setDuration}
            editable={!isReadOnly}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Difficulty
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={placeholderFor('e.g. Intermediate')}
            placeholderTextColor={theme.textMuted}
            value={difficulty}
            onChangeText={setDifficulty}
            editable={!isReadOnly}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Focus
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={placeholderFor('What this plan targets')}
            placeholderTextColor={theme.textMuted}
            value={workoutFocus}
            onChangeText={setWorkoutFocus}
            editable={!isReadOnly}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Summary
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={placeholderFor('One-line summary')}
            placeholderTextColor={theme.textMuted}
            value={workoutSummary}
            onChangeText={setWorkoutSummary}
            editable={!isReadOnly}
          />
        </Card>
      ) : (
        <Card style={styles.panel}>
          <ThemedText type="label" themeColor="textSecondary">
            Calories
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={placeholderFor('e.g. 2,000 kcal')}
            placeholderTextColor={theme.textMuted}
            value={calories}
            onChangeText={setCalories}
            editable={!isReadOnly}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Focus
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={placeholderFor('What this plan targets')}
            placeholderTextColor={theme.textMuted}
            value={dietFocus}
            onChangeText={setDietFocus}
            editable={!isReadOnly}
          />

          <ThemedText type="label" themeColor="textSecondary">
            Summary
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={placeholderFor('One-line summary')}
            placeholderTextColor={theme.textMuted}
            value={dietSummary}
            onChangeText={setDietSummary}
            editable={!isReadOnly}
          />
        </Card>
      )}

      <Card style={styles.panel}>
        <ThemedText type="smallBold">{type === 'WORKOUT' ? 'Exercises' : 'Meals'}</ThemedText>

        {type === 'WORKOUT'
          ? exercises.map((row) => (
              <View key={row.rowId} style={styles.exerciseBlock}>
                <TextInput
                  style={inputStyle}
                  placeholder={placeholderFor('Exercise name')}
                  placeholderTextColor={theme.textMuted}
                  value={row.name}
                  onChangeText={(value) => updateExercise(row.rowId, { name: value })}
                  editable={!isReadOnly}
                />
                <TextInput
                  style={inputStyle}
                  placeholder={placeholderFor('Note (optional)')}
                  placeholderTextColor={theme.textMuted}
                  value={row.note}
                  onChangeText={(value) => updateExercise(row.rowId, { note: value })}
                  editable={!isReadOnly}
                />

                <View style={styles.tripleRow}>
                  <View style={styles.tripleField}>
                    <ThemedText type="meta">Sets</ThemedText>
                    <TextInput
                      style={inputStyle}
                      placeholder={placeholderFor('3')}
                      placeholderTextColor={theme.textMuted}
                      keyboardType="number-pad"
                      value={row.sets}
                      onChangeText={(value) => updateExercise(row.rowId, { sets: value })}
                      editable={!isReadOnly}
                    />
                  </View>
                  <View style={styles.tripleField}>
                    <ThemedText type="meta">Reps</ThemedText>
                    <TextInput
                      style={inputStyle}
                      placeholder={placeholderFor('8-10')}
                      placeholderTextColor={theme.textMuted}
                      value={row.reps}
                      onChangeText={(value) => updateExercise(row.rowId, { reps: value })}
                      editable={!isReadOnly}
                    />
                  </View>
                  <View style={styles.tripleField}>
                    <ThemedText type="meta">Rest</ThemedText>
                    <TextInput
                      style={inputStyle}
                      placeholder={placeholderFor('90s')}
                      placeholderTextColor={theme.textMuted}
                      value={row.rest}
                      onChangeText={(value) => updateExercise(row.rowId, { rest: value })}
                      editable={!isReadOnly}
                    />
                  </View>
                </View>

                {isReadOnly ? null : (
                  <Pressable onPress={() => removeExercise(row.rowId)} style={styles.removeButton}>
                    <ThemedText type="small" themeColor="danger">
                      Remove exercise
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            ))
          : meals.map((row) => (
              <View key={row.rowId} style={styles.rowEditor}>
                <TextInput
                  style={[...inputStyle, styles.rowInput]}
                  placeholder={placeholderFor('e.g. Breakfast: eggs, toast, fruit')}
                  placeholderTextColor={theme.textMuted}
                  value={row.label}
                  onChangeText={(value) => updateMeal(row.rowId, value)}
                  editable={!isReadOnly}
                />
                {isReadOnly ? null : (
                  <Pressable onPress={() => removeMeal(row.rowId)} style={styles.removeButton}>
                    <ThemedText type="small" themeColor="danger">
                      Remove
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            ))}

        {isReadOnly ? null : (
          <Pressable
            style={[styles.addButton, { borderColor: theme.border }]}
            onPress={type === 'WORKOUT' ? addExercise : addMeal}>
            <ThemedText type="smallBold" themeColor="accent">
              + Add {type === 'WORKOUT' ? 'exercise' : 'meal'}
            </ThemedText>
          </Pressable>
        )}
      </Card>

      {formError ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger">
            {formError}
          </ThemedText>
        </View>
      ) : null}

      {isReadOnly ? (
        <Button label="Back" variant="secondary" onPress={() => router.back()} fullWidth />
      ) : (
        <>
          <Button
            label={mode === 'edit' ? 'Save changes' : 'Create plan'}
            onPress={handleSave}
            loading={isSaving}
            fullWidth
          />

          {mode === 'edit' ? (
            // Confirmed inline rather than with Alert, which is a no-op on
            // React Native Web — an Alert-gated delete does nothing at all in
            // a browser, with no error to explain why.
            isConfirmingDelete ? (
              <Card style={styles.confirmBlock}>
                <ThemedText type="smallBold">Delete this plan?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  This can&apos;t be undone. Clients who already finished it keep their history.
                </ThemedText>
                <View style={styles.confirmActions}>
                  <View style={styles.confirmAction}>
                    <Button
                      label="Cancel"
                      variant="secondary"
                      onPress={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      fullWidth
                    />
                  </View>
                  <View style={styles.confirmAction}>
                    <Button label="Delete plan" variant="danger" onPress={handleDelete} loading={isDeleting} fullWidth />
                  </View>
                </View>
              </Card>
            ) : (
              <Button
                label="Delete plan"
                variant="danger"
                onPress={() => setIsConfirmingDelete(true)}
                fullWidth
              />
            )
          ) : null}
        </>
      )}
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
  exerciseBlock: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  tripleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tripleField: {
    flex: 1,
    gap: Spacing.one,
  },
  rowEditor: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  rowInput: {
    flex: 1,
  },
  removeButton: {
    paddingHorizontal: Spacing.two,
    alignSelf: 'flex-start',
  },
  addButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
  errorCopy: {
    marginBottom: Spacing.two,
  },
  confirmBlock: {
    gap: Spacing.two,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmAction: {
    flex: 1,
  },
});
