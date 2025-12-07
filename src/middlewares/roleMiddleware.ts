import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export const authorize = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Usuario no autenticado" });
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "No tienes permiso para realizar esta acción" });
        }
        
        next();
    };
};
