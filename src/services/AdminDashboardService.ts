import { AppDataSource } from "../utils/db";

type RawRow = Record<string, unknown>;

const numberOf = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: unknown) => Math.round(numberOf(value) * 100) / 100;
const percentage = (part: number, total: number) => (
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0
);

export function buildAdminDashboardResult(
  summaryRow: RawRow = {},
  paymentRows: RawRow[] = [],
  planRows: RawRow[] = [],
  trendRows: RawRow[] = [],
) {
  const orders30d = numberOf(summaryRow.orders30d);
  const cancelled30d = numberOf(summaryRow.cancelled30d);
  const sharedOrders30d = numberOf(summaryRow.sharedOrders30d);

  return {
    generatedAt: new Date().toISOString(),
    period: {
      summaryDays: 30,
      trendDays: 14,
    },
    users: {
      total: numberOf(summaryRow.totalUsers),
      new7d: numberOf(summaryRow.newUsers7d),
      new30d: numberOf(summaryRow.newUsers30d),
    },
    businesses: {
      total: numberOf(summaryRow.totalBusinesses),
      open: numberOf(summaryRow.openBusinesses),
      verified: numberOf(summaryRow.verifiedBusinesses),
      new7d: numberOf(summaryRow.newBusinesses7d),
      new30d: numberOf(summaryRow.newBusinesses30d),
    },
    orders: {
      today: numberOf(summaryRow.ordersToday),
      last7d: numberOf(summaryRow.orders7d),
      last30d: orders30d,
      completed30d: numberOf(summaryRow.completed30d),
      cancelled30d,
      cancellationRate30d: percentage(cancelled30d, orders30d),
    },
    revenue: {
      completedVolume30d: roundMoney(summaryRow.completedVolume30d),
      averageTicket30d: roundMoney(summaryRow.averageTicket30d),
    },
    sharedOrders: {
      last30d: sharedOrders30d,
      shareRate30d: percentage(sharedOrders30d, orders30d),
    },
    transfers: {
      pendingReview: numberOf(summaryRow.transferPendingReview),
      requiresClarification: numberOf(summaryRow.transferRequiresClarification),
    },
    paymentMethods: paymentRows.map((row) => ({
      method: String(row.method || "unknown"),
      orders: numberOf(row.ordersCount),
      volume: roundMoney(row.volume),
    })),
    plans: planRows.map((row) => ({
      planCode: String(row.planCode || "free"),
      businesses: numberOf(row.businessesCount),
    })),
    trend: trendRows.map((row) => ({
      day: String(row.day),
      orders: numberOf(row.ordersCount),
      volume: roundMoney(row.volume),
    })),
  };
}

export class AdminDashboardService {
  async getDashboard() {
    const [summaryRows, paymentRows, planRows, trendRows] = await Promise.all([
      AppDataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM users) AS totalUsers,
          (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS newUsers7d,
          (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS newUsers30d,
          (SELECT COUNT(*) FROM business) AS totalBusinesses,
          (SELECT COUNT(*) FROM business WHERE is_open = 1) AS openBusinesses,
          (SELECT COUNT(*) FROM business WHERE is_verified = 1) AS verifiedBusinesses,
          (SELECT COUNT(*) FROM business WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS newBusinesses7d,
          (SELECT COUNT(*) FROM business WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS newBusinesses30d,
          (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE AND created_at < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)) AS ordersToday,
          (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS orders7d,
          (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS orders30d,
          (SELECT COUNT(*) FROM orders WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS completed30d,
          (SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS cancelled30d,
          (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS completedVolume30d,
          (SELECT COALESCE(AVG(total), 0) FROM orders WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS averageTicket30d,
          (SELECT COUNT(*) FROM orders WHERE shared_session_id IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS sharedOrders30d,
          (SELECT COUNT(*) FROM order_transfer_payments WHERE review_status = 'reported') AS transferPendingReview,
          (SELECT COUNT(*) FROM order_transfer_payments WHERE review_status = 'requires_clarification') AS transferRequiresClarification
      `),
      AppDataSource.query(`
        SELECT
          payment_method AS method,
          COUNT(*) AS ordersCount,
          COALESCE(SUM(total), 0) AS volume
        FROM orders
        WHERE status = 'completed'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY payment_method
        ORDER BY ordersCount DESC, payment_method ASC
      `),
      AppDataSource.query(`
        SELECT effectivePlanCode AS planCode, COUNT(*) AS businessesCount
        FROM (
          SELECT
            business.business_id,
            CASE
              WHEN subscription.business_id IS NULL THEN 'free'
              WHEN subscription.status IN ('active', 'trialing')
                AND (subscription.ends_at IS NULL OR subscription.ends_at > NOW())
                AND subscription.trial_plan_code IS NOT NULL
                AND (subscription.trial_starts_at IS NULL OR subscription.trial_starts_at <= NOW())
                AND (subscription.trial_ends_at IS NULL OR subscription.trial_ends_at > NOW())
                THEN subscription.trial_plan_code
              WHEN subscription.status IN ('active', 'trialing')
                AND (subscription.ends_at IS NULL OR subscription.ends_at > NOW())
                THEN COALESCE(subscription.plan_code, 'free')
              ELSE 'free'
            END AS effectivePlanCode
          FROM business
          LEFT JOIN business_plan_subscriptions subscription
            ON subscription.business_id = business.business_id
        ) plan_snapshot
        GROUP BY effectivePlanCode
        ORDER BY businessesCount DESC, effectivePlanCode ASC
      `),
      AppDataSource.query(`
        SELECT
          DATE(created_at) AS day,
          COUNT(*) AS ordersCount,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) AS volume
        FROM orders
        WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 13 DAY)
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `),
    ]);

    return buildAdminDashboardResult(
      summaryRows?.[0] || {},
      paymentRows || [],
      planRows || [],
      trendRows || [],
    );
  }
}
