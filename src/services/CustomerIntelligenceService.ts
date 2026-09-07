import { AppDataSource } from "../utils/db";
import { HttpError } from "../utils/httpError";
import { BusinessPlanService } from "./BusinessPlanService";
import { createStatsPeriod, percentage } from "./stats/statsPeriod";

const numeric = (value: unknown) => Number(value || 0);
const money = (value: unknown) => Number(numeric(value).toFixed(2));

interface CohortRow {
  cohort: "new" | "returning";
  customers: unknown;
  orders: unknown;
  revenue: unknown;
  average_ticket: unknown;
}

export class CustomerIntelligenceService {
  private readonly plans = new BusinessPlanService();

  async get(businessId: number, requestedPeriod = 30) {
    if (!Number.isInteger(businessId) || businessId < 1) throw new HttpError(400, "Negocio inválido");
    if (!Number.isInteger(requestedPeriod) || requestedPeriod < 1) throw new HttpError(400, "Periodo inválido");

    const capabilities = await this.plans.resolveCapabilities(businessId);
    const feature = capabilities.features.find((item) => item.key === "customer.intelligence");
    if (!feature?.included || feature.status !== "available") {
      throw new HttpError(403, "Customer Intelligence requiere Nivel 2 o superior");
    }

    const historyLimit = capabilities.limits.analyticsHistoryDays;
    if (historyLimit !== null && requestedPeriod > historyLimit) {
      throw new HttpError(409, `Tu plan permite consultar hasta ${historyLimit} días de historial analítico`);
    }

    const period = createStatsPeriod(requestedPeriod);
    const observationStart = new Date(period.currentEnd);
    observationStart.setDate(observationStart.getDate() - Number(historyLimit || requestedPeriod));

    const [cohortRows, lifecycleRows, inactivityRows, sharedRows] = await Promise.all([
      this.cohorts(businessId, observationStart, period.currentStart, period.currentEnd),
      this.lifecycle(businessId, observationStart, period.currentEnd),
      this.inactivity(businessId, observationStart, period.currentEnd),
      this.sharedOrders(businessId, period.currentStart, period.currentEnd),
    ]);

    const cohorts = this.normalizeCohorts(cohortRows);
    const currentCustomers = cohorts.new.customers + cohorts.returning.customers;
    const currentOrders = cohorts.new.orders + cohorts.returning.orders;
    const currentRevenue = money(cohorts.new.revenue + cohorts.returning.revenue);
    const lifecycle = this.normalizeLifecycle(lifecycleRows);
    const inactivity = this.normalizeInactivity(inactivityRows);
    const shared = this.normalizeShared(sharedRows?.[0] || {});
    const sufficientData = currentCustomers >= 5 && currentOrders >= 5;

    return {
      period: {
        days: period.days,
        startDate: period.currentStart.toISOString(),
        endDate: period.currentEnd.toISOString(),
        observationStartDate: observationStart.toISOString(),
        analyticsHistoryDays: historyLimit,
      },
      summary: {
        customers: currentCustomers,
        newCustomers: cohorts.new.customers,
        returningCustomers: cohorts.returning.customers,
        newCustomerShare: percentage(cohorts.new.customers, currentCustomers),
        returningCustomerShare: percentage(cohorts.returning.customers, currentCustomers),
        orders: currentOrders,
        revenue: currentRevenue,
        ordersPerCustomer: currentCustomers ? Number((currentOrders / currentCustomers).toFixed(2)) : 0,
        observedRepeatRate: lifecycle.totalCustomers ? percentage(lifecycle.repeatCustomers, lifecycle.totalCustomers) : 0,
      },
      cohorts: {
        new: cohorts.new,
        returning: cohorts.returning,
        ticketDifferencePercent: this.percentDifference(cohorts.returning.averageTicket, cohorts.new.averageTicket),
      },
      lifecycle,
      inactivity,
      sharedOrders: shared,
      sufficientData,
      signals: sufficientData ? this.buildSignals({ cohorts, lifecycle, inactivity, shared }) : [],
      privacyNote: "Customer Intelligence muestra métricas agregadas. Esta respuesta no expone nombres, correos, teléfonos ni IDs de clientes.",
    };
  }

