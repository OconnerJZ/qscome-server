import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Business } from "../entities/Entities";

const businessRepo = AppDataSource.getRepository(Business);

export const getAllBusinesses = async (req: Request, res: Response) => {
    try {
        const businesses = await businessRepo.find({
            relations: ["locations", "deliverySettings", "paymentMethods"]
        });
        res.json(businesses);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener negocios", error });
    }
};

export const getBusinessById = async (req: Request, res: Response) => {
    try {
        const business = await businessRepo.findOne({
            where: { business_id: parseInt(req.params.id) },
            relations: ["locations", "menus", "deliverySettings", "paymentMethods", "reviews"]
        });

        if (!business) {
            return res.status(404).json({ message: "Negocio no encontrado" });
        }

        res.json(business);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener negocio", error });
    }
};

export const createBusiness = async (req: Request, res: Response) => {
    try {
        const newBusiness = businessRepo.create(req.body);
        await businessRepo.save(newBusiness);
        res.status(201).json({ message: "Negocio creado", business: newBusiness });
    } catch (error) {
        res.status(500).json({ message: "Error al crear negocio", error });
    }
};

export const updateBusiness = async (req: Request, res: Response) => {
    try {
        const business = await businessRepo.findOne({
            where: { business_id: parseInt(req.params.id) }
        });

        if (!business) {
            return res.status(404).json({ message: "Negocio no encontrado" });
        }

        businessRepo.merge(business, req.body);
        await businessRepo.save(business);

        res.json({ message: "Negocio actualizado", business });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar negocio", error });
    }
};

export const deleteBusiness = async (req: Request, res: Response) => {
    try {
        const result = await businessRepo.delete(parseInt(req.params.id));

        if (result.affected === 0) {
            return res.status(404).json({ message: "Negocio no encontrado" });
        }

        res.json({ message: "Negocio eliminado" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar negocio", error });
    }
};
