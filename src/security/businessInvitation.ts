import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { BusinessInvitations } from "../entities/BusinessInvitations";
import { getJwtSecret } from "../utils/authToken";

export const normalizeInvitationEmail = (email: string) => String(email || "").trim().toLowerCase();
export const normalizeInvitationCode = (code: string) => String(code || "").trim().toUpperCase();
export const hashInvitationToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const hashInvitationCode = (code: string) => createHmac("sha256", getJwtSecret()).update(normalizeInvitationCode(code)).digest("hex");
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const createReadableCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]).join("");
export const createInvitationSecrets = () => ({
  token: randomBytes(32).toString("hex"),
  code: createReadableCode(),
});
export const createInvitationExpiry = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

export const serializeInvitation = (invitation: BusinessInvitations) => ({
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
