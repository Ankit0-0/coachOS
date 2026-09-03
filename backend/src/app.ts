import dotenv from "dotenv";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { router } from "./router.js";

dotenv.config();

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, React Native) that send no Origin.
      const noOrigin = !origin;
      const configuredOrigin = origin === env.clientUrl;
      // In development, allow any localhost port so `expo start --web` works
      // regardless of which port Metro picks (8081, 8082, ...).
      const devLocalhost =
        !!origin &&
        env.nodeEnv !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      callback(null, noOrigin || configuredOrigin || devLocalhost);
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on("finish", () => {
    logger.info(
      {
        method: request.method,
        url: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      },
      "HTTP request completed",
    );
  });
  next();
});

app.get("/", (_request: Request, response: Response) => {
  response.status(200).json({ message: "Server is running smoothly!" });
});

app.get("/heartbeat", (_request: Request, response: Response) => {
  response.status(200).json({ message: "Heartbeat successful.", status: "beating" });
});

app.use("/v1", router);

export { app };