import assert from "node:assert/strict";
import test from "node:test";
import {
  APPROVED_PLAN_LIMITS,
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
    for (const key of ["orders.secure", "realtime", "kitchen", "sharedOrders", "reviews.core", "loyalty.participation"]) {
      const feature = plan.features.find((item) => item.key === key);
      assert.equal(feature?.included, true, `${key} debe estar incluido en ${plan.code}`);
      assert.equal(feature?.status, "available", `${key} debe estar disponible en ${plan.code}`);
      assert.equal(feature?.commercialModel, "core");
    }
  }
});

test("activa capacidades comerciales sólo desde su nivel mínimo", () => {
  const free = getBusinessPlanDefinition("free");
  const level1 = getBusinessPlanDefinition("level_1");
  const level2 = getBusinessPlanDefinition("level_2");
  const level3 = getBusinessPlanDefinition("level_3");

  for (const key of ["reputation.insights", "loyalty.management", "marketing.center"]) {
    assert.equal(free.features.find((item) => item.key === key)?.included, false);
    assert.equal(level1.features.find((item) => item.key === key)?.included, true);
    assert.equal(level1.features.find((item) => item.key === key)?.status, "available");
  }

  for (const key of ["customer.intelligence", "customer.segments"]) {
    assert.equal(level1.features.find((item) => item.key === key)?.included, false);
    assert.equal(level2.features.find((item) => item.key === key)?.included, true);
    assert.equal(level2.features.find((item) => item.key === key)?.status, "available");
  }

  for (const key of ["analytics.advanced", "exports", "marketing.advanced"]) {
    const feature = level2.features.find((item) => item.key === key);
    assert.equal(feature?.included, true, `${key} debe pertenecer a Nivel 2+`);
    assert.equal(feature?.status, "coming_soon", `${key} no debe anunciarse como disponible todavía`);
  }

  assert.equal(level2.features.find((item) => item.key === "automations")?.included, false);
  assert.equal(level3.features.find((item) => item.key === "automations")?.included, true);
  assert.equal(level3.features.find((item) => item.key === "automations")?.status, "coming_soon");

  const allowedAvailablePaid = new Set([
    "reputation.insights", "loyalty.management", "marketing.center",
    "customer.intelligence", "customer.segments",
  ]);
  for (const plan of [free, level1, level2, level3]) {
    const unexpectedAvailablePaidFeature = plan.features.find(
      (item) => item.commercialModel !== "core" && item.status === "available" && !allowedAvailablePaid.has(item.key),
    );
    assert.equal(unexpectedAvailablePaidFeature, undefined);
  }
});

test("mantiene qsCome Ads separado de la suscripción y sin beneficios ficticios", () => {
  const free = getBusinessPlanDefinition("free");
  const level1 = getBusinessPlanDefinition("level_1");
  const freeAdsBenefit = free.features.find((item) => item.key === "ads.planBenefits");
  const paidAdsBenefit = level1.features.find((item) => item.key === "ads.planBenefits");
  assert.equal(freeAdsBenefit?.included, false);
  assert.equal(paidAdsBenefit?.included, true);
  assert.equal(paidAdsBenefit?.commercialModel, "separate_product");
  assert.equal(paidAdsBenefit?.status, "coming_soon");
  assert.match(paidAdsBenefit?.description || "", /nunca ranking orgánico garantizado/i);
});

test("ordena planes para previews de upgrade y downgrade", () => {
  assert.equal(getBusinessPlanRank("free"), 0);
  assert.equal(getBusinessPlanRank("level_3"), 3);
  assert.equal(compareBusinessPlanCodes("free", "level_1"), "upgrade");
  assert.equal(compareBusinessPlanCodes("level_3", "level_1"), "downgrade");
  assert.equal(compareBusinessPlanCodes("level_2", "level_2"), "same");
});

test("activa exactamente los límites comerciales aprobados", () => {
  assert.deepEqual(getBusinessPlanDefinition("free").limits, APPROVED_PLAN_LIMITS.free);
  assert.deepEqual(getBusinessPlanDefinition("level_1").limits, APPROVED_PLAN_LIMITS.level_1);
  assert.deepEqual(getBusinessPlanDefinition("level_2").limits, APPROVED_PLAN_LIMITS.level_2);
  assert.deepEqual(getBusinessPlanDefinition("level_3").limits, APPROVED_PLAN_LIMITS.level_3);
  assert.deepEqual(APPROVED_PLAN_LIMITS.free, {
    teamMembers: 3,
    menuItems: 75,
    businessPhotos: 4,
    analyticsHistoryDays: 30,
  });
});

test("los límites comerciales sólo describen escala del negocio", () => {
  const free = getBusinessPlanDefinition("free");
  assert.deepEqual(Object.keys(free.limits).sort(), ["analyticsHistoryDays", "businessPhotos", "menuItems", "teamMembers"]);
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

test("acepta overrides explícitos y conserva defaults ante valores inválidos", () => {
  process.env.BUSINESS_PLAN_LIMITS_JSON = JSON.stringify({
    free: { teamMembers: 2, menuItems: 25, businessPhotos: -1 },
    level_1: { analyticsHistoryDays: 90.5 },
  });

  const free = getBusinessPlanDefinition("free");
  const level1 = getBusinessPlanDefinition("level_1");
  assert.equal(free.limits.teamMembers, 2);
  assert.equal(free.limits.menuItems, 25);
  assert.equal(free.limits.businessPhotos, 4);
  assert.equal(level1.limits.analyticsHistoryDays, 90);
  assert.equal(getBusinessPlanDefinition("unknown").code, "free");
  assert.equal(isBusinessPlanCode("level_3"), true);
});
