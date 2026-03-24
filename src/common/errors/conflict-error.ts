import type { ErrorDetail } from "../types/http.types";
import { AppError } from "./app-error";

export class ConflictError extends AppError {
  constructor(message = "Conflict", details: ErrorDetail[] = []) {
    super(message, {
      statusCode: 409,
      code: "CONFLICT",
      details
    });
  }
}
