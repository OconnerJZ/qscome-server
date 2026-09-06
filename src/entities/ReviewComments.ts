import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";
import { Business } from "./Business";
import { Orders } from "./Orders";
import { ReviewDetails } from "./ReviewDetails";
import { Votes } from "./Votes";

@Index("user_id", ["userId"], {})
@Index("business_id", ["businessId"], {})
@Index("uq_review_order", ["orderId"], { unique: true })
@Index("idx_review_business_rating", ["businessId", "rating", "commentDate"])
@Entity("review_comments", { schema: "qscome" })
export class ReviewComments {
  @PrimaryGeneratedColumn({ type: "int", name: "comment_id" })
  commentId!: number;

  @Column("int", { name: "user_id", nullable: true })
  userId!: number | null;

  @Column("int", { name: "business_id", nullable: true })
  businessId!: number | null;

  @Column("int", { name: "order_id", nullable: true })
  orderId!: number | null;

  @Column("text", { name: "comment_text", nullable: true })
  commentText!: string | null;

  @Column("tinyint", { name: "rating", nullable: true })
  rating!: number | null;

  @Column("tinyint", { name: "food_rating", nullable: true })
  foodRating!: number | null;

  @Column("tinyint", { name: "time_rating", nullable: true })
  timeRating!: number | null;

  @Column("tinyint", { name: "presentation_rating", nullable: true })
  presentationRating!: number | null;

  @Column("tinyint", { name: "accuracy_rating", nullable: true })
  accuracyRating!: number | null;

  @Column("datetime", { name: "comment_date", nullable: true, default: () => "CURRENT_TIMESTAMP" })
  commentDate!: Date | null;

  @Column("text", { name: "owner_response_text", nullable: true })
  ownerResponseText!: string | null;

  @Column("int", { name: "owner_response_by", nullable: true })
  ownerResponseBy!: number | null;

  @Column("datetime", { name: "owner_responded_at", nullable: true })
  ownerRespondedAt!: Date | null;

  @ManyToOne(() => Users, (users) => users.reviewComments, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user!: Users;

  @ManyToOne(() => Business, (business) => business.reviewComments, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business!: Business;

  @ManyToOne(() => Orders, { onDelete: "SET NULL", onUpdate: "RESTRICT" })
  @JoinColumn([{ name: "order_id", referencedColumnName: "orderId" }])
  order!: Orders | null;

  @ManyToOne(() => Users, { onDelete: "SET NULL", onUpdate: "RESTRICT" })
  @JoinColumn([{ name: "owner_response_by", referencedColumnName: "userId" }])
  ownerResponder!: Users | null;

  @OneToMany(() => ReviewDetails, (reviewDetails) => reviewDetails.comment)
  reviewDetails!: ReviewDetails[];

  @OneToMany(() => Votes, (votes) => votes.comment)
  votes!: Votes[];
}
