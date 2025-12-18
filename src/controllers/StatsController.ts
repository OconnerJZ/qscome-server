import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { OrderDetails } from "../entities/OrderDetails";
import { Between, MoreThan } from "typeorm";

export class StatsController {
  private  readonly orderRepo = AppDataSource.getRepository(Orders);
  private readonly detailRepo = AppDataSource.getRepository(OrderDetails);

  // GET /api/stats/business/:businessId
  async getBusinessStats(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const { period = '7' } = req.query; // días

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - Number.parseInt(period as string));

      // Total de órdenes
      const totalOrders = await this.orderRepo.count({
        where: {
          businessId: Number.parseInt(businessId),
          createdAt: MoreThan(daysAgo)
        }
      });

      // Ingresos totales
      const orders = await this.orderRepo.find({
        where: {
          businessId: Number.parseInt(businessId),
          status: 'completed',
          createdAt: MoreThan(daysAgo)
        }
      });

      const totalRevenue = orders.reduce((sum, o) => 
        sum + Number.parseFloat(o.total || '0'), 0
      );

      // Ticket promedio
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Órdenes pendientes
      const pendingOrders = await this.orderRepo.count({
        where: {
          businessId: Number.parseInt(businessId),
          status: 'pending'
        }
      });

      // Ventas por día
      const salesByDay = await this.getSalesByDay(businessId, Number.parseInt(period as string));

      // Productos más vendidos
      const topProducts = await this.getTopProducts(businessId, Number.parseInt(period as string));

      // Estados de órdenes
      const ordersByStatus = await this.getOrdersByStatus(businessId);

      return res.json({
        success: true,
        data: {
          summary: {
            totalOrders,
            totalRevenue,
            avgOrderValue,
            pendingOrders
          },
          salesByDay,
          topProducts,
          ordersByStatus
        }
      });
    } catch (error: any) {
      console.error('Error getting business stats:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  private async getSalesByDay(businessId: string, days: number) {
    const result: any[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const orders = await this.orderRepo.find({
        where: {
          businessId: Number.parseInt(businessId),
          status: 'completed',
          createdAt: Between(date, nextDay)
        }
      });

      const ventas = orders.reduce((sum, o) => 
        sum + Number.parseFloat(o.total || '0'), 0
      );

      result.push({
        day: date.toLocaleDateString('es-MX', { weekday: 'short' }),
        ventas,
        ordenes: orders.length
      });
    }

    return result;
  }

  private async getTopProducts(businessId: string, days: number) {
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

    const topProducts = await AppDataSource.query(query, [
      Number.parseInt(businessId),
      daysAgo
    ]);

    return topProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number.parseFloat(p.price),
      image: p.image,
      sold: Number.parseInt(p.sold)
    }));
  }

  private async getOrdersByStatus(businessId: string) {
    const statuses = ['pending', 'accepted', 'preparing', 'ready', 'in_delivery', 'completed'];
    const result = [];

    for (const status of statuses) {
      const count = await this.orderRepo.count({
        where: {
          businessId: Number.parseInt(businessId),
          status: status as any
        }
      });

      if (count > 0) {
        result.push({
          name: this.getStatusLabel(status),
          value: count
        });
      }
    }

    return result;
  }

  private getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'Pendiente',
      'accepted': 'Aceptada',
      'preparing': 'Preparando',
      'ready': 'Lista',
      'in_delivery': 'En Camino',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return labels[status] || status;
  }
}