import assert from "node:assert/strict";
import test from "node:test";
import { Request, Response } from "express";
import { errorHandler } from "./errorHandler";
import { HttpError } from "../utils/httpError";

const captureResponse = (error: unknown) => {
  let statusCode = 200;
  let body: Record<string, unknown> = {};
  const response = {
    status: (value: number) => {
      statusCode = value;
      return response;
    },
    json: (value: Record<string, unknown>) => {
      body = value;
      return response;
    },
  } as unknown as Response;

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    errorHandler(error, {} as Request, response, () => undefined);
  } finally {
    console.error = originalConsoleError;
  }

  return { statusCode, body };
};

test("conserva código y detalles de errores controlados", () => {
  const response = captureResponse(new HttpError(409, "La orden cambió", {
    code: "ORDER_VERSION_CONFLICT",
    details: { expectedVersion: 2 },
  }));

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, {
    success: false,
    code: "ORDER_VERSION_CONFLICT",
    message: "La orden cambió",
    details: { expectedVersion: 2 },
  });
});

test("no expone mensajes de excepciones internas", () => {
  const response = captureResponse(new Error("contraseña o consulta sensible"));

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.code, "INTERNAL_ERROR");
  assert.equal(response.body.message, "Error interno del servidor");
  assert.equal(JSON.stringify(response.body).includes("sensible"), false);
});
