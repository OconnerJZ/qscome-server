import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAdminBusinessStatusInput } from "./AdminBusinessService";

 test("normalizeAdminBusinessStatusInput requires a reason when suspending", () => {
  assert.throws(
    () => normalizeAdminBusinessStatusInput("suspended", "   "),
    /motivo de la suspensión/i,
  );
});

test("normalizeAdminBusinessStatusInput trims suspension reason", () => {
  assert.deepEqual(
    normalizeAdminBusinessStatusInput("suspended", "  Incumplimiento operativo  "),
    { status: "suspended", reason: "Incumplimiento operativo" },
  );
});

test("normalizeAdminBusinessStatusInput clears reason when reactivating", () => {
  assert.deepEqual(
    normalizeAdminBusinessStatusInput("active", "motivo anterior"),
    { status: "active", reason: null },
  );
});

test("normalizeAdminBusinessStatusInput rejects unknown status", () => {
  assert.throws(
    () => normalizeAdminBusinessStatusInput("disabled", "x"),
    /Estado de plataforma inválido/i,
  );
});
