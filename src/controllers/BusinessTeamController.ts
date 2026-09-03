import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { BusinessInvitationService } from "../services/BusinessInvitationService";
import { BusinessMembershipService } from "../services/BusinessMembershipService";

export class BusinessTeamController {
  private readonly invitations = new BusinessInvitationService();
  private readonly memberships = new BusinessMembershipService();

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const businessId = Number(req.params.id);
      const [members, invitations] = await Promise.all([
        this.memberships.list(businessId),
        this.invitations.listPending(businessId),
      ]);
      res.json({ success: true, data: { members, invitations } });
    } catch (error) { next(error); }
  };

  invite = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.invitations.createMember(Number(req.params.id), req.user!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  };

  transfer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.invitations.createTransfer(Number(req.params.id), req.user!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  };

  preview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.invitations.preview(req.params.token) }); }
    catch (error) { next(error); }
  };

  accept = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.invitations.acceptToken(req.params.token, req.user!.userId) }); }
    catch (error) { next(error); }
  };

  acceptCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.invitations.acceptCode(req.body.code, req.user!.userId) }); }
    catch (error) { next(error); }
  };

  cancel = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.invitations.cancel(Number(req.params.id), Number(req.params.invitationId), req.user!.userId);
      res.json({ success: true });
    } catch (error) { next(error); }
  };

  updateMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.memberships.updateRole(Number(req.params.id), Number(req.params.userId), req.body.role, req.user!.userId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.memberships.remove(Number(req.params.id), Number(req.params.userId), req.user!.userId);
      res.json({ success: true });
    } catch (error) { next(error); }
  };
}
