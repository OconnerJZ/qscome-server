import { Request, Response, Router } from "express";
import { UserController } from "../controllers/UserController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";

const router = Router();
const userController = new UserController();

router.get("/", 
    authenticate, 
    authorize("admin"),
    (req: Request, res: Response) => userController.getAll(req, res)
);

router.get("/:id", 
    authenticate,
    (req: Request, res: Response) => userController.getById(req, res)
);

router.put("/:id", 
    authenticate,
    (req: Request, res: Response) => userController.update(req, res)
);

router.delete("/:id", 
    authenticate, 
    authorize("admin"),
    (req: Request, res: Response) => userController.delete(req, res)
);

export default router;