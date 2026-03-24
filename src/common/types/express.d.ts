import type { AuthenticatedUser } from "./auth.types";
import type { ValidatedRequestPayload } from "./http.types";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
      validated?: ValidatedRequestPayload;
    }
  }
}

export {};
