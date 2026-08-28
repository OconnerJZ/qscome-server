import { AppDataSource } from "../utils/db";
import { BusinessOwners } from "../entities/BusinessOwners";

export const BUSINESS_ROLES = [
  "primary_owner",
  "co_owner",
  "manager",
  "kitchen",
  "cashier",
] as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[number];
export type LegacyBusinessRole = "owner" | "staff";
export type BusinessPermission =
  | "orders.read"
  | "orders.accept"
  | "kitchen.read"
  | "kitchen.update"
  | "payments.review"
  | "reports.read"
  | "settings.update"
  | "menu.manage"
  | "team.manage"
  | "ownership.transfer";

const ALL_PERMISSIONS: BusinessPermission[] = [
  "orders.read", "orders.accept", "kitchen.read", "kitchen.update",
  "payments.review", "reports.read", "settings.update", "menu.manage",
  "team.manage", "ownership.transfer",
];

export const ROLE_PERMISSIONS: Record<BusinessRole, BusinessPermission[]> = {
  primary_owner: ALL_PERMISSIONS,
  co_owner: ALL_PERMISSIONS.filter((permission) => !["team.manage", "ownership.transfer"].includes(permission)),
  manager: ["orders.read", "orders.accept", "kitchen.read", "kitchen.update", "payments.review", "reports.read", "menu.manage"],
  kitchen: ["orders.read", "kitchen.read", "kitchen.update"],
  cashier: ["orders.read", "orders.accept", "payments.review"],
};

export const normalizeBusinessRole = (role?: string | null): BusinessRole => {
  if (role === "owner") return "primary_owner";
  if (role === "staff") return "kitchen";
  return BUSINESS_ROLES.includes(role as BusinessRole) ? role as BusinessRole : "kitchen";
};

export const permissionsForRole = (role?: string | null) => ROLE_PERMISSIONS[normalizeBusinessRole(role)];

export const getBusinessMembership = async (userId: number, businessId: number) => {
  const membership = await AppDataSource.getRepository(BusinessOwners).findOne({
    where: { userId, businessId },
  });
  if (!membership) return null;
  const role = normalizeBusinessRole(membership.roleInBusiness);
  return { membership, role, permissions: permissionsForRole(role) };
};

