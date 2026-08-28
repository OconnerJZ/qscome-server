import assert from "node:assert/strict";
import test from "node:test";
import { hasBusinessPermission, normalizeBusinessRole, permissionsForRole } from "./businessRoles";

test("normaliza roles heredados sin ampliar permisos", () => {
  assert.equal(normalizeBusinessRole("owner"), "primary_owner");
  assert.equal(normalizeBusinessRole("staff"), "kitchen");
  assert.equal(normalizeBusinessRole("desconocido"), "kitchen");
});

test("sólo primary_owner administra equipo y transfiere propiedad", () => {
  assert.equal(hasBusinessPermission("primary_owner", "team.manage"), true);
  assert.equal(hasBusinessPermission("primary_owner", "ownership.transfer"), true);
  for (const role of ["co_owner", "manager", "kitchen", "cashier"]) {
    assert.equal(hasBusinessPermission(role, "team.manage"), false);
    assert.equal(hasBusinessPermission(role, "ownership.transfer"), false);
  }
});

test("cocina y caja reciben permisos operativos distintos", () => {
  assert.deepEqual(permissionsForRole("kitchen"), ["orders.read", "kitchen.read", "kitchen.update"]);
  assert.deepEqual(permissionsForRole("cashier"), ["orders.read", "orders.accept", "payments.review"]);
});

