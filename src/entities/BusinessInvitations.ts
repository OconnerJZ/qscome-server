import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { BusinessRole } from "../security/businessAccess";

export type BusinessInvitationType = "membership" | "ownership_transfer";
export type BusinessInvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

@Index("idx_business_invitation_business", ["businessId"])
@Index("idx_business_invitation_email", ["invitedEmail"])
@Index("idx_business_invitation_token", ["tokenHash"], { unique: true })
@Entity("business_invitations", { schema: "qscome" })
export class BusinessInvitations {
  @PrimaryGeneratedColumn({ type: "int", name: "invitation_id" })
  invitationId!: number;

  @Column("int", { name: "business_id" })
  businessId!: number;

  @Column("varchar", { name: "invited_email", length: 255 })
  invitedEmail!: string;

  @Column("enum", { name: "role_in_business", enum: ["primary_owner", "co_owner", "manager", "kitchen", "cashier"] })
  roleInBusiness!: BusinessRole;

  @Column("enum", { name: "invitation_type", enum: ["membership", "ownership_transfer"], default: () => "'membership'" })
  invitationType!: BusinessInvitationType;

  @Column("enum", { name: "status", enum: ["pending", "accepted", "cancelled", "expired"], default: () => "'pending'" })
  status!: BusinessInvitationStatus;

  @Column("char", { name: "token_hash", length: 64 })
  tokenHash!: string;

  @Column("char", { name: "code_hash", length: 64 })
  codeHash!: string;

  @Column("int", { name: "invited_by" })
  invitedBy!: number;

  @Column("int", { name: "accepted_by", nullable: true })
  acceptedBy!: number | null;

  @Column("tinyint", { name: "retain_previous_as_co_owner", width: 1, default: () => "'1'" })
  retainPreviousAsCoOwner!: boolean;

  @Column("datetime", { name: "expires_at" })
  expiresAt!: Date;

  @Column("datetime", { name: "accepted_at", nullable: true })
  acceptedAt!: Date | null;

  @Column("datetime", { name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column("datetime", { name: "updated_at", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}
