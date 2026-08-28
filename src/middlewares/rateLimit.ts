import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware";

interface RateWindow { count: number; resetsAt: number; }

export const createRateLimiter = ({ limit, windowMs, message = "Demasiados intentos. Espera antes de volver a intentarlo." }: { limit: number; windowMs: number; message?: string }) => {
  const windows = new Map<string, RateWindow>();
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.user?.userId || "anonymous"}:${req.ip || "unknown"}`;
    const current = windows.get(key);
    const window = !current || current.resetsAt <= now ? { count: 0, resetsAt: now + windowMs } : current;
    window.count += 1;
    windows.set(key, window);
    if (window.count > limit) {
      res.setHeader("Retry-After", Math.ceil((window.resetsAt - now) / 1000));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
};
