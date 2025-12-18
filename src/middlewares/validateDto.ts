import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";

export function validateDto(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(dtoClass, req.body);
    
    const errors: ValidationError[] = await validate(dtoInstance);
    
    if (errors.length > 0) {
      const formattedErrors = errors.map(error => ({
        field: error.property,
        errors: Object.values(error.constraints || {})
      }));
      
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formattedErrors
      });
    }
    
    req.body = dtoInstance;
    next();
  };
}