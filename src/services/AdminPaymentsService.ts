import { AppDataSource } from "../utils/db";
import { TransferPaymentEvidence } from "../entities/TransferPaymentEvidence";
import { TransferReviewStatus } from "../entities/OrderTransferPayment";
import { HttpError } from "../utils/httpError";
import { OrderAuditService } from "./OrderAuditService";

const TRANSFER_STATUSES: TransferReviewStatus[] = ["reported", "reviewed", "requires_clarification"];

export interface AdminTransferFilters {
  q: string;
  status: TransferReviewStatus | null;
  businessId: number | null;
  limit: number;
}

export const normalizeAdminTransferFilters = (input: {
  q?: unknown;
  status?: unknown;
  businessId?: unknown;
  limit?: unknown;
}): AdminTransferFilters => {
  const q = String(input.q || "").trim().slice(0, 120);
  const rawStatus = String(input.status || "").trim();
  const status = rawStatus ? rawStatus as TransferReviewStatus : null;
  if (status && !TRANSFER_STATUSES.includes(status)) {
    throw new HttpError(400, "Estado de revisión inválido");
  }

  const rawBusinessId = input.businessId == null || input.businessId === ""
    ? null
    : Number(input.businessId);
  if (rawBusinessId !== null && (!Number.isInteger(rawBusinessId) || rawBusinessId < 1)) {
    throw new HttpError(400, "Negocio inválido");
  }

  const parsedLimit = Number(input.limit || 50);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(100, Math.max(1, Math.trunc(parsedLimit)))
    : 50;

  return { q, status, businessId: rawBusinessId, limit };
};

export class AdminPaymentsService {
  private readonly audit = new OrderAuditService();

  async summary() {
    const [transferRows, evidenceRows] = await Promise.all([
      AppDataSource.query(`
        SELECT
          COUNT(*) AS total,
          SUM(review_status = 'reported') AS reported,
          SUM(review_status = 'reviewed') AS reviewed,
          SUM(review_status = 'requires_clarification') AS requires_clarification,
          SUM(latest_evidence_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS recent_evidence_7d
        FROM order_transfer_payments
      `),
      AppDataSource.query(`
        SELECT
          COUNT(*) AS total_evidences,
          SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS evidences_7d
        FROM transfer_payment_evidences
      `),
    ]);

    const transfer = transferRows?.[0] || {};
    const evidence = evidenceRows?.[0] || {};
    return {
      transfers: {
        total: Number(transfer.total || 0),
        reported: Number(transfer.reported || 0),
        reviewed: Number(transfer.reviewed || 0),
        requiresClarification: Number(transfer.requires_clarification || 0),
        withRecentEvidence7d: Number(transfer.recent_evidence_7d || 0),
      },
      evidences: {
        total: Number(evidence.total_evidences || 0),
        addedLast7d: Number(evidence.evidences_7d || 0),
      },
      policy: {
        adminReadOnly: true,
        ownerReviewRemainsAuthoritative: true,
        preparationBlockedByReview: false,
      },
    };
  }

  async transfers(rawInput: {
    q?: unknown;
    status?: unknown;
    businessId?: unknown;
    limit?: unknown;
  }) {
    const input = normalizeAdminTransferFilters(rawInput);
    const where: string[] = [];
    const params: unknown[] = [];

    if (input.status) {
      where.push("tp.review_status = ?");
      params.push(input.status);
    }
    if (input.businessId) {
      where.push("o.business_id = ?");
      params.push(input.businessId);
    }
    if (input.q) {
      const like = `%${input.q}%`;
      where.push(`(
        CAST(tp.order_id AS CHAR) LIKE ? OR
        b.business_name LIKE ? OR
        COALESCE(o.customer_name, customer.user_name, '') LIKE ? OR
        COALESCE(customer.email, '') LIKE ?
      )`);
      params.push(like, like, like, like);
    }

    const rows = await AppDataSource.query(`
      SELECT
        tp.transfer_payment_id AS transferPaymentId,
        tp.order_id AS orderId,
        tp.review_status AS reviewStatus,
        tp.client_confirmed_at AS clientConfirmedAt,
        tp.latest_evidence_at AS latestEvidenceAt,
        tp.reviewed_at AS reviewedAt,
        tp.owner_message AS ownerMessage,
        tp.version AS version,
        o.business_id AS businessId,
        b.business_name AS businessName,
        o.status AS orderStatus,
        o.total AS orderTotal,
        o.created_at AS orderCreatedAt,
        COALESCE(o.customer_name, customer.user_name) AS customerName,
        customer.email AS customerEmail,
        reviewer.user_name AS reviewerName,
        reviewer.email AS reviewerEmail,
        (SELECT COUNT(*) FROM transfer_payment_evidences e WHERE e.transfer_payment_id = tp.transfer_payment_id) AS evidenceCount,
        (SELECT MAX(e2.created_at) FROM transfer_payment_evidences e2 WHERE e2.transfer_payment_id = tp.transfer_payment_id) AS lastEvidenceCreatedAt
      FROM order_transfer_payments tp
      INNER JOIN orders o ON o.order_id = tp.order_id
      INNER JOIN business b ON b.business_id = o.business_id
      LEFT JOIN users customer ON customer.user_id = tp.customer_user_id
      LEFT JOIN users reviewer ON reviewer.user_id = tp.reviewed_by
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY tp.latest_evidence_at DESC, tp.transfer_payment_id DESC
      LIMIT ${input.limit}
    `, params);

    return rows.map((row: any) => ({
      transferPaymentId: Number(row.transferPaymentId),
      orderId: Number(row.orderId),
      reviewStatus: row.reviewStatus,
      clientConfirmedAt: row.clientConfirmedAt,
      latestEvidenceAt: row.latestEvidenceAt,
      reviewedAt: row.reviewedAt,
      ownerMessage: row.ownerMessage,
      version: Number(row.version || 0),
      business: {
        id: Number(row.businessId),
        name: row.businessName,
      },
      order: {
        status: row.orderStatus,
        total: Number(row.orderTotal || 0),
        createdAt: row.orderCreatedAt,
      },
      customer: {
        name: row.customerName,
        email: row.customerEmail,
      },
      reviewer: row.reviewerName || row.reviewerEmail
        ? { name: row.reviewerName, email: row.reviewerEmail }
        : null,
      evidenceCount: Number(row.evidenceCount || 0),
      lastEvidenceCreatedAt: row.lastEvidenceCreatedAt,
    }));
  }

