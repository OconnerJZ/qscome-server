// src/utils/httpError.ts
// Error de dominio con código HTTP. El errorHandler global ya lee `statusCode`,
// así que los services pueden lanzar esto y el controller sólo hace next(error).

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
}