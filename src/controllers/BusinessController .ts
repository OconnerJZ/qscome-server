import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Business } from "../entities/Business";
import { Menus } from "../entities/Menus";
import { Locations } from "../entities/Locations";
import { BusinessSchedule } from "../entities/BusinessSchedule";
import { BusinessFoodTypes } from "../entities/BusinessFoodTypes";
import { BusinessOwners } from "../entities/BusinessOwners";
import { BusinessDeliverySettings } from "../entities/BusinessDeliverySettings";
import { BusinessPaymentMethods } from "../entities/BusinessPaymentMethods";

export class BusinessController {
  private readonly businessRepo = AppDataSource.getRepository(Business);
  private readonly menuRepo = AppDataSource.getRepository(Menus);
  private readonly locationRepo = AppDataSource.getRepository(Locations);
  private readonly scheduleRepo = AppDataSource.getRepository(BusinessSchedule);
  private readonly bFoodTypesRepos =
    AppDataSource.getRepository(BusinessFoodTypes);
  private readonly bOwnerRepo = AppDataSource.getRepository(BusinessOwners);
  private readonly bDeliverySett = AppDataSource.getRepository(
    BusinessDeliverySettings
  );
  private readonly bPaymentMethod = AppDataSource.getRepository(
    BusinessPaymentMethods
  );

  // GET /api/business
  async getAll(req: Request, res: Response) {
    try {
      const businesses = await this.businessRepo.find({
        relations: [
          "locations",
          "businessFoodTypes",
          "businessFoodTypes.foodType",
        ],
        take: 50, // Limitar para performance
      });

      const formatted = businesses.map((b) => ({
        id: b.businessId,
        title: b.businessName,
        urlImage: b.logoUrl || b.bannerUrl,
        isOpen: b.isOpen,
        likes: 0, // TODO: Calcular likes reales
        hasDelivery: true, // TODO: Verificar desde businessDeliverySettings
        tags:
          b.businessFoodTypes?.map((ft) => ({
            label: ft.foodType?.typeName,
            color: "warning",
          })) || [],
        emails: [b.email].filter(Boolean),
        phones: [b.phone].filter(Boolean),
        social: {
          facebook: "",
          instagram: "",
          whats: b.phone ? `https://wa.me/${b.phone.replace(/\D/g, "")}` : "",
        },
        prepTimeMin: b.prepTimeMin,
        estimatedDeliveryMin: b.estimatedDeliveryMin,
        createdAt: b.createdAt,
      }));

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /api/business/:id
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const business = await this.businessRepo.findOne({
        where: { businessId: Number.parseInt(id) },
        relations: [
          "locations",
          "businessFoodTypes",
          "businessFoodTypes.foodType",
        ],
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Negocio no encontrado",
        });
      }

      return res.json({
        success: true,
        data: {
          id: business.businessId,
          title: business.businessName,
          urlImage: business.logoUrl || business.bannerUrl,
          isOpen: business.isOpen,
          phone: business.phone,
          email: business.email,
          prepTimeMin: business.prepTimeMin,
          estimatedDeliveryMin: business.estimatedDeliveryMin,
          locations: business.locations,
          foodTypes: business.businessFoodTypes?.map(
            (ft) => ft.foodType?.typeName
          ),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /api/business/:id/menu
  async getMenu(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const menus = await this.menuRepo.find({
        where: {
          businessId: Number.parseInt(id),
          isAvailable: true,
        },
        order: { category: "ASC", itemName: "ASC" },
      });

      const formatted = menus.map((m) => ({
        id: m.menuId,
        name: m.itemName,
        description: m.description,
        price: Number.parseFloat(m.price || "0"),
        image: m.imageUrl,
        available: m.isAvailable,
        category: m.category,
      }));

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // POST /api/business
  async create(req: Request, res: Response) {
    try {
      const {
        business_name,
        phone,
        logo_url,
        locale,
        schedule,
        has_delivery,
        food_type,
        id,
      } = req.body;

      // Crear negocio
      const business = this.businessRepo.create({
        businessName: business_name,
        phone,
        logoUrl: logo_url,
        isOpen: true,
        hasDelivery: has_delivery,
      });

      await this.businessRepo.save(business);

      // Crear ubicación si se proporcionó
      if (locale) {
        const location = this.locationRepo.create({
          businessId: business.businessId,
          ...locale,
        });
        await this.locationRepo.save(location);
      }
      if (schedule) {
        await Promise.all(
          schedule.map((scheduled: object) => {
            const sched = this.scheduleRepo.create({
              businessId: business.businessId,
              ...scheduled,
            });
            return this.scheduleRepo.save(sched);
          })
        );
      }
      if (food_type) {
        await Promise.all(
          food_type.map((foodTypeId: number) => {
            const bft = this.bFoodTypesRepos.create({
              businessId: business.businessId,
              foodTypeId: foodTypeId,
            });
            return this.bFoodTypesRepos.save(bft);
          })
        );
      }
      const deliverySet = this.bDeliverySett.create({
        businessId: business.businessId,
      });
      await this.bDeliverySett.save(deliverySet);

      const methods = ["cash", "card", "wallet", "transfer"] as const;
      type PaymentType = (typeof methods)[number];
      await Promise.all(
        methods.map((m: PaymentType) => {
          const paymentMethod = this.bPaymentMethod.create({
            businessId: business.businessId,
            method: m,
            isActive: m == "cash" || m == "transfer",
          });
          return this.bPaymentMethod.save(paymentMethod);
        })
      );

      const businessOwner = this.bOwnerRepo.create({
        userId: id,
        businessId: business.businessId,
        roleInBusiness: "owner",
      });
      await this.bOwnerRepo.save(businessOwner);

      return res.status(201).json({
        success: true,
        message: "Negocio creado exitosamente",
        data: {
          id: business.businessId,
          name: business.businessName,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PUT /api/business/:id
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { business_name, phone, email, logo_url, is_open } = req.body;

      const business = await this.businessRepo.findOne({
        where: { businessId: Number.parseInt(id) },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Negocio no encontrado",
        });
      }

      if (business_name) business.businessName = business_name;
      if (phone) business.phone = phone;
      if (email) business.email = email;
      if (logo_url) business.logoUrl = logo_url;
      if (typeof is_open === "boolean") business.isOpen = is_open;

      await this.businessRepo.save(business);

      return res.json({
        success: true,
        message: "Negocio actualizado",
        data: business,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
