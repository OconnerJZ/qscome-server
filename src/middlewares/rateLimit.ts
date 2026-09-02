import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware";

interface RateWindow { count: number; resetsAt: number; }
interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  message?: string;
  keyGenerator?: (req: AuthRequest) => string;
}

const defaultKey = (req: AuthRequest) =>
  req.user?.userId ? `user:${req.user.userId}` : `ip:${req.ip || "unknown"}`;

export const createRateLimiter = ({
  limit,
  windowMs,
  message = "Demasiados intentos. Espera antes de volver a intentarlo.",
  keyGenerator = defaultKey,
}: RateLimiterOptions) => {
  const windows = new Map<string, RateWindow>();
  let nextCleanupAt = 0;

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (now >= nextCleanupAt) {
      for (const [key, value] of windows) if (value.resetsAt <= now) windows.delete(key);
      nextCleanupAt = now + Math.min(windowMs, 60_000);
    }

    const key = keyGenerator(req) || defaultKey(req);
    const current = windows.get(key);
    const window = !current || current.resetsAt <= now ? { count: 0, resetsAt: now + windowMs } : current;
    window.count += 1;
    windows.set(key, window);

    res.setHeader("RateLimit-Limit", limit);
    res.setHeader("RateLimit-Remaining", Math.max(0, limit - window.count));
    res.setHeader("RateLimit-Reset", Math.ceil(window.resetsAt / 1000));
    if (window.count > limit) {
      res.setHeader("Retry-After", Math.ceil((window.resetsAt - now) / 1000));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
};
