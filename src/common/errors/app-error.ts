import type { ErrorDetail } from "../types/http.types";

export class AppError extends Error {
  public readonly code: string;
  public readonly details: ErrorDetail[];
  public readonly statusCode: number;

  constructor(
    message: string,
    options: {
      statusCode: number;
      code: string;
      details?: ErrorDetail[];
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details ?? [];
  }
}
