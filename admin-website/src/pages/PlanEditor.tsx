import { useState, type FormEvent } from 'react';

import type { DietContent, Plan, PlanType, WorkoutContent } from '../lib/api';

/**
 * Rows carry the content `id` they were loaded with. Check-ins record which
 * items a client completed by that id, so an edit has to preserve it —
 * re-deriving it from the name would orphan a client's history the first time
 * an admin fixes a typo. New rows get an id on save.
 */
type ExerciseRow = { rowId: string; id?: string; name: string; note: string; sets: string; reps: string; rest: string };
type MealRow = { rowId: string; id?: string; label: string };

let rowCounter = 0;
function newRowId(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
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

export type PlanDraft = {
  title: string;
  description: string;
  content: WorkoutContent | DietContent;
};

type PlanEditorProps = {
  type: PlanType;
  /** Absent when creating. */
  plan?: Plan;
  onCancel: () => void;
  onSubmit: (draft: PlanDraft) => Promise<void>;
};

export function PlanEditor({ type, plan, onCancel, onSubmit }: PlanEditorProps) {
  const workout = plan && plan.type === 'WORKOUT' ? (plan.content as WorkoutContent) : null;
  const diet = plan && plan.type === 'DIET' ? (plan.content as DietContent) : null;

  const [title, setTitle] = useState(plan?.title ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');

  const [duration, setDuration] = useState(workout?.duration ?? '');
  const [difficulty, setDifficulty] = useState(workout?.difficulty ?? '');
  const [workoutFocus, setWorkoutFocus] = useState(workout?.focus ?? '');
  const [workoutSummary, setWorkoutSummary] = useState(workout?.summary ?? '');
  const [exercises, setExercises] = useState<ExerciseRow[]>(
    workout
      ? workout.exercises.map((exercise) => ({
          rowId: newRowId(),
          id: exercise.id,
          name: exercise.name,
          note: exercise.note ?? '',
          sets: String(exercise.sets),
          reps: exercise.reps ?? '',
          rest: exercise.rest ?? '',
        }))
      : [emptyExercise()],
  );

  const [calories, setCalories] = useState(diet?.calories ?? '');
  const [dietFocus, setDietFocus] = useState(diet?.focus ?? '');
  const [dietSummary, setDietSummary] = useState(diet?.summary ?? '');
  const [meals, setMeals] = useState<MealRow[]>(
    diet
      ? diet.meals.map((meal) => ({ rowId: newRowId(), id: meal.id, label: meal.label }))
      : [{ rowId: newRowId(), label: '' }],
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateExercise = (rowId: string, changes: Partial<ExerciseRow>) =>
    setExercises((rows) => rows.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)));

  /** Returns the content to save, or null after setting the reason it can't be built. */
  const buildContent = (): WorkoutContent | DietContent | null => {
    if (type === 'WORKOUT') {
      const valid = exercises.filter((row) => row.name.trim());
      if (!duration.trim() || !difficulty.trim() || !workoutFocus.trim() || !workoutSummary.trim() || valid.length === 0) {
        setError('Fill in duration, difficulty, focus, summary, and at least one exercise.');
        return null;
      }
      return {
        duration: duration.trim(),
        focus: workoutFocus.trim(),
        summary: workoutSummary.trim(),
        difficulty: difficulty.trim(),
        exercises: valid.map((row, index) => ({
          id: row.id ?? slugify(row.name, `exercise-${index}`),
          name: row.name.trim(),
          note: row.note.trim(),
          sets: Math.max(1, Number.parseInt(row.sets, 10) || 1),
          ...(row.reps.trim() ? { reps: row.reps.trim() } : {}),
          ...(row.rest.trim() ? { rest: row.rest.trim() } : {}),
        })),
      };
    }

    const valid = meals.filter((row) => row.label.trim());
    if (!calories.trim() || !dietFocus.trim() || !dietSummary.trim() || valid.length === 0) {
      setError('Fill in calories, focus, summary, and at least one meal.');
      return null;
    }
    return {
      calories: calories.trim(),
      focus: dietFocus.trim(),
      summary: dietSummary.trim(),
      meals: valid.map((row, index) => ({
        id: row.id ?? slugify(row.label, `meal-${index}`),
        label: row.label.trim(),
      })),
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Give this plan a title.');
      return;
    }

    const content = buildContent();
    if (!content) return;

    try {
      setIsSaving(true);
      await onSubmit({ title: title.trim(), description: description.trim(), content });
    } catch {
      setError('Could not save this plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
      <div className="sectionHeader" style={{ marginBottom: 0 }}>
        <h2>{plan ? 'Edit plan' : `New ${type === 'WORKOUT' ? 'workout' : 'diet'} plan`}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
        <div className="field">
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="description">
            Description (optional)
          </label>
          <input
            id="description"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {type === 'WORKOUT' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
            <div className="field">
              <label className="label">Duration</label>
              <input className="input" placeholder="45 min" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Difficulty</label>
              <input
                className="input"
                placeholder="Intermediate"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">Focus</label>
              <input className="input" value={workoutFocus} onChange={(e) => setWorkoutFocus(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Summary</label>
              <input className="input" value={workoutSummary} onChange={(e) => setWorkoutSummary(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="sectionHeader">
              <h3>Exercises</h3>
              <button
                type="button"
                className="button buttonSmall"
                onClick={() => setExercises((rows) => [...rows, emptyExercise()])}>
                Add exercise
              </button>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Note</th>
                  <th style={{ width: 70 }}>Sets</th>
                  <th style={{ width: 90 }}>Reps</th>
                  <th style={{ width: 90 }}>Rest</th>
                  <th style={{ width: 70 }} />
                </tr>
              </thead>
              <tbody>
                {exercises.map((row) => (
                  <tr key={row.rowId}>
                    <td>
                      <input
                        className="input"
                        value={row.name}
                        onChange={(e) => updateExercise(row.rowId, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={row.note}
                        onChange={(e) => updateExercise(row.rowId, { note: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input numeric"
                        value={row.sets}
                        onChange={(e) => updateExercise(row.rowId, { sets: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        placeholder="8-10"
                        value={row.reps}
                        onChange={(e) => updateExercise(row.rowId, { reps: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        placeholder="90s"
                        value={row.rest}
                        onChange={(e) => updateExercise(row.rowId, { rest: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button buttonSmall buttonQuiet"
                        onClick={() => setExercises((rows) => rows.filter((item) => item.rowId !== row.rowId))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
            <div className="field">
              <label className="label">Calories</label>
              <input
                className="input"
                placeholder="2,000 kcal"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">Focus</label>
              <input className="input" value={dietFocus} onChange={(e) => setDietFocus(e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Summary</label>
              <input className="input" value={dietSummary} onChange={(e) => setDietSummary(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="sectionHeader">
              <h3>Meals</h3>
              <button
                type="button"
                className="button buttonSmall"
                onClick={() => setMeals((rows) => [...rows, { rowId: newRowId(), label: '' }])}>
                Add meal
              </button>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Meal</th>
                  <th style={{ width: 70 }} />
                </tr>
              </thead>
              <tbody>
                {meals.map((row) => (
                  <tr key={row.rowId}>
                    <td>
                      <input
                        className="input"
                        placeholder="Breakfast: eggs, toast, fruit"
                        value={row.label}
                        onChange={(e) =>
                          setMeals((rows) =>
                            rows.map((item) => (item.rowId === row.rowId ? { ...item, label: e.target.value } : item)),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button buttonSmall buttonQuiet"
                        onClick={() => setMeals((rows) => rows.filter((item) => item.rowId !== row.rowId))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {error ? (
        <div className="notice" role="alert">
          {error}
        </div>
      ) : null}

      <div className="buttonRow">
        <button type="submit" className="button buttonPrimary" disabled={isSaving}>
          {isSaving ? 'Saving…' : plan ? 'Save changes' : 'Create plan'}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