  private cohorts(businessId: number, observationStart: Date, start: Date, end: Date): Promise<CohortRow[]> {
    return AppDataSource.query(`
      SELECT classified.cohort,
             COUNT(DISTINCT classified.user_id) customers,
             COUNT(*) orders,
             ROUND(SUM(classified.total), 2) revenue,
             ROUND(AVG(classified.total), 2) average_ticket
      FROM (
        SELECT o.user_id, o.total,
          CASE WHEN first_purchase.first_completed_at >= ? THEN 'new' ELSE 'returning' END cohort
        FROM orders o
        INNER JOIN (
          SELECT user_id, MIN(created_at) first_completed_at
          FROM orders
          WHERE business_id = ? AND status = 'completed' AND user_id IS NOT NULL
            AND created_at BETWEEN ? AND ?
          GROUP BY user_id
        ) first_purchase ON first_purchase.user_id = o.user_id
        WHERE o.business_id = ?
          AND o.status = 'completed'
          AND o.user_id IS NOT NULL
          AND o.created_at BETWEEN ? AND ?
      ) classified
      GROUP BY classified.cohort
    `, [start, businessId, observationStart, end, businessId, start, end]);
  }

  private lifecycle(businessId: number, start: Date, end: Date) {
    return AppDataSource.query(`
      SELECT
        SUM(observed_orders = 1) one_order,
        SUM(observed_orders BETWEEN 2 AND 3) two_to_three,
        SUM(observed_orders BETWEEN 4 AND 7) four_to_seven,
        SUM(observed_orders >= 8) eight_plus,
        SUM(observed_orders >= 2) repeat_customers,
        COUNT(*) total_customers
      FROM (
        SELECT o.user_id, COUNT(*) observed_orders
        FROM orders o
        WHERE o.business_id = ? AND o.status = 'completed' AND o.user_id IS NOT NULL
          AND o.created_at BETWEEN ? AND ?
        GROUP BY o.user_id
      ) observed
    `, [businessId, start, end]);
  }

  private inactivity(businessId: number, start: Date, end: Date) {
    return AppDataSource.query(`
      SELECT
        SUM(days_since_last <= 30) active_30,
        SUM(days_since_last BETWEEN 31 AND 60) cooling_31_60,
        SUM(days_since_last BETWEEN 61 AND 90) at_risk_61_90,
        SUM(days_since_last > 90) inactive_90_plus,
        COUNT(*) observed_customers
      FROM (
        SELECT o.user_id, DATEDIFF(?, MAX(o.created_at)) days_since_last
        FROM orders o
        WHERE o.business_id = ? AND o.status = 'completed' AND o.user_id IS NOT NULL
          AND o.created_at BETWEEN ? AND ?
        GROUP BY o.user_id
      ) activity
    `, [end, businessId, start, end]);
  }

  private sharedOrders(businessId: number, start: Date, end: Date) {
    return AppDataSource.query(`
      SELECT
        COUNT(*) completed_orders,
        SUM(o.shared_session_id IS NOT NULL) shared_orders,
        COALESCE(ROUND(SUM(CASE WHEN o.shared_session_id IS NOT NULL THEN o.total ELSE 0 END), 2), 0) shared_revenue,
        COALESCE(ROUND(AVG(CASE WHEN o.shared_session_id IS NOT NULL THEN o.total END), 2), 0) shared_average_ticket,
        COALESCE(ROUND(AVG(CASE WHEN o.shared_session_id IS NULL THEN o.total END), 2), 0) individual_average_ticket,
        COALESCE((
          SELECT ROUND(AVG(participant_count), 2)
          FROM (
            SELECT sp.session_id, COUNT(DISTINCT sp.user_id) participant_count
            FROM shared_order_participants sp
            INNER JOIN orders so ON so.shared_session_id = sp.session_id
            WHERE so.business_id = ? AND so.status = 'completed'
              AND so.created_at BETWEEN ? AND ?
            GROUP BY sp.session_id
          ) participant_counts
        ), 0) average_participants
      FROM orders o
      WHERE o.business_id = ? AND o.status = 'completed' AND o.created_at BETWEEN ? AND ?
    `, [businessId, start, end, businessId, start, end]);
  }

