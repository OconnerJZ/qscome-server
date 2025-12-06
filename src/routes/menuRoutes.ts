import { Router } from "express";
import {
    getMenusByBusiness,
    getMenuById,
    createMenu,
    updateMenu,
    deleteMenu
} from "../controllers/menuController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";

const router = Router();

router.get("/business/:businessId", getMenusByBusiness);
router.get("/:id", getMenuById);
router.post("/", authenticate, authorize("admin", "owner"), createMenu);
router.put("/:id", authenticate, authorize("admin", "owner"), updateMenu);
router.delete("/:id", authenticate, authorize("admin", "owner"), deleteMenu);

export default router;
