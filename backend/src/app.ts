import dotenv from "dotenv";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";

import { logger } from "./config/logger.js";
import { router } from "./router.js";

dotenv.config();

const app: Application = express();

app.use(helmet());
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