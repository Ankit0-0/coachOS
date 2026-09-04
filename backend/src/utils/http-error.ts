import type { Response } from "express";

/** Send a bare status code with no response body. The reason lives in the server logs, not the wire response. */
export function sendError(response: Response, status: number): void {
  response.status(status).end();
}
