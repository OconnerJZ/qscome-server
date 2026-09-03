import { AppDataSource } from "../utils/db";
import { Orders } from "../entities/Orders";
import { OrderTransferPayment, TransferReviewStatus } from "../entities/OrderTransferPayment";
import { TransferPaymentEvidence } from "../entities/TransferPaymentEvidence";
import { HttpError } from "../utils/httpError";
import { OrderAuditService } from "./OrderAuditService";
import { emitTransferPaymentUpdated } from "../utils/socket";

export interface EvidenceFileInput {
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export class TransferPaymentService {
  private readonly reportRepo = AppDataSource.getRepository(OrderTransferPayment);
  private readonly audit = new OrderAuditService();

  async getByOrder(orderId: number) {
    const order = await AppDataSource.getRepository(Orders).findOne({ where: { orderId } });
    if (!order) throw new HttpError(404, "Orden no encontrada");
    const report = await this.reportRepo.findOne({ where: { orderId }, relations: ["evidences"] });
    let bankDetails: Record<string, unknown> | null = null;
    try { bankDetails = order.transferBankSnapshotJson ? JSON.parse(order.transferBankSnapshotJson) : null; } catch { bankDetails = null; }
    return { bankDetails, payment: report ? this.format(report) : null };
  }

  async submitEvidence(orderId: number, userId: number, file: EvidenceFileInput) {
    const reportId = await AppDataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Orders);
      const reportRepo = manager.getRepository(OrderTransferPayment);
      const evidenceRepo = manager.getRepository(TransferPaymentEvidence);
      const order = await orderRepo.findOne({ where: { orderId }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new HttpError(404, "Orden no encontrada");
      if (order.userId !== userId) throw new HttpError(403, "Sólo el cliente puede reportar esta transferencia");
      if (order.paymentMethod !== "transfer") throw new HttpError(409, "La orden no fue registrada para pago por transferencia");
      if (order.status === "cancelled") throw new HttpError(409, "No se puede reportar pago para una orden cancelada");

      const now = new Date();
      let report = await reportRepo.findOne({ where: { orderId }, lock: { mode: "pessimistic_write" } });
      if (!report) {
        report = reportRepo.create({ orderId, customerUserId: userId, reviewStatus: "reported", clientConfirmedAt: now, latestEvidenceAt: now, reviewedBy: null, reviewedAt: null, ownerMessage: null });
      } else {
        report.reviewStatus = "reported";
        report.latestEvidenceAt = now;
        report.reviewedBy = null;
        report.reviewedAt = null;
        report.ownerMessage = null;
      }
      await reportRepo.save(report);
      const evidence = await evidenceRepo.save(evidenceRepo.create({
        transferPaymentId: report.transferPaymentId,
        orderId,
        submittedBy: userId,
        storageKey: file.storageKey,
        originalName: file.originalName.slice(0, 255),
        mimeType: file.mimeType,
        fileSize: file.size,
      }));
      await this.audit.record({
        orderId,
        businessId: order.businessId,
        actorUserId: userId,
        actorRole: "customer",
        action: "TRANSFER_PAYMENT_REPORTED",
        entityType: "transfer_payment_evidence",
        entityId: evidence.evidenceId,
        orderVersion: order.version,
        metadata: { evidenceId: evidence.evidenceId, mimeType: file.mimeType, size: file.size, reportVersion: report.version },
      }, manager);
      return report.transferPaymentId;
    });
    const report = await this.reportRepo.findOneOrFail({ where: { transferPaymentId: reportId }, relations: ["evidences", "order"] });
    const data = this.format(report);
    emitTransferPaymentUpdated(Number(report.order.businessId), report.customerUserId, { orderId, transferPayment: data });
    return data;
  }

  async review(orderId: number, actorUserId: number, actorRole: string, status: TransferReviewStatus, message: string | undefined, expectedVersion: number) {
    const reportId = await AppDataSource.transaction(async (manager) => {
      const reportRepo = manager.getRepository(OrderTransferPayment);
      const orderRepo = manager.getRepository(Orders);
      const report = await reportRepo.findOne({ where: { orderId }, lock: { mode: "pessimistic_write" } });
      if (!report) throw new HttpError(409, "El cliente todavía no ha enviado un comprobante");
      if (report.version !== expectedVersion) throw new HttpError(409, "El comprobante cambió; actualiza la orden antes de revisarlo");
      if (!(["reviewed", "requires_clarification"] as TransferReviewStatus[]).includes(status)) throw new HttpError(400, "Estado de revisión inválido");
      const normalizedMessage = String(message || "").trim();
      if (status === "requires_clarification" && !normalizedMessage) throw new HttpError(400, "Indica qué aclaración necesita el cliente");
      const order = await orderRepo.findOne({ where: { orderId } });
      if (!order) throw new HttpError(404, "Orden no encontrada");

      report.reviewStatus = status;
      report.reviewedBy = actorUserId;
      report.reviewedAt = new Date();
      report.ownerMessage = normalizedMessage || null;
      await reportRepo.save(report);
      await this.audit.record({
        orderId,
        businessId: order.businessId,
        actorUserId,
        actorRole,
        action: status === "reviewed" ? "TRANSFER_PAYMENT_REVIEWED" : "TRANSFER_PAYMENT_CLARIFICATION_REQUESTED",
        entityType: "order_transfer_payment",
        entityId: report.transferPaymentId,
        orderVersion: order.version,
        metadata: { reviewStatus: status, message: normalizedMessage || null, reportVersion: report.version },
      }, manager);
      return report.transferPaymentId;
    });
    const report = await this.reportRepo.findOneOrFail({ where: { transferPaymentId: reportId }, relations: ["evidences", "order"] });
    const data = this.format(report);
    emitTransferPaymentUpdated(Number(report.order.businessId), report.customerUserId, { orderId, transferPayment: data });
    return data;
  }

  async getEvidenceFile(orderId: number, evidenceId: number) {
    const evidence = await AppDataSource.getRepository(TransferPaymentEvidence).findOne({ where: { evidenceId, orderId } });
    if (!evidence) throw new HttpError(404, "Comprobante no encontrado");
    return { storageKey: evidence.storageKey, mimeType: evidence.mimeType, originalName: evidence.originalName };
  }

  private format(report: OrderTransferPayment) {
    return {
      id: report.transferPaymentId,
      orderId: report.orderId,
      version: report.version,
      status: report.reviewStatus,
      clientConfirmedAt: report.clientConfirmedAt,
      latestEvidenceAt: report.latestEvidenceAt,
      reviewedBy: report.reviewedBy,
      reviewedAt: report.reviewedAt,
      ownerMessage: report.ownerMessage,
      evidences: (report.evidences || []).sort((a, b) => Number(a.evidenceId) - Number(b.evidenceId)).map((evidence) => ({
        id: evidence.evidenceId,
        url: `/api/orders/${report.orderId}/transfer-payment/evidence/${evidence.evidenceId}/file`,
        originalName: evidence.originalName,
        mimeType: evidence.mimeType,
        size: evidence.fileSize,
        submittedBy: evidence.submittedBy,
        createdAt: evidence.createdAt,
      })),
    };
  }
}
