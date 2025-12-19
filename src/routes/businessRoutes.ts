import { Router, Request, Response } from "express";
import { BusinessController } from "../controllers/BusinessController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/roleMiddleware";
import { validateDto } from "../middlewares/validateDto";
import { sanitizeInput } from "../middlewares/sanitizeInput";
import { CreateBusinessDto } from "../dtos/business.dto";

const router = Router();
const businessController = new BusinessController();

router.get("/", 
  (req: Request, res: Response) => businessController.getAll(req, res)
);

router.get("/:id", 
  (req: Request, res: Response) => businessController.getById(req, res)
);

router.get("/:id/menu", 
  (req: Request, res: Response) => businessController.getMenu(req, res)
);

router.post("/", 
  authenticate,
  authorize("admin", "owner", "customer"),
  sanitizeInput,
  validateDto(CreateBusinessDto),
  (req: Request, res: Response) => businessController.create(req, res)
);

router.put("/:id", 
  authenticate,
  authorize("admin", "owner"),
  sanitizeInput,
  (req: Request, res: Response) => businessController.update(req, res)
);

export default router;