import test from "node:test";
import assert from "node:assert/strict";
import { corsOrigin, isLoopbackOrigin } from "../utils/cors";

test("reconoce localhost por HTTP y HTTPS sin abrir dominios externos", () => {
  assert.equal(isLoopbackOrigin("https://localhost:5173"), true);
  assert.equal(isLoopbackOrigin("http://127.0.0.1:5173"), true);
  assert.equal(isLoopbackOrigin("https://localhost.attacker.example"), false);
});

test("acepta HTTPS local durante desarrollo aunque CORS_ORIGIN tenga HTTP", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOrigin = process.env.CORS_ORIGIN;
  try {
    process.env.NODE_ENV = "development";
    process.env.CORS_ORIGIN = "http://localhost:5173";
    let result: boolean | undefined;
    corsOrigin("https://localhost:5173", (error, allowed) => { assert.equal(error, null); result = allowed; });
    assert.equal(result, true);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousOrigin === undefined) delete process.env.CORS_ORIGIN; else process.env.CORS_ORIGIN = previousOrigin;
  }
});
