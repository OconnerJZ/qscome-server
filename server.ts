// server.ts - VERSIÓN ACTUALIZADA
import "reflect-metadata";
import express from "express";
import http from "node:http";
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
import { corsOrigin } from "./src/utils/cors";
import sharedOrderRoutes from "./src/routes/sharedOrderRoutes";
import { ensureStorageDirectories, publicUploadsPath } from "./src/config/storage";
import { HealthService } from "./src/services/HealthService";

dotenv.config({ debug: false });

const app = express();
const httpServer = http.createServer(app);
const healthService = new HealthService();
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || "1", 10);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
  throw new Error("TRUST_PROXY_HOPS debe ser un entero entre 0 y 5");
}
if (trustProxyHops > 0) app.set("trust proxy", trustProxyHops);
initializeSocket(httpServer);

// Middlewares globales
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

ensureStorageDirectories();

// Sólo las imágenes públicas se sirven de forma estática. Los comprobantes
// permanecen fuera de esta ruta y requieren autorización en su endpoint.
app.use("/uploads", express.static(publicUploadsPath));

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "qsCome API - Running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (req, res) => {
  const health = await healthService.check();
  res.status(health.healthy ? 200 : 503).json({
    status: health.healthy ? "OK" : "ERROR",
    version: process.env.APP_VERSION || "development",
    services: health.services,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shared-orders", sharedOrderRoutes);
app.use("/api/payments", paymentRoutes); // RUTA CORREGIDA
app.use("/api/upload", uploadRoutes);
app.use("/api/catalogs", catalogRoutes);
app.use("/api/stats", statsRoutes); // NUEVO

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
      console.log("   GET    /api/stats/business/:businessId"); // NUEVO
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
