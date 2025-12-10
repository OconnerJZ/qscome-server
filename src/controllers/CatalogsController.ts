import { Request, Response } from "express";
import { FoodTypes } from "../entities/FoodTypes";
import { AppDataSource } from "../utils/db";

export class CatalogsController {
  private readonly foodTypesRepo = AppDataSource.getRepository(FoodTypes);

  // GET ALL /food-types
  async getAll(req: Request, res: Response) {
    try {
      const foodTypes = await this.foodTypesRepo.find({
        select: {
          foodTypeId: true,
          typeName: true,
        },
      });

      return res.json({
        success: true,
        data: foodTypes.map((f) => ({
          id: f.foodTypeId,
          value: f.typeName,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
