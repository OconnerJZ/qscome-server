import { AppDataSource } from "../utils/db";
import { MoreThan } from "typeorm";
import { BusinessOwners } from "../entities/BusinessOwners";
import { BusinessInvitations, BusinessInvitationType } from "../entities/BusinessInvitations";
import { Business } from "../entities/Business";
import { Users } from "../entities/Users";
import { BUSINESS_ROLES, BusinessRole, normalizeBusinessRole, permissionsForRole } from "../security/businessRoles";
import {
  createInvitationExpiry, createInvitationSecrets, hashInvitationCode,
  hashInvitationToken, normalizeInvitationEmail, serializeInvitation,
} from "../security/businessInvitation";
import { HttpError } from "../utils/httpError";
import { BusinessAccessAuditService } from "./BusinessAccessAuditService";
import { MEMBER_ROLES } from "./BusinessMembershipService";
import { emitBusinessAccessChanged } from "../utils/socket";
import { BusinessPlanService } from "./BusinessPlanService";

interface CreateInvitationInput {
  email: string;
  role: BusinessRole;
  type: BusinessInvitationType;
  retainPreviousAsCoOwner?: boolean;
}

export class BusinessInvitationService {
  private readonly invitations = AppDataSource.getRepository(BusinessInvitations);
  private readonly memberships = AppDataSource.getRepository(BusinessOwners);
  private readonly audit = new BusinessAccessAuditService();
  private readonly plans = new BusinessPlanService();

  async listPending(businessId: number) {
    const rows = await this.invitations.find({ where: { businessId, status: "pending" }, order: { createdAt: "DESC" } });
    return rows.map(serializeInvitation);
  }

  createMember(businessId: number, actorUserId: number, body: any) {
    return this.create(businessId, actorUserId, { email: body.email, role: body.role, type: "membership" });
  }

  async createTransfer(businessId: number, actorUserId: number, body: any) {
    const [currentOwner, actor] = await Promise.all([
      this.memberships.findOne({ where: { businessId, userId: actorUserId } }),
      AppDataSource.getRepository(Users).findOne({ where: { userId: actorUserId } }),
    ]);
    if (!currentOwner || normalizeBusinessRole(currentOwner.roleInBusiness) !== "primary_owner") {
      throw new HttpError(403, "Sólo el owner principal puede iniciar un traspaso");
    }
    if (normalizeInvitationEmail(body.email) === normalizeInvitationEmail(actor?.email || "")) {
      throw new HttpError(400, "El nuevo owner debe ser otra persona");
    }
    return this.create(businessId, actorUserId, {
      email: body.email,
      role: "primary_owner",
      type: "ownership_transfer",
      retainPreviousAsCoOwner: body.retainPreviousAsCoOwner !== false,
    });
  }

