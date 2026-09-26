import { z } from "zod";

import { isExpoPushToken } from "../../utils/push.js";

const token = z.string().trim().max(200).refine(isExpoPushToken, "Not an Expo push token");

export const registerPushTokenSchema = z.object({
  token,
  platform: z.enum(["IOS", "ANDROID"]),
});

export const removePushTokenSchema = z.object({ token });
