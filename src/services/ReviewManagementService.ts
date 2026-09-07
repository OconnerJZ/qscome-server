import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { ReviewComments } from "../entities/ReviewComments";
import { CreateVerifiedReviewDto } from "../dtos/review.dto";
import { HttpError } from "../utils/httpError";
import { formatPublicReview } from "./ReviewService";

export class ReviewManagementService {
  private readonly orders = AppDataSource.getRepository(Orders);
  private readonly reviews = AppDataSource.getRepository(ReviewComments);

  async createVerifiedReview(userId: number, input: CreateVerifiedReviewDto) {
    this.assertUserId(userId);
    const order = await this.orders.findOne({ where: { orderId: input.orderId } });
    if (!order) throw new HttpError(404, "Orden no encontrada");
    if (Number(order.userId) !== Number(userId)) {
      throw new HttpError(403, "Sólo quien realizó la orden puede reseñarla");
    }
    if (order.status !== "completed") {
      throw new HttpError(409, "Podrás reseñar esta experiencia cuando la orden esté completada");
    }
    if (!order.businessId) {
      throw new HttpError(409, "La orden no está asociada a un negocio válido");
    }

    const existing = await this.reviews.findOne({ where: { orderId: order.orderId } });
    if (existing) throw new HttpError(409, "Esta orden ya tiene una reseña");

    const review = this.reviews.create({
      userId,
      businessId: order.businessId,
      orderId: order.orderId,
      commentText: this.cleanOptionalText(input.comment),
      rating: input.rating,
      foodRating: input.foodRating ?? null,
      timeRating: input.timeRating ?? null,
      presentationRating: input.presentationRating ?? null,
      accuracyRating: input.accuracyRating ?? null,
      commentDate: new Date(),
      ownerResponseText: null,
      ownerResponseBy: null,
      ownerRespondedAt: null,
    });

    try {
      const saved = await this.reviews.save(review);
      return formatPublicReview(await this.loadReview(saved.commentId));
    } catch (error: any) {
      if (error?.code === "ER_DUP_ENTRY" || Number(error?.errno) === 1062) {
        throw new HttpError(409, "Esta orden ya tiene una reseña");
      }
      throw error;
    }
  }

  async getForOrder(userId: number, orderId: number) {
    this.assertUserId(userId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new HttpError(400, "La orden indicada no es válida");
    }

    const order = await this.orders.findOne({ where: { orderId } });
    if (!order) throw new HttpError(404, "Orden no encontrada");
    if (Number(order.userId) !== Number(userId)) {
      throw new HttpError(403, "No tienes acceso a la reseña de esta orden");
    }

    const review = await this.reviews.findOne({
      where: { orderId },
      relations: ["user", "reviewDetails", "ownerResponder"],
    });

    return {
      orderId,
      businessId: order.businessId,
      eligible: order.status === "completed" && Boolean(order.businessId),
      reviewed: Boolean(review),
      review: review ? formatPublicReview(review) : null,
    };
  }

  async respond(businessId: number, reviewId: number, actorUserId: number, rawResponse: string) {
    this.assertUserId(actorUserId);
    if (!Number.isInteger(businessId) || businessId <= 0 || !Number.isInteger(reviewId) || reviewId <= 0) {
      throw new HttpError(400, "La reseña indicada no es válida");
    }

    const response = String(rawResponse || "").trim();
    if (!response) throw new HttpError(400, "La respuesta no puede estar vacía");

    const review = await this.reviews.findOne({ where: { commentId: reviewId, businessId } });
    if (!review) throw new HttpError(404, "Reseña no encontrada para este negocio");

    review.ownerResponseText = response;
    review.ownerResponseBy = actorUserId;
    review.ownerRespondedAt = new Date();
    await this.reviews.save(review);

    return formatPublicReview(await this.loadReview(review.commentId));
  }

  async summary(businessId: number) {
    if (!Number.isInteger(businessId) || businessId <= 0) {
      throw new HttpError(400, "El negocio indicado no es válido");
    }

    const [row] = await AppDataSource.query(
      `SELECT
        COUNT(rating) AS reviewCount,
        ROUND(AVG(rating), 2) AS averageRating,
        ROUND(AVG(food_rating), 2) AS foodRating,
        ROUND(AVG(time_rating), 2) AS timeRating,
        ROUND(AVG(presentation_rating), 2) AS presentationRating,
        ROUND(AVG(accuracy_rating), 2) AS accuracyRating,
        SUM(CASE WHEN order_id IS NOT NULL THEN 1 ELSE 0 END) AS verifiedCount
       FROM review_comments
       WHERE business_id = ? AND rating IS NOT NULL`,
      [businessId],
    );

    return {
      businessId,
      reviewCount: Number(row?.reviewCount || 0),
      verifiedCount: Number(row?.verifiedCount || 0),
      averageRating: this.numberOrNull(row?.averageRating),
      categoryRatings: {
        food: this.numberOrNull(row?.foodRating),
        time: this.numberOrNull(row?.timeRating),
        presentation: this.numberOrNull(row?.presentationRating),
        accuracy: this.numberOrNull(row?.accuracyRating),
      },
    };
  }

  private async loadReview(commentId: number) {
    const review = await this.reviews.findOne({
      where: { commentId },
      relations: ["user", "reviewDetails", "ownerResponder"],
    });
    if (!review) throw new HttpError(404, "Reseña no encontrada");
    return review;
  }

  private assertUserId(userId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError(401, "Usuario no autenticado");
    }
  }

  private cleanOptionalText(value?: string) {
    const text = String(value || "").trim();
    return text || null;
  }

  private numberOrNull(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
