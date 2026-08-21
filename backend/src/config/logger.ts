import pino from "pino";

import { env } from "./env.js";

const isDevelopment = env.nodeEnv === "development";

export const logger = pino({
  level: env.logLevel,
  name: "coachos-api",
  messageKey: "message",
  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: true,
            messageKey: "message",
          },
        },
      }
    : {}),
});