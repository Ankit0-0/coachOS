import { useCallback, useEffect, useState } from 'react';

import { Pager } from '../components/Pager';
import { adminDietItemApi, type DietItemInput, type LibraryDietItem, type MealType, type Page } from '../lib/api';
import { MEAL_TYPES, mealTypeLabel } from '../lib/library';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { DietItemEditor } from './DietItemEditor';

/**
 * The global diet-item library coaches pick from when they build a plan. What a
 * coach saves for themselves never shows up here. Deleting an entry only takes
 * it out of the picker: plans store the label, not a link to this row.
 */
export function DietItems() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const [mealType, setMealType] = useState<MealType | ''>('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<LibraryDietItem[]>([]);
  const [paging, setPaging] = useState<Page>({ total: 0, page: 1, pageSize: 25 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LibraryDietItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    adminDietItemApi
      .list({ q: debouncedQuery, mealType, page })
      .then(({ dietItems, total, pageSize }) => {
        // The last row on the last page was just deleted: step back a page.
        if (dietItems.length === 0 && page > 1 && total > 0) {
          setPage(page - 1);
          return;
        }
        setRows(dietItems);
        setPaging({ total, page, pageSize });
        setError(null);
      })
      .catch(() => setError('Could not load diet items.'))
      .finally(() => setIsLoading(false));
  }, [debouncedQuery, mealType, page]);

  useEffect(load, [load]);

  const closeEditor = () => {
    setEditing(null);
    setIsCreating(false);
  };

  const handleCreate = async (input: DietItemInput) => {
    await adminDietItemApi.create(input);
    closeEditor();
    load();
  };

  const handleUpdate = async (dietItem: LibraryDietItem, input: DietItemInput) => {
    await adminDietItemApi.update(dietItem.id, input);
    closeEditor();
    load();
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await adminDietItemApi.remove(id);
      setConfirmingDelete(null);
      load();
    } catch {
      setError('Could not delete that diet item.');
      setConfirmingDelete(null);
    }
  };

  if (isCreating) {
    return (
      <div className="page">
        <DietItemEditor onCancel={closeEditor} onSubmit={handleCreate} />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="page">
        <DietItemEditor
          dietItem={editing}
          onCancel={closeEditor}
          onSubmit={(input) => handleUpdate(editing, input)}
        />
      </div>
    );
  }

  const isFiltered = Boolean(debouncedQuery || mealType);

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageHeaderText">
          <h1>Diet items</h1>
          <p>The shared library coaches search when they add a meal to a plan.</p>
        </div>
        <button type="button" className="button buttonPrimary" onClick={() => setIsCreating(true)}>
          New diet item
        </button>
      </div>

      <div className="filterBar">
        <input
          className="input"
          type="search"
          placeholder="Search by name"
          aria-label="Search diet items by name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input"
          aria-label="Meal"
          value={mealType}
          onChange={(e) => {
            setMealType(e.target.value as MealType | '');
            setPage(1);
          }}>
          <option value="">All meals</option>
          {MEAL_TYPES.map((option) => (
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
        <p className="empty">{isFiltered ? 'No diet items match these filters.' : 'No diet items yet.'}</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Meal</th>
                <th>Calories</th>
                <th>Protein (g)</th>
                <th>Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((dietItem) => (
                <tr key={dietItem.id}>
                  <td>
                    <button type="button" className="rowLink" onClick={() => setEditing(dietItem)}>
                      {dietItem.name}
                    </button>
                  </td>
                  <td className="secondary">{mealTypeLabel(dietItem.mealType)}</td>
                  <td className="secondary numeric">{dietItem.calories ?? '—'}</td>
                  <td className="secondary numeric">{dietItem.proteinG ?? '—'}</td>
                  <td>
                    {dietItem.imageUrl ? (
                      <img src={dietItem.imageUrl} alt="" className="thumb" />
                    ) : (
                      <span className={dietItem.hasImage ? 'secondary' : 'muted'}>{dietItem.hasImage ? 'Yes' : '—'}</span>
                    )}
                  </td>
                  <td>
                    {confirmingDelete === dietItem.id ? (
                      <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
                        <span className="muted" style={{ fontSize: 13 }}>
                          Delete?
                        </span>
                        <button
                          type="button"
                          className="button buttonSmall buttonPrimary"
                          onClick={() => handleDelete(dietItem.id)}>
                          Yes
                        </button>
                        <button type="button" className="button buttonSmall" onClick={() => setConfirmingDelete(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="button buttonSmall" onClick={() => setEditing(dietItem)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button buttonSmall buttonQuiet"
                          onClick={() => setConfirmingDelete(dietItem.id)}>
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
