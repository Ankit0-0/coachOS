import { useCallback, useEffect, useState } from 'react';

import { ApiError, adminPlanApi, type DietContent, type Plan, type PlanType, type WorkoutContent } from '../lib/api';
import { PlanEditor, type PlanDraft } from './PlanEditor';

const TYPES: { label: string; value: PlanType }[] = [
  { label: 'Workout', value: 'WORKOUT' },
  { label: 'Diet', value: 'DIET' },
];

/** The two figures that describe a plan at a glance. */
function stats(plan: Plan): { items: string; measure: string } {
  if (plan.type === 'WORKOUT') {
    const content = plan.content as WorkoutContent;
    const count = content.exercises.length;
    return { items: `${count} ${count === 1 ? 'exercise' : 'exercises'}`, measure: content.duration };
  }
  const content = plan.content as DietContent;
  const count = content.meals.length;
  return { items: `${count} ${count === 1 ? 'meal' : 'meals'}`, measure: content.calories };
}

export function Plans() {
  const [type, setType] = useState<PlanType>('WORKOUT');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    adminPlanApi
      .list(type)
      .then((rows) => {
        setPlans(rows);
        setError(null);
      })
      .catch(() => setError('Could not load plans.'))
      .finally(() => setIsLoading(false));
  }, [type]);

  useEffect(load, [load]);

  const closeEditor = () => {
    setEditing(null);
    setIsCreating(false);
  };

  const handleCreate = async (draft: PlanDraft) => {
    await adminPlanApi.create({
      type,
      title: draft.title,
      ...(draft.description ? { description: draft.description } : {}),
      content: draft.content,
    });
    closeEditor();
    load();
  };

  const handleUpdate = async (plan: Plan, draft: PlanDraft) => {
    await adminPlanApi.update(plan.id, {
      title: draft.title,
      description: draft.description,
      content: draft.content,
    });
    closeEditor();
    load();
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await adminPlanApi.remove(id);
      setConfirmingDelete(null);
      load();
    } catch (caught) {
      // A 409 here means one thing: a client is still active on this plan.
      setError(
        caught instanceof ApiError && caught.status === 409
          ? 'A client is currently assigned to this plan. Move them to another plan before deleting it.'
          : 'Could not delete that plan.',
      );
      setConfirmingDelete(null);
    }
  };

  if (isCreating) {
    return (
      <div className="page">
        <PlanEditor type={type} onCancel={closeEditor} onSubmit={handleCreate} />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="page">
        <PlanEditor
          type={editing.type}
          plan={editing}
          onCancel={closeEditor}
          onSubmit={(draft) => handleUpdate(editing, draft)}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageHeaderText">
          <h1>Default plans</h1>
          <p>The shared library every coach can assign. Coaches can use these but cannot edit them.</p>
        </div>
        <button type="button" className="button buttonPrimary" onClick={() => setIsCreating(true)}>
          New plan
        </button>
      </div>

      <div className="tabs">
        {TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`tab${type === option.value ? ' tabActive' : ''}`}
            onClick={() => setType(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="notice" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p className="muted">Loading…</p>
      ) : plans.length === 0 ? (
        <p className="empty">No default {type === 'WORKOUT' ? 'workout' : 'diet'} plans yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Contents</th>
              <th>{type === 'WORKOUT' ? 'Duration' : 'Calories'}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const { items, measure } = stats(plan);
              return (
                <tr key={plan.id}>
                  <td>
                    <button type="button" className="rowLink" onClick={() => setEditing(plan)}>
                      {plan.title}
                    </button>
                  </td>
                  <td className={plan.description ? 'secondary' : 'muted'}>{plan.description || '—'}</td>
                  <td className="secondary">{items}</td>
                  <td className="secondary numeric">{measure}</td>
                  <td>
                    {confirmingDelete === plan.id ? (
                      <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
                        <span className="muted" style={{ fontSize: 13 }}>
                          Delete?
                        </span>
                        <button
                          type="button"
                          className="button buttonSmall buttonPrimary"
                          onClick={() => handleDelete(plan.id)}>
                          Yes
                        </button>
                        <button
                          type="button"
                          className="button buttonSmall"
                          onClick={() => setConfirmingDelete(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="button buttonSmall" onClick={() => setEditing(plan)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button buttonSmall buttonQuiet"
                          onClick={() => setConfirmingDelete(plan.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
