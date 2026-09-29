import { useState, type FormEvent } from 'react';

import { ImageField, type ImageChange } from '../components/ImageField';
import { uploadImage, type DietItemInput, type LibraryDietItem, type MealType } from '../lib/api';
import { librarySaveError, MEAL_TYPES } from '../lib/library';

type DietItemEditorProps = {
  dietItem?: LibraryDietItem;
  onCancel: () => void;
  onSubmit: (input: DietItemInput) => Promise<void>;
};

/** Blank is null; anything else must be a whole number within the backend's range. */
function parseAmount(text: string, max: number): number | null | 'invalid' {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return 'invalid';
  const value = Number(trimmed);
  return value <= max ? value : 'invalid';
}

export function DietItemEditor({ dietItem, onCancel, onSubmit }: DietItemEditorProps) {
  const [name, setName] = useState(dietItem?.name ?? '');
  const [mealType, setMealType] = useState<MealType | ''>(dietItem?.mealType ?? '');
  const [calories, setCalories] = useState(dietItem?.calories?.toString() ?? '');
  const [proteinG, setProteinG] = useState(dietItem?.proteinG?.toString() ?? '');
  const [notes, setNotes] = useState(dietItem?.notes ?? '');
  const [image, setImage] = useState<ImageChange>({ kind: 'keep' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Give this diet item a name.');
      return;
    }
    const parsedCalories = parseAmount(calories, 5000);
    if (parsedCalories === 'invalid') {
      setError('Calories must be a whole number from 0 to 5000.');
      return;
    }
    const parsedProtein = parseAmount(proteinG, 500);
    if (parsedProtein === 'invalid') {
      setError('Protein must be a whole number of grams from 0 to 500.');
      return;
    }

    try {
      setIsSaving(true);
      // Uploaded only now, so cancelling the form never leaves an unused object behind.
      const imageKey =
        image.kind === 'replace' ? await uploadImage(image.file, 'diet-item') : image.kind === 'remove' ? null : undefined;
      await onSubmit({
        name: name.trim(),
        mealType: mealType || null,
        calories: parsedCalories,
        proteinG: parsedProtein,
        notes: notes.trim() || null,
        ...(imageKey === undefined ? {} : { imageKey }),
      });
    } catch (caught) {
      setError(librarySaveError(caught, 'diet item'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
      <div className="sectionHeader" style={{ marginBottom: 0 }}>
        <h2>{dietItem ? 'Edit diet item' : 'New diet item'}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 'var(--s3)' }}>
        <div className="field">
          <label className="label" htmlFor="dietItemName">
            Name
          </label>
          <input id="dietItemName" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="mealType">
            Meal
          </label>
          <select
            id="mealType"
            className="input"
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType | '')}>
            <option value="">—</option>
            {MEAL_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="calories">
            Calories
          </label>
          <input
            id="calories"
            className="input numeric"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="proteinG">
            Protein (g)
          </label>
          <input
            id="proteinG"
            className="input numeric"
            inputMode="numeric"
            value={proteinG}
            onChange={(e) => setProteinG(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea id="notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="field">
        <span className="label">Image (optional)</span>
        <ImageField
          currentUrl={dietItem?.imageUrl ?? null}
          hasCurrent={dietItem?.hasImage ?? false}
          value={image}
          onChange={setImage}
        />
      </div>

      {error ? (
        <div className="notice" role="alert">
          {error}
        </div>
      ) : null}

      <div className="buttonRow">
        <button type="submit" className="button buttonPrimary" disabled={isSaving}>
          {isSaving ? 'Saving…' : dietItem ? 'Save changes' : 'Create diet item'}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
