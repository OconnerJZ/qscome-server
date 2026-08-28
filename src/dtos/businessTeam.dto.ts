import { IsBoolean, IsEmail, IsEnum, IsOptional, Matches } from "class-validator";

export enum InvitableBusinessRole {
  CO_OWNER = "co_owner",
  MANAGER = "manager",
  KITCHEN = "kitchen",
  CASHIER = "cashier",
}

export class InviteBusinessMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(InvitableBusinessRole)
  role!: InvitableBusinessRole;
}

export class TransferBusinessOwnershipDto {
  @IsEmail()
  email!: string;

  @IsBoolean()
  @IsOptional()
  retainPreviousAsCoOwner?: boolean;
}

export class UpdateBusinessMemberRoleDto {
  @IsEnum(InvitableBusinessRole)
  role!: InvitableBusinessRole;
}

export class AcceptBusinessInvitationCodeDto {
  @Matches(/^[A-Za-z0-9]{6,8}$/)
  code!: string;
}

