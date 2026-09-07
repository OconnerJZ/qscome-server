import assert from "node:assert/strict";
import test from "node:test";
import { isBusinessPlatformActive } from "./BusinessPlatformService";

test("isBusinessPlatformActive keeps legacy/active businesses available", () => {
  assert.equal(isBusinessPlatformActive(undefined), true);
  assert.equal(isBusinessPlatformActive(null), true);
  assert.equal(isBusinessPlatformActive("active"), true);
});

test("isBusinessPlatformActive blocks suspended businesses", () => {
  assert.equal(isBusinessPlatformActive("suspended"), false);
});
