import { ReviewComments } from "../entities/ReviewComments";
import {
  ReviewReader,
  ReviewRepository,
} from "../repositories/ReviewRepository";
import { HttpError } from "../utils/httpError";

const numberOrNull = (value: number | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

/**
 * Public storefront contract. Internal user/order/business ids intentionally stay
 * out of this shape; callers only need to know whether the review came from a
 * completed qsCome order.
 */
export const formatPublicReview = (review: ReviewComments) => ({
  id: review.commentId,
  userName: review.user?.userName || "Cliente",
  avatar: review.user?.avatarUrl || "",
  comment: review.commentText || "",
  createdAt: review.commentDate,
  rating: Number(review.rating || 0),
  verifiedOrder: Boolean(review.orderId),
  categoryRatings: {
    food: numberOrNull(review.foodRating),
    time: numberOrNull(review.timeRating),
    presentation: numberOrNull(review.presentationRating),
    accuracy: numberOrNull(review.accuracyRating),
  },
  ownerResponse: review.ownerResponseText
    ? {
        text: review.ownerResponseText,
        respondedAt: review.ownerRespondedAt,
        responderName: review.ownerResponder?.userName || "Negocio",
      }
    : null,
  // Legacy fields are retained while historical rows are migrated gradually.
  details: (review.reviewDetails || []).map((detail) => ({
    pros: detail.pros || "",
    cons: detail.cons || "",
  })),
});

export class ReviewService {
  constructor(private readonly reviews: ReviewReader = new ReviewRepository()) {}

  async listByBusiness(businessId: number) {
    if (!Number.isInteger(businessId) || businessId <= 0) {
      throw new HttpError(400, "El negocio indicado no es válido");
    }

    const reviews = await this.reviews.findByBusiness(businessId);
    return reviews.map(formatPublicReview);
  }
}
