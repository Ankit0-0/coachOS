import { useState, type FormEvent } from 'react';

import type { DietContent, DietDay, Plan, PlanType, WorkoutContent, WorkoutDay } from '../lib/api';

/**
 * Rows carry the content `id` they were loaded with. Check-ins record which
 * items a client completed by that id, so an edit has to preserve it —
 * re-deriving it from the name would orphan a client's history the first time
 * an admin fixes a typo. New rows get an id on save, prefixed with their day.
 */
type ExerciseRow = { rowId: string; id?: string; name: string; note: string; sets: string; reps: string; rest: string };
type MealRow = { rowId: string; id?: string; label: string };

/** One day of the cycle. Only the side matching the plan's type is saved. */
type DayDraft = {
  key: string;
  label: string;
  isRestDay: boolean;
  duration: string;
  calories: string;
  exercises: ExerciseRow[];
  meals: MealRow[];
};

const MIN_CYCLE_LENGTH_DAYS = 1;
const MAX_CYCLE_LENGTH_DAYS = 31;
const CYCLE_PRESETS = [7, 14, 21, 28];

let rowCounter = 0;
function newRowId(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
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

/** Whether a day would show a client anything. A rest day deliberately counts. */
function dayHasContent(day: DayDraft, type: PlanType): boolean {
  if (type === 'WORKOUT') return day.isRestDay || day.exercises.some((row) => row.name.trim());
  return day.meals.some((row) => row.label.trim());
}

/** "Day 3", "Days 3 and 5", "Days 2, 5 and 9". */
function dayList(indexes: number[]): string {
  const numbers = indexes.map((index) => index + 1);
  if (numbers.length === 1) return `Day ${numbers[0]}`;
  return `Days ${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
}

/**
 * An id the plan already had is kept as it is (check-ins reference it); a new
 * one carries its day. Two rows with the same name on one day get a suffix,
 * since ids must be unique within a day.
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

function daysFromPlan(plan: Plan | undefined): DayDraft[] {
  if (!plan) return [emptyDay()];
  if (plan.type === 'WORKOUT') {
    return (plan.content as WorkoutContent).days.map((source) => ({
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
    }));
  }
  return (plan.content as DietContent).days.map((source) => ({
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
  }));
}

export type PlanDraft = {
  title: string;
  description: string;
  cycleLengthDays: number;
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
  const content = plan ? (plan.content as WorkoutContent | DietContent) : null;

  const [title, setTitle] = useState(plan?.title ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [difficulty, setDifficulty] = useState(
    plan && plan.type === 'WORKOUT' ? (plan.content as WorkoutContent).difficulty : '',
  );
  const [focus, setFocus] = useState(content?.focus ?? '');
  const [summary, setSummary] = useState(content?.summary ?? '');

  const [days, setDays] = useState<DayDraft[]>(() => daysFromPlan(plan));
  const [selectedDay, setSelectedDay] = useState(0);
  const [customLength, setCustomLength] = useState(String(days.length));
  /** A shorter cycle waiting on confirmation, because days with content would be dropped. */
  const [pendingLength, setPendingLength] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const day = days[selectedDay] ?? days[0];

  // ---- cycle length -------------------------------------------------------

  const resizeTo = (next: number) => {
    setDays((current) =>
      next <= current.length
        ? current.slice(0, next)
        : [...current, ...Array.from({ length: next - current.length }, emptyDay)],
    );
    setSelectedDay((current) => Math.min(current, next - 1));
    setCustomLength(String(next));
    setPendingLength(null);
    setNotice(null);
  };

  const changeLength = (next: number) => {
    setError(null);
    if (next === days.length) return;
    // Growing is free; shrinking asks first, but only if work would be lost.
    if (next < days.length && days.slice(next).some((candidate) => dayHasContent(candidate, type))) {
      setPendingLength(next);
      return;
    }
    resizeTo(next);
  };

  const handleCustomLength = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setCustomLength(digits);
    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_CYCLE_LENGTH_DAYS && parsed <= MAX_CYCLE_LENGTH_DAYS) {
      changeLength(parsed);
    }
  };

  // ---- day editing --------------------------------------------------------

  const updateDay = (changes: Partial<DayDraft>) =>
    setDays((current) => current.map((existing, index) => (index === selectedDay ? { ...existing, ...changes } : existing)));

  const updateExercise = (rowId: string, changes: Partial<ExerciseRow>) =>
    updateDay({ exercises: day.exercises.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)) });

  /** Copies this day onto the next empty one; the copies get fresh ids for the day they land on. */
  const duplicateDay = () => {
    setError(null);
    const order = [
      ...days.slice(selectedDay + 1).map((_, offset) => selectedDay + 1 + offset),
      ...days.slice(0, selectedDay).map((_, index) => index),
    ];
    const target = order.find((index) => !dayHasContent(days[index], type));
    if (target === undefined) {
      setNotice('Every other day already has something in it. Clear one, or make the cycle longer.');
      return;
    }
    const source = days[selectedDay];
    setDays((current) =>
      current.map((existing, index) =>
        index === target
          ? {
              ...existing,
              label: source.label,
              isRestDay: source.isRestDay,
              duration: source.duration,
              calories: source.calories,
              exercises: source.exercises.map((row) => ({ ...row, rowId: newRowId(), id: undefined })),
              meals: source.meals.map((row) => ({ ...row, rowId: newRowId(), id: undefined })),
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
      setError(type === 'WORKOUT' ? 'Fill in difficulty, focus and summary.' : 'Fill in focus and summary.');
      return null;
    }

    const emptyDays = days.flatMap((candidate, index) => (dayHasContent(candidate, type) ? [] : [index]));
    if (emptyDays.length > 0) {
      setSelectedDay(emptyDays[0]);
      const one = emptyDays.length === 1;
      setError(
        type === 'WORKOUT'
          ? `${dayList(emptyDays)} ${one ? 'has' : 'have'} nothing in ${one ? 'it' : 'them'} — add an exercise, or mark ${one ? 'it' : 'them'} as rest.`
          : `${dayList(emptyDays)} ${one ? 'has' : 'have'} no meals yet.`,
      );
      return null;
    }

    if (type === 'WORKOUT') {
      const workoutDays: WorkoutDay[] = days.map((source, index) => {
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

    const dietDays: DietDay[] = days.map((source, index) => {
      const used = new Set<string>();
      return {
        dayIndex: index,
        label: source.label.trim() || `Day ${index + 1}`,
        calories: source.calories.trim(),
        meals: source.meals
          .filter((row) => row.label.trim())
          .map((row, position) => ({
            id: uniqueId(row.id, index, slugify(row.label, `meal-${position + 1}`), used),
            label: row.label.trim(),
          })),
      };
    });
    return { focus: focus.trim(), summary: summary.trim(), days: dietDays };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!title.trim()) {
      setError('Give this plan a title.');
      return;
    }

    const built = buildContent();
    if (!built) return;

    try {
      setIsSaving(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        cycleLengthDays: days.length,
        content: built,
      });
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
          <input id="description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {type === 'WORKOUT' ? (
          <div className="field">
            <label className="label">Difficulty</label>
            <input className="input" placeholder="Intermediate" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
          </div>
        ) : null}
        <div className="field">
          <label className="label">Focus</label>
          <input className="input" value={focus} onChange={(e) => setFocus(e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label className="label">Summary</label>
          <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="sectionHeader">
          <h3>Cycle</h3>
          <span className="muted">
            {days.length === 1 ? 'One day, repeated every day.' : `${days.length} days, then back to day 1.`}
          </span>
        </div>

        <div className="buttonRow" style={{ alignItems: 'center' }}>
          {CYCLE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`button buttonSmall${preset === days.length ? ' buttonPrimary' : ''}`}
              aria-pressed={preset === days.length}
              onClick={() => changeLength(preset)}>
              {preset} days
            </button>
          ))}
          <label className="label" htmlFor="cycleLength" style={{ margin: 0 }}>
            Custom
          </label>
          <input
            id="cycleLength"
            className="input numeric"
            style={{ width: 64 }}
            inputMode="numeric"
            value={customLength}
            onChange={(e) => handleCustomLength(e.target.value)}
            onBlur={() => setCustomLength(String(days.length))}
            aria-label={`Cycle length in days, ${MIN_CYCLE_LENGTH_DAYS} to ${MAX_CYCLE_LENGTH_DAYS}`}
          />
        </div>

        {pendingLength !== null ? (
          <div className="notice" role="alert" style={{ marginTop: 'var(--s3)' }}>
            <p style={{ margin: 0 }}>
              Shorten to {pendingLength} {pendingLength === 1 ? 'day' : 'days'}?{' '}
              {dayList(days.map((_, index) => index).slice(pendingLength))} will be discarded.
            </p>
            <div className="buttonRow" style={{ marginTop: 'var(--s2)' }}>
              <button type="button" className="button buttonSmall buttonPrimary" onClick={() => resizeTo(pendingLength)}>
                Shorten
              </button>
              <button
                type="button"
                className="button buttonSmall"
                onClick={() => {
                  setPendingLength(null);
                  setCustomLength(String(days.length));
                }}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="tabs dayTabs" role="tablist" style={{ marginTop: 'var(--s3)' }}>
          {days.map((candidate, index) => {
            const filled = dayHasContent(candidate, type);
            const isRest = type === 'WORKOUT' && candidate.isRestDay;
            return (
              <button
                key={candidate.key}
                type="button"
                role="tab"
                aria-selected={index === selectedDay}
                title={`Day ${index + 1}${candidate.label ? ` · ${candidate.label}` : ''}${isRest ? ' (rest)' : filled ? '' : ' (empty)'}`}
                className={`tab dayTab${index === selectedDay ? ' tabActive' : ''}`}
                onClick={() => {
                  setSelectedDay(index);
                  setNotice(null);
                }}>
                {index + 1}
                <span className={`dayMarker${isRest ? ' dayMarkerRest' : filled ? ' dayMarkerFilled' : ''}`} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="sectionHeader">
          <h3>
            Day {selectedDay + 1}
            {days.length > 1 ? ` of ${days.length}` : ''}
          </h3>
          {days.length > 1 ? (
            <button type="button" className="button buttonSmall" onClick={duplicateDay}>
              Duplicate day
            </button>
          ) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)', marginBottom: 'var(--s3)' }}>
          <div className="field">
            <label className="label">Day label</label>
            <input
              className="input"
              placeholder={type === 'WORKOUT' ? 'Pull' : 'High carb'}
              value={day.label}
              onChange={(e) => updateDay({ label: e.target.value })}
            />
          </div>
          {type === 'WORKOUT' && day.isRestDay ? null : (
            <div className="field">
              <label className="label">{type === 'WORKOUT' ? 'Duration' : 'Calories'}</label>
              <input
                className="input"
                placeholder={type === 'WORKOUT' ? '45 min' : '2,000 kcal'}
                value={type === 'WORKOUT' ? day.duration : day.calories}
                onChange={(e) => updateDay(type === 'WORKOUT' ? { duration: e.target.value } : { calories: e.target.value })}
              />
            </div>
          )}
          {type === 'WORKOUT' ? (
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--s2)' }}>
              <input
                type="checkbox"
                checked={day.isRestDay}
                onChange={(e) => {
                  setNotice(null);
                  updateDay({ isRestDay: e.target.checked });
                }}
              />
              Rest day — nothing to log, and it counts as rest rather than a miss
            </label>
          ) : null}
        </div>

        {type === 'WORKOUT' && day.isRestDay ? null : type === 'WORKOUT' ? (
          <>
            <div className="sectionHeader">
              <h3>Exercises</h3>
              <button
                type="button"
                className="button buttonSmall"
                onClick={() => updateDay({ exercises: [...day.exercises, emptyExercise()] })}>
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
                {day.exercises.map((row) => (
                  <tr key={row.rowId}>
                    <td>
                      <input className="input" value={row.name} onChange={(e) => updateExercise(row.rowId, { name: e.target.value })} />
                    </td>
                    <td>
                      <input className="input" value={row.note} onChange={(e) => updateExercise(row.rowId, { note: e.target.value })} />
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
                        onClick={() => updateDay({ exercises: day.exercises.filter((item) => item.rowId !== row.rowId) })}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div className="sectionHeader">
              <h3>Meals</h3>
              <button type="button" className="button buttonSmall" onClick={() => updateDay({ meals: [...day.meals, emptyMeal()] })}>
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
                {day.meals.map((row) => (
                  <tr key={row.rowId}>
                    <td>
                      <input
                        className="input"
                        placeholder="Breakfast: eggs, toast, fruit"
                        value={row.label}
                        onChange={(e) =>
                          updateDay({
                            meals: day.meals.map((item) => (item.rowId === row.rowId ? { ...item, label: e.target.value } : item)),
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button buttonSmall buttonQuiet"
                        onClick={() => updateDay({ meals: day.meals.filter((item) => item.rowId !== row.rowId) })}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {notice ? <p className="muted" style={{ margin: 0 }}>{notice}</p> : null}

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
