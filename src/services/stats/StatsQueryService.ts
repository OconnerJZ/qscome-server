import { AppDataSource } from "../../utils/db";

export interface DateWindow { start: Date; end: Date; }

export class StatsQueryService {
  async summary(businessId: number, window: DateWindow) {
    const [row] = await AppDataSource.query(`
      SELECT COUNT(*) total_orders,
        SUM(o.status = 'completed') completed_orders,
        SUM(o.status = 'cancelled') cancelled_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END), 0) revenue,
        COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN o.total ELSE 0 END), 0) cancelled_value,
        COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.user_id END) unique_customers,
        COALESCE(AVG(CASE WHEN o.status = 'completed' THEN o.total END), 0) average_ticket
      FROM orders o WHERE o.business_id = ? AND o.created_at BETWEEN ? AND ?
    `, [businessId, window.start, window.end]);
    const [items] = await AppDataSource.query(`
      SELECT COALESCE(SUM(od.quantity), 0) items_sold
      FROM order_details od INNER JOIN orders o ON o.order_id = od.order_id
      WHERE o.business_id = ? AND o.status = 'completed' AND o.created_at BETWEEN ? AND ?
    `, [businessId, window.start, window.end]);
    return { ...row, items_sold: items?.items_sold || 0 };
  }

  async returningCustomers(businessId: number, window: DateWindow) {
    const [row] = await AppDataSource.query(`
      SELECT COUNT(*) returning_customers FROM (
        SELECT DISTINCT current_orders.user_id
        FROM orders current_orders
        WHERE current_orders.business_id = ? AND current_orders.status = 'completed'
          AND current_orders.user_id IS NOT NULL AND current_orders.created_at BETWEEN ? AND ?
          AND EXISTS (SELECT 1 FROM orders previous_orders WHERE previous_orders.business_id = current_orders.business_id
            AND previous_orders.user_id = current_orders.user_id AND previous_orders.status = 'completed'
            AND previous_orders.created_at < ?)
      ) returning
    `, [businessId, window.start, window.end, window.start]);
    return Number(row?.returning_customers || 0);
  }

  salesTrend(businessId: number, window: DateWindow) {
    return AppDataSource.query(`
      SELECT DATE_FORMAT(o.created_at, '%Y-%m-%d') date,
        COUNT(*) orders, ROUND(SUM(o.total), 2) revenue, ROUND(AVG(o.total), 2) average_ticket
      FROM orders o WHERE o.business_id = ? AND o.status = 'completed' AND o.created_at BETWEEN ? AND ?
      GROUP BY DATE(o.created_at) ORDER BY DATE(o.created_at)
    `, [businessId, window.start, window.end]);
  }

  productPerformance(businessId: number, window: DateWindow) {
    return AppDataSource.query(`
      SELECT COALESCE(od.menu_id, 0) id, COALESCE(MAX(od.item_name), MAX(m.item_name), 'Producto') name,
        COALESCE(MAX(m.category), 'Sin categoría') category, MAX(m.image_url) image,
        SUM(od.quantity) quantity, COUNT(DISTINCT od.order_id) order_count,
        ROUND(SUM(od.subtotal), 2) revenue, ROUND(AVG(od.unit_price), 2) average_unit_price
      FROM order_details od INNER JOIN orders o ON o.order_id = od.order_id LEFT JOIN menus m ON m.menu_id = od.menu_id
      WHERE o.business_id = ? AND o.status = 'completed' AND o.created_at BETWEEN ? AND ?
      GROUP BY od.menu_id, od.item_name ORDER BY revenue DESC, quantity DESC LIMIT 20
    `, [businessId, window.start, window.end]);
  }

