import { Router } from "express";
import { ReviewController } from "../controllers/ReviewController";

const router = Router();
const controller = new ReviewController();

// Las reseñas forman parte del escaparate público del negocio.
// Las operaciones de creación y moderación se incorporarán con sus permisos
// propios; este endpoint sólo expone información segura de lectura.
router.get("/business/:businessId", controller.listByBusiness);

export default router;
