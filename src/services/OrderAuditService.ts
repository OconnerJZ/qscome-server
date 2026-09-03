import { EntityManager } from "typeorm";
import { AppDataSource } from "../utils/db";
import { OrderAuditEvent } from "../entities/OrderAuditEvent";

export interface OrderAuditInput {
  orderId: number;
  businessId?: number | null;
  actorUserId?: number | null;
  actorRole?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | number | null;
  orderVersion?: number | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class OrderAuditService {
  async record(input: OrderAuditInput, manager?: EntityManager) {
    const repo = (manager || AppDataSource.manager).getRepository(OrderAuditEvent);
    const event = repo.create({
      orderId: input.orderId,
      businessId: input.businessId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType || "order",
      entityId: input.entityId == null ? null : String(input.entityId),
      orderVersion: input.orderVersion ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ? input.userAgent.slice(0, 255) : null,
    });
    return repo.save(event);
  }

  async listByOrder(orderId: number) {
    const rows = await AppDataSource.getRepository(OrderAuditEvent).find({
      where: { orderId },
      order: { createdAt: "DESC", auditId: "DESC" },
      take: 250,
    });

    return rows.map((row) => ({
      id: row.auditId,
      orderId: row.orderId,
      businessId: row.businessId,
      actorUserId: row.actorUserId,
      actorRole: row.actorRole,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      orderVersion: row.orderVersion,
      metadata: this.parseMetadata(row.metadataJson),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    }));
  }

  private parseMetadata(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return { unavailable: true };
    }
  }
}
