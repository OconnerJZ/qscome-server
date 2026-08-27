import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// Mantener la misma carpeta física en desarrollo y producción.
// __dirname cambia al compilar a dist/, process.cwd() no si el servidor se
// ejecuta desde la raíz del proyecto (npm run dev / npm start).
const uploadsPath = path.resolve(process.cwd(), 'uploads');

// Crear directorio si no existe
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Tipos de archivo permitidos
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
    cb(null, uploadsPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = ALLOWED_TYPES[file.mimetype as keyof typeof ALLOWED_TYPES] || path.extname(file.originalname);
    const fileName = `${Date.now()}-${uniqueSuffix}${ext}`;
    cb(null, fileName);
  }
});

export const uploadSecure = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

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