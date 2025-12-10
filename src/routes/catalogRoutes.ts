import { Request, Response, Router } from "express";
import { CatalogsController } from "../controllers/CatalogsController";

const router = Router();
const catalogsController = new CatalogsController();

router.get("/food-types", (req: Request, res: Response) =>
  catalogsController.getAll(req, res)
);

export default router;