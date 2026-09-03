import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { resolveStoragePaths } from "./storage";

test("mantiene los archivos fuera de dist usando el directorio de ejecución", () => {
  const paths = resolveStoragePaths({}, "/app");

  assert.equal(paths.publicUploadsPath, path.resolve("/app/uploads"));
  assert.equal(
    paths.privateEvidenceUploadsPath,
    path.resolve("/app/private_uploads/transfer-evidence"),
  );
});

test("permite montar todo el almacenamiento bajo una raíz configurable", () => {
  const paths = resolveStoragePaths({ STORAGE_ROOT: "/data/qscome" }, "/app");

  assert.equal(paths.publicUploadsPath, path.resolve("/data/qscome/uploads"));
  assert.equal(
    paths.privateEvidenceUploadsPath,
    path.resolve("/data/qscome/private_uploads/transfer-evidence"),
  );
});

test("acepta montajes independientes para contenido público y privado", () => {
  const paths = resolveStoragePaths({
    UPLOADS_PATH: "/media/public",
    PRIVATE_EVIDENCE_UPLOADS_PATH: "/vault/evidence",
  }, "/app");

  assert.equal(paths.publicUploadsPath, path.resolve("/media/public"));
  assert.equal(paths.privateEvidenceUploadsPath, path.resolve("/vault/evidence"));
});
