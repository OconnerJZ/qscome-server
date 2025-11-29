import "reflect-metadata";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { AppDataSource } from "./src/utils/db";
import userRoutes from "./src/routes/userRoutes";
/* import businessRoutes from "./routes/businessRoutes";
import menuRoutes from "./routes/menuRoutes";
import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoutes"; */

dotenv.config({ 
  debug: false  // Desactiva los tips
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/api/users", userRoutes);
/* app.use("/api/business", businessRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes); */

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: "Hello world from Docker, Ubuntu & Cloudflare" });
});


AppDataSource.initialize()
  .then(() => {
    console.log("Conexión a DB establecida");
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => console.log(error));
