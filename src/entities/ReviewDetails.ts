import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { ReviewComments } from "./ReviewComments";

@Index("comment_id", ["commentId"], {})
@Entity("review_details", { schema: "qscome" })
export class ReviewDetails {
  @Column("int", { primary: true, name: "review_detail_id" })
  reviewDetailId!: number;

  @Column("int", { name: "comment_id", nullable: true })
  commentId!: number | null;

  @Column("text", { name: "pros", nullable: true })
  pros!: string | null;

  @Column("text", { name: "cons", nullable: true })
  cons!: string | null;

  @ManyToOne(
    () => ReviewComments,
    (reviewComments) => reviewComments.reviewDetails,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([{ name: "comment_id", referencedColumnName: "commentId" }])
  comment!: ReviewComments;
}
