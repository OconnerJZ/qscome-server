// server.ts - VERSIÓN ACTUALIZADA
import "reflect-metadata";
import express from "express";
import http from "node:http";
import path from "node:path";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { AppDataSource } from "./src/utils/db";
import { errorHandler } from "./src/middlewares/errorHandler";
import authRoutes from "./src/routes/authRoutes";
import userRoutes from "./src/routes/userRoutes";
import businessRoutes from "./src/routes/businessRoutes";
import menuRoutes from "./src/routes/menuRoutes";
import orderRoutes from "./src/routes/orderRoutes";
import paymentRoutes from "./src/routes/paymentRoutes";
import uploadRoutes from "./src/routes/uploadRoutes";
import catalogRoutes from "./src/routes/catalogRoutes";
import statsRoutes from "./src/routes/statsRoutes";
import { initializeSocket } from "./src/utils/socket";

dotenv.config({ debug: false });

const app = express();
const httpServer = http.createServer(app);
initializeSocket(httpServer);

// Middlewares globales
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// IMPORTANTE: usar process.cwd() mantiene la misma carpeta tanto con ts-node
// como al ejecutar node dist/server.js. Con __dirname el build terminaba
// apuntando a dist/uploads y dejaba de encontrar imágenes históricas.
const uploadsPath = path.resolve(process.cwd(), "uploads");
const uploadsStatic = express.static(uploadsPath, {
  fallthrough: true,
  maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
});

// Ruta canónica de archivos.
app.use("/uploads", uploadsStatic);

// Compatibilidad con URLs antiguas que pudieron guardarse como /api/uploads/...
// Debe declararse ANTES de las rutas /api para que no caiga en el 404 de API.
app.use("/api/uploads", express.static(uploadsPath, {
  fallthrough: true,
  maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
}));

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "qsCome API - Running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (req, res) => {
  try {
    await Promise.race([
      AppDataSource.query("SELECT 1"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);

    res.json({
      status: "OK",
      database: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      database: "unhealthy",
      error: error,
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/catalogs", catalogRoutes);
app.use("/api/stats", statsRoutes);

// Error handler (debe ir al final)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;

// Inicializar DB y servidor
AppDataSource.initialize()
  .then(() => {
    console.log("✅ Conexión a DB establecida");
    console.log(`📊 Base de datos: ${process.env.DB_NAME}`);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🖼️ Archivos estáticos en http://localhost:${PORT}/uploads`);
      console.log(`📁 Carpeta uploads: ${uploadsPath}`);
      console.log(`🔌 Socket.IO inicializado`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
      console.log("\n📡 Endpoints disponibles:");
      console.log("   POST   /api/auth/register");
      console.log("   POST   /api/auth/login");
      console.log("   GET    /api/auth/me");
      console.log("   GET    /api/users");
      console.log("   GET    /api/business");
      console.log("   GET    /api/business/:id/menu");
      console.log("   GET    /api/menus");
      console.log("   POST   /api/orders");
      console.log("   GET    /api/orders/user/:userId");
      console.log("   PATCH  /api/orders/:id/status");
      console.log("   POST   /api/payments");
      console.log("   POST   /api/upload/image");
      console.log("   GET    /api/catalogs/food-types");
      console.log("   GET    /api/stats/business/:businessId");
    });
  })
  .catch((error) => {
    console.error("❌ Error al conectar con la base de datos:", error);
    process.exit(1);
  });

// Manejo de errores no capturados
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