  private async create(businessId: number, actorUserId: number, input: CreateInvitationInput) {
    const email = normalizeInvitationEmail(input.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Email de invitación inválido");
    if (!BUSINESS_ROLES.includes(input.role)) throw new HttpError(400, "Rol de negocio inválido");
    if (input.type === "membership" && !MEMBER_ROLES.includes(input.role)) throw new HttpError(400, "No puedes invitar otro propietario principal");

    if (input.type === "membership") {
      const [members, pending] = await Promise.all([
        this.memberships.count({ where: { businessId } }),
        this.invitations.count({ where: { businessId, status: "pending", expiresAt: MoreThan(new Date()) } }),
      ]);
      await this.plans.assertWithinLimit(businessId, "teamMembers", members + pending);
    }

    const [business, existingUser] = await Promise.all([
      AppDataSource.getRepository(Business).findOne({ where: { businessId } }),
      AppDataSource.getRepository(Users).findOne({ where: { email } }),
    ]);
    if (!business) throw new HttpError(404, "Negocio no encontrado");
    if (input.type === "membership" && existingUser && await this.memberships.findOne({ where: { businessId, userId: existingUser.userId } })) {
      throw new HttpError(409, "Este usuario ya pertenece al negocio");
    }

    await this.invitations.createQueryBuilder().update().set({ status: "cancelled" })
      .where("business_id = :businessId AND invited_email = :email AND status = 'pending'", { businessId, email }).execute();
    const secret = createInvitationSecrets();
    const invitation = await this.invitations.save(this.invitations.create({
      businessId,
      invitedEmail: email,
      roleInBusiness: input.role,
      invitationType: input.type,
      status: "pending",
      tokenHash: hashInvitationToken(secret.token),
      codeHash: hashInvitationCode(secret.code),
      invitedBy: actorUserId,
      acceptedBy: null,
      retainPreviousAsCoOwner: input.retainPreviousAsCoOwner !== false,
      expiresAt: createInvitationExpiry(),
      acceptedAt: null,
    }));
    await this.audit.record(actorUserId, input.type === "ownership_transfer" ? "OWNERSHIP_TRANSFER_INVITED" : "BUSINESS_MEMBER_INVITED", businessId, serializeInvitation(invitation));
    const frontendUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:5173").replace(/\/$/, "");
    return { ...serializeInvitation(invitation), code: secret.code, invitationUrl: `${frontendUrl}/business-invitations/${secret.token}` };
  }

  async preview(token: string) {
    const invitation = await this.invitations.findOne({ where: { tokenHash: hashInvitationToken(token) } });
    if (!invitation) throw new HttpError(404, "Invitación no encontrada");
    const business = await AppDataSource.getRepository(Business).findOne({ where: { businessId: invitation.businessId } });
    return { ...serializeInvitation(invitation), businessName: business?.businessName };
  }

  async acceptToken(token: string, userId: number) {
    return this.accept(await this.invitations.findOne({ where: { tokenHash: hashInvitationToken(token) } }), userId);
  }

  async acceptCode(code: string, userId: number) {
    const user = await AppDataSource.getRepository(Users).findOne({ where: { userId } });
    if (!user?.email) throw new HttpError(400, "Tu cuenta no tiene email");
    const invitation = await this.invitations.findOne({
      where: { codeHash: hashInvitationCode(String(code)), invitedEmail: normalizeInvitationEmail(user.email), status: "pending" },
      order: { createdAt: "DESC" },
    });
    return this.accept(invitation, userId);
  }

  private async accept(invitation: BusinessInvitations | null, userId: number) {
    if (!invitation) throw new HttpError(404, "Invitación no encontrada");
    if (invitation.status !== "pending") throw new HttpError(409, "La invitación ya no está disponible");
    if (invitation.expiresAt.getTime() <= Date.now()) {
      invitation.status = "expired";
      await this.invitations.save(invitation);
      throw new HttpError(410, "La invitación expiró");
    }
    const user = await AppDataSource.getRepository(Users).findOne({ where: { userId } });
    if (!user || normalizeInvitationEmail(user.email || "") !== invitation.invitedEmail) throw new HttpError(403, "Esta invitación corresponde a otro email");

    const accepted = await AppDataSource.transaction(async (manager) => {
      const locked = await manager.getRepository(BusinessInvitations).createQueryBuilder("invitation")
        .setLock("pessimistic_write")
        .where("invitation.invitation_id = :id", { id: invitation.invitationId }).getOne();
      if (!locked || locked.status !== "pending") throw new HttpError(409, "La invitación ya no está disponible");
      if (locked.expiresAt.getTime() <= Date.now()) throw new HttpError(410, "La invitación expiró");

      const repository = manager.getRepository(BusinessOwners);
      let target = await repository.findOne({ where: { businessId: locked.businessId, userId } });
      if (!target) target = repository.create({ businessId: locked.businessId, userId, roleInBusiness: locked.roleInBusiness });
      target.roleInBusiness = locked.roleInBusiness;
      await repository.save(target);
      if (locked.invitationType === "ownership_transfer") {
        const previous = await repository.findOne({ where: { businessId: locked.businessId, userId: locked.invitedBy } });
        if (previous && locked.retainPreviousAsCoOwner) {
          previous.roleInBusiness = "co_owner";
          await repository.save(previous);
        } else if (previous) await repository.remove(previous);
      }
      locked.status = "accepted";
      locked.acceptedBy = userId;
      locked.acceptedAt = new Date();
      return manager.getRepository(BusinessInvitations).save(locked);
    });
    await this.audit.record(userId, accepted.invitationType === "ownership_transfer" ? "OWNERSHIP_TRANSFER_ACCEPTED" : "BUSINESS_INVITATION_ACCEPTED", accepted.businessId, serializeInvitation(accepted));
    await emitBusinessAccessChanged(userId, accepted.businessId, {
      role: accepted.roleInBusiness,
      permissions: permissionsForRole(accepted.roleInBusiness),
    });
    if (accepted.invitationType === "ownership_transfer") {
      await emitBusinessAccessChanged(
        accepted.invitedBy,
        accepted.businessId,
        accepted.retainPreviousAsCoOwner
          ? { role: "co_owner", permissions: permissionsForRole("co_owner") }
          : null,
      );
    }
    return { ...serializeInvitation(accepted), accepted: true };
  }

  async cancel(businessId: number, invitationId: number, actorUserId: number) {
    const invitation = await this.invitations.findOne({ where: { invitationId, businessId } });
    if (!invitation) throw new HttpError(404, "Invitación no encontrada");
    if (invitation.status !== "pending") throw new HttpError(409, "La invitación ya no se puede cancelar");
    invitation.status = "cancelled";
    await this.invitations.save(invitation);
    await this.audit.record(actorUserId, "BUSINESS_INVITATION_CANCELLED", businessId, serializeInvitation(invitation));
  }
}
