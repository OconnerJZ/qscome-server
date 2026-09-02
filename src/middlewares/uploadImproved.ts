import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import {
  ensureStorageDirectories,
  privateEvidenceUploadsPath,
  publicUploadsPath,
} from '../config/storage';

ensureStorageDirectories();

// Tipos de archivo permitidos
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MULTIPART_LIMITS = {
  fileSize: MAX_FILE_SIZE,
  files: 1,
  fields: 2,
  parts: 3,
  fieldNameSize: 100,
};

// Filtro de archivos
const fileFilter = (req: any, file: any, cb: any) => {
  if (ALLOWED_TYPES[file.mimetype as keyof typeof ALLOWED_TYPES]) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo imágenes JPG, PNG, WebP o GIF.'), false);
  }
};

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, publicUploadsPath);
  },
  filename: function (req, file, cb) {
    // Generar nombre único con hash
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = ALLOWED_TYPES[file.mimetype as keyof typeof ALLOWED_TYPES] || path.extname(file.originalname);
    const fileName = `${Date.now()}-${uniqueSuffix}${ext}`;
    cb(null, fileName);
  }
});

const evidenceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, privateEvidenceUploadsPath),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype as keyof typeof ALLOWED_TYPES];
    cb(null, `${Date.now()}-${crypto.randomBytes(24).toString('hex')}${ext}`);
  },
});

// Configuración de multer
export const uploadSecure = multer({
  storage,
  fileFilter,
  limits: MULTIPART_LIMITS,
});

export const uploadEvidenceSecure = multer({
  storage: evidenceStorage,
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("El comprobante debe ser una imagen JPG, PNG o WebP"));
  },
  limits: MULTIPART_LIMITS,
});

// Middleware para manejar errores de multer
export const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Error al subir archivo: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};
