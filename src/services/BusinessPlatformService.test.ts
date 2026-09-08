import assert from "node:assert/strict";
import test from "node:test";
import {
  getBusinessIdFromPlatformItem,
  isBusinessPlatformActive,
} from "./BusinessPlatformService";

test("isBusinessPlatformActive keeps legacy/active businesses available", () => {
  assert.equal(isBusinessPlatformActive(undefined), true);
  assert.equal(isBusinessPlatformActive(null), true);
  assert.equal(isBusinessPlatformActive("active"), true);
});

test("isBusinessPlatformActive blocks suspended businesses", () => {
  assert.equal(isBusinessPlatformActive("suspended"), false);
});

test("platform filters prefer businessId over an unrelated item id", () => {
  assert.equal(getBusinessIdFromPlatformItem({ id: 91, businessId: 7 }), 7);
  assert.equal(getBusinessIdFromPlatformItem({ id: 12, businessId: null }), 12);
});
