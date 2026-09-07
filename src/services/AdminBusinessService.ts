import { AppDataSource } from "../utils/db";
import { AuditLogs } from "../entities/AuditLogs";
import { Business, BusinessPlatformStatus } from "../entities/Business";
import { Menus } from "../entities/Menus";
import { HttpError } from "../utils/httpError";
import { BusinessMembershipService } from "./BusinessMembershipService";
import { BusinessPlanService } from "./BusinessPlanService";

export const normalizeAdminBusinessStatusInput = (
  rawStatus: string,
  rawReason?: string | null,
): { status: BusinessPlatformStatus; reason: string | null } => {
  const status = rawStatus === "active" || rawStatus === "suspended" ? rawStatus : null;
  if (!status) throw new HttpError(400, "Estado de plataforma inválido");

  const reason = String(rawReason || "").trim();
  if (status === "suspended" && !reason) {
    throw new HttpError(400, "Indica el motivo de la suspensión");
  }

  return { status, reason: status === "suspended" ? reason : null };
};

export class AdminBusinessService {
  private readonly businessRepo = AppDataSource.getRepository(Business);
  private readonly menuRepo = AppDataSource.getRepository(Menus);
  private readonly memberships = new BusinessMembershipService();
  private readonly plans = new BusinessPlanService();

  async get(businessId: number) {
    if (!Number.isInteger(businessId) || businessId < 1) {
      throw new HttpError(400, "Negocio inválido");
    }

    const business = await this.businessRepo.findOne({
      where: { businessId },
      relations: [
        "locations",
        "businessSchedules",
        "businessDeliverySettings",
        "businessPaymentMethods",
        "businessFoodTypes",
        "businessFoodTypes.foodType",
        "businessPhotos",
      ],
    });
    if (!business) throw new HttpError(404, "Negocio no encontrado");

    const [team, plan, menuItems] = await Promise.all([
      this.memberships.list(businessId),
      this.plans.get(businessId),
      this.menuRepo.count({ where: { businessId, isArchived: false } }),
    ]);

    const location = business.locations?.[0] || null;
    const delivery = business.businessDeliverySettings?.[0] || null;

    return {
      business: {
        id: business.businessId,
        name: business.businessName,
        email: business.email,
        phone: business.phone,
        description: business.description,
        logoUrl: business.logoUrl,
        bannerUrl: business.bannerUrl,
        hasDelivery: Boolean(business.hasDelivery),
        isOpen: Boolean(business.isOpen),
        isVerified: Boolean(business.isVerified),
        verifiedAt: business.verifiedAt,
        platformStatus: business.platformStatus || "active",
        suspendedAt: business.suspendedAt,
        suspensionReason: business.suspensionReason,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
      },
      team,
      plan: {
        plan: plan.plan,
        basePlan: plan.basePlan,
        subscription: plan.subscription,
        trial: plan.trial,
        limits: plan.limits,
        usage: plan.usage,
      },
      configuration: {
        location: location
          ? {
              address: location.address,
              city: location.city,
              postalCode: location.postalCode,
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : null,
        schedules: (business.businessSchedules || []).map((schedule) => ({
          id: schedule.scheduleId,
          day: schedule.day,
          isClosed: Boolean(schedule.isClosed),
          opened: schedule.opened,
          closed: schedule.closed,
          isHoliday: Boolean(schedule.isHoliday),
        })),
        delivery: {
          enabled: Boolean(business.hasDelivery),
          radiusKm: Number(delivery?.deliveryRadiusKm || 0),
          fee: Number(delivery?.deliveryFee || 0),
          minOrderAmount: Number(delivery?.minOrderAmount || 0),
          estimatedTimeMin: Number(delivery?.estimatedTimeMin || business.estimatedDeliveryMin || 0),
          useOwnDelivery: Boolean(delivery?.useOwnDelivery),
        },
        paymentMethods: (business.businessPaymentMethods || []).map((method) => ({
          method: method.method,
          active: Boolean(method.isActive),
        })),
        foodTypes: (business.businessFoodTypes || []).map((foodType) => ({
          id: foodType.foodTypeId,
          name: foodType.foodType?.typeName || null,
        })),
        photos: business.businessPhotos?.length || 0,
        menuItems,
      },
    };
  }

  async setPlatformStatus(
    businessId: number,
    rawStatus: string,
    rawReason: string | null | undefined,
    actorUserId: number,
  ) {
    const input = normalizeAdminBusinessStatusInput(rawStatus, rawReason);

    await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Business);
      const business = await repo.findOne({
        where: { businessId },
        lock: { mode: "pessimistic_write" },
      });
      if (!business) throw new HttpError(404, "Negocio no encontrado");

      const before = {
        platformStatus: business.platformStatus || "active",
        suspendedAt: business.suspendedAt,
        suspensionReason: business.suspensionReason,
      };
      const currentReason = String(business.suspensionReason || "").trim() || null;
      if (before.platformStatus === input.status && currentReason === input.reason) return;

      business.platformStatus = input.status;
      business.suspendedAt = input.status === "suspended" ? new Date() : null;
      business.suspensionReason = input.reason;
      await repo.save(business);

      const auditRepo = manager.getRepository(AuditLogs);
      await auditRepo.save(auditRepo.create({
        actorUserId,
        action: input.status === "suspended" ? "BUSINESS_SUSPENDED" : "BUSINESS_REACTIVATED",
        targetTable: "business",
        targetId: businessId,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify({
          platformStatus: business.platformStatus,
          suspendedAt: business.suspendedAt,
          suspensionReason: business.suspensionReason,
        }),
      }));
    });

    return this.get(businessId);
  }

  async setVerification(businessId: number, verified: boolean, actorUserId: number) {
    await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Business);
      const business = await repo.findOne({
        where: { businessId },
        lock: { mode: "pessimistic_write" },
      });
      if (!business) throw new HttpError(404, "Negocio no encontrado");

      const previousVerified = Boolean(business.isVerified);
      if (previousVerified === verified) return;

      const previousVerifiedAt = business.verifiedAt;
      business.isVerified = verified;
      business.verifiedAt = verified ? new Date() : null;
      await repo.save(business);

      const auditRepo = manager.getRepository(AuditLogs);
      await auditRepo.save(auditRepo.create({
        actorUserId,
        action: verified ? "BUSINESS_VERIFIED" : "BUSINESS_UNVERIFIED",
        targetTable: "business",
        targetId: businessId,
        beforeJson: JSON.stringify({ isVerified: previousVerified, verifiedAt: previousVerifiedAt }),
        afterJson: JSON.stringify({ isVerified: Boolean(business.isVerified), verifiedAt: business.verifiedAt }),
      }));
    });

    return this.get(businessId);
  }
}
