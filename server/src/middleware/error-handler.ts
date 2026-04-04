import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors.js";
import { trackErrorHandlerCrash } from "@paperclipai/shared/telemetry";
import { getTelemetryClient } from "../telemetry.js";

export interface ErrorContext {
  error: { message: string; stack?: string; name?: string; details?: unknown; raw?: unknown };
  method: string;
  url: string;
  requestId?: string;
  actor?: Record<string, unknown>;
  reqBody?: unknown;
  reqParams?: unknown;
  reqQuery?: unknown;
}

function summarizeActor(req: Request): Record<string, unknown> {
  const a = req.actor;
  // Actor middleware runs after body parsing; early errors may not have `actor` yet.
  if (a == null || a.type === "none") return { actorType: "none" };
  if (a.type === "agent") {
    return {
      actorType: "agent",
      agentId: a.agentId,
      companyId: a.companyId,
      source: a.source,
      runId: a.runId,
    };
  }
  return {
    actorType: "board",
    userId: a.userId,
    source: a.source,
    isInstanceAdmin: a.isInstanceAdmin,
  };
}

/** Avoid logging full bodies on routine 403/404 noise. */
function includeRequestPayload(statusCode: number, isZod: boolean): boolean {
  if (isZod) return true;
  if (statusCode >= 500) return true;
  if (statusCode === 422 || statusCode === 400) return true;
  return false;
}

function attachErrorContext(
  req: Request,
  res: Response,
  payload: ErrorContext["error"],
  options: { statusCode: number; rawError?: Error; isZod?: boolean },
) {
  const isZod = options.isZod ?? false;
  const withPayload = includeRequestPayload(options.statusCode, isZod);
  (res as any).__errorContext = {
    error: payload,
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
    actor: summarizeActor(req),
    ...(withPayload
      ? {
          reqBody: req.body,
          reqParams: req.params,
          reqQuery: req.query,
        }
      : {}),
  } satisfies ErrorContext;
  if (options.rawError) {
    (res as any).err = options.rawError;
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    const isServer = err.status >= 500;
    attachErrorContext(
      req,
      res,
      {
        message: err.message,
        name: err.name,
        details: err.details,
        ...(isServer ? { stack: err.stack } : {}),
      },
      { statusCode: err.status, rawError: isServer ? err : undefined },
    );
    if (isServer) {
      const tc = getTelemetryClient();
      if (tc) trackErrorHandlerCrash(tc, { errorCode: err.name });
    }
    res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    attachErrorContext(
      req,
      res,
      {
        message: "Validation error",
        name: "ZodError",
        details: err.errors.slice(0, 20),
      },
      { statusCode: 400, isZod: true },
    );
    res.status(400).json({ error: "Validation error", details: err.errors });
    return;
  }

  const rootError = err instanceof Error ? err : new Error(String(err));
  attachErrorContext(
    req,
    res,
    err instanceof Error
      ? { message: err.message, stack: err.stack, name: err.name }
      : { message: String(err), raw: err, stack: rootError.stack, name: rootError.name },
    { statusCode: 500, rawError: rootError },
  );

  const tc = getTelemetryClient();
  if (tc) trackErrorHandlerCrash(tc, { errorCode: rootError.name });

  res.status(500).json({ error: "Internal server error" });
}
