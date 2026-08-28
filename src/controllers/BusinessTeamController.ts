import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { BusinessTeamService } from "../services/BusinessTeamService";

export class BusinessTeamController {
  private readonly service = new BusinessTeamService();
  list = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.list(Number(req.params.id)) }); } catch (error) { next(error); } };
  invite = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await this.service.createMemberInvitation(Number(req.params.id), req.user!.userId, req.body) }); } catch (error) { next(error); } };
  transfer = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await this.service.createOwnershipTransfer(Number(req.params.id), req.user!.userId, req.body) }); } catch (error) { next(error); } };
  preview = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.preview(req.params.token) }); } catch (error) { next(error); } };
  accept = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.acceptByToken(req.params.token, req.user!.userId) }); } catch (error) { next(error); } };
  acceptCode = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.acceptByCode(req.body.code, req.user!.userId) }); } catch (error) { next(error); } };
  cancel = async (req: AuthRequest, res: Response, next: NextFunction) => { try { await this.service.cancel(Number(req.params.id), Number(req.params.invitationId), req.user!.userId); res.json({ success: true }); } catch (error) { next(error); } };
  updateMember = async (req: AuthRequest, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.updateMember(Number(req.params.id), Number(req.params.userId), req.body.role, req.user!.userId) }); } catch (error) { next(error); } };
  removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => { try { await this.service.removeMember(Number(req.params.id), Number(req.params.userId), req.user!.userId); res.json({ success: true }); } catch (error) { next(error); } };
}

