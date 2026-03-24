import type { NextFunction, Request, Response } from "express";

import { logger } from "../../config/logger";
import { buildErrorResponse } from "../base/http-response";
import { AppError } from "../errors/app-error";
import { mapPostgresError } from "../errors/postgres-error";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const normalizedError = mapPostgresError(error);

  if (normalizedError instanceof AppError) {
    res.status(normalizedError.statusCode).json(
      buildErrorResponse(normalizedError.message, normalizedError.details)
    );
    return;
  }

  logger.error({ err: normalizedError }, "Unhandled application error");

  res.status(500).json(
    buildErrorResponse("Internal server error", [
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred"
      }
    ])
  );
};
