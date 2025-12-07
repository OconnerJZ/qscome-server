import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Menus } from "../entities/Menus";

export class MenuController {
    private readonly menuRepo = AppDataSource.getRepository(Menus);

    // GET /api/menus
    async getAll(req: Request, res: Response) {
        try {
            const menus = await this.menuRepo.find({
                relations: ["business"],
                where: { isAvailable: true }
            });

            return res.json({
                success: true,
                data: menus.map(m => ({
                    id: m.menuId,
                    name: m.itemName,
                    description: m.description,
                    price: Number.parseFloat(m.price || "0"),
                    image: m.imageUrl,
                    category: m.category,
                    available: m.isAvailable,
                    businessId: m.businessId,
                    businessName: m.business?.businessName
                }))
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // GET /api/menus/:id
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const menu = await this.menuRepo.findOne({
                where: { menuId: Number.parseInt(id) },
                relations: ["business", "menuOptions", "menuOptionGroups"]
            });

            if (!menu) {
                return res.status(404).json({
                    success: false,
                    message: "Producto no encontrado"
                });
            }

            return res.json({
                success: true,
                data: {
                    id: menu.menuId,
                    name: menu.itemName,
                    description: menu.description,
                    price: Number.parseFloat(menu.price || "0"),
                    image: menu.imageUrl,
                    category: menu.category,
                    available: menu.isAvailable,
                    businessId: menu.businessId,
                    options: menu.menuOptions,
                    optionGroups: menu.menuOptionGroups
                }
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // GET /api/menus/business/:businessId
    async getByBusiness(req: Request, res: Response) {
        try {
            const { businessId } = req.params;

            const menus = await this.menuRepo.find({
                where: { 
                    businessId: Number.parseInt(businessId),
                    isAvailable: true 
                },
                order: { category: "ASC", itemName: "ASC" }
            });

            return res.json({
                success: true,
                data: menus.map(m => ({
                    id: m.menuId,
                    name: m.itemName,
                    description: m.description,
                    price: Number.parseFloat(m.price || "0"),
                    image: m.imageUrl,
                    category: m.category,
                    available: m.isAvailable
                }))
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // POST /api/menus
    async create(req: Request, res: Response) {
        try {
            const { 
                business_id, 
                item_name, 
                description, 
                price, 
                image_url,
                category 
            } = req.body;

            const menu = this.menuRepo.create({
                businessId: business_id,
                itemName: item_name,
                description,
                price: price.toString(),
                imageUrl: image_url,
                category,
                isAvailable: true
            });

            await this.menuRepo.save(menu);

            return res.status(201).json({
                success: true,
                message: "Producto creado exitosamente",
                data: {
                    id: menu.menuId,
                    name: menu.itemName,
                    price: Number.parseFloat(menu.price || "0")
                }
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // PUT /api/menus/:id
    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { item_name, description, price, image_url, category, is_available } = req.body;

            const menu = await this.menuRepo.findOne({
                where: { menuId: Number.parseInt(id) }
            });

            if (!menu) {
                return res.status(404).json({
                    success: false,
                    message: "Producto no encontrado"
                });
            }

            if (item_name) menu.itemName = item_name;
            if (description) menu.description = description;
            if (price) menu.price = price.toString();
            if (image_url) menu.imageUrl = image_url;
            if (category) menu.category = category;
            if (typeof is_available === "boolean") menu.isAvailable = is_available;

            await this.menuRepo.save(menu);

            return res.json({
                success: true,
                message: "Producto actualizado",
                data: {
                    id: menu.menuId,
                    name: menu.itemName,
                    price: Number.parseFloat(menu.price || "0")
                }
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // DELETE /api/menus/:id (soft delete)
    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const menu = await this.menuRepo.findOne({
                where: { menuId: Number.parseInt(id) }
            });

            if (!menu) {
                return res.status(404).json({
                    success: false,
                    message: "Producto no encontrado"
                });
            }

            // Soft delete - marcar como no disponible
            menu.isAvailable = false;
            await this.menuRepo.save(menu);

            return res.json({
                success: true,
                message: "Producto eliminado"
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
}