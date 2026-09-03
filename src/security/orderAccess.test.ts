import assert from "node:assert/strict";
import test from "node:test";
import { hasOrderReadAccess } from "./orderAccess";

test("un cliente sólo obtiene acceso directo a su propia orden", () => {
  assert.equal(hasOrderReadAccess({ requesterUserId: 7, orderUserId: 7 }), true);
  assert.equal(hasOrderReadAccess({ requesterUserId: 8, orderUserId: 7 }), false);
  assert.equal(hasOrderReadAccess({ orderUserId: 7 }), false);
});

test("una orden compartida exige una participación activa", () => {
  assert.equal(hasOrderReadAccess({ requesterUserId: 8, orderUserId: 7, activeSharedParticipant: true }), true);
  assert.equal(hasOrderReadAccess({ requesterUserId: 8, orderUserId: 7, activeSharedParticipant: false }), false);
});

test("la membresía de negocio y el acceso global se evalúan explícitamente", () => {
  assert.equal(hasOrderReadAccess({ requesterUserId: 8, orderUserId: 7, businessMember: true }), true);
  assert.equal(hasOrderReadAccess({ requesterUserId: 8, orderUserId: 7, businessMember: false }), false);
  assert.equal(hasOrderReadAccess({ requesterUserId: 8, globalRole: "admin" }), true);
});
