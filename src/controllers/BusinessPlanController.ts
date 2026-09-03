import { NextFunction, Request, Response } from "express";
import { BusinessPlanService } from "../services/BusinessPlanService";

export class BusinessPlanController {
  private readonly service = new BusinessPlanService();
  catalog = async (_req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: this.service.catalog() }); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.get(Number(req.params.id)) }); } catch (error) { next(error); } };
  assign = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.assign(Number(req.params.id), req.body.planCode, Number((req as any).user?.userId), req.body.expectedVersion) }); } catch (error) { next(error); } };
}
