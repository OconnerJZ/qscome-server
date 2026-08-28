import { AppDataSource } from "../utils/db";
import { BusinessOwners } from "../entities/BusinessOwners";
import { BusinessRole, normalizeBusinessRole, permissionsForRole } from "../security/businessRoles";
import { HttpError } from "../utils/httpError";
import { BusinessAccessAuditService } from "./BusinessAccessAuditService";

export const MEMBER_ROLES: BusinessRole[] = ["co_owner", "manager", "kitchen", "cashier"];

export class BusinessMembershipService {
  private readonly repository = AppDataSource.getRepository(BusinessOwners);
  private readonly audit = new BusinessAccessAuditService();

  async list(businessId: number) {
    const memberships = await this.repository.find({
      where: { businessId },
      relations: ["user"],
      order: { createdAt: "ASC" },
    });
    return memberships.map((membership) => ({
      id: membership.ownerId,
      userId: membership.userId,
      name: membership.user?.userName,
      email: membership.user?.email,
      avatar: membership.user?.avatarUrl,
      role: normalizeBusinessRole(membership.roleInBusiness),
      permissions: permissionsForRole(membership.roleInBusiness),
      joinedAt: membership.createdAt,
    }));
  }

  async updateRole(businessId: number, targetUserId: number, role: BusinessRole, actorUserId: number) {
    if (!MEMBER_ROLES.includes(role)) throw new HttpError(400, "Rol inválido para un colaborador");
    const membership = await this.repository.findOne({ where: { businessId, userId: targetUserId } });
    if (!membership) throw new HttpError(404, "Colaborador no encontrado");
    if (normalizeBusinessRole(membership.roleInBusiness) === "primary_owner") {
      throw new HttpError(409, "Transfiere la propiedad para cambiar al propietario principal");
    }
    const previousRole = normalizeBusinessRole(membership.roleInBusiness);
    membership.roleInBusiness = role;
    await this.repository.save(membership);
    await this.audit.record(actorUserId, "BUSINESS_MEMBER_ROLE_CHANGED", businessId, { userId: targetUserId, previousRole, role });
    return { userId: targetUserId, role, permissions: permissionsForRole(role) };
  }

  async remove(businessId: number, targetUserId: number, actorUserId: number) {
    const membership = await this.repository.findOne({ where: { businessId, userId: targetUserId } });
    if (!membership) throw new HttpError(404, "Colaborador no encontrado");
    const role = normalizeBusinessRole(membership.roleInBusiness);
    if (role === "primary_owner") throw new HttpError(409, "No puedes eliminar al propietario principal");
    await this.repository.remove(membership);
    await this.audit.record(actorUserId, "BUSINESS_MEMBER_REMOVED", businessId, { userId: targetUserId, role });
  }
}

