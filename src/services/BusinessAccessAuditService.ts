import { AppDataSource } from "../utils/db";
import { AuditLogs } from "../entities/AuditLogs";

export class BusinessAccessAuditService {
  async record(actorUserId: number, action: string, businessId: number, metadata: unknown) {
    const repository = AppDataSource.getRepository(AuditLogs);
    await repository.save(repository.create({
      actorUserId,
      action,
      targetTable: "businesses",
      targetId: businessId,
      beforeJson: null,
      afterJson: JSON.stringify(metadata),
    }));
  }
}

