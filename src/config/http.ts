import type { CorsOptions } from "cors";

import { ForbiddenError } from "../common/errors/forbidden-error";
import type { AppEnv } from "./env";

export const parseCorsAllowedOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

export const buildCorsOptions = (
  appEnv: Pick<AppEnv, "CORS_ALLOWED_ORIGINS" | "NODE_ENV">
): CorsOptions => {
  const allowedOrigins = parseCorsAllowedOrigins(appEnv.CORS_ALLOWED_ORIGINS);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length === 0 && appEnv.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new ForbiddenError("CORS origin is not allowed"));
    },
    optionsSuccessStatus: 204
  };
};
