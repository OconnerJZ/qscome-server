import { NextFunction, Request, Response } from "express";
import { AdminAuditService } from "../services/AdminAuditService";

export class AdminAuditController {
  private readonly service = new AdminAuditService();

  summary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await this.service.summary() });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: await this.service.list({
          q: req.query.q,
          action: req.query.action,
          source: req.query.source,
          actorUserId: req.query.actorUserId,
          targetId: req.query.targetId,
          from: req.query.from,
          to: req.query.to,
          limit: req.query.limit,
        }),
      });
    } catch (error) {
      next(error);
    }
  };
}
