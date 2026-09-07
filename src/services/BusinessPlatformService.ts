import { In } from "typeorm";
import { AppDataSource } from "../utils/db";
import { Business } from "../entities/Business";
import { HttpError } from "../utils/httpError";

export const isBusinessPlatformActive = (status?: string | null) => status !== "suspended";

export class BusinessPlatformService {
  private readonly repository = AppDataSource.getRepository(Business);

  async assertActive(businessId: number) {
    return this.assertActiveMany([businessId]);
  }

  async assertActiveMany(rawBusinessIds: number[]) {
    const businessIds = [...new Set(rawBusinessIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (!businessIds.length) throw new HttpError(400, "Negocio inválido");

    const businesses = await this.repository.find({
      where: { businessId: In(businessIds) },
      select: { businessId: true, platformStatus: true },
    });
    const foundIds = new Set(businesses.map((business) => business.businessId));
    if (businessIds.some((id) => !foundIds.has(id))) throw new HttpError(404, "Negocio no encontrado");
    if (businesses.some((business) => !isBusinessPlatformActive(business.platformStatus))) {
      throw new HttpError(409, "Este negocio está temporalmente suspendido");
    }
  }

  async filterActive<T extends { id?: number; businessId?: number }>(items: T[]) {
    const ids = [...new Set(items.map((item) => Number(item.id ?? item.businessId)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length) return [];

    const businesses = await this.repository.find({
      where: { businessId: In(ids) },
      select: { businessId: true, platformStatus: true },
    });
    const activeIds = new Set(
      businesses
        .filter((business) => isBusinessPlatformActive(business.platformStatus))
        .map((business) => business.businessId),
    );
    return items.filter((item) => activeIds.has(Number(item.id ?? item.businessId)));
  }
}
