import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminMarketingSummary,
  normalizeAdminAdModeration,
  normalizeAdminMarketingIntervention,
} from "./AdminMarketingService";

test("normaliza decisiones de moderación con motivo obligatorio", () => {
  assert.deepEqual(normalizeAdminAdModeration("approved", "Contenido revisado"), {
    decision: "approved",
    reason: "Contenido revisado",
  });
  assert.deepEqual(normalizeAdminAdModeration("rejected", "Promoción engañosa"), {
    decision: "rejected",
    reason: "Promoción engañosa",
  });
  assert.throws(() => normalizeAdminAdModeration("active", "No corresponde"), /Decisión de moderación inválida/);
  assert.throws(() => normalizeAdminAdModeration("approved", "x"), /motivo administrativo/i);
});

test("limita las intervenciones admin a pausa o finalización", () => {
  assert.deepEqual(normalizeAdminMarketingIntervention("paused", "Revisión preventiva"), {
    status: "paused",
    reason: "Revisión preventiva",
  });
  assert.deepEqual(normalizeAdminMarketingIntervention("ended", "Campaña retirada"), {
    status: "ended",
    reason: "Campaña retirada",
  });
  assert.throws(() => normalizeAdminMarketingIntervention("active", "Forzar activación"), /Estado administrativo inválido/);
});

test("el resumen mantiene billing y serving deshabilitados", () => {
  const summary = buildAdminMarketingSummary(
    { total: "8", active: "2", paused: "1" },
    { total: "5", pendingModeration: "2", approved: "1", pendingBilling: "3", active: "0" },
  );
  assert.equal(summary.billingEnabled, false);
  assert.equal(summary.servingEnabled, false);
  assert.equal(summary.marketing.total, 8);
  assert.equal(summary.marketing.active, 2);
  assert.equal(summary.ads.pendingModeration, 2);
  assert.equal(summary.ads.pendingBilling, 3);
  assert.equal(summary.ads.active, 0);
});
