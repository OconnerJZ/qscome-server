import { Router, Request, Response } from "express";
import { MenuController } from "../controllers/MenuController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { createMenuValidation } from "../validators/menuValidators";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();
const menuController = new MenuController();

router.get("/", 
    (req: Request, res: Response) => menuController.getAll(req, res)
);

router.get("/:id", 
    (req: Request, res: Response) => menuController.getById(req, res)
);

router.get("/business/:businessId", 
    (req: Request, res: Response) => menuController.getByBusiness(req, res)
);

router.post("/", 
    authenticate,
    authorize("admin", "owner"),
    createMenuValidation,
    validateRequest,
    (req: Request, res: Response) => menuController.create(req, res)
);

router.put("/:id", 
    authenticate,
    authorize("admin", "owner"),
    (req: Request, res: Response) => menuController.update(req, res)
);

router.delete("/:id", 
    authenticate,
    authorize("admin", "owner"),
    (req: Request, res: Response) => menuController.delete(req, res)
);

export default router;