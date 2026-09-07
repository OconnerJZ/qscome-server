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
import adminRoutes from "./src/routes/adminRoutes";
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
import { validateProductionEnvironment } from "./src/config/environment";
import reviewRoutes from "./src/routes/reviewRoutes";
import loyaltyRoutes from "./src/routes/loyaltyRoutes";
import marketingRoutes from "./src/routes/marketingRoutes";

dotenv.config({ debug: false });
validateProductionEnvironment();

const app = express();
const httpServer = http.createServer(app);
const healthService = new HealthService();
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || "1", 10);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
  throw new Error("TRUST_PROXY_HOPS debe ser un entero entre 0 y 5");
}
if (trustProxyHops > 0) app.set("trust proxy", trustProxyHops);
initializeSocket(httpServer);

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
ensureStorageDirectories();
app.use("/uploads", express.static(publicUploadsPath));

app.get("/", (_req, res) => {
  res.json({ message: "qsCome API - Running", version: "1.0.0", timestamp: new Date().toISOString() });
});

app.get("/health", async (_req, res) => {
  const health = await healthService.check();
  res.status(health.healthy ? 200 : 503).json({
    status: health.healthy ? "OK" : "ERROR",
    version: process.env.APP_VERSION || "development",
    services: health.services,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shared-orders", sharedOrderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/catalogs", catalogRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/marketing", marketingRoutes);

app.use(errorHandler);
app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));

const PORT = process.env.PORT || 3000;
AppDataSource.initialize()
  .then(() => {
    console.log("✅ Conexión a DB establecida");
    console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🖼️ Archivos estáticos en http://localhost:${PORT}/uploads`);
      console.log("🔌 Socket.IO inicializado");
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((error) => {
    console.error("❌ Error al conectar con la base de datos:", error);
    process.exit(1);
  });

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
