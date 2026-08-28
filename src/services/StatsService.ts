import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { getStatusLabel } from "../serializers/order.serializer";
import { HttpError } from "../utils/httpError";
import { StatsQueryService } from "./stats/StatsQueryService";
import { createStatsPeriod, percentage, percentageChange } from "./stats/statsPeriod";

const number = (value: unknown) => Number(value || 0);
const money = (value: unknown) => Number(number(value).toFixed(2));

export class StatsService {
  private readonly queries = new StatsQueryService();

  async getBusinessStats(businessId: number, requestedPeriod = 7) {
    if (!Number.isInteger(businessId) || businessId < 1) throw new HttpError(400, "Negocio inválido");
    const period = createStatsPeriod(requestedPeriod);
    const currentWindow = { start: period.currentStart, end: period.currentEnd };
    const previousWindow = { start: period.previousStart, end: period.previousEnd };
    const [current, previous, returningCustomers, trendRows, products, slowMovers, categories, paymentMix, orderTypeMix, peakHours, statusRows, operational, pendingOrders] = await Promise.all([
      this.queries.summary(businessId, currentWindow), this.queries.summary(businessId, previousWindow),
      this.queries.returningCustomers(businessId, currentWindow), this.queries.salesTrend(businessId, currentWindow),
      this.queries.productPerformance(businessId, currentWindow), this.queries.slowMovers(businessId, currentWindow),
      this.queries.categoryPerformance(businessId, currentWindow), this.queries.paymentMix(businessId, currentWindow),
      this.queries.orderTypeMix(businessId, currentWindow), this.queries.peakHours(businessId, currentWindow),
      this.queries.statusDistribution(businessId, currentWindow), this.queries.operationalTimes(businessId, currentWindow),
      AppDataSource.getRepository(Orders).count({ where: { businessId, status: "pending" } }),
    ]);
    const totalOrders = number(current.total_orders), completedOrders = number(current.completed_orders), cancelledOrders = number(current.cancelled_orders);
    const previousTotal = number(previous.total_orders), totalRevenue = money(current.revenue), previousRevenue = money(previous.revenue);
    const averageTicket = money(current.average_ticket), previousAverageTicket = money(previous.average_ticket);
    const itemsSold = number(current.items_sold), previousItemsSold = number(previous.items_sold);
    const uniqueCustomers = number(current.unique_customers);
    return {
      summary: {
        totalRevenue, revenueGrowth: percentageChange(totalRevenue, previousRevenue),
        totalOrders, ordersGrowth: percentageChange(totalOrders, previousTotal), completedOrders,
        averageTicket, averageTicketGrowth: percentageChange(averageTicket, previousAverageTicket),
        itemsSold, itemsGrowth: percentageChange(itemsSold, previousItemsSold), pendingOrders,
        cancellationRate: percentage(cancelledOrders, totalOrders), previousCancellationRate: percentage(number(previous.cancelled_orders), previousTotal),
        completionRate: percentage(completedOrders, totalOrders), potentialCancelledRevenue: money(current.cancelled_value),
        uniqueCustomers, customerGrowth: percentageChange(uniqueCustomers, number(previous.unique_customers)),
        repeatCustomerRate: percentage(returningCustomers, uniqueCustomers), returningCustomers,
      },
      salesByDay: this.fillDailyTrend(period.currentStart, period.days, trendRows),
      productPerformance: products.map((row: any) => ({ id: row.id, name: row.name, category: row.category, image: row.image, quantity: number(row.quantity), orderCount: number(row.order_count), revenue: money(row.revenue), revenueShare: percentage(number(row.revenue), totalRevenue), averageUnitPrice: money(row.average_unit_price) })),
      slowMovers: slowMovers.map((row: any) => ({ id: row.id, name: row.name, category: row.category, image: row.image, quantity: number(row.quantity), revenue: money(row.revenue) })),
      categoryPerformance: categories.map((row: any) => ({ category: row.category, quantity: number(row.quantity), orderCount: number(row.order_count), revenue: money(row.revenue), revenueShare: percentage(number(row.revenue), totalRevenue) })),
      paymentMix: paymentMix.map((row: any) => ({ method: row.method, orders: number(row.orders), revenue: money(row.revenue), share: percentage(number(row.revenue), totalRevenue) })),
      orderTypeMix: orderTypeMix.map((row: any) => ({ type: row.type, orders: number(row.orders), revenue: money(row.revenue), share: percentage(number(row.orders), completedOrders) })),
      peakHours: peakHours.map((row: any) => ({ hour: number(row.hour), label: `${String(number(row.hour)).padStart(2, "0")}:00`, orders: number(row.orders), revenue: money(row.revenue) })),
      ordersByStatus: statusRows.map((row: any) => ({ status: row.status, name: getStatusLabel(row.status), value: number(row.value), share: percentage(number(row.value), totalOrders) })),
      operations: { averageAcceptanceMinutes: number(operational.acceptance_minutes), averageFulfillmentMinutes: number(operational.fulfillment_minutes) },
      period: { days: period.days, startDate: period.currentStart.toISOString(), endDate: period.currentEnd.toISOString(), comparisonStartDate: period.previousStart.toISOString(), comparisonEndDate: period.previousEnd.toISOString() },
      accountingNote: "Los importes representan ventas brutas de órdenes completadas; no son utilidad y no descuentan costos, comisiones ni impuestos.",
    };
  }

  private fillDailyTrend(start: Date, days: number, rows: any[]) {
    const byDate = new Map(rows.map((row) => [String(row.date), row]));
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(start); date.setDate(date.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const row: any = byDate.get(key);
      return { date: key, label: date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }), revenue: money(row?.revenue), orders: number(row?.orders), averageTicket: money(row?.average_ticket) };
    });
  }
}
