import { Request, Response, NextFunction } from "express";
import { AuthTokenPayload } from "../utils/authToken";
import { AuthIdentityService } from "../services/AuthIdentityService";

const identityService = new AuthIdentityService();

export interface AuthRequest extends Request {
    user?: AuthTokenPayload;
    businessAccess?: { businessId: number; role: string; permissions: readonly string[] };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }

        const identity = await identityService.resolve(token);
        if (!identity) {
            return res.status(401).json({ message: "La cuenta ya no está disponible" });
        }
        req.user = identity;
        next();
    } catch {
        return res.status(401).json({ message: "Token inválido o expirado" });
    }
};
