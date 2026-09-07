import { AppDataSource } from "../utils/db";
import { BusinessPlanService } from "./BusinessPlanService";
import { HttpError } from "../utils/httpError";

const ALLOWED_PERIODS = [30, 90, 365, 730] as const;

type ReputationPeriod = (typeof ALLOWED_PERIODS)[number];

const number = (value: unknown) => Number(value || 0);
const nullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const percentage = (part: number, total: number) => total > 0 ? round((part / total) * 100, 1) : 0;

export class ReputationInsightsService {
  private readonly plans = new BusinessPlanService();

  async get(businessId: number, requestedPeriod = 90) {
    if (!Number.isInteger(businessId) || businessId <= 0) {
      throw new HttpError(400, "El negocio indicado no es válido");
    }

    const capabilities = await this.plans.resolveCapabilities(businessId);
    const entitlement = capabilities.features.find((feature) => feature.key === "reputation.insights");
    if (!entitlement?.included || entitlement.status !== "available") {
      throw new HttpError(403, "Reputation Insights requiere Nivel 1 o superior");
    }

    const analyticsLimit = capabilities.limits.analyticsHistoryDays;
    const period = this.resolvePeriod(requestedPeriod, analyticsLimit);

    const [summaryRows, previousRows, distributionRows, trendRows, categoryCountRows] = await Promise.all([
      AppDataSource.query(
        `SELECT
          COUNT(*) AS review_count,
          ROUND(AVG(rating), 2) AS average_rating,
          SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) AS low_rating_count,
          SUM(CASE WHEN owner_response_text IS NOT NULL AND TRIM(owner_response_text) <> '' THEN 1 ELSE 0 END) AS responded_count,
          ROUND(AVG(food_rating), 2) AS food_rating,
          ROUND(AVG(time_rating), 2) AS time_rating,
          ROUND(AVG(presentation_rating), 2) AS presentation_rating,
          ROUND(AVG(accuracy_rating), 2) AS accuracy_rating
        FROM review_comments
        WHERE business_id = ?
          AND rating IS NOT NULL
          AND comment_date >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [businessId, period],
      ),
      AppDataSource.query(
        `SELECT COUNT(*) AS review_count, ROUND(AVG(rating), 2) AS average_rating
         FROM review_comments
         WHERE business_id = ?
           AND rating IS NOT NULL
           AND comment_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
           AND comment_date < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [businessId, period * 2, period],
      ),
      AppDataSource.query(
        `SELECT rating, COUNT(*) AS total
         FROM review_comments
         WHERE business_id = ?
           AND rating BETWEEN 1 AND 5
           AND comment_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY rating
         ORDER BY rating DESC`,
        [businessId, period],
      ),
      AppDataSource.query(
        `SELECT DATE_FORMAT(comment_date, '%Y-%m-%d') AS review_date,
                COUNT(*) AS review_count,
                ROUND(AVG(rating), 2) AS average_rating
         FROM review_comments
         WHERE business_id = ?
           AND rating IS NOT NULL
           AND comment_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE_FORMAT(comment_date, '%Y-%m-%d')
         ORDER BY review_date ASC`,
        [businessId, period],
      ),
      AppDataSource.query(
        `SELECT
          COUNT(food_rating) AS food_count,
          COUNT(time_rating) AS time_count,
          COUNT(presentation_rating) AS presentation_count,
          COUNT(accuracy_rating) AS accuracy_count
         FROM review_comments
         WHERE business_id = ?
           AND comment_date >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [businessId, period],
      ),
    ]);

    const current = summaryRows[0] || {};
    const previous = previousRows[0] || {};
    const categoryCounts = categoryCountRows[0] || {};
    const reviewCount = number(current.review_count);
    const respondedCount = number(current.responded_count);
    const lowRatingCount = number(current.low_rating_count);
    const averageRating = nullableNumber(current.average_rating);
    const previousAverageRating = nullableNumber(previous.average_rating);
    const ratingDelta = averageRating !== null && previousAverageRating !== null
      ? round(averageRating - previousAverageRating)
      : null;

    const categoryRatings = [
      { key: "food", label: "Comida", average: nullableNumber(current.food_rating), count: number(categoryCounts.food_count) },
      { key: "time", label: "Tiempo", average: nullableNumber(current.time_rating), count: number(categoryCounts.time_count) },
      { key: "presentation", label: "Presentación", average: nullableNumber(current.presentation_rating), count: number(categoryCounts.presentation_count) },
      { key: "accuracy", label: "Exactitud", average: nullableNumber(current.accuracy_rating), count: number(categoryCounts.accuracy_count) },
    ];

    const usableCategories = categoryRatings.filter((category) => category.average !== null && category.count >= 3);
    const weakestCategory = usableCategories.length
      ? [...usableCategories].sort((a, b) => Number(a.average) - Number(b.average))[0]
      : null;

    const distribution = [5, 4, 3, 2, 1].map((rating) => {
      const row = distributionRows.find((item: any) => Number(item.rating) === rating);
      const total = number(row?.total);
      return { rating, total, percentage: percentage(total, reviewCount) };
    });

    const responseRate = percentage(respondedCount, reviewCount);
    const lowRatingShare = percentage(lowRatingCount, reviewCount);
    const alerts = this.buildAlerts({
      reviewCount,
      ratingDelta,
      responseRate,
      unansweredCount: Math.max(0, reviewCount - respondedCount),
      lowRatingShare,
      lowRatingCount,
      weakestCategory,
    });

    return {
      businessId,
      plan: { code: capabilities.plan.code, name: capabilities.plan.name },
      period: {
        days: period,
        allowedDays: analyticsLimit,
        availablePeriods: ALLOWED_PERIODS.filter((days) => analyticsLimit === null || days <= analyticsLimit),
      },
      sample: {
        reviewCount,
        sufficientForTrends: reviewCount >= 5,
        minimumRecommended: 5,
      },
      overview: {
        averageRating,
        previousAverageRating,
        ratingDelta,
        responseRate,
        respondedCount,
        unansweredCount: Math.max(0, reviewCount - respondedCount),
        lowRatingCount,
        lowRatingShare,
      },
      distribution,
      categoryRatings,
      weakestCategory,
      trend: trendRows.map((row: any) => ({
        date: String(row.review_date),
        reviewCount: number(row.review_count),
        averageRating: nullableNumber(row.average_rating),
      })),
      alerts,
      message: reviewCount < 5
        ? "Aún hay pocas reseñas para detectar tendencias con confianza. Las métricas descriptivas siguen disponibles."
        : null,
    };
  }

  private resolvePeriod(requested: number, analyticsLimit: number | null) {
    const parsed = Number(requested);
    if (!ALLOWED_PERIODS.includes(parsed as ReputationPeriod)) {
      throw new HttpError(400, "Periodo de reputación inválido");
    }
    if (analyticsLimit !== null && parsed > analyticsLimit) {
      throw new HttpError(403, `Tu plan permite analizar hasta ${analyticsLimit} días de historial`);
    }
    return parsed as ReputationPeriod;
  }

  private buildAlerts(input: {
    reviewCount: number;
    ratingDelta: number | null;
    responseRate: number;
    unansweredCount: number;
    lowRatingShare: number;
    lowRatingCount: number;
    weakestCategory: { key: string; label: string; average: number | null; count: number } | null;
  }) {
    if (input.reviewCount < 5) return [];

    const alerts: Array<{ type: "warning" | "opportunity" | "positive"; key: string; title: string; detail: string }> = [];

    if (input.ratingDelta !== null && input.ratingDelta <= -0.4) {
      alerts.push({
        type: "warning",
        key: "rating_drop",
        title: "La calificación reciente bajó",
        detail: `El promedio cayó ${Math.abs(input.ratingDelta).toFixed(2)} puntos frente al periodo anterior.`,
      });
    } else if (input.ratingDelta !== null && input.ratingDelta >= 0.4) {
      alerts.push({
        type: "positive",
        key: "rating_improved",
        title: "La reputación está mejorando",
        detail: `El promedio subió ${input.ratingDelta.toFixed(2)} puntos frente al periodo anterior.`,
      });
    }

    if (input.lowRatingCount >= 2 && input.lowRatingShare >= 25) {
      alerts.push({
        type: "warning",
        key: "low_rating_share",
        title: "Hay una concentración de reseñas bajas",
        detail: `${input.lowRatingShare.toFixed(1)}% de las reseñas del periodo tienen 1 o 2 estrellas.`,
      });
    }

    if (input.unansweredCount >= 3 && input.responseRate < 70) {
      alerts.push({
        type: "opportunity",
        key: "response_rate",
        title: "Puedes mejorar la tasa de respuesta",
        detail: `Hay ${input.unansweredCount} reseñas sin responder; la tasa actual es ${input.responseRate.toFixed(1)}%.`,
      });
    }

    const weakestCategory = input.weakestCategory;
    if (weakestCategory?.average !== null && weakestCategory !== null && Number(weakestCategory.average) <= 3.5) {
      alerts.push({
        type: "opportunity",
        key: `category_${weakestCategory.key}`,
        title: `${weakestCategory.label} es la categoría más débil`,
        detail: `Promedia ${Number(weakestCategory.average).toFixed(2)} con ${weakestCategory.count} evaluaciones.`,
      });
    }

    return alerts;
  }
}
