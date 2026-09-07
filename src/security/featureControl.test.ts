import assert from "node:assert/strict";
import test from "node:test";
import {
  getFeatureControlRegistry,
  resolveFeatureControlMode,
} from "./featureControl";

test("protege funcionalidades core e implementaciones pendientes", () => {
  const registry = getFeatureControlRegistry();
  const orders = registry.find((feature) => feature.key === "orders.secure");
  const automations = registry.find((feature) => feature.key === "automations");

  assert.equal(orders?.immutable, true);
  assert.equal(orders?.plans.free, "enabled");
  assert.equal(automations?.immutable, true);
  assert.equal(automations?.plans.level_3, "disabled");

  assert.deepEqual(resolveFeatureControlMode({
    planDefault: "enabled",
    immutable: true,
    globalMode: "disabled",
  }), { mode: "enabled", source: "immutable" });
});

test("un override de negocio domina al plan y el plan domina al entitlement", () => {
  assert.deepEqual(resolveFeatureControlMode({
    planDefault: "disabled",
    planMode: "enabled",
  }), { mode: "enabled", source: "plan" });

  assert.deepEqual(resolveFeatureControlMode({
    planDefault: "enabled",
    planMode: "disabled",
    businessMode: "read_only",
  }), { mode: "read_only", source: "business" });
});

test("el kill switch global domina y read_only actúa como tope sin revivir features", () => {
  assert.deepEqual(resolveFeatureControlMode({
    planDefault: "enabled",
    businessMode: "enabled",
    globalMode: "disabled",
  }), { mode: "disabled", source: "global" });

  assert.deepEqual(resolveFeatureControlMode({
    planDefault: "enabled",
    businessMode: "enabled",
    globalMode: "read_only",
  }), { mode: "read_only", source: "global" });

  assert.deepEqual(resolveFeatureControlMode({
    planDefault: "disabled",
    globalMode: "read_only",
  }), { mode: "disabled", source: "entitlement" });
});

test("el registro refleja los niveles comerciales aprobados", () => {
  const registry = getFeatureControlRegistry();
  const marketing = registry.find((feature) => feature.key === "marketing.center");
  const intelligence = registry.find((feature) => feature.key === "customer.intelligence");

  assert.deepEqual(marketing?.plans, {
    free: "disabled",
    level_1: "enabled",
    level_2: "enabled",
    level_3: "enabled",
  });
  assert.deepEqual(intelligence?.plans, {
    free: "disabled",
    level_1: "disabled",
    level_2: "enabled",
    level_3: "enabled",
  });
});
