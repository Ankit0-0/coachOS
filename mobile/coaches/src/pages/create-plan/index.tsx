import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CycleLengthPicker } from '@/components/create-plan/CycleLengthPicker';
import { DayStrip } from '@/components/create-plan/DayStrip';
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
  type DietDayContent,
  type Plan,
  type PlanType,
  type WorkoutContent,
  type WorkoutDayContent,
} from '@/lib/api';
import { TextField } from '@coachos/theme';

/**
 * `id` is the plan-content id this row already had when it was loaded.
 * Check-ins record which items a client completed by that id, so an edit must
 * carry it through — re-deriving it from the name would silently orphan every
 * past check-in the moment a coach fixes a typo. Rows added in this session
 * have no id yet and get one on save, prefixed with the day they sit on.
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

/**
 * One day of the cycle. It holds both an exercise list and a meal list so that
 * switching the plan's type on a new plan doesn't throw away what was typed —
 * only the side matching the type is ever saved.
 */
type DayDraft = {
  key: string;
  label: string;
  isRestDay: boolean;
  duration: string;
  calories: string;
  exercises: ExerciseRow[];
  meals: MealRow[];
};

type Mode = 'create' | 'edit' | 'view';

let rowIdCounter = 0;
function newRowId(): string {
  rowIdCounter += 1;
  return `row-${Date.now()}-${rowIdCounter}`;
}

function emptyExercise(): ExerciseRow {
  return { rowId: newRowId(), name: '', note: '', sets: '3', reps: '', rest: '' };
}

function emptyMeal(): MealRow {
  return { rowId: newRowId(), label: '' };
}

function emptyDay(): DayDraft {
  return {
    key: newRowId(),
    label: '',
    isRestDay: false,
    duration: '',
    calories: '',
    exercises: [emptyExercise()],
    meals: [emptyMeal()],
  };
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}

/** Whether the day would show the client anything. A rest day is deliberately something. */
function dayHasContent(day: DayDraft, type: PlanType): boolean {
  if (type === 'WORKOUT') return day.isRestDay || day.exercises.some((row) => row.name.trim());
  return day.meals.some((row) => row.label.trim());
}

