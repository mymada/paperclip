import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { errorHandler } from "../middleware/error-handler.js";

function makeReq(): Request {
  return {
    method: "GET",
    originalUrl: "/api/test",
    requestId: "test-req-id",
    actor: { type: "none", source: "none" },
    body: { a: 1 },
    params: { id: "123" },
    query: { q: "x" },
  } as unknown as Request;
}

function makeRes(): Response {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;
  (res.status as unknown as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

describe("errorHandler", () => {
  it("attaches the original Error to res.err for 500s", () => {
    const req = makeReq();
    const res = makeRes() as any;
    const next = vi.fn() as unknown as NextFunction;
    const err = new Error("boom");

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    expect(res.err).toBe(err);
    expect(res.__errorContext?.error?.message).toBe("boom");
  });

  it("attaches HttpError instances for 500 responses", () => {
    const req = makeReq();
    const res = makeRes() as any;
    const next = vi.fn() as unknown as NextFunction;
    const err = new HttpError(500, "db exploded");

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "db exploded" });
    expect(res.err).toBe(err);
    expect(res.__errorContext?.error?.message).toBe("db exploded");
  });

  it("attaches debug context for 4xx HttpError without res.err", () => {
    const req = makeReq();
    const res = makeRes() as any;
    const next = vi.fn() as unknown as NextFunction;
    const err = new HttpError(404, "missing");

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "missing" });
    expect(res.err).toBeUndefined();
    expect(res.__errorContext?.requestId).toBe("test-req-id");
    expect(res.__errorContext?.actor?.actorType).toBe("none");
    expect(res.__errorContext?.reqBody).toBeUndefined();
  });

  it("attaches error context for ZodError validation failures", () => {
    const req = makeReq();
    const res = makeRes() as any;
    const next = vi.fn() as unknown as NextFunction;
    const parsed = z.object({ x: z.string() }).safeParse({});
    if (parsed.success) throw new Error("expected zod error");

    errorHandler(parsed.error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.__errorContext?.error?.message).toBe("Validation error");
    expect(res.__errorContext?.reqBody).toEqual({ a: 1 });
  });
});
