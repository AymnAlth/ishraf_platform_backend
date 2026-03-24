import type { ErrorDetail } from "../types/http.types";
import { AppError } from "./app-error";

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details: ErrorDetail[] = []) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details
    });
  }
}
