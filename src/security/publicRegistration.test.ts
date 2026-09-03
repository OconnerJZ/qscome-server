import test from "node:test";
import assert from "node:assert/strict";
import { getPublicRegistrationRole } from "./publicRegistration";

test("public registration only grants owner to an explicit business signup", () => {
  assert.equal(getPublicRegistrationRole(true), "owner");
  assert.equal(getPublicRegistrationRole(false), "customer");
  assert.equal(getPublicRegistrationRole(undefined), "customer");
  assert.equal(getPublicRegistrationRole("true"), "customer");
});
