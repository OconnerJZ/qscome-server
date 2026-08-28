import { Request, Response, NextFunction } from "express";
import { AuthTokenPayload, verifyAuthToken } from "../utils/authToken";

export interface AuthRequest extends Request {
    user?: AuthTokenPayload;
    businessAccess?: { businessId: number; role: string; permissions: string[] };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }

        req.user = verifyAuthToken(token);
        next();
    } catch(error) {
        return res.status(401).json({ message: "Token inválido o expirado " + error });
    }
};
