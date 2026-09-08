import assert from "node:assert/strict";
import test from "node:test";
import {
  derivePlatformHealthStatus,
  deriveStorageHealthStatus,
} from "./AdminHealthService";

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

test("marca storage healthy cuando rutas y filesystem están disponibles", () => {
  assert.equal(
    deriveStorageHealthStatus({
      publicUploads: "healthy",
      privateEvidence: "healthy",
      disk: {
        totalBytes: 1_000,
        availableBytes: 400,
        usedPercent: 60,
      },
    }),
    "healthy",
  );
});

test("marca storage unhealthy si alguna ruta no es accesible", () => {
  assert.equal(
    deriveStorageHealthStatus({
      publicUploads: "healthy",
      privateEvidence: "unhealthy",
      disk: {
        totalBytes: 1_000,
        availableBytes: 400,
        usedPercent: 60,
      },
    }),
    "unhealthy",
  );
});

test("marca storage unhealthy si no puede obtener el estado del filesystem", () => {
  assert.equal(
    deriveStorageHealthStatus({
      publicUploads: "healthy",
      privateEvidence: "healthy",
      disk: null,
    }),
    "unhealthy",
  );
});

test("marca storage unhealthy ante un snapshot de filesystem inválido", () => {
  assert.equal(
    deriveStorageHealthStatus({
      publicUploads: "healthy",
      privateEvidence: "healthy",
      disk: {
        totalBytes: 0,
        availableBytes: 0,
        usedPercent: null,
      },
    }),
    "unhealthy",
  );
});
