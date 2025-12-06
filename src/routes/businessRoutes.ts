import { Router } from "express";
import {
    getAllBusinesses,
    getBusinessById,
    createBusiness,
    updateBusiness,
    deleteBusiness
} from "../controllers/businessController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";

const router = Router();

router.get("/", getAllBusinesses);
router.get("/:id", getBusinessById);
router.post("/", authenticate, authorize("admin", "owner"), createBusiness);
router.put("/:id", authenticate, authorize("admin", "owner"), updateBusiness);
router.delete("/:id", authenticate, authorize("admin"), deleteBusiness);

export default router;
