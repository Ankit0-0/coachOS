import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";

import { env } from "../../config/env.js";
import { getLogger } from "../../config/logger.js";
import { ALLOWED_CONTENT_TYPES, type AllowedContentType, type UploadPurpose } from "./schemas.js";

/** Long enough for a phone on a slow connection, short enough to be useless if leaked. */
const UPLOAD_URL_TTL_SECONDS = 5 * 60;

/** Read URLs are handed to the app on every list/get, so an hour is plenty. */
const READ_URL_TTL_SECONDS = 60 * 60;

type S3Config = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

/**
 * The AWS variables are optional in `env` on purpose — local development, CI and
 * the test suite all have to boot without credentials. So configuration is
 * checked here, at the moment an upload is actually attempted, and the missing
 * variable names are logged so the failure is obvious rather than mysterious.
 */
function readConfig(): S3Config | null {
  const { awsRegion, awsAccessKeyId, awsSecretAccessKey, s3Bucket } = env;

  const missing = [
    ["AWS_REGION", awsRegion],
    ["AWS_ACCESS_KEY_ID", awsAccessKeyId],
    ["AWS_SECRET_ACCESS_KEY", awsSecretAccessKey],
    ["S3_BUCKET", s3Bucket],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    getLogger().error(
      { missing },
      `S3 is not configured: set ${missing.join(", ")}. Image uploads are unavailable until then.`,
    );
    return null;
  }

  return {
    region: awsRegion as string,
    accessKeyId: awsAccessKeyId as string,
    secretAccessKey: awsSecretAccessKey as string,
    bucket: s3Bucket as string,
  };
}

let cached: { signature: string; client: S3Client } | null = null;

/** Memoised per credential set so tests can swap `env` without a stale client. */
function s3Client(config: S3Config): S3Client {
  const signature = `${config.region}:${config.accessKeyId}`;
  if (cached?.signature !== signature) {
    cached = {
      signature,
      client: new S3Client({
        region: config.region,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      }),
    };
  }
  return cached.client;
}

/**
 * Namespaced to the caller and randomly named. The user id prefix is what stops
 * one user from writing over another's image; the cuid stops a key from being
 * guessable from anything the client knows.
 */
export function buildObjectKey(userId: string, purpose: UploadPurpose, contentType: AllowedContentType): string {
  return `users/${userId}/${purpose}/${createId()}.${ALLOWED_CONTENT_TYPES[contentType]}`;
}

export async function createPresignedUpload(
  userId: string,
  input: { contentType: AllowedContentType; purpose: UploadPurpose },
): Promise<{ uploadUrl: string; key: string }> {
  const config = readConfig();
  if (!config) throw new Error("S3_NOT_CONFIGURED");

  const key = buildObjectKey(userId, input.purpose, input.contentType);

  // ContentType is part of what the signature covers, so the URL can only be
  // used to upload the type that was asked for — it can't be replayed to put a
  // script or an HTML file in the bucket.
  //
  // KNOWN LIMITATION: a presigned PUT cannot enforce a maximum object size.
  // Size is capped in the apps before upload (~5MB). If that ever needs to be
  // enforced server-side, the upgrade path is `createPresignedPost` with a
  // `content-length-range` condition, which changes the client from a single
  // PUT to a multipart POST — hence not done here.
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: input.contentType,
  });

  // signableHeaders is what actually does the pinning. By default the presigner
  // signs only `host`, so without this S3 accepts a PUT with any Content-Type —
  // setting ContentType on the command alone is not enough.
  const uploadUrl = await getSignedUrl(s3Client(config), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type"]),
  });

  getLogger().debug({ userId, purpose: input.purpose, key }, "createPresignedUpload: issued upload URL");
  return { uploadUrl, key };
}

/**
 * Whether a key the client handed back belongs to that client.
 *
 * Presign returns the key to the app, and the app sends it back when saving the
 * record it belongs to — so keys do travel through the client, and the prefix
 * has to be re-checked on the way in. Without this, a client could store
 * someone else's key on their own record and have the server sign a read URL
 * for it.
 */
export function isOwnedKey(key: string, userId: string): boolean {
  return key.startsWith(`users/${userId}/`);
}

/**
 * Turns a stored S3 key into a URL the apps can render. Called by every feature
 * that serializes a record carrying a key, so the apps never see raw keys.
 *
 * Deliberately forgiving: a null key means "no image", and an unconfigured
 * bucket means "no image either" rather than a failed read. Reads happen on
 * every list request, and a dev machine or CI run with no credentials must
 * still be able to load a weight history — losing the thumbnail is acceptable,
 * failing the whole request is not.
 */
export async function getSignedReadUrl(key: string | null): Promise<string | null> {
  if (!key) return null;

  const config = readConfig();
  if (!config) return null;

  try {
    const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
    return await getSignedUrl(s3Client(config), command, { expiresIn: READ_URL_TTL_SECONDS });
  } catch (error) {
    getLogger().error({ err: error, key }, "getSignedReadUrl: failed to sign a read URL");
    return null;
  }
}

/**
 * The `{ [itemId]: key }` shape CheckIn.photoKeys stores, resolved to signed
 * URLs. Prisma types Json columns as `unknown`, so the shape is validated here
 * rather than trusted.
 */
export async function getSignedReadUrlMap(keys: unknown): Promise<Record<string, string> | null> {
  if (!keys || typeof keys !== "object" || Array.isArray(keys)) return null;

  const entries = Object.entries(keys as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
  );
  if (entries.length === 0) return null;

  const signed = await Promise.all(
    entries.map(async ([itemId, key]) => [itemId, await getSignedReadUrl(key)] as const),
  );

  const urls: Record<string, string> = {};
  for (const [itemId, url] of signed) {
    if (url) urls[itemId] = url;
  }
  return Object.keys(urls).length > 0 ? urls : null;
}

/** Whether the four AWS variables are set, without logging when they are not. */
export function isS3Configured(): boolean {
  return Boolean(env.awsRegion && env.awsAccessKeyId && env.awsSecretAccessKey && env.s3Bucket);
}

/** Uploads bytes we already hold, for scripts — the apps use presigned PUTs instead. */
export async function putObject(key: string, body: Buffer, contentType: AllowedContentType): Promise<void> {
  const config = readConfig();
  if (!config) throw new Error("S3_NOT_CONFIGURED");
  await s3Client(config).send(
    new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

/** Removes one object, so a script that uploaded it can undo itself. */
export async function deleteObject(key: string): Promise<void> {
  const config = readConfig();
  if (!config) throw new Error("S3_NOT_CONFIGURED");
  await s3Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
