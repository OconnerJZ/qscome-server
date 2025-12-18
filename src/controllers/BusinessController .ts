// src/controllers/BusinessController.ts - VERSIÓN COMPLETA
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
import { BusinessPhotos } from "../entities/BusinessPhotos";

export class BusinessController {
  private readonly businessRepo = AppDataSource.getRepository(Business);
  private readonly menuRepo = AppDataSource.getRepository(Menus);
  private readonly locationRepo = AppDataSource.getRepository(Locations);
  private readonly scheduleRepo = AppDataSource.getRepository(BusinessSchedule);
  private readonly bFoodTypesRepos = AppDataSource.getRepository(BusinessFoodTypes);
  private readonly bOwnerRepo = AppDataSource.getRepository(BusinessOwners);
  private readonly bDeliverySett = AppDataSource.getRepository(BusinessDeliverySettings);
  private readonly bPaymentMethod = AppDataSource.getRepository(BusinessPaymentMethods);
  private readonly bPhotosRepo = AppDataSource.getRepository(BusinessPhotos);

  // GET /api/business
  async getAll(req: Request, res: Response) {
    try {
      const businesses = await this.businessRepo.find({
        relations: [
          "locations",
          "businessFoodTypes",
          "businessFoodTypes.foodType",
        ],
        take: 50,
      });

      const formatted = businesses.map((b) => ({
        id: b.businessId,
        title: b.businessName,
        urlImage: b.logoUrl || b.bannerUrl,
        isOpen: b.isOpen,
        likes: 0,
        hasDelivery: b.hasDelivery,
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
          "businessSchedules",
          "businessDeliverySettings",
          "businessPaymentMethods",
          "businessPhotos"
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
          businessName: business.businessName,
          phone: business.phone,
          email: business.email,
          logoUrl: business.logoUrl,
          bannerUrl: business.bannerUrl,
          isOpen: business.isOpen,
          hasDelivery: business.hasDelivery,
          isVerified: business.isVerified,
          prepTimeMin: business.prepTimeMin,
          estimatedDeliveryMin: business.estimatedDeliveryMin,
          locations: business.locations,
          schedules: business.businessSchedules,
          foodTypes: business.businessFoodTypes?.map(ft => ({
            id: ft.foodTypeId,
            name: ft.foodType?.typeName
          })),
          deliverySettings: business.businessDeliverySettings?.[0] || null,
          paymentMethods: business.businessPaymentMethods,
          photos: business.businessPhotos,
          createdAt: business.createdAt,
          updatedAt: business.updatedAt
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PUT /api/business/:id - ACTUALIZACIÓN COMPLETA
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        business_name, 
        phone, 
        email, 
        logo_url,
        banner_url,
        is_open,
        has_delivery,
        prep_time_min,
        estimated_delivery_min
      } = req.body;

      const business = await this.businessRepo.findOne({
        where: { businessId: Number.parseInt(id) },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Negocio no encontrado",
        });
      }

      // Actualizar campos básicos
      if (business_name) business.businessName = business_name;
      if (phone) business.phone = phone;
      if (email) business.email = email;
      if (logo_url) business.logoUrl = logo_url;
      if (banner_url) business.bannerUrl = banner_url;
      if (typeof is_open === "boolean") business.isOpen = is_open;
      if (typeof has_delivery === "boolean") business.hasDelivery = has_delivery;
      if (prep_time_min) business.prepTimeMin = prep_time_min;
      if (estimated_delivery_min) business.estimatedDeliveryMin = estimated_delivery_min;

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

  // PUT /api/business/:id/location
  async updateLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { address, city, postal_code, latitude, longitude } = req.body;

      // Buscar ubicación existente
      let location = await this.locationRepo.findOne({
        where: { businessId: Number.parseInt(id) }
      });

      if (location) {
        // Actualizar existente
        location.address = address || location.address;
        location.city = city || location.city;
        location.postalCode = postal_code || location.postalCode;
        location.latitude = latitude?.toString() || location.latitude;
        location.longitude = longitude?.toString() || location.longitude;
      } else {
        // Crear nueva
        location = this.locationRepo.create({
          businessId: Number.parseInt(id),
          address,
          city,
          postalCode: postal_code,
          latitude: latitude?.toString(),
          longitude: longitude?.toString()
        });
      }

      await this.locationRepo.save(location);

      return res.json({
        success: true,
        message: "Ubicación actualizada",
        data: location
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PUT /api/business/:id/schedules
  async updateSchedules(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { schedules } = req.body;

      if (!Array.isArray(schedules)) {
        return res.status(400).json({
          success: false,
          message: "schedules debe ser un array"
        });
      }

      // Eliminar horarios existentes
      await this.scheduleRepo.delete({ businessId: Number.parseInt(id) });

      // Crear nuevos horarios
      const newSchedules = schedules.map(sched => 
        this.scheduleRepo.create({
          businessId: Number.parseInt(id),
          day: sched.day,
          isClosed: sched.isClosed,
          opened: sched.opened,
          closed: sched.closed,
          isHoliday: sched.isHoliday || false
        })
      );

      await this.scheduleRepo.save(newSchedules);

      return res.json({
        success: true,
        message: "Horarios actualizados",
        data: newSchedules
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PUT /api/business/:id/delivery-settings
  async updateDeliverySettings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        delivery_radius_km, 
        delivery_fee, 
        min_order_amount,
        estimated_time_min,
        use_own_delivery
      } = req.body;

      let settings = await this.bDeliverySett.findOne({
        where: { businessId: Number.parseInt(id) }
      });

      if (settings) {
        // Actualizar existente
        if (delivery_radius_km) settings.deliveryRadiusKm = delivery_radius_km.toString();
        if (delivery_fee) settings.deliveryFee = delivery_fee.toString();
        if (min_order_amount) settings.minOrderAmount = min_order_amount.toString();
        if (estimated_time_min) settings.estimatedTimeMin = estimated_time_min;
        if (typeof use_own_delivery === 'boolean') settings.useOwnDelivery = use_own_delivery;
      } else {
        // Crear nuevo
        settings = this.bDeliverySett.create({
          businessId: Number.parseInt(id),
          deliveryRadiusKm: delivery_radius_km?.toString() || "5.00",
          deliveryFee: delivery_fee?.toString() || "0.00",
          minOrderAmount: min_order_amount?.toString() || "0.00",
          estimatedTimeMin: estimated_time_min || 30,
          useOwnDelivery: use_own_delivery || false
        });
      }

      await this.bDeliverySett.save(settings);

      return res.json({
        success: true,
        message: "Configuración de delivery actualizada",
        data: settings
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PUT /api/business/:id/payment-methods
  async updatePaymentMethods(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { payment_methods } = req.body;

      if (!Array.isArray(payment_methods)) {
        return res.status(400).json({
          success: false,
          message: "payment_methods debe ser un array"
        });
      }

      // Actualizar cada método
      for (const pm of payment_methods) {
        const existing = await this.bPaymentMethod.findOne({
          where: { 
            businessId: Number.parseInt(id),
            method: pm.method 
          }
        });

        if (existing) {
          existing.isActive = pm.is_active;
          existing.configJson = pm.config_json || null;
          await this.bPaymentMethod.save(existing);
        }
      }

      // Obtener métodos actualizados
      const updated = await this.bPaymentMethod.find({
        where: { businessId: Number.parseInt(id) }
      });

      return res.json({
        success: true,
        message: "Métodos de pago actualizados",
        data: updated
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PUT /api/business/:id/food-types
  async updateFoodTypes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { food_type_ids } = req.body;

      if (!Array.isArray(food_type_ids)) {
        return res.status(400).json({
          success: false,
          message: "food_type_ids debe ser un array"
        });
      }

      // Eliminar tipos existentes
      await this.bFoodTypesRepos.delete({ businessId: Number.parseInt(id) });

      // Crear nuevos
      const newTypes = food_type_ids.map(typeId =>
        this.bFoodTypesRepos.create({
          businessId: Number.parseInt(id),
          foodTypeId: typeId
        })
      );

      await this.bFoodTypesRepos.save(newTypes);

      // Recargar con relaciones
      const updated = await this.bFoodTypesRepos.find({
        where: { businessId: Number.parseInt(id) },
        relations: ['foodType']
      });

      return res.json({
        success: true,
        message: "Tipos de comida actualizados",
        data: updated
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // POST /api/business/:id/photos
  async addPhoto(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { photo_url } = req.body;

      const photo = this.bPhotosRepo.create({
        businessId: Number.parseInt(id),
        photoUrl: photo_url
      });

      await this.bPhotosRepo.save(photo);

      return res.json({
        success: true,
        message: "Foto agregada",
        data: photo
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // DELETE /api/business/:id/photos/:photoId
  async deletePhoto(req: Request, res: Response) {
    try {
      const { photoId } = req.params;

      await this.bPhotosRepo.delete({ photoId: Number.parseInt(photoId) });

      return res.json({
        success: true,
        message: "Foto eliminada"
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Métodos existentes (getMenu, create) se mantienen igual...
  
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

      const business = this.businessRepo.create({
        businessName: business_name,
        phone,
        logoUrl: logo_url,
        isOpen: true,
        hasDelivery: has_delivery,
      });

      await this.businessRepo.save(business);

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
}