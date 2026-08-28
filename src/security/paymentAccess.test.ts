import test from "node:test";
import assert from "node:assert/strict";
import { hasDirectPaymentAccess } from "./paymentAccess";

test("payment access is limited to its customer or an admin", () => {
  assert.equal(hasDirectPaymentAccess({ requesterUserId: 8, paymentUserId: 8 }), true);
  assert.equal(hasDirectPaymentAccess({ requesterUserId: 8, orderUserId: 8 }), true);
  assert.equal(hasDirectPaymentAccess({ requesterUserId: 9, paymentUserId: 8, orderUserId: 8 }), false);
  assert.equal(hasDirectPaymentAccess({ requesterUserId: 9, globalRole: "admin" }), true);
});
