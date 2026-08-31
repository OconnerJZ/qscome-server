import assert from "node:assert/strict";
import test from "node:test";
import { RETURNING_CUSTOMERS_QUERY } from "./StatsQueryService";

test("usa un alias compatible con MariaDB para clientes recurrentes", () => {
  assert.doesNotMatch(RETURNING_CUSTOMERS_QUERY, /\)\s+returning\b/i);
  assert.match(RETURNING_CUSTOMERS_QUERY, /\)\s+returning_users\b/i);
});
