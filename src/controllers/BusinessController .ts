
import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Business } from "../entities/Business";
import { Menus } from "../entities/Menus";
import { Locations } from "../entities/Locations";

export class BusinessController {
    private readonly businessRepo = AppDataSource.getRepository(Business);
    private readonly menuRepo = AppDataSource.getRepository(Menus);
    private readonly locationRepo = AppDataSource.getRepository(Locations);

    // GET /api/business
    async getAll(req: Request, res: Response) {
        try {
            const businesses = await this.businessRepo.find({
                relations: ["locations", "businessFoodTypes", "businessFoodTypes.foodType"],
                take: 50 // Limitar para performance
            });

            const formatted = businesses.map(b => ({
                id: b.businessId,
                title: b.businessName,
                urlImage: b.logoUrl || b.bannerUrl,
                isOpen: b.isOpen,
                likes: 0, // TODO: Calcular likes reales
                hasDelivery: true, // TODO: Verificar desde businessDeliverySettings
                tags: b.businessFoodTypes?.map(ft => ({
                    label: ft.foodType?.typeName,
                    color: "warning"
                })) || [],
                emails: [b.email].filter(Boolean),
                phones: [b.phone].filter(Boolean),
                social: {
                    facebook: "",
                    instagram: "",
                    whats: b.phone ? `https://wa.me/${b.phone.replace(/\D/g, '')}` : ""
                },
                prepTimeMin: b.prepTimeMin,
                estimatedDeliveryMin: b.estimatedDeliveryMin,
                createdAt: b.createdAt
            }));

            return res.json({
                success: true,
                data: formatted
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // GET /api/business/:id
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const business = await this.businessRepo.findOne({
                where: { businessId: Number.parseInt(id) },
                relations: ["locations", "businessFoodTypes", "businessFoodTypes.foodType"]
            });

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: "Negocio no encontrado"
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
                    foodTypes: business.businessFoodTypes?.map(ft => ft.foodType?.typeName)
                }
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
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
                    isAvailable: true 
                },
                order: { category: "ASC", itemName: "ASC" }
            });

            const formatted = menus.map(m => ({
                id: m.menuId,
                name: m.itemName,
                description: m.description,
                price: Number.parseFloat(m.price || "0"),
                image: m.imageUrl,
                available: m.isAvailable,
                category: m.category
            }));

            return res.json({
                success: true,
                data: formatted
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // POST /api/business
    async create(req: Request, res: Response) {
        try {
            const { 
                business_name, 
                phone, 
                email, 
                logo_url, 
                prep_time_min,
                address,
                city,
                postal_code,
                latitude,
                longitude
            } = req.body;

            // Crear negocio
            const business = this.businessRepo.create({
                businessName: business_name,
                phone,
                email,
                logoUrl: logo_url,
                prepTimeMin: prep_time_min,
                isOpen: true,
                isVerified: false
            });

            await this.businessRepo.save(business);

            // Crear ubicación si se proporcionó
            if (address) {
                const location = this.locationRepo.create({
                    businessId: business.businessId,
                    address,
                    city,
                    postalCode: postal_code,
                    latitude,
                    longitude
                });
                await this.locationRepo.save(location);
            }

            return res.status(201).json({
                success: true,
                message: "Negocio creado exitosamente",
                data: {
                    id: business.businessId,
                    name: business.businessName
                }
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // PUT /api/business/:id
    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { business_name, phone, email, logo_url, is_open } = req.body;

            const business = await this.businessRepo.findOne({
                where: { businessId: Number.parseInt(id) }
            });

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: "Negocio no encontrado"
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
                data: business
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
}