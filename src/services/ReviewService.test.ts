import assert from "node:assert/strict";
import test from "node:test";
import { ReviewComments } from "../entities/ReviewComments";
import { ReviewReader } from "../repositories/ReviewRepository";
import { formatPublicReview, ReviewService } from "./ReviewService";

const review = {
  commentId: 12,
  userId: 8,
  businessId: 4,
  commentText: "Excelente atención",
  commentDate: new Date("2026-09-03T12:00:00.000Z"),
  user: { userName: "Bryant", avatarUrl: "avatars/8.png" },
  reviewDetails: [{ pros: "Servicio", cons: null }],
} as ReviewComments;

test("expone únicamente el contrato público de una reseña", () => {
  assert.deepEqual(formatPublicReview(review), {
    id: 12,
    userName: "Bryant",
    avatar: "avatars/8.png",
    comment: "Excelente atención",
    createdAt: new Date("2026-09-03T12:00:00.000Z"),
    rating: 0,
    verifiedOrder: false,
    categoryRatings: {
      food: null,
      time: null,
      presentation: null,
      accuracy: null,
    },
    ownerResponse: null,
    details: [{ pros: "Servicio", cons: "" }],
  });
});

test("marca una reseña como verificada sin exponer el id interno de la orden", () => {
  const verified = {
    ...review,
    orderId: 77,
    rating: 5,
    foodRating: 5,
    timeRating: 4,
    presentationRating: 5,
    accuracyRating: 5,
  } as ReviewComments;

  const formatted = formatPublicReview(verified);
  assert.equal(formatted.verifiedOrder, true);
  assert.equal("orderId" in formatted, false);
  assert.equal("userId" in formatted, false);
  assert.equal("businessId" in formatted, false);
  assert.equal(formatted.rating, 5);
  assert.deepEqual(formatted.categoryRatings, {
    food: 5,
    time: 4,
    presentation: 5,
    accuracy: 5,
  });
});

test("consulta las reseñas del negocio mediante el repositorio", async () => {
  const reader: ReviewReader = {
    findByBusiness: async (businessId) => {
      assert.equal(businessId, 4);
      return [review];
    },
  };
  const result = await new ReviewService(reader).listByBusiness(4);
  assert.equal(result[0].comment, "Excelente atención");
});

test("rechaza identificadores de negocio inválidos", async () => {
  const reader: ReviewReader = { findByBusiness: async () => [] };
  await assert.rejects(
    () => new ReviewService(reader).listByBusiness(Number.NaN),
    /negocio indicado no es válido/,
  );
});
