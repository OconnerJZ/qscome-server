import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAdminTransferFilters } from "./AdminPaymentsService";

test("normaliza filtros de auditoría de transferencias", () => {
  assert.deepEqual(
    normalizeAdminTransferFilters({ q: "  Las parota  ", status: "reviewed", businessId: "12", limit: "500" }),
    { q: "Las parota", status: "reviewed", businessId: 12, limit: 100 },
  );
});

test("acepta búsqueda sin filtros y aplica límite por defecto", () => {
  assert.deepEqual(
    normalizeAdminTransferFilters({}),
    { q: "", status: null, businessId: null, limit: 50 },
  );
});

test("rechaza estado o negocio inválidos", () => {
  assert.throws(() => normalizeAdminTransferFilters({ status: "unknown" }));
  assert.throws(() => normalizeAdminTransferFilters({ businessId: "abc" }));
});
