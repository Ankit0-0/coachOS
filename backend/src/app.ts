import dotenv from "dotenv";
import cors from "cors";
import express, { type Application, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { attachRequestLogger, createHttpLogger } from "./config/http-logger.js";
import { logger } from "./config/logger.js";
import { router } from "./router.js";
import { sendError } from "./utils/http-error.js";

dotenv.config();

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, React Native) that send no Origin.
      const noOrigin = !origin;
      const configuredOrigin = !!origin && env.clientUrls.includes(origin);
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
// Before the body parsers, so a request with a malformed body still gets an id
// and a logger — that rejection is one of the things worth seeing.
app.use(createHttpLogger(logger));
app.use(attachRequestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_request: Request, response: Response) => {
  response.status(200).json({ message: "Server is running smoothly!" });
});

app.get("/heartbeat", (_request: Request, response: Response) => {
  response.status(200).json({ message: "Heartbeat successful.", status: "beating" });
});

app.use("/v1", router);

/**
 * Anything that escaped a route handler. Express's own handler would answer
 * without ever showing the logger the error, so the stack would be lost — this
 * logs it against the request's id and answers with the bare status every other
 * error uses.
 *
 * A body parser rejecting malformed JSON carries its own 4xx status: that is
 * the client's mistake, so it keeps that status and logs at warn.
 */
app.use((error: unknown, request: Request, response: Response, next: NextFunction) => {
  const log = request.log ?? logger;
  const status = (error as { status?: number; statusCode?: number })?.status ?? (error as { statusCode?: number })?.statusCode;
  const isClientError = typeof status === "number" && status >= 400 && status < 500;

  if (isClientError) {
    log.warn({ err: error, status }, "Request rejected before it reached a route");
  } else {
    log.error({ err: error }, "Unhandled error");
  }

  if (response.headersSent) {
    next(error);
    return;
  }
  sendError(response, isClientError ? status : 500);
});

export { app };