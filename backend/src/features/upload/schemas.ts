import { z } from "zod";

/**
 * Allowlisted image types, mapped to the extension the generated key gets.
 * Anything not listed here is rejected — the point is to keep the bucket to
 * images, since the app renders whatever comes back out of it.
 */
export const ALLOWED_CONTENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedContentType = keyof typeof ALLOWED_CONTENT_TYPES;

/** Where the image is going, which decides the folder inside the user's prefix. */
export const UPLOAD_PURPOSES = ["weight", "diet", "avatar"] as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/**
 * Note what is deliberately absent: there is no `key` or `path` field. Zod
 * strips unknown keys, so a client sending one is ignored outright — the key is
 * always generated server-side under the caller's own id. Accepting a path
 * fragment from the client would let one user overwrite another user's image.
 */
export const presignSchema = z.object({
  contentType: z.enum(Object.keys(ALLOWED_CONTENT_TYPES) as [AllowedContentType, ...AllowedContentType[]]),
  purpose: z.enum(UPLOAD_PURPOSES),
});
