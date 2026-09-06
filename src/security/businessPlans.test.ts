import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_PLAN_CODES,
  getBusinessPlanCatalog,
  getBusinessPlanDefinition,
  isBusinessPlanCode,
} from "./businessPlans";

const originalLimits = process.env.BUSINESS_PLAN_LIMITS_JSON;

test.afterEach(() => {
  if (originalLimits === undefined) delete process.env.BUSINESS_PLAN_LIMITS_JSON;
  else process.env.BUSINESS_PLAN_LIMITS_JSON = originalLimits;
});

test("mantiene los cuatro niveles comerciales sin convertir core en paywall", () => {
  const catalog = getBusinessPlanCatalog();
  assert.deepEqual(catalog.map((plan) => plan.code), [...BUSINESS_PLAN_CODES]);

  for (const plan of catalog) {
    for (const key of ["orders.secure", "realtime", "kitchen", "sharedOrders"]) {
      const feature = plan.features.find((item) => item.key === key);
      assert.equal(feature?.included, true, `${key} debe estar incluido en ${plan.code}`);
      assert.equal(feature?.status, "available", `${key} debe estar disponible en ${plan.code}`);
    }
  }
});

test("los límites comerciales sólo describen escala del negocio", () => {
  const free = getBusinessPlanDefinition("free");
  assert.deepEqual(Object.keys(free.limits).sort(), [
    "analyticsHistoryDays",
    "businessPhotos",
    "menuItems",
    "teamMembers",
  ]);
  assert.equal("sharedParticipants" in free.limits, false);
  assert.equal("activeSharedSessions" in free.limits, false);
});

test("publicidad se expresa como policy y conserva compatibilidad temporal", () => {
  const [free, ...paid] = getBusinessPlanCatalog();
  assert.equal(free.policies.adsEnabled, true);
  assert.equal(free.adsEnabled, true);

  for (const plan of paid) {
    assert.equal(plan.policies.adsEnabled, false);
    assert.equal(plan.adsEnabled, false);
  }
});

test("acepta overrides explícitos sin inventar límites inválidos", () => {
  process.env.BUSINESS_PLAN_LIMITS_JSON = JSON.stringify({
    free: { teamMembers: 3, menuItems: 25, businessPhotos: -1 },
    level_1: { analyticsHistoryDays: 90.5 },
  });

  const free = getBusinessPlanDefinition("free");
  const level1 = getBusinessPlanDefinition("level_1");

  assert.equal(free.limits.teamMembers, 3);
  assert.equal(free.limits.menuItems, 25);
  assert.equal(free.limits.businessPhotos, null);
  assert.equal(level1.limits.analyticsHistoryDays, null);
  assert.equal(getBusinessPlanDefinition("unknown").code, "free");
  assert.equal(isBusinessPlanCode("level_3"), true);
});
