import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// Determinar si estamos en producción (dist compilado) o desarrollo (ts directo)
const isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod";

// Rutas dinámicas para entidades
const entitiesPath = isProduction 
  ? path.join(__dirname, "../entities/*.js")
  : "src/entities/*.ts";

const migrationsPath = isProduction
  ? path.join(__dirname, "../migrations/*.js")
  : "src/migrations/*.ts";

console.log("Configuración de DB:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("isProduction:", isProduction);
console.log("entitiesPath:", entitiesPath);

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
    logging: false,
    entities: [entitiesPath],
    migrations: [migrationsPath],
    subscribers: []
});