import { Brackets, EntityManager } from "typeorm";
import { AppDataSource } from "../utils/db";
import { AuditLogs } from "../entities/AuditLogs";
import { UserRoles } from "../entities/UserRoles";
import { UserAccountStatus, Users } from "../entities/Users";
import { normalizeBusinessRole } from "../security/businessAccess";
import { HttpError } from "../utils/httpError";

export const normalizeAdminUserStatusInput = (
  rawStatus: string,
  rawReason?: string | null,
): { status: UserAccountStatus; reason: string | null } => {
  const status = rawStatus === "active" || rawStatus === "blocked" ? rawStatus : null;
  if (!status) throw new HttpError(400, "Estado de cuenta inválido");

  const reason = String(rawReason || "").trim();
  if (status === "blocked" && !reason) {
    throw new HttpError(400, "Indica el motivo del bloqueo");
  }

  return { status, reason: status === "blocked" ? reason : null };
};

export class AdminUserService {
  private readonly users = AppDataSource.getRepository(Users);
  private readonly roles = AppDataSource.getRepository(UserRoles);

  async search(rawQuery = "", rawLimit = 20) {
    const query = String(rawQuery || "").trim();
    const limit = Math.min(50, Math.max(1, Number(rawLimit) || 20));

    const qb = this.users
      .createQueryBuilder("user")
      .leftJoin("user.role", "role")
      .select([
        "user.user_id AS userId",
        "user.user_name AS userName",
        "user.email AS email",
        "user.phone AS phone",
        "user.auth_provider AS authProvider",
        "user.account_status AS accountStatus",
        "user.blocked_at AS blockedAt",
        "user.created_at AS createdAt",
        "role.role_id AS roleId",
        "role.role_name AS roleName",
      ])
      .addSelect(
        "(SELECT COUNT(*) FROM business_owners membership WHERE membership.user_id = user.user_id)",
        "businessCount",
      )
      .addSelect(
        "(SELECT COUNT(*) FROM orders user_order WHERE user_order.user_id = user.user_id)",
        "orderCount",
      )
      .orderBy("user.created_at", "DESC")
      .limit(limit);

    if (query) {
      const numericId = /^\d+$/.test(query) ? Number(query) : null;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where("user.user_name LIKE :query", { query: `%${query}%` })
            .orWhere("user.email LIKE :query", { query: `%${query}%` })
            .orWhere("user.phone LIKE :query", { query: `%${query}%` })
            .orWhere("role.role_name LIKE :query", { query: `%${query}%` });
          if (numericId !== null) {
            where.orWhere("user.user_id = :numericId", { numericId });
          }
        }),
      );
    }

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      id: Number(row.userId),
      name: row.userName || null,
      email: row.email || null,
      phone: row.phone || null,
      provider: row.authProvider || "local",
      accountStatus: row.accountStatus || "active",
      blockedAt: row.blockedAt || null,
      createdAt: row.createdAt || null,
      role: row.roleId
        ? { id: Number(row.roleId), name: row.roleName || "customer" }
        : { id: null, name: row.roleName || "customer" },
      businessCount: Number(row.businessCount || 0),
      orderCount: Number(row.orderCount || 0),
    }));
  }

  async get(userId: number) {
    this.assertValidUserId(userId);

    const user = await this.users.findOne({
      where: { userId },
      relations: ["role", "businessOwners", "businessOwners.business"],
    });
    if (!user) throw new HttpError(404, "Usuario no encontrado");

    const [orderRows, reviewRows, addressRows, roleCatalog] = await Promise.all([
      AppDataSource.query(
        `SELECT
          COUNT(*) totalOrders,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) ordersLast30Days,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) completedOrders,
          MAX(created_at) lastOrderAt
        FROM orders
        WHERE user_id = ?`,
        [userId],
      ),
      AppDataSource.query(
        "SELECT COUNT(*) totalReviews FROM review_comments WHERE user_id = ?",
        [userId],
      ),
      AppDataSource.query(
        "SELECT COUNT(*) totalAddresses FROM user_addresses WHERE user_id = ?",
        [userId],
      ),
      this.roles.find({ order: { roleName: "ASC" } }),
    ]);

    const orderActivity = orderRows?.[0] || {};
    const memberships = (user.businessOwners || []).map((membership) => ({
      membershipId: membership.ownerId,
      businessId: membership.businessId,
      businessName: membership.business?.businessName || `Negocio #${membership.businessId}`,
      role: normalizeBusinessRole(membership.roleInBusiness),
      joinedAt: membership.createdAt,
    }));

    return {
      user: {
        id: user.userId,
        name: user.userName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatarUrl,
        provider: user.authProvider || "local",
        role: {
          id: user.role?.roleId || user.roleId || null,
          name: user.role?.roleName || "customer",
        },
        accountStatus: user.accountStatus || "active",
        blockedAt: user.blockedAt,
        blockReason: user.blockReason,
        isSubscribed: Boolean(user.isSubscribed),
        isPaymentActive: Boolean(user.isPaymentActive),
        locale: user.locale,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      businesses: memberships,
      activity: {
        businesses: memberships.length,
        totalOrders: Number(orderActivity.totalOrders || 0),
        ordersLast30Days: Number(orderActivity.ordersLast30Days || 0),
        completedOrders: Number(orderActivity.completedOrders || 0),
        totalReviews: Number(reviewRows?.[0]?.totalReviews || 0),
        totalAddresses: Number(addressRows?.[0]?.totalAddresses || 0),
        lastOrderAt: orderActivity.lastOrderAt || null,
      },
      roleCatalog: roleCatalog.map((role) => ({ id: role.roleId, name: role.roleName })),
    };
  }

  async setStatus(
    userId: number,
    rawStatus: string,
    rawReason: string | null | undefined,
    actorUserId: number,
  ) {
    this.assertValidUserId(userId);
    this.assertValidActor(actorUserId);
    const input = normalizeAdminUserStatusInput(rawStatus, rawReason);

    if (userId === actorUserId && input.status === "blocked") {
      throw new HttpError(409, "No puedes bloquear tu propia cuenta administrativa");
    }

    await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Users);
      const user = await repo.findOne({
        where: { userId },
        relations: ["role"],
        lock: { mode: "pessimistic_write" },
      });
      if (!user) throw new HttpError(404, "Usuario no encontrado");

      const previousStatus = user.accountStatus || "active";
      const previousReason = String(user.blockReason || "").trim() || null;
      if (previousStatus === input.status && previousReason === input.reason) return;

      if (
        user.role?.roleName === "admin"
        && previousStatus === "active"
        && input.status === "blocked"
      ) {
        await this.assertAnotherActiveAdminExists(manager, userId);
      }

      const before = {
        accountStatus: previousStatus,
        blockedAt: user.blockedAt,
        blockReason: user.blockReason,
      };

      user.accountStatus = input.status;
      user.blockedAt = input.status === "blocked" ? new Date() : null;
      user.blockReason = input.reason;
      await repo.save(user);

      const auditRepo = manager.getRepository(AuditLogs);
      await auditRepo.save(auditRepo.create({
        actorUserId,
        action: input.status === "blocked" ? "USER_BLOCKED" : "USER_REACTIVATED",
        targetTable: "users",
        targetId: userId,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify({
          accountStatus: user.accountStatus,
          blockedAt: user.blockedAt,
          blockReason: user.blockReason,
        }),
      }));
    });

    return this.get(userId);
  }

  async setRole(userId: number, rawRole: string, actorUserId: number) {
    this.assertValidUserId(userId);
    this.assertValidActor(actorUserId);
    const roleName = String(rawRole || "").trim().toLowerCase();
    if (!roleName) throw new HttpError(400, "Rol global inválido");

    await AppDataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(Users);
      const roleRepo = manager.getRepository(UserRoles);
      const user = await userRepo.findOne({
        where: { userId },
        relations: ["role"],
        lock: { mode: "pessimistic_write" },
      });
      if (!user) throw new HttpError(404, "Usuario no encontrado");

      const nextRole = await roleRepo.findOne({ where: { roleName } });
      if (!nextRole) throw new HttpError(400, "Rol global inválido");

      const previousRole = user.role?.roleName || "customer";
      if (previousRole === nextRole.roleName) return;

      if (userId === actorUserId) {
        throw new HttpError(409, "No puedes cambiar tu propio rol global");
      }

      if (
        previousRole === "admin"
        && nextRole.roleName !== "admin"
        && (user.accountStatus || "active") === "active"
      ) {
        await this.assertAnotherActiveAdminExists(manager, userId);
      }

      user.roleId = nextRole.roleId;
      user.role = nextRole;
      await userRepo.save(user);

      const auditRepo = manager.getRepository(AuditLogs);
      await auditRepo.save(auditRepo.create({
        actorUserId,
        action: "USER_GLOBAL_ROLE_CHANGED",
        targetTable: "users",
        targetId: userId,
        beforeJson: JSON.stringify({ role: previousRole }),
        afterJson: JSON.stringify({ role: nextRole.roleName }),
      }));
    });

    return this.get(userId);
  }

  private assertValidUserId(userId: number) {
    if (!Number.isInteger(userId) || userId < 1) {
      throw new HttpError(400, "Usuario inválido");
    }
  }

  private assertValidActor(actorUserId: number) {
    if (!Number.isInteger(actorUserId) || actorUserId < 1) {
      throw new HttpError(401, "Administrador no autenticado");
    }
  }

  private async assertAnotherActiveAdminExists(manager: EntityManager, excludedUserId: number) {
    const activeAdmins = await manager
      .getRepository(Users)
      .createQueryBuilder("adminUser")
      .innerJoin("adminUser.role", "adminRole")
      .where("adminRole.role_name = :role", { role: "admin" })
      .andWhere("adminUser.account_status = :status", { status: "active" })
      .andWhere("adminUser.user_id <> :excludedUserId", { excludedUserId })
      .getCount();

    if (activeAdmins < 1) {
      throw new HttpError(409, "Debe permanecer al menos un administrador activo");
    }
  }
}
