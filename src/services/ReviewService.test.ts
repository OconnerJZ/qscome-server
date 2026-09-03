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

test("expone únicamente los campos públicos de una reseña", () => {
  assert.deepEqual(formatPublicReview(review), {
    id: 12,
    userName: "Bryant",
    avatar: "avatars/8.png",
    comment: "Excelente atención",
    createdAt: new Date("2026-09-03T12:00:00.000Z"),
    rating: 0,
    details: [{ pros: "Servicio", cons: "" }],
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
