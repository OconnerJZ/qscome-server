import { NextFunction, Request, Response } from "express";
import { LoyaltyService } from "../services/LoyaltyService";

export class LoyaltyController {
  private readonly service = new LoyaltyService();

  getProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.getProgram(Number.parseInt(req.params.businessId, 10)) });
    } catch (error) { next(error); }
  };

  saveProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: "Programa de lealtad actualizado",
        data: await this.service.saveProgram(Number.parseInt(req.params.businessId, 10), req.body),
      });
    } catch (error) { next(error); }
  };

  getMyProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.service.getCustomerProgress(
          Number((req as any).user?.userId),
          Number.parseInt(req.params.businessId, 10),
        ),
      });
    } catch (error) { next(error); }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.listCustomerPrograms(Number((req as any).user?.userId)) });
    } catch (error) { next(error); }
  };
}
