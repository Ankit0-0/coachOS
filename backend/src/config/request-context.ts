import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";

/**
 * The logger bound to the request being handled, so a service deep in a call
 * stack can log with the request's correlation id without every function
 * taking a logger parameter. Mutable: requireAuth swaps in a child carrying
 * the user id once it knows who is calling.
 */
export type RequestContext = { log: Logger };

export const requestContext = new AsyncLocalStorage<RequestContext>();
