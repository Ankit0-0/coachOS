import { useEffect, useRef, useState } from 'react';

import { isUploadContentType, MAX_UPLOAD_BYTES } from '../lib/api';

/**
 * What the form will do with the image on save. Nothing is uploaded until
 * then, so backing out of the form never leaves a stray object in the bucket.
 */
export type ImageChange = { kind: 'keep' } | { kind: 'replace'; file: File } | { kind: 'remove' };

type ImageFieldProps = {
  /** The stored image's signed URL, if it has one and the bucket could sign it. */
  currentUrl: string | null;
  /** Whether an image is stored at all. */
  hasCurrent: boolean;
  value: ImageChange;
  onChange: (change: ImageChange) => void;
};

/** One image per entry: show it, replace it, or remove it. */
export function ImageField({ currentUrl, hasCurrent, value, onChange }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pendingFile = value.kind === 'replace' ? value.file : null;
  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const choose = () => inputRef.current?.click();

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!isUploadContentType(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That image is over 5 MB. Choose a smaller one.');
      return;
    }
    onChange({ kind: 'replace', file });
  };

  let preview: React.ReactNode;
  let caption: string;
  if (value.kind === 'replace') {
    preview = previewUrl ? <img src={previewUrl} alt="" className="imagePreview" /> : null;
    caption = 'New image. It uploads when you save.';
  } else if (value.kind === 'remove') {
    preview = <div className="imagePreview imagePreviewEmpty">Removed</div>;
    caption = 'The image is deleted when you save.';
  } else if (hasCurrent) {
    preview = currentUrl ? (
      <img src={currentUrl} alt="" className="imagePreview" />
    ) : (
      <div className="imagePreview imagePreviewEmpty">Stored</div>
    );
    caption = currentUrl ? 'Current image.' : 'An image is stored, but it cannot be previewed here.';
  } else {
    preview = <div className="imagePreview imagePreviewEmpty">No image</div>;
    caption = 'JPEG, PNG or WebP, up to 5 MB.';
  }

  return (
    <div className="imageField">
      {preview}
      <div className="field" style={{ gap: 'var(--s2)' }}>
        <span className="secondary" style={{ fontSize: 13 }}>
          {caption}
        </span>
        <div className="buttonRow">
          {value.kind === 'keep' ? (
            <>
              <button type="button" className="button buttonSmall" onClick={choose}>
                {hasCurrent ? 'Replace' : 'Choose image'}
              </button>
              {hasCurrent ? (
                <button type="button" className="button buttonSmall buttonQuiet" onClick={() => onChange({ kind: 'remove' })}>
                  Remove
                </button>
              ) : null}
            </>
          ) : (
            <>
              {value.kind === 'replace' ? (
                <button type="button" className="button buttonSmall" onClick={choose}>
                  Choose another
                </button>
              ) : null}
              <button type="button" className="button buttonSmall buttonQuiet" onClick={() => onChange({ kind: 'keep' })}>
                Undo
              </button>
            </>
          )}
        </div>
        {error ? (
          <span role="alert" style={{ fontSize: 13 }}>
            {error}
          </span>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          // Choosing the same file twice in a row should still fire.
          event.target.value = '';
        }}
      />
    </div>
  );
}
