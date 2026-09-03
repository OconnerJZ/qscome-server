import { ReviewComments } from "../entities/ReviewComments";
import {
  ReviewReader,
  ReviewRepository,
} from "../repositories/ReviewRepository";
import { HttpError } from "../utils/httpError";

export const formatPublicReview = (review: ReviewComments) => ({
  id: review.commentId,
  userName: review.user?.userName || "Cliente",
  avatar: review.user?.avatarUrl || "",
  comment: review.commentText || "",
  createdAt: review.commentDate,
  rating: 0,
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
