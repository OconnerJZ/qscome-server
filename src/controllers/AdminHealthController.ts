import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AdminHealthService } from "../services/AdminHealthService";

export class AdminHealthController {
  private readonly service = new AdminHealthService();

  snapshot = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.snapshot() });
    } catch (error) {
      next(error);
    }
  };
}
