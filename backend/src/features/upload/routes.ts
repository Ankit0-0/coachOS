import { Router } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { sendError } from "../../utils/http-error.js";
import { presignSchema } from "./schemas.js";
import { createPresignedUpload } from "./service.js";

export const uploadRouter: ReturnType<typeof Router> = Router();

// Any authenticated role can upload — coaches and clients both have avatars,
// and clients have progress and meal photos.
uploadRouter.use(requireAuth);

uploadRouter.post("/presign", async (request, response) => {
  const parsed = presignSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug(
      { issues: parsed.error.flatten() },
      "POST /uploads/presign: rejected — contentType not an allowed image type, or unknown purpose",
    );
    sendError(response, 400);
    return;
  }

  const userId = request.user?.id;
  if (!userId) {
    logger.debug({ url: request.originalUrl }, "POST /uploads/presign: rejected — no authenticated user on request");
    sendError(response, 401);
    return;
  }

  try {
    // The key comes back from the service, built from `userId` — never from the
    // request body, which has already had any stray key field stripped.
    const { uploadUrl, key } = await createPresignedUpload(userId, parsed.data);
    response.status(201).json({ message: "Upload URL created successfully.", uploadUrl, key });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "S3_NOT_CONFIGURED") {
      // The missing variable names are already in the log from the service.
      // 503 rather than 500: the request was fine, the server isn't ready.
      sendError(response, 503);
    } else {
      logger.error({ err: error, url: request.originalUrl }, "uploads: unexpected error");
      sendError(response, 500);
    }
  }
});
