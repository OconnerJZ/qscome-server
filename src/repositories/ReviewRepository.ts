import { Repository } from "typeorm";
import { ReviewComments } from "../entities/ReviewComments";
import { AppDataSource } from "../utils/db";

export interface ReviewReader {
  findByBusiness(businessId: number): Promise<ReviewComments[]>;
}

export class ReviewRepository implements ReviewReader {
  private readonly repository: Repository<ReviewComments>;

  constructor(repository = AppDataSource.getRepository(ReviewComments)) {
    this.repository = repository;
  }

  findByBusiness(businessId: number) {
    return this.repository.find({
      where: { businessId },
      relations: ["user", "reviewDetails"],
      order: {
        commentDate: "DESC",
        commentId: "DESC",
      },
      take: 50,
    });
  }
}
