// src/services/StatsService.ts
// Métricas de negocio alineadas al contrato que consume OwnerReports.

import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { Between } from "typeorm";
import { getStatusLabel } from "../serializers/order.serializer";

const STATUS_ORDER = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "in_delivery",
  "completed",
  "cancelled",
];

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export class StatsService {
  private readonly orderRepo = AppDataSource.getRepository(Orders);

  async getBusinessStats(businessId: number, period = 7) {
    const safePeriod = Math.min(Math.max(Number(period) || 7, 1), 365);
    const now = new Date();
    const currentStart = startOfDay(new Date(now));
    currentStart.setDate(currentStart.getDate() - (safePeriod - 1));
    const currentEnd = endOfDay(now);

    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = startOfDay(new Date(previousEnd));
    previousStart.setDate(previousStart.getDate() - (safePeriod - 1));

    const [currentOrders, previousOrders, pendingOrders] = await Promise.all([
      this.orderRepo.find({
        where: { businessId, createdAt: Between(currentStart, currentEnd) },
      }),
      this.orderRepo.find({
        where: { businessId, createdAt: Between(previousStart, previousEnd) },
      }),
      this.orderRepo.count({ where: { businessId, status: "pending" } }),
    ]);

    const completedOrders = currentOrders.filter(
      (order) => order.status === "completed",
    );
    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + Number.parseFloat(order.total || "0"),
      0,
    );

    const totalOrders = currentOrders.length;
    const averageOrder =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const [salesByDay, topProducts, ordersByStatus] = await Promise.all([
      this.getSalesByDay(businessId, safePeriod, currentEnd),
      this.getTopProducts(businessId, currentStart, currentEnd),
      this.getOrdersByStatus(currentOrders),
    ]);

    return {
      summary: {
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageOrder: Number(averageOrder.toFixed(2)),
        pendingOrders,
        ordersGrowth: percentageChange(totalOrders, previousOrders.length),
      },
      salesByDay,
      topProducts,
      ordersByStatus,
      period: {
        days: safePeriod,
        startDate: currentStart.toISOString(),
        endDate: currentEnd.toISOString(),
      },
    };
  }

  private async getSalesByDay(
    businessId: number,
    days: number,
    currentEnd: Date,
  ) {
    const result: Array<{ date: string; revenue: number; orders: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(new Date(currentEnd));
      date.setDate(date.getDate() - i);
      const nextDay = endOfDay(date);

      const orders = await this.orderRepo.find({
        where: {
          businessId,
          status: "completed",
          createdAt: Between(date, nextDay),
        },
      });

      const revenue = orders.reduce(
        (sum, order) => sum + Number.parseFloat(order.total || "0"),
        0,
      );

      result.push({
        date: date.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
        }),
        revenue: Number(revenue.toFixed(2)),
        orders: orders.length,
      });
    }

    return result;
  }

  private async getTopProducts(
    businessId: number,
    startDate: Date,
    endDate: Date,
  ) {
    const query = `
      SELECT
        od.menu_id AS id,
        COALESCE(MAX(od.item_name), MAX(m.item_name), 'Producto') AS name,
        MAX(m.category) AS category,
        MAX(m.image_url) AS image,
        SUM(od.quantity) AS quantity,
        SUM(od.subtotal) AS revenue
      FROM order_details od
      INNER JOIN orders o ON od.order_id = o.order_id
      LEFT JOIN menus m ON od.menu_id = m.menu_id
      WHERE o.business_id = ?
        AND o.status = 'completed'
        AND o.created_at BETWEEN ? AND ?
      GROUP BY od.menu_id
      ORDER BY quantity DESC, revenue DESC
      LIMIT 8
    `;

    const rows = await AppDataSource.query(query, [
      businessId,
      startDate,
      endDate,
    ]);

    return rows.map((product: any) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      image: product.image,
      quantity: Number.parseInt(product.quantity || "0", 10),
      revenue: Number.parseFloat(product.revenue || "0"),
    }));
  }

  private async getOrdersByStatus(orders: Orders[]) {
    return STATUS_ORDER.map((status) => ({
      name: getStatusLabel(status),
      value: orders.filter((order) => order.status === status).length,
    })).filter((item) => item.value > 0);
  }
}
