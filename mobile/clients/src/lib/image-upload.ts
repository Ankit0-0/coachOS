import * as ImagePicker from 'expo-image-picker';

import { ApiError, uploadApi, type UploadContentType, type UploadPurpose } from '@/lib/api';

/**
 * A presigned PUT cannot enforce a maximum size server-side, so this is the
 * only cap there is. See the note in backend/src/features/upload/service.ts for
 * what it would take to enforce it on the bucket instead.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** The backend allowlist, plus the aliases a picker might hand back. */
const CONTENT_TYPES: Record<string, UploadContentType> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
};

const EXTENSIONS: Record<string, UploadContentType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export type ImageUploadResult =
  /** `key` goes in the record being saved; `uri` is the local file, for an instant preview. */
  | { status: 'uploaded'; key: string; uri: string }
  /** The user backed out of the picker. Not an error — show nothing. */
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** mimeType is not always populated, so the file extension is the fallback. */
function resolveContentType(asset: ImagePicker.ImagePickerAsset): UploadContentType | null {
  const reported = (asset.mimeType ?? asset.file?.type ?? '').toLowerCase();
  if (CONTENT_TYPES[reported]) return CONTENT_TYPES[reported];

  const name = (asset.fileName ?? asset.uri).toLowerCase().split('?')[0] ?? '';
  const extension = name.slice(name.lastIndexOf('.') + 1);
  return EXTENSIONS[extension] ?? null;
}

/**
 * The bytes to PUT. On web the picker hands back a `File` directly; on native
 * the local `file://` URI has to be read through fetch.
 */
async function readBytes(asset: ImagePicker.ImagePickerAsset): Promise<Blob> {
  if (asset.file) return asset.file;
  const response = await fetch(asset.uri);
  return response.blob();
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // The API sends bare status codes with no body, so the status is all there
    // is to read — turn it into something a person can act on.
    if (error.status === 503) return 'Photo uploads are not available right now. Try again later.';
    if (error.status === 400) return 'That image type is not supported. Use a JPEG, PNG or WebP.';
    if (error.status === 401) return 'Your session expired. Sign in again to upload a photo.';
    if (error.status === 0) return error.message;
  }
  return 'Could not upload the photo. Please try again.';
}

/**
 * The whole upload in one call: pick an image, check its type and size, ask the
 * API for a presigned URL, PUT the bytes straight to S3, and hand back the key
 * to store on whatever record the photo belongs to.
 *
 * The file never passes through our own server — the app talks to S3 directly
 * with a URL that is only good for five minutes and only for this one object.
 */
export async function pickAndUploadImage(purpose: UploadPurpose): Promise<ImageUploadResult> {
  let picked: ImagePicker.ImagePickerResult;
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return {
        status: 'error',
        message: 'Photo access is off. Turn it on in your settings to add a photo.',
      };
    }

    picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
  } catch {
    return { status: 'error', message: 'Could not open your photo library. Please try again.' };
  }

  // Backing out of the picker is a normal thing to do, not a failure.
  if (picked.canceled) return { status: 'cancelled' };

  const asset = picked.assets[0];
  if (!asset) return { status: 'cancelled' };

  const contentType = resolveContentType(asset);
  if (!contentType) {
    return { status: 'error', message: 'That image type is not supported. Use a JPEG, PNG or WebP.' };
  }

  try {
    const bytes = await readBytes(asset);
    const size = bytes.size || asset.fileSize || 0;
    if (size > MAX_UPLOAD_BYTES) {
      const megabytes = (size / 1024 / 1024).toFixed(1);
      return { status: 'error', message: `That photo is ${megabytes}MB. Please pick one under 5MB.` };
    }

    const { uploadUrl, key } = await uploadApi.presign({ contentType, purpose });

    // The Content-Type has to match what was signed, or S3 rejects the PUT.
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: bytes,
    });
    if (!response.ok) {
      return { status: 'error', message: 'The photo was rejected during upload. Please try again.' };
    }

    return { status: 'uploaded', key, uri: asset.uri };
  } catch (error) {
    return { status: 'error', message: uploadErrorMessage(error) };
  }
}
