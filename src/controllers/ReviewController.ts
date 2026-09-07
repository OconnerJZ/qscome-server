import { NextFunction, Request, Response } from "express";
import { ReviewService } from "../services/ReviewService";
import { ReviewManagementService } from "../services/ReviewManagementService";
import { ReputationInsightsService } from "../services/ReputationInsightsService";

export class ReviewController {
  constructor(
    private readonly service = new ReviewService(),
    private readonly management = new ReviewManagementService(),
    private readonly insights = new ReputationInsightsService(),
  ) {}

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

  summary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.management.summary(Number.parseInt(req.params.businessId, 10)),
      });
    } catch (error) {
      next(error);
    }
  };

  reputationInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestedPeriod = req.query.period === undefined ? 90 : Number(req.query.period);
      res.json({
        success: true,
        data: await this.insights.get(
          Number.parseInt(req.params.businessId, 10),
          requestedPeriod,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  getForOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.management.getForOrder(
          Number((req as any).user?.userId),
          Number.parseInt(req.params.orderId, 10),
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({
        success: true,
        message: "Reseña publicada correctamente",
        data: await this.management.createVerifiedReview(
          Number((req as any).user?.userId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  respond = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: "Respuesta publicada correctamente",
        data: await this.management.respond(
          Number.parseInt(req.params.businessId, 10),
          Number.parseInt(req.params.reviewId, 10),
          Number((req as any).user?.userId),
          req.body.response,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
}