  async detail(orderId: number) {
    if (!Number.isInteger(orderId) || orderId < 1) throw new HttpError(400, "Orden inválida");

    const rows = await AppDataSource.query(`
      SELECT
        tp.transfer_payment_id AS transferPaymentId,
        tp.order_id AS orderId,
        tp.review_status AS reviewStatus,
        tp.client_confirmed_at AS clientConfirmedAt,
        tp.latest_evidence_at AS latestEvidenceAt,
        tp.reviewed_at AS reviewedAt,
        tp.reviewed_by AS reviewedBy,
        tp.owner_message AS ownerMessage,
        tp.version AS version,
        o.business_id AS businessId,
        b.business_name AS businessName,
        o.status AS orderStatus,
        o.total AS orderTotal,
        o.created_at AS orderCreatedAt,
        o.transfer_bank_snapshot_json AS bankSnapshotJson,
        COALESCE(o.customer_name, customer.user_name) AS customerName,
        customer.email AS customerEmail,
        reviewer.user_name AS reviewerName,
        reviewer.email AS reviewerEmail
      FROM order_transfer_payments tp
      INNER JOIN orders o ON o.order_id = tp.order_id
      INNER JOIN business b ON b.business_id = o.business_id
      LEFT JOIN users customer ON customer.user_id = tp.customer_user_id
      LEFT JOIN users reviewer ON reviewer.user_id = tp.reviewed_by
      WHERE tp.order_id = ?
      LIMIT 1
    `, [orderId]);

    const row = rows?.[0];
    if (!row) throw new HttpError(404, "Reporte de transferencia no encontrado");

    const evidences = await AppDataSource.getRepository(TransferPaymentEvidence).find({
      where: { orderId },
      order: { createdAt: "DESC", evidenceId: "DESC" },
      take: 100,
    });
    const timeline = (await this.audit.listByOrder(orderId)).filter((event) => (
      event.action.startsWith("TRANSFER_PAYMENT_") ||
      event.entityType === "order_transfer_payment" ||
      event.entityType === "transfer_payment_evidence"
    ));

    let bankDetails: Record<string, unknown> | null = null;
    try {
      bankDetails = row.bankSnapshotJson ? JSON.parse(row.bankSnapshotJson) : null;
    } catch {
      bankDetails = null;
    }

    return {
      transferPaymentId: Number(row.transferPaymentId),
      orderId: Number(row.orderId),
      reviewStatus: row.reviewStatus,
      clientConfirmedAt: row.clientConfirmedAt,
      latestEvidenceAt: row.latestEvidenceAt,
      reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedBy == null ? null : Number(row.reviewedBy),
      ownerMessage: row.ownerMessage,
      version: Number(row.version || 0),
      business: { id: Number(row.businessId), name: row.businessName },
      order: {
        status: row.orderStatus,
        total: Number(row.orderTotal || 0),
        createdAt: row.orderCreatedAt,
      },
      customer: { name: row.customerName, email: row.customerEmail },
      reviewer: row.reviewerName || row.reviewerEmail
        ? { name: row.reviewerName, email: row.reviewerEmail }
        : null,
      bankDetails,
      evidences: evidences.map((evidence) => ({
        id: evidence.evidenceId,
        originalName: evidence.originalName,
        mimeType: evidence.mimeType,
        size: evidence.fileSize,
        submittedBy: evidence.submittedBy,
        createdAt: evidence.createdAt,
        fileUrl: `/api/orders/${orderId}/transfer-payment/evidence/${evidence.evidenceId}/file`,
      })),
      timeline,
      policy: {
        adminReadOnly: true,
        ownerReviewRemainsAuthoritative: true,
        preparationBlockedByReview: false,
      },
    };
  }
}
