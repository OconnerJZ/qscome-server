import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { ReviewComments } from "./ReviewComments";
import { Users } from "./Users";

@Index("comment_id", ["commentId"], {})
@Index("user_id", ["userId"], {})
@Entity("votes", { schema: "qscome" })
export class Votes {
  @Column("int", { primary: true, name: "vote_id" })
  voteId!: number;

  @Column("int", { name: "comment_id", nullable: true })
  commentId!: number | null;

  @Column("int", { name: "user_id", nullable: true })
  userId!: number | null;

  @Column("tinyint", { name: "is_positive", nullable: true, width: 1 })
  isPositive!: boolean | null;

  @ManyToOne(() => ReviewComments, (reviewComments) => reviewComments.votes, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "comment_id", referencedColumnName: "commentId" }])
  comment!: ReviewComments;

  @ManyToOne(() => Users, (users) => users.votes, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "userId" }])
  user!: Users;
}
