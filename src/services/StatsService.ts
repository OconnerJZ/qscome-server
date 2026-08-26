// src/services/StatsService.ts
// Cálculo de métricas de negocio. Toda la lógica (agregados + queries) vive aquí;
// el controller sólo traduce HTTP.

import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { Between, MoreThan } from "typeorm";
import { getStatusLabel } from "../serializers/order.serializer";

const STATUS_ORDER = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "in_delivery",
  "completed",
];

export class StatsService {
  private readonly orderRepo = AppDataSource.getRepository(Orders);

  async getBusinessStats(businessId: number, period = 7) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    const totalOrders = await this.orderRepo.count({
      where: { businessId, createdAt: MoreThan(daysAgo) },
    });

    const completed = await this.orderRepo.find({
      where: { businessId, status: "completed", createdAt: MoreThan(daysAgo) },
    });
    const totalRevenue = completed.reduce(
      (sum, o) => sum + Number.parseFloat(o.total || "0"),
      0,
    );

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const pendingOrders = await this.orderRepo.count({
      where: { businessId, status: "pending" },
    });

    const [salesByDay, topProducts, ordersByStatus] = await Promise.all([
      this.getSalesByDay(businessId, period),
      this.getTopProducts(businessId, period),
      this.getOrdersByStatus(businessId),
    ]);

    return {
      summary: { totalOrders, totalRevenue, avgOrderValue, pendingOrders },
      salesByDay,
      topProducts,
      ordersByStatus,
    };
  }

  private async getSalesByDay(businessId: number, days: number) {
    const result: Array<{ day: string; ventas: number; ordenes: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const orders = await this.orderRepo.find({
        where: {
          businessId,
          status: "completed",
          createdAt: Between(date, nextDay),
        },
      });

      const ventas = orders.reduce(
        (sum, o) => sum + Number.parseFloat(o.total || "0"),
        0,
      );

      result.push({
        day: date.toLocaleDateString("es-MX", { weekday: "short" }),
        ventas,
        ordenes: orders.length,
      });
    }

    return result;
  }

  private async getTopProducts(businessId: number, days: number) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const query = `
      SELECT
        m.menu_id as id,
        m.item_name as name,
        m.category,
        m.price,
        m.image_url as image,
        SUM(od.quantity) as sold
      FROM order_details od
      INNER JOIN orders o ON od.order_id = o.order_id
      INNER JOIN menus m ON od.menu_id = m.menu_id
      WHERE o.business_id = ?
        AND o.status = 'completed'
        AND o.created_at > ?
      GROUP BY m.menu_id
      ORDER BY sold DESC
      LIMIT 5
    `;

    const rows = await AppDataSource.query(query, [businessId, daysAgo]);

    return rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number.parseFloat(p.price),
      image: p.image,
      sold: Number.parseInt(p.sold, 10),
    }));
  }

  private async getOrdersByStatus(businessId: number) {
    const result: Array<{ name: string; value: number }> = [];

    for (const status of STATUS_ORDER) {
      const count = await this.orderRepo.count({
        where: { businessId, status: status as any },
      });
      if (count > 0) {
        result.push({ name: getStatusLabel(status), value: count });
      }
    }

    return result;
  }
}