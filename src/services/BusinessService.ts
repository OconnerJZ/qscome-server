// src/services/BusinessService.ts
// Lógica de negocio y persistencia de "business" y sus sub-recursos.
// Los controllers sólo traducen HTTP. Errores de dominio → HttpError.

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
  id: number; // userId del owner
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

export class BusinessService {
  private readonly businessRepo = AppDataSource.getRepository(Business);
  private readonly menuRepo = AppDataSource.getRepository(Menus);
  private readonly locationRepo = AppDataSource.getRepository(Locations);
  private readonly scheduleRepo = AppDataSource.getRepository(BusinessSchedule);
  private readonly bFoodTypesRepo =
    AppDataSource.getRepository(BusinessFoodTypes);
  private readonly bOwnerRepo = AppDataSource.getRepository(BusinessOwners);
  private readonly bDeliveryRepo = AppDataSource.getRepository(
    BusinessDeliverySettings,
  );
  private readonly bPaymentRepo = AppDataSource.getRepository(
    BusinessPaymentMethods,
  );
  private readonly bPhotosRepo = AppDataSource.getRepository(BusinessPhotos);

  // GET /api/business
  async list() {
    const businesses = await this.businessRepo.find({
      relations: [
        "locations",
        "businessFoodTypes",
        "businessFoodTypes.foodType",
        "menus",
      ],
      take: 50,
    });
    return businesses.map(formatBusinessCard);
  }

  // GET /api/business/:id
  async getById(businessId: number) {
    const business = await this.businessRepo.findOne({
      where: { businessId },
      relations: [
        "locations",
        "businessFoodTypes",
        "businessFoodTypes.foodType",
        "businessSchedules",
        "businessDeliverySettings",
        "businessPaymentMethods",
        "businessPhotos",
        "menus",
      ],
    });
    if (!business) throw new HttpError(404, "Negocio no encontrado");
    return formatBusinessDetail(business);
  }

  // GET /api/business/owner/:ownerId
  async getByOwner(ownerId: number) {
    const owned = await this.bOwnerRepo.find({
      where: { userId: ownerId },
      relations: [
        "business",
        "business.locations",
        "business.businessFoodTypes",
        "business.businessFoodTypes.foodType",
        "business.menus",
      ],
    });

    if (!owned.length) {
      throw new HttpError(404, "No se encontraron negocios para este owner");
    }

    return owned.map((bo) => formatOwnerBusinessCard(bo.business));
  }

  // GET /api/business/:id/menu
  async getMenu(businessId: number) {
    const menus = await this.menuRepo.find({
      where: { businessId, isAvailable: true },
      order: { category: "ASC", itemName: "ASC" },
    });
    return menus.map(formatMenuItem);
  }

  // PUT /api/business/:id
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

    if (business_name) business.businessName = business_name;
    if (phone) business.phone = phone;
    if (email) business.email = email;
    if (logo_url) business.logoUrl = logo_url;
    if (banner_url) business.bannerUrl = banner_url;
    if (typeof is_open === "boolean") business.isOpen = is_open;
    if (typeof has_delivery === "boolean") business.hasDelivery = has_delivery;
    if (prep_time_min) business.prepTimeMin = prep_time_min;
    if (estimated_delivery_min)
      business.estimatedDeliveryMin = estimated_delivery_min;

    await this.businessRepo.save(business);
    return business;
  }

  // POST /api/business — atómico: negocio + ubicación + horarios + tipos +
  // settings + métodos de pago + vínculo owner, todo en una transacción.
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
            bFoodTypesRepo.create({
              businessId: business.businessId,
              foodTypeId,
            }),
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

  // ==========================================================================
  // SUB-RECURSOS (aún no ruteados, listos para conectar)
  // ==========================================================================

  // PUT /api/business/:id/location
  async updateLocation(businessId: number, body: any) {
    const { address, city, postal_code, latitude, longitude } = body;

    let location = await this.locationRepo.findOne({ where: { businessId } });

    if (location) {
      location.address = address || location.address;
      location.city = city || location.city;
      location.postalCode = postal_code || location.postalCode;
      location.latitude = latitude?.toString() || location.latitude;
      location.longitude = longitude?.toString() || location.longitude;
    } else {
      location = this.locationRepo.create({
        businessId,
        address,
        city,
        postalCode: postal_code,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
      });
    }

    await this.locationRepo.save(location);
    return location;
  }

  // PUT /api/business/:id/schedules
  async updateSchedules(businessId: number, schedules: any) {
    if (!Array.isArray(schedules)) {
      throw new HttpError(400, "schedules debe ser un array");
    }

    await this.scheduleRepo.delete({ businessId });

    const newSchedules = schedules.map((sched) =>
      this.scheduleRepo.create({
        businessId,
        day: sched.day,
        isClosed: sched.isClosed,
        opened: sched.opened,
        closed: sched.closed,
        isHoliday: sched.isHoliday || false,
      }),
    );

    await this.scheduleRepo.save(newSchedules);
    return newSchedules;
  }

  // PUT /api/business/:id/delivery-settings
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
      if (delivery_radius_km)
        settings.deliveryRadiusKm = delivery_radius_km.toString();
      if (delivery_fee) settings.deliveryFee = delivery_fee.toString();
      if (min_order_amount)
        settings.minOrderAmount = min_order_amount.toString();
      if (estimated_time_min) settings.estimatedTimeMin = estimated_time_min;
      if (typeof use_own_delivery === "boolean")
        settings.useOwnDelivery = use_own_delivery;
    } else {
      settings = this.bDeliveryRepo.create({
        businessId,
        deliveryRadiusKm: delivery_radius_km?.toString() || "5.00",
        deliveryFee: delivery_fee?.toString() || "0.00",
        minOrderAmount: min_order_amount?.toString() || "0.00",
        estimatedTimeMin: estimated_time_min || 30,
        useOwnDelivery: use_own_delivery || false,
      });
    }

    await this.bDeliveryRepo.save(settings);
    return settings;
  }

  // PUT /api/business/:id/payment-methods
  async updatePaymentMethods(businessId: number, payment_methods: any) {
    if (!Array.isArray(payment_methods)) {
      throw new HttpError(400, "payment_methods debe ser un array");
    }

    for (const pm of payment_methods) {
      const existing = await this.bPaymentRepo.findOne({
        where: { businessId, method: pm.method },
      });
      if (existing) {
        existing.isActive = pm.is_active;
        existing.configJson = pm.config_json || null;
        await this.bPaymentRepo.save(existing);
      }
    }

    return this.bPaymentRepo.find({ where: { businessId } });
  }

  // PUT /api/business/:id/food-types
  async updateFoodTypes(businessId: number, food_type_ids: any) {
    if (!Array.isArray(food_type_ids)) {
      throw new HttpError(400, "food_type_ids debe ser un array");
    }

    await this.bFoodTypesRepo.delete({ businessId });

    const newTypes = food_type_ids.map((typeId) =>
      this.bFoodTypesRepo.create({ businessId, foodTypeId: typeId }),
    );
    await this.bFoodTypesRepo.save(newTypes);

    return this.bFoodTypesRepo.find({
      where: { businessId },
      relations: ["foodType"],
    });
  }

  // POST /api/business/:id/photos
  async addPhoto(businessId: number, photo_url: string) {
    const photo = this.bPhotosRepo.create({ businessId, photoUrl: photo_url });
    await this.bPhotosRepo.save(photo);
    return photo;
  }

  // DELETE /api/business/:id/photos/:photoId
  async deletePhoto(photoId: number) {
    await this.bPhotosRepo.delete({ photoId });
  }
}