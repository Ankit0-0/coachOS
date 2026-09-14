import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

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
 * Byte size before anything is uploaded. Web has the File in hand; on native
 * the picker's fileSize isn't always populated, so the file system is asked.
 */
async function fileSize(asset: ImagePicker.ImagePickerAsset): Promise<number> {
  if (asset.file) return asset.file.size;
  if (asset.fileSize) return asset.fileSize;
  const info = await FileSystem.getInfoAsync(asset.uri);
  return info.exists ? info.size : 0;
}

type PutResult = { ok: true } | { ok: false; status: number; body: string };

/**
 * PUTs the image to the presigned URL.
 *
 * Native uses expo-file-system's uploadAsync, which streams the file straight
 * from its URI with exactly the headers given. React Native's fetch with a Blob
 * body can't be trusted here: the presigned URL signs `content-type`, and any
 * difference in what's sent — a replaced type, an added charset, a dropped
 * header — makes S3 answer 403 SignatureDoesNotMatch.
 *
 * Web keeps fetch with the picker's File, which browsers send faithfully.
 */
async function putToS3(
  uploadUrl: string,
  asset: ImagePicker.ImagePickerAsset,
  contentType: UploadContentType,
): Promise<PutResult> {
  if (Platform.OS === 'web' || asset.file) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: asset.file ?? (await (await fetch(asset.uri)).blob()),
    });
    return response.ok ? { ok: true } : { ok: false, status: response.status, body: await response.text() };
  }

  const result = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });
  return result.status >= 200 && result.status < 300
    ? { ok: true }
    : { ok: false, status: result.status, body: result.body };
}

/**
 * What S3 said, pulled out of its XML error: the code (SignatureDoesNotMatch,
 * AccessDenied, …) and, for signature failures, the content-type header S3
 * actually received — which is the usual culprit.
 */
function describeS3Failure(status: number, body: string): { code: string; receivedContentType?: string } {
  const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? `HTTP ${status}`;
  const canonical = /<CanonicalRequest>([\s\S]*?)<\/CanonicalRequest>/.exec(body)?.[1];
  const receivedContentType = canonical
    ? /^content-type:(.*)$/m.exec(canonical)?.[1]?.trim()
    : undefined;
  return { code, receivedContentType };
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
    const size = await fileSize(asset);
    if (size > MAX_UPLOAD_BYTES) {
      const megabytes = (size / 1024 / 1024).toFixed(1);
      return { status: 'error', message: `That photo is ${megabytes}MB. Please pick one under 5MB.` };
    }

    const { uploadUrl, key } = await uploadApi.presign({ contentType, purpose });

    const put = await putToS3(uploadUrl, asset, contentType);
    if (!put.ok) {
      const { code, receivedContentType } = describeS3Failure(put.status, put.body);
      console.warn('[image-upload] S3 rejected the PUT', {
        platform: Platform.OS,
        status: put.status,
        code,
        signedContentType: contentType,
        receivedContentType,
        pickerMimeType: asset.mimeType,
        body: put.body.slice(0, 2000),
      });
      // TEMPORARY: S3's code is shown in-app so a device test reports the real
      // cause without a debugger attached. Remove once native uploads are
      // confirmed working — the detail stays in the console log above.
      const detail = receivedContentType !== undefined
        ? `${code}, sent content-type "${receivedContentType}", signed "${contentType}"`
        : code;
      return { status: 'error', message: `The photo was rejected during upload (${detail}).` };
    }

    return { status: 'uploaded', key, uri: asset.uri };
  } catch (error) {
    console.warn('[image-upload] upload failed', { platform: Platform.OS, error: String(error) });
    return { status: 'error', message: uploadErrorMessage(error) };
  }
}
