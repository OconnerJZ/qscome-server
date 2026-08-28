import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { AppDataSource } from "../utils/db";
import { BusinessOwners } from "../entities/BusinessOwners";
import { BusinessInvitations, BusinessInvitationType } from "../entities/BusinessInvitations";
import { AuditLogs } from "../entities/AuditLogs";
import { Business } from "../entities/Business";
import { Users } from "../entities/Users";
import { BUSINESS_ROLES, BusinessRole, normalizeBusinessRole, permissionsForRole } from "../security/businessAccess";
import { getJwtSecret } from "../utils/authToken";
import { HttpError } from "../utils/httpError";

const MEMBER_ROLES: BusinessRole[] = ["co_owner", "manager", "kitchen", "cashier"];
const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const codeHash = (code: string) => createHmac("sha256", getJwtSecret()).update(code).digest("hex");
const invitationExpiry = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const safeInvitation = (invitation: BusinessInvitations) => ({
  id: invitation.invitationId,
  businessId: invitation.businessId,
  email: invitation.invitedEmail,
  role: invitation.roleInBusiness,
  type: invitation.invitationType,
  status: invitation.status,
  expiresAt: invitation.expiresAt,
  createdAt: invitation.createdAt,
  retainPreviousAsCoOwner: Boolean(invitation.retainPreviousAsCoOwner),
});

export class BusinessTeamService {
  private readonly membershipRepo = AppDataSource.getRepository(BusinessOwners);
  private readonly invitationRepo = AppDataSource.getRepository(BusinessInvitations);

  private async audit(actorUserId: number, action: string, businessId: number, after: unknown) {
    await AppDataSource.getRepository(AuditLogs).save(AppDataSource.getRepository(AuditLogs).create({
      actorUserId,
      action,
      targetTable: "businesses",
      targetId: businessId,
      beforeJson: null,
      afterJson: JSON.stringify(after),
    }));
  }

  async list(businessId: number) {
    const [memberships, invitations] = await Promise.all([
      this.membershipRepo.find({ where: { businessId }, relations: ["user"], order: { createdAt: "ASC" } }),
      this.invitationRepo.find({ where: { businessId, status: "pending" }, order: { createdAt: "DESC" } }),
    ]);
    return {
      members: memberships.map((membership) => ({
        id: membership.ownerId,
        userId: membership.userId,
        name: membership.user?.userName,
        email: membership.user?.email,
        avatar: membership.user?.avatarUrl,
        role: normalizeBusinessRole(membership.roleInBusiness),
        permissions: permissionsForRole(membership.roleInBusiness),
        joinedAt: membership.createdAt,
      })),
      invitations: invitations.map(safeInvitation),
    };
  }

