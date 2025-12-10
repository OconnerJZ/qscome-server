import multer from 'multer';
import path from 'path';

// Obtener la ruta real del proyecto
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsPath = path.join(projectRoot, 'uploads');

console.log('UPLOADS PATH:', uploadsPath); // Debug útil

// Configuración de Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, fileName);
    }
});

// Exportar función upload
export const upload = multer({ storage });
