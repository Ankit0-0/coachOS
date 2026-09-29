import { useCallback, useEffect, useState } from 'react';

import { Pager } from '../components/Pager';
import {
  adminExerciseApi,
  type ExerciseInput,
  type LibraryExercise,
  type MuscleGroup,
  type Page,
  type TrainingDay,
} from '../lib/api';
import { equipmentLabel, MUSCLE_GROUPS, muscleLabel, TRAINING_DAYS, trainingDayLabel } from '../lib/library';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { ExerciseEditor } from './ExerciseEditor';

/**
 * The global exercise library coaches pick from when they build a plan. What a
 * coach saves for themselves never shows up here. Deleting an entry only takes
 * it out of the picker: plans store the name, not a link to this row.
 */
export function Exercises() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | ''>('');
  const [trainingDay, setTrainingDay] = useState<TrainingDay | ''>('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<LibraryExercise[]>([]);
  const [paging, setPaging] = useState<Page>({ total: 0, page: 1, pageSize: 25 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LibraryExercise | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    adminExerciseApi
      .list({ q: debouncedQuery, muscleGroup, trainingDay, page })
      .then(({ exercises, total, pageSize }) => {
        // The last row on the last page was just deleted: step back a page.
        if (exercises.length === 0 && page > 1 && total > 0) {
          setPage(page - 1);
          return;
        }
        setRows(exercises);
        setPaging({ total, page, pageSize });
        setError(null);
      })
      .catch(() => setError('Could not load exercises.'))
      .finally(() => setIsLoading(false));
  }, [debouncedQuery, muscleGroup, trainingDay, page]);

  useEffect(load, [load]);

  const closeEditor = () => {
    setEditing(null);
    setIsCreating(false);
  };

  const handleCreate = async (input: ExerciseInput) => {
    await adminExerciseApi.create(input);
    closeEditor();
    load();
  };

  const handleUpdate = async (exercise: LibraryExercise, input: ExerciseInput) => {
    await adminExerciseApi.update(exercise.id, input);
    closeEditor();
    load();
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await adminExerciseApi.remove(id);
      setConfirmingDelete(null);
      load();
    } catch {
      setError('Could not delete that exercise.');
      setConfirmingDelete(null);
    }
  };

  if (isCreating) {
    return (
      <div className="page">
        <ExerciseEditor onCancel={closeEditor} onSubmit={handleCreate} />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="page">
        <ExerciseEditor
          exercise={editing}
          onCancel={closeEditor}
          onSubmit={(input) => handleUpdate(editing, input)}
        />
      </div>
    );
  }

  const isFiltered = Boolean(debouncedQuery || muscleGroup || trainingDay);

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageHeaderText">
          <h1>Exercises</h1>
          <p>The shared library coaches search when they add an exercise to a plan.</p>
        </div>
        <button type="button" className="button buttonPrimary" onClick={() => setIsCreating(true)}>
          New exercise
        </button>
      </div>

      <div className="filterBar">
        <input
          className="input"
          type="search"
          placeholder="Search by name"
          aria-label="Search exercises by name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input"
          aria-label="Primary muscle"
          value={muscleGroup}
          onChange={(e) => {
            setMuscleGroup(e.target.value as MuscleGroup | '');
            setPage(1);
          }}>
          <option value="">All muscles</option>
          {MUSCLE_GROUPS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Training day"
          value={trainingDay}
          onChange={(e) => {
            setTrainingDay(e.target.value as TrainingDay | '');
            setPage(1);
          }}>
          <option value="">All training days</option>
          {TRAINING_DAYS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="notice" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading && rows.length === 0 ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="empty">{isFiltered ? 'No exercises match these filters.' : 'No exercises yet.'}</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Primary muscles</th>
                <th>Training day</th>
                <th>Equipment</th>
                <th>Image</th>
                <th>Video</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((exercise) => (
                <tr key={exercise.id}>
                  <td>
                    <button type="button" className="rowLink" onClick={() => setEditing(exercise)}>
                      {exercise.name}
                    </button>
                  </td>
                  <td className="secondary">
                    {exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles.map(muscleLabel).join(', ') : '—'}
                  </td>
                  <td className="secondary">{trainingDayLabel(exercise.trainingDay)}</td>
                  <td className="secondary">{equipmentLabel(exercise.equipment)}</td>
                  <td>
                    {exercise.imageUrl ? (
                      <img src={exercise.imageUrl} alt="" className="thumb" />
                    ) : (
                      <span className={exercise.hasImage ? 'secondary' : 'muted'}>{exercise.hasImage ? 'Yes' : '—'}</span>
                    )}
                  </td>
                  <td>
                    {exercise.videoUrl ? (
                      <a href={exercise.videoUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {confirmingDelete === exercise.id ? (
                      <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
                        <span className="muted" style={{ fontSize: 13 }}>
                          Delete?
                        </span>
                        <button
                          type="button"
                          className="button buttonSmall buttonPrimary"
                          onClick={() => handleDelete(exercise.id)}>
                          Yes
                        </button>
                        <button type="button" className="button buttonSmall" onClick={() => setConfirmingDelete(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="button buttonSmall" onClick={() => setEditing(exercise)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button buttonSmall buttonQuiet"
                          onClick={() => setConfirmingDelete(exercise.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager {...paging} onPage={setPage} />
        </>
      )}
    </div>
  );
}
