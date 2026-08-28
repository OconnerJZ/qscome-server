import { NextFunction, Request, Response } from "express";
import fs from "node:fs/promises";
import { TransferPaymentService } from "../services/TransferPaymentService";
import { hasValidImageSignature } from "../security/imageSignature";
import path from "node:path";
import { privateEvidenceUploadsPath } from "../middlewares/uploadImproved";

export class TransferPaymentController {
  private readonly service = new TransferPaymentService();

  get = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await this.service.getByOrder(Number(req.params.id)) }); }
    catch (error) { next(error); }
  };

  submitEvidence = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "Selecciona una imagen del comprobante" });
      const handle = await fs.open(req.file.path, "r");
      const header = Buffer.alloc(12);
      try { await handle.read(header, 0, header.length, 0); } finally { await handle.close(); }
      if (!hasValidImageSignature(header, req.file.mimetype)) {
        await fs.unlink(req.file.path).catch(() => undefined);
        return res.status(400).json({ success: false, message: "El archivo no contiene una imagen válida" });
      }
      const data = await this.service.submitEvidence(Number(req.params.id), Number((req as any).user?.userId), {
        storageKey: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
      return res.status(201).json({ success: true, message: "Comprobante enviado", data });
    } catch (error) {
      if (req.file?.path) await fs.unlink(req.file.path).catch(() => undefined);
      next(error);
    }
  };

  file = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evidence = await this.service.getEvidenceFile(Number(req.params.id), Number(req.params.evidenceId));
      const filePath = path.resolve(privateEvidenceUploadsPath, evidence.storageKey);
      const safeRoot = `${path.resolve(privateEvidenceUploadsPath)}${path.sep}`;
      if (!filePath.startsWith(safeRoot)) return res.status(400).json({ success: false, message: "Archivo inválido" });
      res.type(evidence.mimeType);
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.sendFile(filePath);
    } catch (error) { next(error); }
  };

  review = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = (req as any).user;
      const role = (req as any).businessAccess?.role || actor?.role;
      const data = await this.service.review(Number(req.params.id), Number(actor?.userId), role, req.body.status, req.body.message, Number(req.body.expectedVersion));
      res.json({ success: true, message: req.body.status === "reviewed" ? "Comprobante revisado" : "Aclaración solicitada", data });
    } catch (error) { next(error); }
  };
}
