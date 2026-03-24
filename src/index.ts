import "dotenv/config";

import { logger } from "./config/logger";
import { startServer } from "./app/server";

void startServer().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start the server");
  process.exit(1);
});
