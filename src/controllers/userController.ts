import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { User } from "../entities/User";

const userRepo = AppDataSource.getRepository(User);

export const getAllUsers = async (req: Request, res: Response) => {
    const users = await userRepo.find();
    res.json(users);
};

export const getUserById = async (req: Request, res: Response) => {
    const user = await userRepo.findOne({ where: { user_id: Number.parseInt(req.params.id) } });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
};

export const createUser = async (req: Request, res: Response) => {
    const newUser = userRepo.create(req.body);
    await userRepo.save(newUser);
    res.status(201).json({ message: "Usuario creado", user: newUser });
};

export const updateUser = async (req: Request, res: Response) => {
    const user = await userRepo.findOne({ where: { user_id: Number.parseInt(req.params.id) } });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    userRepo.merge(user, req.body);
    await userRepo.save(user);
    res.json({ message: "Usuario actualizado", user });
};