  private async createInvitation(
    businessId: number,
    actorUserId: number,
    input: { email: string; role: BusinessRole; type: BusinessInvitationType; retainPreviousAsCoOwner?: boolean },
  ) {
    const email = normalizeEmail(input.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Email de invitación inválido");
    if (!BUSINESS_ROLES.includes(input.role)) throw new HttpError(400, "Rol de negocio inválido");
    if (input.type === "membership" && !MEMBER_ROLES.includes(input.role)) throw new HttpError(400, "No puedes invitar otro propietario principal");

    const business = await AppDataSource.getRepository(Business).findOne({ where: { businessId } });
    if (!business) throw new HttpError(404, "Negocio no encontrado");
    const existingUser = await AppDataSource.getRepository(Users).findOne({ where: { email } });
    if (input.type === "membership" && existingUser && await this.membershipRepo.findOne({ where: { businessId, userId: existingUser.userId } })) {
      throw new HttpError(409, "Este usuario ya pertenece al negocio");
    }
    await this.invitationRepo.createQueryBuilder().update().set({ status: "cancelled" }).where("business_id = :businessId AND invited_email = :email AND status = 'pending'", { businessId, email }).execute();

    const rawToken = randomBytes(32).toString("hex");
    const rawCode = String(randomInt(100000, 1000000));
    const invitation = await this.invitationRepo.save(this.invitationRepo.create({
      businessId,
      invitedEmail: email,
      roleInBusiness: input.role,
      invitationType: input.type,
      status: "pending",
      tokenHash: tokenHash(rawToken),
      codeHash: codeHash(rawCode),
      invitedBy: actorUserId,
      acceptedBy: null,
      retainPreviousAsCoOwner: input.retainPreviousAsCoOwner !== false,
      expiresAt: invitationExpiry(),
      acceptedAt: null,
    }));
    await this.audit(actorUserId, input.type === "ownership_transfer" ? "OWNERSHIP_TRANSFER_INVITED" : "BUSINESS_MEMBER_INVITED", businessId, safeInvitation(invitation));

    const frontendUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:5173").replace(/\/$/, "");
    return { ...safeInvitation(invitation), code: rawCode, invitationUrl: `${frontendUrl}/business-invitations/${rawToken}` };
  }

  createMemberInvitation(businessId: number, actorUserId: number, body: any) {
    return this.createInvitation(businessId, actorUserId, { email: body.email, role: body.role, type: "membership" });
  }

  async createOwnershipTransfer(businessId: number, actorUserId: number, body: any) {
    const currentOwner = await this.membershipRepo.findOne({ where: { businessId, userId: actorUserId } });
    if (!currentOwner || normalizeBusinessRole(currentOwner.roleInBusiness) !== "primary_owner") {
      throw new HttpError(403, "Sólo el owner principal puede iniciar un traspaso");
    }
    if (normalizeEmail(body.email) === normalizeEmail((await AppDataSource.getRepository(Users).findOne({ where: { userId: actorUserId } }))?.email || "")) {
      throw new HttpError(400, "El nuevo owner debe ser otra persona");
    }
    return this.createInvitation(businessId, actorUserId, {
      email: body.email,
      role: "primary_owner",
      type: "ownership_transfer",
      retainPreviousAsCoOwner: body.retainPreviousAsCoOwner !== false,
    });
  }

  async preview(token: string) {
    const invitation = await this.invitationRepo.findOne({ where: { tokenHash: tokenHash(token) } });
    if (!invitation) throw new HttpError(404, "Invitación no encontrada");
    const business = await AppDataSource.getRepository(Business).findOne({ where: { businessId: invitation.businessId } });
    return { ...safeInvitation(invitation), businessName: business?.businessName };
  }

  async acceptByToken(token: string, userId: number) {
    const invitation = await this.invitationRepo.findOne({ where: { tokenHash: tokenHash(token) } });
    return this.accept(invitation, userId);
  }

  async acceptByCode(code: string, userId: number) {
    const user = await AppDataSource.getRepository(Users).findOne({ where: { userId } });
    if (!user?.email) throw new HttpError(400, "Tu cuenta no tiene email");
    const invitation = await this.invitationRepo.findOne({
      where: { codeHash: codeHash(String(code)), invitedEmail: normalizeEmail(user.email), status: "pending" },
      order: { createdAt: "DESC" },
    });
    return this.accept(invitation, userId);
  }

  private async accept(invitation: BusinessInvitations | null, userId: number) {
    if (!invitation) throw new HttpError(404, "Invitación no encontrada");
    if (invitation.status !== "pending") throw new HttpError(409, "La invitación ya no está disponible");
    if (invitation.expiresAt.getTime() <= Date.now()) {
      invitation.status = "expired";
      await this.invitationRepo.save(invitation);
      throw new HttpError(410, "La invitación expiró");
    }
    const user = await AppDataSource.getRepository(Users).findOne({ where: { userId } });
    if (!user || normalizeEmail(user.email || "") !== invitation.invitedEmail) throw new HttpError(403, "Esta invitación corresponde a otro email");

    const acceptedInvitation = await AppDataSource.transaction(async (manager) => {
      const lockedInvitation = await manager.getRepository(BusinessInvitations).createQueryBuilder("invitation")
        .setLock("pessimistic_write")
        .where("invitation.invitation_id = :invitationId", { invitationId: invitation.invitationId })
        .getOne();
      if (!lockedInvitation || lockedInvitation.status !== "pending") throw new HttpError(409, "La invitación ya no está disponible");
      if (lockedInvitation.expiresAt.getTime() <= Date.now()) {
        lockedInvitation.status = "expired";
        await manager.getRepository(BusinessInvitations).save(lockedInvitation);
        throw new HttpError(410, "La invitación expiró");
      }
      const memberships = manager.getRepository(BusinessOwners);
      let target = await memberships.findOne({ where: { businessId: lockedInvitation.businessId, userId } });
      if (!target) target = memberships.create({ businessId: lockedInvitation.businessId, userId, roleInBusiness: lockedInvitation.roleInBusiness });
      target.roleInBusiness = lockedInvitation.roleInBusiness;
      await memberships.save(target);

      if (lockedInvitation.invitationType === "ownership_transfer") {
        const previous = await memberships.findOne({ where: { businessId: lockedInvitation.businessId, userId: lockedInvitation.invitedBy } });
        if (previous) {
          if (lockedInvitation.retainPreviousAsCoOwner) {
            previous.roleInBusiness = "co_owner";
            await memberships.save(previous);
          } else {
            await memberships.remove(previous);
          }
        }
      }
      lockedInvitation.status = "accepted";
      lockedInvitation.acceptedBy = userId;
      lockedInvitation.acceptedAt = new Date();
      return manager.getRepository(BusinessInvitations).save(lockedInvitation);
    });
    await this.audit(userId, acceptedInvitation.invitationType === "ownership_transfer" ? "OWNERSHIP_TRANSFER_ACCEPTED" : "BUSINESS_INVITATION_ACCEPTED", acceptedInvitation.businessId, safeInvitation(acceptedInvitation));
    return { ...safeInvitation(acceptedInvitation), accepted: true };
  }

  async cancel(businessId: number, invitationId: number, actorUserId: number) {
    const invitation = await this.invitationRepo.findOne({ where: { invitationId, businessId } });
    if (!invitation) throw new HttpError(404, "Invitación no encontrada");
    if (invitation.status !== "pending") throw new HttpError(409, "La invitación ya no se puede cancelar");
    invitation.status = "cancelled";
    await this.invitationRepo.save(invitation);
    await this.audit(actorUserId, "BUSINESS_INVITATION_CANCELLED", businessId, safeInvitation(invitation));
  }

  async updateMember(businessId: number, targetUserId: number, role: BusinessRole, actorUserId: number) {
    if (!MEMBER_ROLES.includes(role)) throw new HttpError(400, "Rol inválido para un colaborador");
    const membership = await this.membershipRepo.findOne({ where: { businessId, userId: targetUserId } });
    if (!membership) throw new HttpError(404, "Colaborador no encontrado");
    if (normalizeBusinessRole(membership.roleInBusiness) === "primary_owner") throw new HttpError(409, "Transfiere la propiedad para cambiar al propietario principal");
    const previousRole = normalizeBusinessRole(membership.roleInBusiness);
    membership.roleInBusiness = role;
    await this.membershipRepo.save(membership);
    await this.audit(actorUserId, "BUSINESS_MEMBER_ROLE_CHANGED", businessId, { userId: targetUserId, previousRole, role });
    return { userId: targetUserId, role, permissions: permissionsForRole(role) };
  }

  async removeMember(businessId: number, targetUserId: number, actorUserId: number) {
    const membership = await this.membershipRepo.findOne({ where: { businessId, userId: targetUserId } });
    if (!membership) throw new HttpError(404, "Colaborador no encontrado");
    if (normalizeBusinessRole(membership.roleInBusiness) === "primary_owner") throw new HttpError(409, "No puedes eliminar al propietario principal");
    await this.membershipRepo.remove(membership);
    await this.audit(actorUserId, "BUSINESS_MEMBER_REMOVED", businessId, { userId: targetUserId, role: normalizeBusinessRole(membership.roleInBusiness) });
  }
}