  slowMovers(businessId: number, window: DateWindow) {
    return AppDataSource.query(`
      SELECT m.menu_id id, m.item_name name, COALESCE(m.category, 'Sin categoría') category, m.image_url image,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN od.quantity ELSE 0 END), 0) quantity,
        COALESCE(ROUND(SUM(CASE WHEN o.status = 'completed' THEN od.subtotal ELSE 0 END), 2), 0) revenue
      FROM menus m LEFT JOIN order_details od ON od.menu_id = m.menu_id AND od.created_at BETWEEN ? AND ?
      LEFT JOIN orders o ON o.order_id = od.order_id AND o.business_id = ?
      WHERE m.business_id = ? AND m.is_archived = 0
      GROUP BY m.menu_id, m.item_name, m.category, m.image_url ORDER BY quantity ASC, revenue ASC, m.item_name ASC LIMIT 8
    `, [window.start, window.end, businessId, businessId]);
  }

  categoryPerformance(businessId: number, window: DateWindow) {
    return AppDataSource.query(`
      SELECT COALESCE(m.category, 'Sin categoría') category, SUM(od.quantity) quantity,
        COUNT(DISTINCT od.order_id) order_count, ROUND(SUM(od.subtotal), 2) revenue
      FROM order_details od INNER JOIN orders o ON o.order_id = od.order_id LEFT JOIN menus m ON m.menu_id = od.menu_id
      WHERE o.business_id = ? AND o.status = 'completed' AND o.created_at BETWEEN ? AND ?
      GROUP BY COALESCE(m.category, 'Sin categoría') ORDER BY revenue DESC
    `, [businessId, window.start, window.end]);
  }

  paymentMix(businessId: number, window: DateWindow) {
    return AppDataSource.query(`SELECT o.payment_method method, COUNT(*) orders, ROUND(SUM(o.total), 2) revenue
      FROM orders o WHERE o.business_id = ? AND o.status = 'completed' AND o.created_at BETWEEN ? AND ?
      GROUP BY o.payment_method ORDER BY revenue DESC`, [businessId, window.start, window.end]);
  }

  orderTypeMix(businessId: number, window: DateWindow) {
    return AppDataSource.query(`SELECT o.order_type type, COUNT(*) orders, ROUND(SUM(o.total), 2) revenue
      FROM orders o WHERE o.business_id = ? AND o.status = 'completed' AND o.created_at BETWEEN ? AND ?
      GROUP BY o.order_type ORDER BY orders DESC`, [businessId, window.start, window.end]);
  }

  peakHours(businessId: number, window: DateWindow) {
    return AppDataSource.query(`SELECT HOUR(o.created_at) hour, COUNT(*) orders, ROUND(SUM(o.total), 2) revenue
      FROM orders o WHERE o.business_id = ? AND o.status = 'completed' AND o.created_at BETWEEN ? AND ?
      GROUP BY HOUR(o.created_at) ORDER BY hour`, [businessId, window.start, window.end]);
  }

  statusDistribution(businessId: number, window: DateWindow) {
    return AppDataSource.query(`SELECT o.status, COUNT(*) value FROM orders o
      WHERE o.business_id = ? AND o.created_at BETWEEN ? AND ? GROUP BY o.status`, [businessId, window.start, window.end]);
  }

  async operationalTimes(businessId: number, window: DateWindow) {
    const [row] = await AppDataSource.query(`
      SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, timed.created_at, timed.accepted_at)), 1) acceptance_minutes,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, timed.created_at, timed.completed_at)), 1) fulfillment_minutes
      FROM (
        SELECT o.order_id, o.created_at,
          MIN(CASE WHEN h.status = 'accepted' THEN h.created_at END) accepted_at,
          MIN(CASE WHEN h.status = 'completed' THEN h.created_at END) completed_at
        FROM orders o LEFT JOIN order_status_history h ON h.order_id = o.order_id
        WHERE o.business_id = ? AND o.created_at BETWEEN ? AND ?
        GROUP BY o.order_id, o.created_at
      ) timed
    `, [businessId, window.start, window.end]);
    return row || {};
  }
}
