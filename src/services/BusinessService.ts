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
import { HttpError } from "../utils/httpError";
import {
  formatBusinessCard,
  formatOwnerBusinessCard,
  formatBusinessDetail,
  formatMenuItem,
} from "../serializers/business.serializer";

export interface CreateBusinessInput {
  id: number;
  business_name?: string;
  phone?: string;
  logo_url?: string;
  locale?: Record<string, unknown>;
  schedule?: Array<Record<string, unknown>>;
  has_delivery?: boolean;
  food_type?: number[];
}

const PAYMENT_METHODS = ["cash", "card", "wallet", "transfer"] as const;
type PaymentType = (typeof PAYMENT_METHODS)[number];

const PROFILE_RELATIONS = [
  "locations",
  "businessFoodTypes",
  "businessFoodTypes.foodType",
  "businessSchedules",
  "businessDeliverySettings",
  "businessPaymentMethods",
  "businessPhotos",
];

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

  async list() {
    const businesses = await this.businessRepo.find({
      relations: PROFILE_RELATIONS,
      take: 50,
    });
    return businesses.map(formatBusinessCard);
  }

  async getById(businessId: number) {
    const business = await this.businessRepo.findOne({
      where: { businessId },
      relations: [...PROFILE_RELATIONS, "menus"],
    });
    if (!business) throw new HttpError(404, "Negocio no encontrado");
    return formatBusinessDetail(business);
  }

  async getByOwner(ownerId: number) {
    const owned = await this.bOwnerRepo.find({
      where: { userId: ownerId },
      relations: [
        "business",
        "business.locations",
        "business.businessFoodTypes",
        "business.businessFoodTypes.foodType",
        "business.businessSchedules",
        "business.businessDeliverySettings",
        "business.businessPaymentMethods",
        "business.businessPhotos",
      ],
    });

    if (!owned.length) {
      throw new HttpError(404, "No se encontraron negocios para este owner");
    }

    return owned.map((bo) => formatOwnerBusinessCard(bo.business));
  }

  async getMenu(businessId: number) {
    const menus = await this.menuRepo.find({
      where: { businessId, isAvailable: true, isArchived: false },
      order: { category: "ASC", itemName: "ASC" },
    });
    return menus.map(formatMenuItem);
  }

  async update(businessId: number, body: any) {
    const business = await this.businessRepo.findOne({ where: { businessId } });
    if (!business) throw new HttpError(404, "Negocio no encontrado");

    const {
      business_name,
      phone,
      email,
      logo_url,
      banner_url,
      is_open,
      has_delivery,
      prep_time_min,
      estimated_delivery_min,
    } = body;

    if (business_name !== undefined) business.businessName = business_name || null;
    if (phone !== undefined) business.phone = phone || null;
    if (email !== undefined) business.email = email || null;
    if (logo_url !== undefined) business.logoUrl = logo_url || null;
    if (banner_url !== undefined) business.bannerUrl = banner_url || null;
    if (typeof is_open === "boolean") business.isOpen = is_open;
    if (typeof has_delivery === "boolean") business.hasDelivery = has_delivery;
    if (prep_time_min !== undefined) business.prepTimeMin = Number(prep_time_min) || 0;
    if (estimated_delivery_min !== undefined)
      business.estimatedDeliveryMin = Number(estimated_delivery_min) || 0;

    await this.businessRepo.save(business);
    return this.getById(businessId);
  }

  async create(input: CreateBusinessInput) {
    const {
      business_name,
      phone,
      logo_url,
      locale,
      schedule,
      has_delivery,
      food_type,
      id,
    } = input;

    const businessId = await AppDataSource.transaction(async (manager) => {
      const businessRepo = manager.getRepository(Business);
      const locationRepo = manager.getRepository(Locations);
      const scheduleRepo = manager.getRepository(BusinessSchedule);
      const bFoodTypesRepo = manager.getRepository(BusinessFoodTypes);
      const bDeliveryRepo = manager.getRepository(BusinessDeliverySettings);
      const bPaymentRepo = manager.getRepository(BusinessPaymentMethods);
      const bOwnerRepo = manager.getRepository(BusinessOwners);

      const business = businessRepo.create({
        businessName: business_name,
        phone,
        logoUrl: logo_url,
        isOpen: true,
        hasDelivery: has_delivery,
      });
      await businessRepo.save(business);

      if (locale) {
        await locationRepo.save(
          locationRepo.create({ businessId: business.businessId, ...locale }),
        );
      }

      if (schedule?.length) {
        await scheduleRepo.save(
          schedule.map((s) =>
            scheduleRepo.create({ businessId: business.businessId, ...s }),
          ),
        );
      }

      if (food_type?.length) {
        await bFoodTypesRepo.save(
          food_type.map((foodTypeId) =>
            bFoodTypesRepo.create({ businessId: business.businessId, foodTypeId }),
          ),
        );
      }

      await bDeliveryRepo.save(
        bDeliveryRepo.create({ businessId: business.businessId }),
      );

      await bPaymentRepo.save(
        PAYMENT_METHODS.map((m: PaymentType) =>
          bPaymentRepo.create({
            businessId: business.businessId,
            method: m,
            isActive: m === "cash" || m === "transfer",
          }),
        ),
      );

      await bOwnerRepo.save(
        bOwnerRepo.create({
          userId: id,
          businessId: business.businessId,
          roleInBusiness: "owner",
        }),
      );

      return business.businessId;
    });

    return { id: businessId, name: business_name };
  }

  async updateLocation(businessId: number, body: any) {
    const { address, city, postal_code, latitude, longitude } = body;
    let location = await this.locationRepo.findOne({ where: { businessId } });

    if (location) {
      if (address !== undefined) location.address = address || null;
      if (city !== undefined) location.city = city || null;
      if (postal_code !== undefined) location.postalCode = postal_code || null;
      if (latitude !== undefined) location.latitude = latitude === "" ? null : String(latitude);
      if (longitude !== undefined) location.longitude = longitude === "" ? null : String(longitude);
    } else {
      location = this.locationRepo.create({
        businessId,
        address,
        city,
        postalCode: postal_code,
        latitude: latitude === "" || latitude == null ? null : String(latitude),
        longitude: longitude === "" || longitude == null ? null : String(longitude),
      });
    }

    await this.locationRepo.save(location);
    return location;
  }

  async updateSchedules(businessId: number, schedules: any) {
    if (!Array.isArray(schedules)) throw new HttpError(400, "schedules debe ser un array");
    await this.scheduleRepo.delete({ businessId });

    const newSchedules = schedules.map((sched) =>
      this.scheduleRepo.create({
        businessId,
        day: sched.day,
        isClosed: Boolean(sched.isClosed),
        opened: sched.isClosed ? null : sched.opened,
        closed: sched.isClosed ? null : sched.closed,
        isHoliday: Boolean(sched.isHoliday),
      }),
    );
    await this.scheduleRepo.save(newSchedules);
    return newSchedules;
  }

  async updateDeliverySettings(businessId: number, body: any) {
    const {
      delivery_radius_km,
      delivery_fee,
      min_order_amount,
      estimated_time_min,
      use_own_delivery,
    } = body;

    let settings = await this.bDeliveryRepo.findOne({ where: { businessId } });
    if (settings) {
      if (delivery_radius_km !== undefined) settings.deliveryRadiusKm = String(delivery_radius_km);
      if (delivery_fee !== undefined) settings.deliveryFee = String(delivery_fee);
      if (min_order_amount !== undefined) settings.minOrderAmount = String(min_order_amount);
      if (estimated_time_min !== undefined) settings.estimatedTimeMin = Number(estimated_time_min);
      if (typeof use_own_delivery === "boolean") settings.useOwnDelivery = use_own_delivery;
    } else {
      settings = this.bDeliveryRepo.create({
        businessId,
        deliveryRadiusKm: String(delivery_radius_km ?? 5),
        deliveryFee: String(delivery_fee ?? 0),
        minOrderAmount: String(min_order_amount ?? 0),
        estimatedTimeMin: Number(estimated_time_min ?? 30),
        useOwnDelivery: Boolean(use_own_delivery),
      });
    }

    await this.bDeliveryRepo.save(settings);
    return settings;
  }

  async updatePaymentMethods(businessId: number, payment_methods: any) {
    if (!Array.isArray(payment_methods)) {
      throw new HttpError(400, "payment_methods debe ser un array");
    }
    for (const pm of payment_methods) {
      const existing = await this.bPaymentRepo.findOne({
        where: { businessId, method: pm.method },
      });
      if (existing) {
        existing.isActive = Boolean(pm.is_active);
        existing.configJson = pm.config_json || null;
        await this.bPaymentRepo.save(existing);
      }
    }
    return this.bPaymentRepo.find({ where: { businessId } });
  }

  async updateFoodTypes(businessId: number, food_type_ids: any) {
    if (!Array.isArray(food_type_ids)) throw new HttpError(400, "food_type_ids debe ser un array");
    await this.bFoodTypesRepo.delete({ businessId });
    const newTypes = food_type_ids.map((typeId) =>
      this.bFoodTypesRepo.create({ businessId, foodTypeId: typeId }),
    );
    await this.bFoodTypesRepo.save(newTypes);
    return this.bFoodTypesRepo.find({ where: { businessId }, relations: ["foodType"] });
  }

  async addPhoto(businessId: number, photo_url: string) {
    if (!photo_url) throw new HttpError(400, "photo_url es requerido");
    const photo = this.bPhotosRepo.create({ businessId, photoUrl: photo_url });
    await this.bPhotosRepo.save(photo);
    return { id: photo.photoId, url: photo.photoUrl };
  }

  async deletePhoto(photoId: number) {
    await this.bPhotosRepo.delete({ photoId });
  }
}
