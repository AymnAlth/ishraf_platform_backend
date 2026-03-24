import pino from "pino";

import { env } from "./env";

export const logger = pino({
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  enabled: env.LOG_LEVEL !== "silent"
});
