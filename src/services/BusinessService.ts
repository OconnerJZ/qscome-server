import { AppDataSource } from "../utils/db";
import { Business } from "../entities/Business";
import { Menus } from "../entities/Menus";
import { Locations } from "../entities/Locations";
import { BusinessSchedule } from "../entities/BusinessSchedule";
import { BusinessFoodTypes } from "../entities/BusinessFoodTypes";
import { BusinessOwners } from "../entities/BusinessOwners";
import { BusinessDeliverySettings } from "../entities/BusinessDeliverySettings";
import { BusinessPaymentMethods } from "../entities/BusinessPaymentMethods";
import { BusinessPhotos } from "../entities/BusinessPhotos";
import { Users } from "../entities/Users";
import { UserRoles } from "../entities/UserRoles";
import { HttpError } from "../utils/httpError";
import { formatBusinessCard, formatOwnerBusinessCard, formatBusinessDetail, formatMenuItem } from "../serializers/business.serializer";

interface ScheduleInput { day: string; isClosed?: boolean | null; opened?: string | null; closed?: string | null; isHoliday?: boolean | null; }
export interface CreateBusinessInput { id: number; business_name?: string; phone?: string; logo_url?: string; locale?: Record<string, unknown>; schedule?: ScheduleInput[]; has_delivery?: boolean; food_type?: number[]; }
const PAYMENT_METHODS = ["cash", "card", "wallet", "transfer"] as const;
type PaymentType = (typeof PAYMENT_METHODS)[number];
const PROFILE_RELATIONS = ["locations", "businessFoodTypes", "businessFoodTypes.foodType", "businessSchedules", "businessDeliverySettings", "businessPaymentMethods", "businessPhotos"];

const normalizeSchedule = (schedule: ScheduleInput, businessId: number) => {
  const day = schedule.day?.trim();
  if (!day) throw new HttpError(400, "Todos los horarios deben indicar un día");

  return {
    businessId,
    day,
    isClosed: Boolean(schedule.isClosed),
    opened: schedule.opened || null,
    closed: schedule.closed || null,
    isHoliday: Boolean(schedule.isHoliday),
  };
};

export class BusinessService {
  private readonly businessRepo = AppDataSource.getRepository(Business);
  private readonly menuRepo = AppDataSource.getRepository(Menus);
  private readonly locationRepo = AppDataSource.getRepository(Locations);
  private readonly scheduleRepo = AppDataSource.getRepository(BusinessSchedule);
  private readonly bFoodTypesRepo = AppDataSource.getRepository(BusinessFoodTypes);
  private readonly bOwnerRepo = AppDataSource.getRepository(BusinessOwners);
  private readonly bDeliveryRepo = AppDataSource.getRepository(BusinessDeliverySettings);
  private readonly bPaymentRepo = AppDataSource.getRepository(BusinessPaymentMethods);
  private readonly bPhotosRepo = AppDataSource.getRepository(BusinessPhotos);

  async list() { const businesses = await this.businessRepo.find({ relations: PROFILE_RELATIONS, take: 50 }); return businesses.map(formatBusinessCard); }
  async getById(businessId: number) { const business = await this.businessRepo.findOne({ where: { businessId }, relations: [...PROFILE_RELATIONS, "menus"] }); if (!business) throw new HttpError(404, "Negocio no encontrado"); return formatBusinessDetail(business); }
  async getByOwner(ownerId: number) {
    const owned = await this.bOwnerRepo.find({ where: { userId: ownerId }, relations: ["business", "business.locations", "business.businessFoodTypes", "business.businessFoodTypes.foodType", "business.businessSchedules", "business.businessDeliverySettings", "business.businessPaymentMethods", "business.businessPhotos"] });
    return owned.map((bo) => formatOwnerBusinessCard(bo.business));
  }
  async getMenu(businessId: number) {
    const menus = await this.menuRepo.find({
      where: { businessId, isAvailable: true, isArchived: false },
      relations: ["menuOptionGroups", "menuOptionGroups.menuOptionChoices"],
      order: { category: "ASC", itemName: "ASC" },
    });
    return menus.map(formatMenuItem);
  }

  async update(businessId: number, body: any) {
    const business = await this.businessRepo.findOne({ where: { businessId } }); if (!business) throw new HttpError(404, "Negocio no encontrado");
    const { business_name, phone, email, logo_url, banner_url, facebook_url, instagram_url, is_open, has_delivery, prep_time_min, estimated_delivery_min } = body;
    if (business_name !== undefined) business.businessName = business_name || null;
    if (phone !== undefined) business.phone = phone || null;
    if (email !== undefined) business.email = email || null;
    if (logo_url !== undefined) business.logoUrl = logo_url || null;
    if (banner_url !== undefined) business.bannerUrl = banner_url || null;
    if (facebook_url !== undefined) business.facebookUrl = String(facebook_url || "").trim() || null;
    if (instagram_url !== undefined) business.instagramUrl = String(instagram_url || "").trim() || null;
    if (typeof is_open === "boolean") business.isOpen = is_open;
    if (typeof has_delivery === "boolean") business.hasDelivery = has_delivery;
    if (prep_time_min !== undefined) business.prepTimeMin = Number(prep_time_min) || 0;
    if (estimated_delivery_min !== undefined) business.estimatedDeliveryMin = Number(estimated_delivery_min) || 0;
    await this.businessRepo.save(business); return this.getById(businessId);
  }

