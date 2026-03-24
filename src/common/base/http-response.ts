import type { ErrorDetail, ErrorResponse, SuccessResponse } from "../types/http.types";

export const buildSuccessResponse = <T>(
  message: string,
  data: T
): SuccessResponse<T> => ({
  success: true,
  message,
  data
});

export const buildErrorResponse = (
  message: string,
  errors: ErrorDetail[] = []
): ErrorResponse => ({
  success: false,
  message,
  errors
});
