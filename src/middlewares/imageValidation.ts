import fs from "node:fs/promises";
import { NextFunction, Request, Response } from "express";
import { hasValidImageSignature } from "../security/imageSignature";

export const validateUploadedImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.file) return next();

  try {
    const handle = await fs.open(req.file.path, "r");
    const header = Buffer.alloc(12);
    try {
      await handle.read(header, 0, header.length, 0);
    } finally {
      await handle.close();
    }

    if (hasValidImageSignature(header, req.file.mimetype)) return next();

    await fs.unlink(req.file.path).catch(() => undefined);
    return res.status(400).json({
      success: false,
      message: "El archivo no contiene una imagen válida",
    });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => undefined);
    return next(error);
  }
};
