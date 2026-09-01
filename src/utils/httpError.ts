// src/utils/httpError.ts
// Error de dominio con código HTTP. El errorHandler global ya lee `statusCode`,
// así que los services pueden lanzar esto y el controller sólo hace next(error).

export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = options.code || "REQUEST_ERROR";
    this.details = options.details;
    this.name = "HttpError";
  }
}
