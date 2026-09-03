import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHealthChecks } from "./HealthService";

test("reporta todos los servicios sanos sin exponer detalles internos", async () => {
  const result = await evaluateHealthChecks({
    database: async () => true,
    storage: async () => true,
  });

  assert.equal(result.healthy, true);
  assert.deepEqual(result.services, { database: "healthy", storage: "healthy" });
});

test("identifica el servicio fallido sin propagar su excepción", async () => {
  const result = await evaluateHealthChecks({
    database: async () => { throw new Error("credenciales privadas"); },
    storage: async () => true,
  });

  assert.equal(result.healthy, false);
  assert.deepEqual(result.services, { database: "unhealthy", storage: "healthy" });
  assert.equal(JSON.stringify(result).includes("credenciales privadas"), false);
});
