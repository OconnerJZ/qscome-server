import { EntityManager } from "typeorm";
import { AppDataSource } from "../utils/db";
import { SharedOrderAuditEvent } from "../entities/SharedOrderAuditEvent";

export class SharedOrderAuditService {
  async record(sessionId: string, actorUserId: number | null, action: string, sessionVersion: number | null, metadata: Record<string, unknown> | null, manager?: EntityManager) {
    const repo = (manager || AppDataSource.manager).getRepository(SharedOrderAuditEvent);
    return repo.save(repo.create({ sessionId, actorUserId, action, sessionVersion, metadataJson: metadata ? JSON.stringify(metadata) : null }));
  }

  async list(sessionId: string) {
    const rows = await AppDataSource.getRepository(SharedOrderAuditEvent).find({ where: { sessionId }, order: { createdAt: "DESC", auditId: "DESC" }, take: 250 });
    return rows.map((row) => ({ id: row.auditId, action: row.action, actorUserId: row.actorUserId, version: row.sessionVersion, metadata: this.parse(row.metadataJson), createdAt: row.createdAt }));
  }

  private parse(value: string | null) { try { return value ? JSON.parse(value) : null; } catch { return { unavailable: true }; } }
}
