import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

const MAX_LEN = 128;

/**
 * Propagates or assigns a request correlation id (header `X-Request-Id` / `x-request-id`).
 * Echoes the id on the response for client-side log correlation.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const raw = req.headers["x-request-id"];
  const header = typeof raw === "string" ? raw.trim() : "";
  const id =
    header.length > 0 && header.length <= MAX_LEN ? header : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
