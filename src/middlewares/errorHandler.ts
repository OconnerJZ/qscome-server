import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/httpError";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error:", err);

    const isHttpError = err instanceof HttpError;
    const statusCode = isHttpError ? err.statusCode : 500;
    const message = isHttpError ? err.message : "Error interno del servidor";
    const code = isHttpError ? err.code : "INTERNAL_ERROR";

    res.status(statusCode).json({
        success: false,
        code,
        message,
        ...(isHttpError && err.details !== undefined && { details: err.details }),
        ...(process.env.NODE_ENV === "development" && err instanceof Error && { stack: err.stack })
    });
};
