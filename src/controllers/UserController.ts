import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Users } from "../entities/Users";

export class UserController {
    private userRepo = AppDataSource.getRepository(Users);

    // GET /api/users
    async getAll(req: Request, res: Response) {
        try {
            const users = await this.userRepo.find({
                relations: ["role"],
                select: {
                    userId: true,
                    userName: true,
                    email: true,
                    phone: true,
                    avatarUrl: true,
                    createdAt: true,
                    isSubscribed: true
                }
            });

            return res.json({
                success: true,
                data: users.map(u => ({
                    id: u.userId,
                    name: u.userName,
                    email: u.email,
                    phone: u.phone,
                    avatar: u.avatarUrl,
                    role: u.role?.roleName,
                    isSubscribed: u.isSubscribed,
                    createdAt: u.createdAt
                }))
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // GET /api/users/:id
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const user = await this.userRepo.findOne({
                where: { userId: Number.parseInt(id) },
                relations: ["role", "userAddresses"]
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Usuario no encontrado"
                });
            }

            return res.json({
                success: true,
                data: {
                    id: user.userId,
                    name: user.userName,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatarUrl,
                    role: user.role?.roleName,
                    isSubscribed: user.isSubscribed,
                    addresses: user.userAddresses,
                    createdAt: user.createdAt
                }
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // PUT /api/users/:id
    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { user_name, phone, avatar_url } = req.body;

            const user = await this.userRepo.findOne({
                where: { userId: Number.parseInt(id) }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Usuario no encontrado"
                });
            }

            // Actualizar solo campos permitidos
            if (user_name) user.userName = user_name;
            if (phone) user.phone = phone;
            if (avatar_url) user.avatarUrl = avatar_url;

            await this.userRepo.save(user);

            return res.json({
                success: true,
                message: "Usuario actualizado",
                data: {
                    id: user.userId,
                    name: user.userName,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatarUrl
                }
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // DELETE /api/users/:id (soft delete)
    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const user = await this.userRepo.findOne({
                where: { userId: Number.parseInt(id) }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Usuario no encontrado"
                });
            }

            // Soft delete - podrías agregar un campo 'deleted_at'
            await this.userRepo.remove(user);

            return res.json({
                success: true,
                message: "Usuario eliminado"
            });
        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
}