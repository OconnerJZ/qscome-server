import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { User } from "../entities/Entities";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from 'jsonwebtoken';
const userRepo = AppDataSource.getRepository(User);

export const register = async (req: Request, res: Response): Promise<any> => {
    try {
        const { user_name, email, password, phone, role_name } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await userRepo.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "El email ya está registrado" });
        }

        // Hash de la contraseña
        const password_hash = await bcrypt.hash(password, 10);

        // Crear usuario (por ahora sin role_id, ya que no tenemos la tabla roles conectada aún)
        const newUser = userRepo.create({
            user_name,
            email,
            password_hash,
            phone,
            role_id: 3, // customer por defecto
            auth_provider: 'local'
        });

        await userRepo.save(newUser);

        // No devolver el password_hash
        const { password_hash: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            message: "Usuario registrado exitosamente",
            user: userWithoutPassword
        });
    } catch (error) {
        console.error("Error en register:", error);
        res.status(500).json({ message: "Error al registrar usuario", error });
    }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;

        // Buscar usuario con contraseña
        const user = await userRepo
            .createQueryBuilder("user")
            .addSelect("user.password_hash")
            .where("user.email = :email", { email })
            .getOne();

        if (!user || !user.password_hash) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        // Verificar contraseña
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }
        
// Generar JWT
        const token = jwt.sign({ 
            user_id: user.user_id, 
            email: user.email, 
            role_id: user.role_id 
        },
        process.env.JWT_SECRET || "secret_key",
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions
        );

        // No devolver el password_hash
        const { password_hash: _, ...userWithoutPassword } = user;

        res.json({
            message: "Login exitoso",
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error al iniciar sesión", error });
    }
};