import { Router, Request, Response } from "express";
import { OrderController } from "../controllers/OrderController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { createOrderValidation } from "../validators/orderValidators";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();
const orderController = new OrderController();

router.get("/", 
    authenticate,
    authorize("admin"),
    (req: Request, res: Response) => orderController.getAll(req, res)
);

router.get("/:id", 
    authenticate,
    (req: Request, res: Response) => orderController.getById(req, res)
);

router.get("/user/:userId", 
    authenticate,
    (req: Request, res: Response) => orderController.getByUser(req, res)
);

router.get("/business/:businessId", 
    authenticate,
    authorize("admin", "owner"),
    (req: Request, res: Response) => orderController.getByBusiness(req, res)
);

router.post("/", 
    authenticate,
    createOrderValidation,
    validateRequest,
    (req: Request, res: Response) => orderController.create(req, res)
);

router.patch("/:id/status", 
    authenticate,
    authorize("admin", "owner"),
    (req: Request, res: Response) => orderController.updateStatus(req, res)
);

export default router;