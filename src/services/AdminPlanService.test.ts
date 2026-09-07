import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAdminTrialTarget,
  buildAdminPlanSummary,
  classifyAdminTrialLifecycle,
} from "./AdminPlanService";

test("clasifica el ciclo de vida del trial sin depender del reloj real", () => {
  const now = new Date("2026-09-07T18:00:00.000Z").getTime();

  assert.equal(classifyAdminTrialLifecycle(null, now), "none");
  assert.equal(classifyAdminTrialLifecycle({
    planCode: "level_1",
    startsAt: "2026-09-08T18:00:00.000Z",
    endsAt: "2026-09-15T18:00:00.000Z",
  }, now), "scheduled");
  assert.equal(classifyAdminTrialLifecycle({
    planCode: "level_1",
    startsAt: "2026-09-01T18:00:00.000Z",
    endsAt: "2026-09-15T18:00:00.000Z",
  }, now), "active");
  assert.equal(classifyAdminTrialLifecycle({
    planCode: "level_1",
    startsAt: "2026-09-01T18:00:00.000Z",
    endsAt: "2026-09-06T18:00:00.000Z",
  }, now), "expired");
});

test("un trial sólo puede elevar temporalmente el plan base", () => {
  assert.doesNotThrow(() => assertAdminTrialTarget("free", "level_1"));
  assert.doesNotThrow(() => assertAdminTrialTarget("level_1", "level_3"));
  assert.throws(() => assertAdminTrialTarget("free", "free"), /superior al plan base/i);
  assert.throws(() => assertAdminTrialTarget("level_2", "level_2"), /superior al plan base/i);
  assert.throws(() => assertAdminTrialTarget("level_2", "level_1"), /superior al plan base/i);
  assert.throws(() => assertAdminTrialTarget("free", "enterprise"), /trial inválido/i);
});

test("normaliza el resumen comercial para el contrato admin", () => {
  const result = buildAdminPlanSummary(
    { totalBusinesses: "12", activeTrials: "2", scheduledTrials: 1, expiringTrials7d: "1" },
    [{ planCode: "free", businessesCount: "8" }],
    [{ planCode: "level_1", businessesCount: "4" }],
    [{ businessId: "7", businessName: "Demo", planCode: "level_2", endsAt: "2026-09-10T00:00:00.000Z" }],
  );

  assert.equal(result.totalBusinesses, 12);
  assert.equal(result.activeTrials, 2);
  assert.deepEqual(result.basePlans[0], { planCode: "free", businesses: 8 });
  assert.deepEqual(result.effectivePlans[0], { planCode: "level_1", businesses: 4 });
  assert.equal(result.expiringTrials[0].businessId, 7);
});
