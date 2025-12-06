import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Users } from "./Users";
import { Business } from "./Business";
import { ReviewDetails } from "./ReviewDetails";
import { Votes } from "./Votes";

@Index("user_id", ["userId"], {})
@Index("business_id", ["businessId"], {})
@Entity("review_comments", { schema: "qscome" })
export class ReviewComments {
  @Column("int", { primary: true, name: "comment_id" })
  commentId: number;

  @Column("int", { name: "user_id", nullable: true })
  userId: number | null;

  @Column("int", { name: "business_id", nullable: true })
  businessId: number | null;

  @Column("text", { name: "comment_text", nullable: true })
  commentText: string | null;

  @Column("datetime", { name: "comment_date", nullable: true })
  commentDate: Date | null;

  @ManyToOne(() => Users, (users) => users.reviewComments, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user: Users;

  @ManyToOne(() => Business, (business) => business.reviewComments, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "business_id", referencedColumnName: "businessId" }])
  business: Business;

  @OneToMany(() => ReviewDetails, (reviewDetails) => reviewDetails.comment)
  reviewDetails: ReviewDetails[];

  @OneToMany(() => Votes, (votes) => votes.comment)
  votes: Votes[];
}
