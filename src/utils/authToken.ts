import * as jwt from "jsonwebtoken";

export interface AuthTokenPayload extends jwt.JwtPayload {
  userId: number;
  email?: string | null;
  role?: string | null;
}

export const getJwtSecret = () => {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;
  if (["production", "prod"].includes(process.env.NODE_ENV || "")) {
    throw new Error("JWT_SECRET es obligatorio en producción");
  }
  return "development_only_change_me";
};

export const signAuthToken = (payload: AuthTokenPayload) => jwt.sign(
  payload,
  getJwtSecret(),
  { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions,
);

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === "string" || !Number.isInteger(Number(decoded.userId))) {
    throw new Error("Token sin identidad válida");
  }
  return { ...decoded, userId: Number(decoded.userId) } as AuthTokenPayload;
};

