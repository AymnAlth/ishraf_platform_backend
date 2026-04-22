import "dotenv/config";

import { logger } from "../config/logger";
import { db } from "../database/db";
import { analyticsOutboxProcessorService } from "../modules/analytics";

const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 25;
const CONCURRENCY = 5;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

let shuttingDown = false;

const requestShutdown = (): void => {
  shuttingDown = true;
};

process.on("SIGINT", requestShutdown);
process.on("SIGTERM", requestShutdown);

const run = async (): Promise<void> => {
  logger.info(
    {
      batchSize: BATCH_SIZE,
      concurrency: CONCURRENCY,
      pollIntervalMs: POLL_INTERVAL_MS
    },
    "Analytics outbox worker started"
  );

  while (!shuttingDown) {
    const claimedCount = await analyticsOutboxProcessorService.processNextBatch(
      BATCH_SIZE,
      CONCURRENCY
    );

    if (claimedCount === 0) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  await db.close();
  logger.info("Analytics outbox worker stopped");
};

void run().catch(async (error: unknown) => {
  logger.error({ err: error }, "Analytics outbox worker failed");
  await db.close();
  process.exit(1);
});
