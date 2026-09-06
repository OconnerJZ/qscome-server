import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_PLAN_CODES,
  compareBusinessPlanCodes,
  getBusinessPlanCatalog,
  getBusinessPlanDefinition,
  getBusinessPlanRank,
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
    for (const key of ["orders.secure", "realtime", "kitchen", "sharedOrders", "reviews.core"]) {
      const feature = plan.features.find((item) => item.key === key);
      assert.equal(feature?.included, true, `${key} debe estar incluido en ${plan.code}`);
      assert.equal(feature?.status, "available", `${key} debe estar disponible en ${plan.code}`);
      assert.equal(feature?.commercialModel, "core");
    }
  }
});

test("la matriz comercial hereda capacidades sin prometer funciones no construidas", () => {
  const free = getBusinessPlanDefinition("free");
  const level1 = getBusinessPlanDefinition("level_1");
  const level2 = getBusinessPlanDefinition("level_2");
  const level3 = getBusinessPlanDefinition("level_3");

  assert.equal(free.features.find((item) => item.key === "reputation.insights")?.included, false);
  assert.equal(level1.features.find((item) => item.key === "reputation.insights")?.included, true);
  assert.equal(level1.features.find((item) => item.key === "reputation.insights")?.status, "coming_soon");
  assert.equal(level1.features.find((item) => item.key === "customer.intelligence")?.included, false);
  assert.equal(level2.features.find((item) => item.key === "customer.intelligence")?.included, true);
  assert.equal(level2.features.find((item) => item.key === "automations")?.included, false);
  assert.equal(level3.features.find((item) => item.key === "automations")?.included, true);

  for (const plan of [free, level1, level2, level3]) {
    const falselyAvailablePaidFeature = plan.features.find(
      (item) => item.commercialModel !== "core" && item.status === "available",
    );
    assert.equal(falselyAvailablePaidFeature, undefined);
  }
});

test("distingue beneficios publicitarios del ranking orgánico", () => {
  const level1 = getBusinessPlanDefinition("level_1");
  const adsBenefit = level1.features.find((item) => item.key === "ads.planBenefits");
  assert.equal(adsBenefit?.included, true);
  assert.equal(adsBenefit?.commercialModel, "separate_product");
  assert.match(adsBenefit?.description || "", /nunca ranking orgánico garantizado/i);
});

test("ordena planes para previews de upgrade y downgrade", () => {
  assert.equal(getBusinessPlanRank("free"), 0);
  assert.equal(getBusinessPlanRank("level_3"), 3);
  assert.equal(compareBusinessPlanCodes("free", "level_1"), "upgrade");
  assert.equal(compareBusinessPlanCodes("level_3", "level_1"), "downgrade");
  assert.equal(compareBusinessPlanCodes("level_2", "level_2"), "same");
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
