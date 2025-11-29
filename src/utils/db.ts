import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

// En producción (dist/) las entidades serán .js, en desarrollo serán .ts
const entitiesPath = process.env.NODE_ENV === "production" 
  ? "dist/src/entities/*.js"
  : "src/entities/*.ts";

const migrationsPath = process.env.NODE_ENV === "production"
  ? "dist/src/migrations/*.js"
  : "src/migrations/*.ts";

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false, // solo desarrollo
    logging: false,
    entities: [entitiesPath],
    migrations: [migrationsPath],
    subscribers: ["src/subscribers/*.ts"]
});