/** "Day 3", "Days 3 and 5", "Days 2, 5 and 9" — for messages that name the days at fault. */
function dayList(indexes: number[]): string {
  const numbers = indexes.map((index) => index + 1);
  const noun = numbers.length === 1 ? 'Day' : 'Days';
  if (numbers.length === 1) return `${noun} ${numbers[0]}`;
  return `${noun} ${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
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

  // Plan-level fields: what the plan is, regardless of which day it is.
  const [difficulty, setDifficulty] = useState('');
  const [focus, setFocus] = useState('');
  const [summary, setSummary] = useState('');

  const [days, setDays] = useState<DayDraft[]>([emptyDay()]);
  const [selectedDay, setSelectedDay] = useState(0);
  /** A shorter cycle waiting on confirmation, because days with content would be dropped. */
  const [pendingLength, setPendingLength] = useState<number | null>(null);
  /** How many clients are on this plan right now; undefined until a plan is loaded. */
  const [activeAssignments, setActiveAssignments] = useState<number | undefined>(undefined);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  // Inline rather than Alert, which is a no-op on React Native Web — routed
  // through Alert these messages simply never appear in a browser.
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isReadOnly = mode === 'view';
  const day = days[selectedDay] ?? days[0];

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
    setActiveAssignments(plan.activeAssignmentCount);

    const content = plan.content as WorkoutContent | DietContent;
    setFocus(content.focus);
    setSummary(content.summary);

    if (plan.type === 'WORKOUT') {
      const workout = plan.content as WorkoutContent;
      setDifficulty(workout.difficulty);
      setDays(
        workout.days.map((source) => ({
          key: newRowId(),
          label: source.label,
          isRestDay: source.isRestDay,
          duration: source.duration,
          calories: '',
          exercises:
            source.exercises.length > 0
              ? source.exercises.map((exercise) => ({
                  rowId: newRowId(),
                  id: exercise.id,
                  name: exercise.name,
                  note: exercise.note ?? '',
                  sets: String(exercise.sets),
                  reps: exercise.reps ?? '',
                  rest: exercise.rest ?? '',
                }))
              : [emptyExercise()],
          meals: [emptyMeal()],
        })),
      );
    } else {
      const diet = plan.content as DietContent;
      setDays(
        diet.days.map((source) => ({
          key: newRowId(),
          label: source.label,
          isRestDay: false,
          duration: '',
          calories: source.calories,
          exercises: [emptyExercise()],
          meals:
            source.meals.length > 0
              ? source.meals.map((meal) => ({ rowId: newRowId(), id: meal.id, label: meal.label }))
              : [emptyMeal()],
        })),
      );
    }
    setSelectedDay(0);
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

  // ---- cycle length -------------------------------------------------------

  const resizeTo = (next: number) => {
    setDays((current) => {
      if (next <= current.length) return current.slice(0, next);
      const added = Array.from({ length: next - current.length }, emptyDay);
      return [...current, ...added];
    });
    setSelectedDay((current) => Math.min(current, next - 1));
    setPendingLength(null);
    setNotice(null);
  };

  const handleLengthChange = (next: number) => {
    setFormError(null);
    if (next === days.length) return;
    if (next < days.length) {
      // Growing is free; shrinking throws work away, so it asks first — but
      // only when there is actually something to lose.
      const losesWork = days.slice(next).some((candidate) => dayHasContent(candidate, type));
      if (losesWork) {
        setPendingLength(next);
        return;
      }
    }
    resizeTo(next);
  };

  // ---- day editing --------------------------------------------------------

  const updateDay = (changes: Partial<DayDraft>) =>
    setDays((current) =>
      current.map((existing, index) => (index === selectedDay ? { ...existing, ...changes } : existing)),
    );

  const updateExercise = (rowId: string, changes: Partial<ExerciseRow>) =>
    updateDay({
      exercises: day.exercises.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)),
    });
  const addExercise = () => updateDay({ exercises: [...day.exercises, emptyExercise()] });
  const removeExercise = (rowId: string) =>
    updateDay({ exercises: day.exercises.filter((row) => row.rowId !== rowId) });

  const updateMeal = (rowId: string, label: string) =>
    updateDay({ meals: day.meals.map((row) => (row.rowId === rowId ? { ...row, label } : row)) });
  const addMeal = () => updateDay({ meals: [...day.meals, emptyMeal()] });
  const removeMeal = (rowId: string) => updateDay({ meals: day.meals.filter((row) => row.rowId !== rowId) });

  const toggleRestDay = () => {
    setNotice(null);
    updateDay({ isRestDay: !day.isRestDay });
  };

  /**
   * Copies this day onto the next day that has nothing in it. The copies drop
   * their ids so they are re-issued against the day they land on — the same
   * exercise on two days has to be two different things to tick off.
   */
  const duplicateDay = () => {
    setFormError(null);
    const order = [
      ...days.slice(selectedDay + 1).map((_, offset) => selectedDay + 1 + offset),
      ...days.slice(0, selectedDay).map((_, index) => index),
    ];
    const target = order.find((index) => !dayHasContent(days[index], type));
    if (target === undefined) {
      setNotice('Every other day already has something in it. Clear one, or make the cycle longer.');
      return;
    }

    setDays((current) =>
      current.map((existing, index) =>
        index === target
          ? {
              ...existing,
              label: current[selectedDay].label,
              isRestDay: current[selectedDay].isRestDay,
              duration: current[selectedDay].duration,
              calories: current[selectedDay].calories,
              exercises: current[selectedDay].exercises.map((row) => ({
                ...row,
                rowId: newRowId(),
                id: undefined,
              })),
              meals: current[selectedDay].meals.map((row) => ({
                ...row,
                rowId: newRowId(),
                id: undefined,
              })),
            }
          : existing,
      ),
    );
    setSelectedDay(target);
    setNotice(`Copied to day ${target + 1}.`);
  };

  // ---- saving -------------------------------------------------------------

  /** Returns the content to save, or null after setting the reason it can't be built. */
  const buildContent = (): WorkoutContent | DietContent | null => {
    if (!focus.trim() || !summary.trim() || (type === 'WORKOUT' && !difficulty.trim())) {
      setFormError(
        type === 'WORKOUT'
          ? 'Fill in difficulty, focus and summary.'
          : 'Fill in focus and summary.',
      );
      return null;
    }

    const emptyDays: number[] = [];
    days.forEach((candidate, index) => {
      if (!dayHasContent(candidate, type)) emptyDays.push(index);
    });
    if (emptyDays.length > 0) {
      setSelectedDay(emptyDays[0]);
      setFormError(
        type === 'WORKOUT'
          ? `${dayList(emptyDays)} ${emptyDays.length === 1 ? 'has' : 'have'} nothing in ${
              emptyDays.length === 1 ? 'it' : 'them'
            } — add an exercise, or mark ${emptyDays.length === 1 ? 'it' : 'them'} as rest.`
          : `${dayList(emptyDays)} ${emptyDays.length === 1 ? 'has' : 'have'} no meals yet.`,
      );
      return null;
    }

    if (type === 'WORKOUT') {
      const workoutDays: WorkoutDayContent[] = days.map((source, index) => {
        const used = new Set<string>();
        const rows = source.isRestDay ? [] : source.exercises.filter((row) => row.name.trim());
        return {
          dayIndex: index,
          label: source.label.trim() || (source.isRestDay ? 'Rest' : `Day ${index + 1}`),
          isRestDay: source.isRestDay,
          duration: source.isRestDay ? '' : source.duration.trim(),
          exercises: rows.map((row, position) => ({
            id: uniqueId(row.id, index, slugify(row.name, `exercise-${position + 1}`), used),
            name: row.name.trim(),
            note: row.note.trim(),
            sets: Math.max(1, Number.parseInt(row.sets, 10) || 1),
            ...(row.reps.trim() ? { reps: row.reps.trim() } : {}),
            ...(row.rest.trim() ? { rest: row.rest.trim() } : {}),
          })),
        };
      });
      return { focus: focus.trim(), summary: summary.trim(), difficulty: difficulty.trim(), days: workoutDays };
    }

    const dietDays: DietDayContent[] = days.map((source, index) => {
      const used = new Set<string>();
      const rows = source.meals.filter((row) => row.label.trim());
      return {
        dayIndex: index,
        label: source.label.trim() || `Day ${index + 1}`,
        calories: source.calories.trim(),
        meals: rows.map((row, position) => ({
          id: uniqueId(row.id, index, slugify(row.label, `meal-${position + 1}`), used),
          label: row.label.trim(),
        })),
      };
    });
    return { focus: focus.trim(), summary: summary.trim(), days: dietDays };
  };

  const handleSave = async () => {
    setFormError(null);
    setNotice(null);

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
          cycleLengthDays: days.length,
          content,
        });
      } else {
        await planApi.create({
          type,
          title: title.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          cycleLengthDays: days.length,
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
      <ScreenScaffold includeBottomTabInset>
        <DetailHeader title="Plan" subtitle="Loading…" />
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (loadFailed) {
    return (
      <ScreenScaffold includeBottomTabInset>
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


  const itemCount = type === 'WORKOUT' ? day.exercises.filter((row) => row.name.trim()).length : day.meals.filter((row) => row.label.trim()).length;

  return (
    <ScreenScaffold includeBottomTabInset>
      <DetailHeader title={header.title} subtitle={header.subtitle} />

      {/* The type is fixed once a plan exists — its stored content has to keep
          matching it, and the backend rejects a mismatch. */}
      {mode === 'create' ? (
        <View style={styles.typeRow}>
          <Pressable
            style={[
              styles.typePill,
              { borderColor: theme.border },
              type === 'WORKOUT' && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setType('WORKOUT')}>
            <ThemedText type="smallBold" themeColor={type === 'WORKOUT' ? 'onPrimary' : 'textPrimary'}>
              Workout
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.typePill,
              { borderColor: theme.border },
              type === 'DIET' && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setType('DIET')}>
            <ThemedText type="smallBold" themeColor={type === 'DIET' ? 'onPrimary' : 'textPrimary'}>
              Diet
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* Editing an assigned plan is allowed, but it is not a draft: it lands
          on the client's screen the moment it saves. */}
      {mode === 'edit' && activeAssignments && activeAssignments > 0 ? (
        <Card style={styles.panel}>
          <ThemedText type="smallBold">
            {activeAssignments} {activeAssignments === 1 ? 'client is' : 'clients are'} on this plan
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Saving changes what they see today. Anything you remove also stops counting towards days
            they have already logged.
          </ThemedText>
        </Card>
      ) : null}

      <Card style={styles.panel}>
        <ThemedText type="label" themeColor="textSecondary">
          Title
        </ThemedText>
        <TextField
          placeholder={placeholderFor('e.g. Lower body strength')}
          value={title}
          onChangeText={setTitle}
          editable={!isReadOnly}
        />

        <ThemedText type="label" themeColor="textSecondary">
          Description (optional)
        </ThemedText>
        <TextField
          placeholder={placeholderFor('Short description')}
          value={description}
          onChangeText={setDescription}
          editable={!isReadOnly}
        />
      </Card>

      <Card style={styles.panel}>
        {type === 'WORKOUT' ? (
          <>
            <ThemedText type="label" themeColor="textSecondary">
              Difficulty
            </ThemedText>
            <TextField
              placeholder={placeholderFor('e.g. Intermediate')}
              value={difficulty}
              onChangeText={setDifficulty}
              editable={!isReadOnly}
            />
          </>
        ) : null}

        <ThemedText type="label" themeColor="textSecondary">
          Focus
        </ThemedText>
        <TextField
          placeholder={placeholderFor('What this plan targets')}
          value={focus}
          onChangeText={setFocus}
          editable={!isReadOnly}
        />

        <ThemedText type="label" themeColor="textSecondary">
          Summary
        </ThemedText>
        <TextField
          placeholder={placeholderFor('One-line summary')}
          value={summary}
          onChangeText={setSummary}
          editable={!isReadOnly}
        />
      </Card>

      <Card style={styles.panel}>
        <CycleLengthPicker length={days.length} onChange={handleLengthChange} disabled={isReadOnly} />

        {pendingLength !== null ? (
          <Card variant="inset" style={styles.confirmBlock}>
            <ThemedText type="smallBold">
              Shorten to {pendingLength} {pendingLength === 1 ? 'day' : 'days'}?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {dayList(days.map((_, index) => index).slice(pendingLength))} will be discarded.
            </ThemedText>
            <View style={styles.confirmActions}>
              <View style={styles.confirmAction}>
                <Button label="Cancel" variant="secondary" onPress={() => setPendingLength(null)} fullWidth />
              </View>
              <View style={styles.confirmAction}>
                <Button label="Shorten" variant="danger" onPress={() => resizeTo(pendingLength)} fullWidth />
              </View>
            </View>
          </Card>
        ) : null}

        <DayStrip
          days={days.map((candidate) => ({
            key: candidate.key,
            label: candidate.label,
            isRestDay: type === 'WORKOUT' && candidate.isRestDay,
            isFilled: dayHasContent(candidate, type),
          }))}
          selectedIndex={selectedDay}
          onSelect={(index) => {
            setSelectedDay(index);
            setNotice(null);
          }}
        />
      </Card>

      <Card style={styles.panel}>
        <View style={styles.dayHeader}>
          <ThemedText type="smallBold">
            Day {selectedDay + 1}
            {days.length > 1 ? ` of ${days.length}` : ''}
          </ThemedText>
          {isReadOnly || days.length === 1 ? null : (
            <Pressable onPress={duplicateDay} accessibilityRole="button">
              <ThemedText type="small" themeColor="primary">
                Duplicate day
              </ThemedText>
            </Pressable>
          )}
        </View>

        <ThemedText type="label" themeColor="textSecondary">
          Day label
        </ThemedText>
        <TextField
          placeholder={placeholderFor(type === 'WORKOUT' ? 'e.g. Pull' : 'e.g. High carb')}
          value={day.label}
          onChangeText={(value) => updateDay({ label: value })}
          editable={!isReadOnly}
        />

        {type === 'WORKOUT' ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: day.isRestDay, disabled: isReadOnly }}
            disabled={isReadOnly}
            onPress={toggleRestDay}
            style={[
              styles.restToggle,
              { borderColor: day.isRestDay ? theme.primary : theme.border },
              day.isRestDay && { backgroundColor: theme.chipBg },
            ]}>
            <ThemedText type="smallBold" themeColor={day.isRestDay ? 'primary' : 'textPrimary'}>
              Rest day
            </ThemedText>
            <ThemedText type="meta" themeColor="textSecondary">
              {day.isRestDay ? 'Nothing to log — it counts as rest, not a miss' : 'Tap to make this a rest day'}
            </ThemedText>
          </Pressable>
        ) : null}

        {type === 'WORKOUT' && day.isRestDay ? null : (
          <>
            <ThemedText type="label" themeColor="textSecondary">
              {type === 'WORKOUT' ? 'Duration' : 'Calories'}
            </ThemedText>
            <TextField
              placeholder={placeholderFor(type === 'WORKOUT' ? 'e.g. 45 min' : 'e.g. 2,000 kcal')}
              value={type === 'WORKOUT' ? day.duration : day.calories}
              onChangeText={(value) =>
                updateDay(type === 'WORKOUT' ? { duration: value } : { calories: value })
              }
              editable={!isReadOnly}
            />
          </>
        )}
      </Card>

      {type === 'WORKOUT' && day.isRestDay ? null : (
        <Card style={styles.panel}>
          <View style={styles.dayHeader}>
            <ThemedText type="smallBold">{type === 'WORKOUT' ? 'Exercises' : 'Meals'}</ThemedText>
            <ThemedText type="meta" themeColor="textSecondary">
              {itemCount} on day {selectedDay + 1}
            </ThemedText>
          </View>

          {type === 'WORKOUT'
            ? day.exercises.map((row) => (
                <View key={row.rowId} style={styles.exerciseBlock}>
                  <TextField
                    placeholder={placeholderFor('Exercise name')}
                    value={row.name}
                    onChangeText={(value) => updateExercise(row.rowId, { name: value })}
                    editable={!isReadOnly}
                  />
                  <TextField
                    placeholder={placeholderFor('Note (optional)')}
                    value={row.note}
                    onChangeText={(value) => updateExercise(row.rowId, { note: value })}
                    editable={!isReadOnly}
                  />

                  <View style={styles.tripleRow}>
                    <View style={styles.tripleField}>
                      <ThemedText type="meta">Sets</ThemedText>
                      <TextField
                        placeholder={placeholderFor('3')}
                        keyboardType="number-pad"
                        value={row.sets}
                        onChangeText={(value) => updateExercise(row.rowId, { sets: value })}
                        editable={!isReadOnly}
                      />
                    </View>
                    <View style={styles.tripleField}>
                      <ThemedText type="meta">Reps</ThemedText>
                      <TextField
                        placeholder={placeholderFor('8-10')}
                        value={row.reps}
                        onChangeText={(value) => updateExercise(row.rowId, { reps: value })}
                        editable={!isReadOnly}
                      />
                    </View>
                    <View style={styles.tripleField}>
                      <ThemedText type="meta">Rest</ThemedText>
                      <TextField
                        placeholder={placeholderFor('90s')}
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
            : day.meals.map((row) => (
                <View key={row.rowId} style={styles.rowEditor}>
                  <TextField
                    style={styles.rowInput}
                    placeholder={placeholderFor('e.g. Breakfast: eggs, toast, fruit')}
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
              <ThemedText type="smallBold" themeColor="primary">
                + Add {type === 'WORKOUT' ? 'exercise' : 'meal'}
              </ThemedText>
            </Pressable>
          )}
        </Card>
      )}

      {notice ? (
        <ThemedText type="small" themeColor="textSecondary">
          {notice}
        </ThemedText>
      ) : null}

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

/**
 * Ids a check-in can hold. An id the plan already had is kept exactly as it is,
 * because past check-ins reference it; a new one carries its day, so the same
 * exercise on day 1 and day 4 is two separate things to tick off. Collisions
 * within a day (two rows named the same) get a numbered suffix — the backend
 * requires ids to be unique inside a day.
 */
function uniqueId(existing: string | undefined, dayIndex: number, slug: string, used: Set<string>): string {
  const base = existing ?? `d${dayIndex}-${slug}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  typePill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  panel: {
    gap: Spacing.two,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  restToggle: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
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
    borderWidth: 1,
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
