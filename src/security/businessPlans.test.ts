import test from "node:test";
import assert from "node:assert/strict";
import { getBusinessPlanCatalog, getBusinessPlanDefinition, isBusinessPlanCode } from "./businessPlans";

test("mantiene realtime y funciones de confianza en todos los planes", () => {
  for (const plan of getBusinessPlanCatalog()) {
    assert.equal(plan.features.find((feature) => feature.key === "realtime")?.included, true);
    assert.equal(plan.features.find((feature) => feature.key === "orders.secure")?.included, true);
  }
});

test("no inventa precios ni límites cuando no están configurados", () => {
  const free = getBusinessPlanDefinition("free");
  assert.equal(free.price, null);
  assert.equal(free.limits.teamMembers, null);
  assert.equal(getBusinessPlanDefinition("unknown").code, "free");
  assert.equal(isBusinessPlanCode("level_3"), true);
});
