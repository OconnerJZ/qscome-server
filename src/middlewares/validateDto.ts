import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { HttpError } from "../utils/httpError";

interface FormattedValidationError {
  field: string;
  errors: string[];
}

const formatValidationErrors = (
  errors: ValidationError[],
  parent = "",
): FormattedValidationError[] => errors.flatMap((error) => {
  const field = parent ? `${parent}.${error.property}` : error.property;
  const current = Object.values(error.constraints || {}).length
    ? [{ field, errors: Object.values(error.constraints || {}) }]
    : [];
  return [...current, ...formatValidationErrors(error.children || [], field)];
});

export function validateDto(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(dtoClass, req.body);
    
    const errors: ValidationError[] = await validate(dtoInstance, {
      whitelist: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
    });
    
    if (errors.length > 0) {
      const formattedErrors = formatValidationErrors(errors);
      
      return next(new HttpError(400, "Los datos enviados no son válidos", {
        code: "VALIDATION_ERROR",
        details: formattedErrors,
      }));
    }
    
    req.body = dtoInstance;
    next();
  };
}
