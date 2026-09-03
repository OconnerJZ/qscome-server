import { Users } from "../entities/Users";
import { AuthTokenPayload, verifyAuthToken } from "../utils/authToken";
import { AppDataSource } from "../utils/db";

export class AuthIdentityService {
  async resolve(token: string): Promise<AuthTokenPayload | null> {
    const payload = verifyAuthToken(token);
    const user = await AppDataSource.getRepository(Users).findOne({
      where: { userId: payload.userId },
      relations: ["role"],
    });
    if (!user) return null;
    return {
      ...payload,
      email: user.email,
      role: user.role?.roleName || "customer",
    };
  }
}

