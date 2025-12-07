import "reflect-metadata";
import express from "express";
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

dotenv.config({ debug: false });

const app = express();

// Middlewares globales
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
    res.json({
        message: "qsCome API - Running",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        database: AppDataSource.isInitialized ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/uploads", uploadRoutes);
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
        
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
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