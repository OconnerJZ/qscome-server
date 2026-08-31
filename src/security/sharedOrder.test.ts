import test from "node:test";
import assert from "node:assert/strict";
import { createSharedOrderSecrets, normalizeSharedOrderCode, sharedParticipantLabel } from "./sharedOrder";

test("genera códigos numéricos de cuatro o seis dígitos", () => {
  assert.match(createSharedOrderSecrets(4).code, /^\d{4}$/);
  assert.match(createSharedOrderSecrets(6).code, /^\d{6}$/);
});

test("normaliza código y genera etiqueta anónima operativa", () => {
  assert.equal(normalizeSharedOrderCode(" 12-34 56 "), "123456");
  assert.equal(sharedParticipantLabel(3), "Selección 3");
});
