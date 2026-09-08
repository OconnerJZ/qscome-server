import assert from "node:assert/strict";
import test from "node:test";
import { derivePlatformHealthStatus } from "./AdminHealthService";

test("marca plataforma healthy cuando todos los componentes están sanos", () => {
  assert.equal(
    derivePlatformHealthStatus(["healthy", "healthy", "healthy", "healthy"]),
    "healthy",
  );
});

test("marca plataforma degraded cuando cualquier dependencia falla", () => {
  assert.equal(
    derivePlatformHealthStatus(["healthy", "unhealthy", "healthy", "healthy"]),
    "degraded",
  );
});
