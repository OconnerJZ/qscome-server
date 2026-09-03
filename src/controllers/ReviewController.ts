import { NextFunction, Request, Response } from "express";
import { ReviewService } from "../services/ReviewService";

export class ReviewController {
  constructor(private readonly service = new ReviewService()) {}

  listByBusiness = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const businessId = Number.parseInt(req.params.businessId, 10);
      const data = await this.service.listByBusiness(businessId);
      res.json({
        success: true,
        message: data.length
          ? "Reseñas consultadas correctamente"
          : "Este negocio aún no tiene reseñas",
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
