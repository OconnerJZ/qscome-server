import test from "node:test";
import assert from "node:assert/strict";
import { hasValidImageSignature } from "./imageSignature";

test("valida la firma real y no sólo el MIME declarado", () => {
  assert.equal(hasValidImageSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(hasValidImageSignature(Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c]), "image/jpeg"), false);
  assert.equal(hasValidImageSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
});
