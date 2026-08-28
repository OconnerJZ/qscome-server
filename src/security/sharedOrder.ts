import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { getJwtSecret } from "../utils/authToken";

export type SharedOrderCodeLength = 4 | 6;
export const normalizeSharedOrderCode = (value: unknown) => String(value || "").replace(/\D/g, "");
export const hashSharedOrderCode = (code: string) => createHmac("sha256", getJwtSecret()).update(normalizeSharedOrderCode(code)).digest("hex");
export const hashSharedOrderToken = (token: string) => createHash("sha256").update(String(token || "")).digest("hex");
export const createSharedOrderSecrets = (length: SharedOrderCodeLength = 6) => ({
  code: Array.from({ length }, () => String(randomInt(0, 10))).join(""),
  token: randomBytes(32).toString("hex"),
});
export const sharedParticipantLabel = (sequence: number) => `Empaquetado ${sequence}`;
export const createSharedOrderExpiry = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
