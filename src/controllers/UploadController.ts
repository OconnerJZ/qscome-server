import { Request, Response } from "express";

export class UploadController {
  // POST /api/upload/image
  async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No se envió ningún archivo" });
      }

      const url = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;

      return res.json({
        success: true,
        data: {
          filename: req.file.filename,
          url,
        },
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Error al subir la imagen" });
    }
  }
}