  async create(input: CreateBusinessInput) {
    const { business_name, phone, logo_url, locale, schedule, has_delivery, food_type, id } = input;
    if (!id) throw new HttpError(400, "Usuario inválido");
    const businessId = await AppDataSource.transaction(async (manager) => {
      const businessRepo = manager.getRepository(Business); const locationRepo = manager.getRepository(Locations); const scheduleRepo = manager.getRepository(BusinessSchedule); const bFoodTypesRepo = manager.getRepository(BusinessFoodTypes); const bDeliveryRepo = manager.getRepository(BusinessDeliverySettings); const bPaymentRepo = manager.getRepository(BusinessPaymentMethods); const bOwnerRepo = manager.getRepository(BusinessOwners); const userRepo = manager.getRepository(Users); const roleRepo = manager.getRepository(UserRoles);
      const business = businessRepo.create({ businessName: business_name, phone, logoUrl: logo_url, isOpen: true, hasDelivery: has_delivery }); await businessRepo.save(business);
      if (locale) await locationRepo.save(locationRepo.create({ businessId: business.businessId, ...locale }));
      if (schedule?.length) {
        const scheduleRows = schedule.map((entry) => scheduleRepo.create(normalizeSchedule(entry, business.businessId)));
        await scheduleRepo.save(scheduleRows);
      }
      if (food_type?.length) await bFoodTypesRepo.save(food_type.map((foodTypeId) => bFoodTypesRepo.create({ businessId: business.businessId, foodTypeId })));
      await bDeliveryRepo.save(bDeliveryRepo.create({ businessId: business.businessId }));
      await bPaymentRepo.save(PAYMENT_METHODS.map((m: PaymentType) => bPaymentRepo.create({ businessId: business.businessId, method: m, isActive: m === "cash" || m === "transfer" })));
      await bOwnerRepo.save(bOwnerRepo.create({ userId: id, businessId: business.businessId, roleInBusiness: "owner" }));
      const user = await userRepo.findOne({ where: { userId: id } }); const ownerRole = await roleRepo.findOne({ where: { roleName: "owner" } });
      if (user && ownerRole && user.roleId !== ownerRole.roleId) { user.roleId = ownerRole.roleId; await userRepo.save(user); }
      return business.businessId;
    });
    return { id: businessId, name: business_name };
  }

  async updateLocation(businessId: number, body: any) { let row = await this.locationRepo.findOne({ where: { businessId } }); if (!row) row = this.locationRepo.create({ businessId }); Object.assign(row, body); await this.locationRepo.save(row); return this.getById(businessId); }
  async updateSchedules(businessId: number, schedules: ScheduleInput[] = []) {
    const normalizedSchedules = schedules.map((schedule) => normalizeSchedule(schedule, businessId));

    await AppDataSource.transaction(async (manager) => {
      const scheduleRepo = manager.getRepository(BusinessSchedule);
      await scheduleRepo.delete({ businessId });
      if (normalizedSchedules.length) {
        await scheduleRepo.save(normalizedSchedules.map((schedule) => scheduleRepo.create(schedule)));
      }
    });

    return this.getById(businessId);
  }
  async updateDeliverySettings(businessId: number, body: any) { let row = await this.bDeliveryRepo.findOne({ where: { businessId } }); if (!row) row = this.bDeliveryRepo.create({ businessId }); const map: Record<string, string> = { delivery_radius_km: "deliveryRadiusKm", delivery_fee: "deliveryFee", min_order_amount: "minOrderAmount", estimated_time_min: "estimatedTimeMin", use_own_delivery: "useOwnDelivery" }; Object.entries(map).forEach(([from, to]) => { if (body[from] !== undefined) (row as any)[to] = body[from]; }); await this.bDeliveryRepo.save(row); return this.getById(businessId); }
  async updatePaymentMethods(businessId: number, methods: any[] = []) { await this.bPaymentRepo.delete({ businessId }); if (methods.length) await this.bPaymentRepo.save(methods.map((m) => this.bPaymentRepo.create({ businessId, method: typeof m === "string" ? m : m.method, isActive: typeof m === "string" ? true : m.isActive !== false }))); return this.getById(businessId); }
  async updateFoodTypes(businessId: number, ids: number[] = []) { await this.bFoodTypesRepo.delete({ businessId }); if (ids.length) await this.bFoodTypesRepo.save(ids.map((foodTypeId) => this.bFoodTypesRepo.create({ businessId, foodTypeId }))); return this.getById(businessId); }
  async addPhoto(businessId: number, photoUrl: string) { if (!photoUrl) throw new HttpError(400, "photo_url requerido"); const photo = await this.bPhotosRepo.save(this.bPhotosRepo.create({ businessId, photoUrl })); return { id: photo.photoId, photoUrl: photo.photoUrl }; }
  async deletePhoto(businessId: number, photoId: number) { const photo = await this.bPhotosRepo.findOne({ where: { photoId, businessId } }); if (!photo) throw new HttpError(404, "Foto no encontrada"); await this.bPhotosRepo.remove(photo); }
}
