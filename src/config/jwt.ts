import { env } from "./env";

export const jwtConfig = {
  accessSecret: env.ACCESS_TOKEN_SECRET,
  accessTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
  refreshSecret: env.REFRESH_TOKEN_SECRET,
  refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS
} as const;