  private normalizeCohorts(rows: CohortRow[]) {
    const empty = { customers: 0, orders: 0, revenue: 0, averageTicket: 0 };
    const result = { new: { ...empty }, returning: { ...empty } };
    for (const row of rows) {
      if (row.cohort !== "new" && row.cohort !== "returning") continue;
      result[row.cohort] = {
        customers: numeric(row.customers),
        orders: numeric(row.orders),
        revenue: money(row.revenue),
        averageTicket: money(row.average_ticket),
      };
    }
    return result;
  }

  private normalizeLifecycle(rows: any[]) {
    const row = rows?.[0] || {};
    return {
      oneOrder: numeric(row.one_order),
      twoToThree: numeric(row.two_to_three),
      fourToSeven: numeric(row.four_to_seven),
      eightPlus: numeric(row.eight_plus),
      repeatCustomers: numeric(row.repeat_customers),
      totalCustomers: numeric(row.total_customers),
      note: "Frecuencia observada dentro del historial disponible para el plan; no representa necesariamente toda la vida del cliente.",
    };
  }

  private normalizeInactivity(rows: any[]) {
    const row = rows?.[0] || {};
    const total = numeric(row.observed_customers);
    const inactive = numeric(row.inactive_90_plus);
    return {
      active30Days: numeric(row.active_30),
      cooling31To60Days: numeric(row.cooling_31_60),
      atRisk61To90Days: numeric(row.at_risk_61_90),
      inactive90PlusDays: inactive,
      observedCustomers: total,
      inactiveShare: percentage(inactive, total),
    };
  }

  private normalizeShared(row: any) {
    const total = numeric(row.completed_orders);
    const sharedOrders = numeric(row.shared_orders);
    const sharedAverageTicket = money(row.shared_average_ticket);
    const individualAverageTicket = money(row.individual_average_ticket);
    return {
      completedOrders: total,
      sharedOrders,
      orderShare: percentage(sharedOrders, total),
      revenue: money(row.shared_revenue),
      averageTicket: sharedAverageTicket,
      individualAverageTicket,
      ticketLiftPercent: this.percentDifference(sharedAverageTicket, individualAverageTicket),
      averageParticipants: numeric(row.average_participants),
    };
  }

  private buildSignals({ cohorts, lifecycle, inactivity, shared }: any) {
    const signals: Array<{ type: "opportunity" | "positive" | "warning"; key: string; message: string }> = [];
    if (lifecycle.totalCustomers >= 5) {
      const repeatRate = percentage(lifecycle.repeatCustomers, lifecycle.totalCustomers);
      if (repeatRate < 25) signals.push({ type: "opportunity", key: "repeat_rate", message: "La recompra observada está por debajo de 25%. Loyalty y futuras campañas pueden ayudar a convertir primeras compras en visitas recurrentes." });
      if (repeatRate >= 45) signals.push({ type: "positive", key: "repeat_rate", message: "Una parte importante de tus clientes observados compra más de una vez. Tu base recurrente es una fortaleza." });
    }
    const ticketDiff = this.percentDifference(cohorts.returning.averageTicket, cohorts.new.averageTicket);
    if (cohorts.new.customers >= 2 && cohorts.returning.customers >= 2 && ticketDiff >= 15) {
      signals.push({ type: "positive", key: "returning_ticket", message: `El ticket de clientes recurrentes es ${ticketDiff}% mayor que el de clientes nuevos en este periodo.` });
    }
    if (inactivity.observedCustomers >= 5 && inactivity.inactiveShare >= 30) {
      signals.push({ type: "warning", key: "inactivity", message: `${inactivity.inactiveShare}% de los clientes observados lleva más de 90 días sin completar una orden. Es una oportunidad de reactivación.` });
    }
    if (shared.sharedOrders >= 3 && shared.ticketLiftPercent >= 20) {
      signals.push({ type: "positive", key: "shared_orders", message: `Las órdenes compartidas tienen un ticket promedio ${shared.ticketLiftPercent}% mayor que las individuales en el periodo.` });
    }
    return signals;
  }

  private percentDifference(value: number, baseline: number) {
    if (!baseline) return value > 0 ? 100 : 0;
    return Number((((value - baseline) / baseline) * 100).toFixed(1));
  }
}
