export interface ErrorDetail {
  field?: string;
  code?: string;
  message: string;
}

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors: ErrorDetail[];
}

export interface ValidatedRequestPayload {
  body?: unknown;
  params?: unknown;
  query?: unknown;
}
