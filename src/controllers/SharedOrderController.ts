import { NextFunction, Request, Response } from "express";
import { SharedOrderService } from "../services/SharedOrderService";
import { SharedOrderCodeLength } from "../security/sharedOrder";

export class SharedOrderController {
  private readonly service = new SharedOrderService();
  private userId(req: Request) { return Number((req as any).user?.userId); }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await this.service.create(this.userId(req), req.body.title, Number(req.body.codeLength || 6) as SharedOrderCodeLength) }); } catch (error) { next(error); }
  };
  joinCode = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.joinByCode(req.body.code, this.userId(req)) }); } catch (error) { next(error); }
  };
  joinToken = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.joinByToken(req.params.token, this.userId(req)) }); } catch (error) { next(error); }
  };
  active = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getActive(this.userId(req)) }); } catch (error) { next(error); }
  };
  get = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.get(req.params.id, this.userId(req)) }); } catch (error) { next(error); }
  };
  audit = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getAudit(req.params.id, this.userId(req)) }); } catch (error) { next(error); }
  };
  addItem = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await this.service.addItem(req.params.id, this.userId(req), req.body) }); } catch (error) { next(error); }
  };
  addItems = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await this.service.addItems(req.params.id, this.userId(req), req.body) }); } catch (error) { next(error); }
  };
  updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.updateItem(req.params.id, Number(req.params.itemId), this.userId(req), req.body) }); } catch (error) { next(error); }
  };
  deleteItem = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.deleteItem(req.params.id, Number(req.params.itemId), this.userId(req), Number(req.body.expectedVersion)) }); } catch (error) { next(error); }
  };
  rotate = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.rotateSecrets(req.params.id, this.userId(req), Number(req.body.expectedVersion), Number(req.body.codeLength) as SharedOrderCodeLength) }); } catch (error) { next(error); }
  };
  leave = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.leave(req.params.id, this.userId(req), Number(req.body.expectedVersion)) }); } catch (error) { next(error); }
  };
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.cancel(req.params.id, this.userId(req), Number(req.body.expectedVersion)) }); } catch (error) { next(error); }
  };
  submit = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await this.service.submit(req.params.id, this.userId(req), Number(req.body.expectedVersion), req.body.checkout || []) }); } catch (error) { next(error); }
  };
}
