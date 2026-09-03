import test from "node:test";
import assert from "node:assert/strict";
import { assertUsableTransferConfig, isUsableTransferConfig, normalizeTransferBankConfig } from "./transferPayment";

test("normaliza únicamente campos bancarios permitidos", () => {
  const result = normalizeTransferBankConfig({ accountHolder: "  Bryant ", bankName: "Banco", clabe: "123456789012345678", secret: "ignore" });
  assert.deepEqual(result, { accountHolder: "Bryant", bankName: "Banco", clabe: "123456789012345678", accountNumber: "", referenceInstructions: "" });
  assert.doesNotThrow(() => assertUsableTransferConfig(result));
  assert.equal(isUsableTransferConfig(result), true);
});

test("rechaza CLABE inválida y configuración incompleta", () => {
  assert.throws(() => normalizeTransferBankConfig({ clabe: "123" }), /18 dígitos/);
  assert.throws(() => assertUsableTransferConfig(normalizeTransferBankConfig({ bankName: "Banco" })), /Completa titular/);
});
