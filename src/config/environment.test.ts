import assert from "node:assert/strict";
import test from "node:test";
import {
  missingProductionEnvironmentKeys,
  validateProductionEnvironment,
} from "./environment";

const validProductionEnvironment = {
  NODE_ENV: "production",
  DB_HOST: "db",
  DB_USER: "app",
  DB_PASSWORD: "secret",
  DB_NAME: "qscome",
  JWT_SECRET: "long-random-secret",
  GOOGLE_CLIENT_ID: "client-id",
  CORS_ORIGIN: "https://qscome.com.mx",
};

test("no exige secretos de producción durante desarrollo", () => {
  assert.deepEqual(missingProductionEnvironmentKeys({ NODE_ENV: "development" }), []);
});

test("enumera únicamente las variables de producción ausentes", () => {
  const environment = { ...validProductionEnvironment, JWT_SECRET: "", DB_PASSWORD: " " };
  assert.deepEqual(missingProductionEnvironmentKeys(environment), ["DB_PASSWORD", "JWT_SECRET"]);
});

test("rechaza iniciar producción con configuración incompleta", () => {
  assert.throws(
    () => validateProductionEnvironment({ NODE_ENV: "prod" }),
    /DB_HOST.*JWT_SECRET.*CORS_ORIGIN/,
  );
  assert.doesNotThrow(() => validateProductionEnvironment(validProductionEnvironment));
});
