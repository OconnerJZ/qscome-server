import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AdminPaymentsService } from "../services/AdminPaymentsService";

export class AdminPaymentsController {
  private readonly service = new AdminPaymentsService();

  summary = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.summary() });
    } catch (error) {
      next(error);
    }
  };

  transfers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.service.transfers({
          q: req.query.q,
          status: req.query.status,
          businessId: req.query.businessId,
          limit: req.query.limit,
        }),
      });
    } catch (error) {
      next(error);
    }
  };

  detail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.service.detail(Number(req.params.orderId)),
      });
    } catch (error) {
      next(error);
    }
  };
}
