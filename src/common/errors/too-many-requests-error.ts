import { AppError } from "./app-error";

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, {
      statusCode: 429,
      code: "TOO_MANY_REQUESTS"
    });
  }
}
