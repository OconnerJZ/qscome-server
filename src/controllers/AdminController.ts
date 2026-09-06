import { NextFunction, Request, Response } from "express";
import { AdminService } from "../services/AdminService";

export class AdminController {
  private readonly service = new AdminService();

  searchBusinesses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Number.parseInt(String(req.query.limit || "20"), 10);
      res.json({
        success: true,
        data: await this.service.searchBusinesses(String(req.query.q || ""), limit),
      });
    } catch (error) {
      next(error);
    }
  };
}
