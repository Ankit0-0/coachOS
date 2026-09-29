import { useState, type FormEvent } from 'react';

import { ImageField, type ImageChange } from '../components/ImageField';
import { ToggleGroup } from '../components/ToggleGroup';
import {
  uploadImage,
  type Equipment,
  type ExerciseInput,
  type LibraryExercise,
  type MuscleGroup,
  type TrainingDay,
} from '../lib/api';
import { EQUIPMENT, isHttpUrl, librarySaveError, MUSCLE_GROUPS, TRAINING_DAYS } from '../lib/library';

type ExerciseEditorProps = {
  exercise?: LibraryExercise;
  onCancel: () => void;
  onSubmit: (input: ExerciseInput) => Promise<void>;
};

export function ExerciseEditor({ exercise, onCancel, onSubmit }: ExerciseEditorProps) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>(exercise?.primaryMuscles ?? []);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(exercise?.secondaryMuscles ?? []);
  const [trainingDay, setTrainingDay] = useState<TrainingDay | ''>(exercise?.trainingDay ?? '');
  const [equipment, setEquipment] = useState<Equipment | ''>(exercise?.equipment ?? '');
  const [instructions, setInstructions] = useState(exercise?.instructions ?? '');
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? '');
  const [image, setImage] = useState<ImageChange>({ kind: 'keep' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Give this exercise a name.');
      return;
    }
    if (videoUrl.trim() && !isHttpUrl(videoUrl.trim())) {
      setError('The video link must start with http:// or https://.');
      return;
    }

    try {
      setIsSaving(true);
      // Uploaded only now, so cancelling the form never leaves an unused object behind.
      const imageKey =
        image.kind === 'replace' ? await uploadImage(image.file, 'exercise') : image.kind === 'remove' ? null : undefined;
      await onSubmit({
        name: name.trim(),
        primaryMuscles,
        secondaryMuscles,
        trainingDay: trainingDay || null,
        equipment: equipment || null,
        instructions: instructions.trim() || null,
        videoUrl: videoUrl.trim() || null,
        ...(imageKey === undefined ? {} : { imageKey }),
      });
    } catch (caught) {
      setError(librarySaveError(caught, 'exercise'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
      <div className="sectionHeader" style={{ marginBottom: 0 }}>
        <h2>{exercise ? 'Edit exercise' : 'New exercise'}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--s3)' }}>
        <div className="field">
          <label className="label" htmlFor="exerciseName">
            Name
          </label>
          <input id="exerciseName" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="trainingDay">
            Training day
          </label>
          <select
            id="trainingDay"
            className="input"
            value={trainingDay}
            onChange={(e) => setTrainingDay(e.target.value as TrainingDay | '')}>
            <option value="">—</option>
            {TRAINING_DAYS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="equipment">
            Equipment
          </label>
          <select
            id="equipment"
            className="input"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment | '')}>
            <option value="">—</option>
            {EQUIPMENT.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ToggleGroup label="Primary muscles" options={MUSCLE_GROUPS} selected={primaryMuscles} onChange={setPrimaryMuscles} />
      <ToggleGroup
        label="Secondary muscles"
        options={MUSCLE_GROUPS}
        selected={secondaryMuscles}
        onChange={setSecondaryMuscles}
      />

      <div className="field">
        <label className="label" htmlFor="instructions">
          Instructions (optional)
        </label>
        <textarea
          id="instructions"
          className="textarea"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)', alignItems: 'start' }}>
        <div className="field">
          <span className="label">Image (optional)</span>
          <ImageField
            currentUrl={exercise?.imageUrl ?? null}
            hasCurrent={exercise?.hasImage ?? false}
            value={image}
            onChange={setImage}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="videoUrl">
            Video link (optional)
          </label>
          <input
            id="videoUrl"
            className="input"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          {videoUrl.trim() && isHttpUrl(videoUrl.trim()) ? (
            <a href={videoUrl.trim()} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
              Open link
            </a>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="notice" role="alert">
          {error}
        </div>
      ) : null}

      <div className="buttonRow">
        <button type="submit" className="button buttonPrimary" disabled={isSaving}>
          {isSaving ? 'Saving…' : exercise ? 'Save changes' : 'Create exercise'}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
