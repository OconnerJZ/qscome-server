import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Menu } from "../entities/Entities";

const menuRepo = AppDataSource.getRepository(Menu);

export const getMenusByBusiness = async (req: Request, res: Response) => {
    try {
        const menus = await menuRepo.find({
            where: { business: { business_id: parseInt(req.params.businessId) } },
            relations: ["optionGroups", "optionGroups.choices"]
        });

        res.json(menus);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener menú", error });
    }
};

export const getMenuById = async (req: Request, res: Response) => {
    try {
        const menu = await menuRepo.findOne({
            where: { menu_id: parseInt(req.params.id) },
            relations: ["business", "optionGroups", "optionGroups.choices"]
        });

        if (!menu) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.json(menu);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener producto", error });
    }
};

export const createMenu = async (req: Request, res: Response) => {
    try {
        const newMenu = menuRepo.create(req.body);
        await menuRepo.save(newMenu);
        res.status(201).json({ message: "Producto creado", menu: newMenu });
    } catch (error) {
        res.status(500).json({ message: "Error al crear producto", error });
    }
};

export const updateMenu = async (req: Request, res: Response) => {
    try {
        const menu = await menuRepo.findOne({
            where: { menu_id: parseInt(req.params.id) }
        });

        if (!menu) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        menuRepo.merge(menu, req.body);
        await menuRepo.save(menu);

        res.json({ message: "Producto actualizado", menu });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar producto", error });
    }
};

export const deleteMenu = async (req: Request, res: Response) => {
    try {
        const result = await menuRepo.delete(parseInt(req.params.id));

        if (result.affected === 0) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.json({ message: "Producto eliminado" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar producto", error });
    }
};
