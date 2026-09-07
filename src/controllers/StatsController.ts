// src/controllers/StatsController.ts
// Controller delgado: parsea HTTP y delega en servicios de analítica.

import { Request, Response, NextFunction } from "express";
import { StatsService } from "../services/StatsService";
import { CustomerIntelligenceService } from "../services/CustomerIntelligenceService";

export class StatsController {
  private readonly service = new StatsService();
  private readonly customerIntelligence = new CustomerIntelligenceService();

  // GET /api/stats/business/:businessId?period=7
  getBusinessStats = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const period = Number.parseInt((req.query.period as string) || "7", 10);
      const data = await this.service.getBusinessStats(businessId, period);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/stats/business/:businessId/customers?period=30
  getCustomerIntelligence = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const period = Number.parseInt((req.query.period as string) || "30", 10);
      const data = await this.customerIntelligence.get(businessId, period);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
