import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminDashboardResult } from "./AdminDashboardService";

test("buildAdminDashboardResult normalizes numeric database values", () => {
  const result = buildAdminDashboardResult(
    {
      totalUsers: "100",
      newUsers7d: "7",
      newUsers30d: 22,
      totalBusinesses: "20",
      openBusinesses: "12",
      verifiedBusinesses: "5",
      newBusinesses7d: "2",
      newBusinesses30d: "6",
      ordersToday: "4",
      orders7d: "30",
      orders30d: "80",
      completed30d: "60",
      cancelled30d: "8",
      completedVolume30d: "12345.678",
      averageTicket30d: "205.7613",
      sharedOrders30d: "12",
      transferPendingReview: "3",
      transferRequiresClarification: "2",
    },
    [{ method: "cash", ordersCount: "40", volume: "8000.129" }],
    [{ planCode: "level_1", businessesCount: "6" }],
    [{ day: "2026-09-07", ordersCount: "4", volume: "500.555" }],
  );

  assert.deepEqual(result.users, { total: 100, new7d: 7, new30d: 22 });
  assert.deepEqual(result.businesses, {
    total: 20,
    open: 12,
    verified: 5,
    new7d: 2,
    new30d: 6,
  });
  assert.equal(result.orders.cancellationRate30d, 10);
  assert.equal(result.sharedOrders.shareRate30d, 15);
  assert.equal(result.revenue.completedVolume30d, 12345.68);
  assert.equal(result.revenue.averageTicket30d, 205.76);
  assert.deepEqual(result.paymentMethods[0], { method: "cash", orders: 40, volume: 8000.13 });
  assert.deepEqual(result.plans[0], { planCode: "level_1", businesses: 6 });
  assert.deepEqual(result.trend[0], { day: "2026-09-07", orders: 4, volume: 500.56 });
});

test("buildAdminDashboardResult avoids invalid rates when there are no orders", () => {
  const result = buildAdminDashboardResult();
  assert.equal(result.orders.cancellationRate30d, 0);
  assert.equal(result.sharedOrders.shareRate30d, 0);
  assert.equal(result.revenue.completedVolume30d, 0);
});
