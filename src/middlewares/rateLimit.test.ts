import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "./rateLimit";

test("bloquea intentos adicionales dentro de la misma ventana", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
  const request = { user: { userId: 7 }, ip: "127.0.0.1" } as any;
  let nextCalls = 0;
  let statusCode = 200;
  let body: any;
  const response = {
    setHeader: () => undefined,
    status: (code: number) => { statusCode = code; return response; },
    json: (value: any) => { body = value; return response; },
  } as any;

  limiter(request, response, () => { nextCalls += 1; });
  limiter(request, response, () => { nextCalls += 1; });
  limiter(request, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(statusCode, 429);
  assert.equal(body.success, false);
});

test("mantiene ventanas independientes por usuario", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
  const response = { setHeader: () => undefined, status: () => response, json: () => response } as any;
  let nextCalls = 0;
  limiter({ user: { userId: 1 }, ip: "same" } as any, response, () => { nextCalls += 1; });
  limiter({ user: { userId: 2 }, ip: "same" } as any, response, () => { nextCalls += 1; });
  assert.equal(nextCalls, 2);
});

