import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateUploadedImage } from "./imageValidation";

const response = () => {
  let statusCode = 200;
  let body: any;
  const res = {
    status: (code: number) => { statusCode = code; return res; },
    json: (value: any) => { body = value; return res; },
  } as any;
  return { res, result: () => ({ statusCode, body }) };
};

test("acepta una imagen cuya firma coincide con el MIME", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "qscome-image-"));
  const filePath = path.join(directory, "valid.png");
  await fs.writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  let nextCalls = 0;

  try {
    await validateUploadedImage({ file: { path: filePath, mimetype: "image/png" } } as any, response().res, () => { nextCalls += 1; });
    assert.equal(nextCalls, 1);
    await fs.access(filePath);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rechaza y elimina un archivo disfrazado de imagen", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "qscome-image-"));
  const filePath = path.join(directory, "fake.jpg");
  await fs.writeFile(filePath, "<html>contenido no válido</html>");
  const { res, result } = response();
  let nextCalls = 0;

  try {
    await validateUploadedImage({ file: { path: filePath, mimetype: "image/jpeg" } } as any, res, () => { nextCalls += 1; });
    assert.equal(nextCalls, 0);
    assert.equal(result().statusCode, 400);
    assert.equal(result().body.success, false);
    await assert.rejects(fs.access(filePath));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
