import { AppDataSource } from "../utils/db";
import { BusinessOwners } from "../entities/BusinessOwners";
import { normalizeBusinessRole, permissionsForRole } from "./businessRoles";

export * from "./businessRoles";

export const getBusinessMembership = async (userId: number, businessId: number) => {
  const membership = await AppDataSource.getRepository(BusinessOwners).findOne({
    where: { userId, businessId },
  });
  if (!membership) return null;
  const role = normalizeBusinessRole(membership.roleInBusiness);
  return { businessId, membership, role, permissions: permissionsForRole(role) };
};
