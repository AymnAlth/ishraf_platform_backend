import "dotenv/config";

import { logger } from "../config/logger";
import { db } from "../database/db";
import { analyticsService } from "../modules/analytics";

const POLL_INTERVAL_MS = 60_000;

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
      pollIntervalMs: POLL_INTERVAL_MS
    },
    "Analytics autonomous scheduler started"
  );

  while (!shuttingDown) {
    try {
      const result = await analyticsService.dispatchAutonomousScheduledRecomputeJobs();

      if (result.skipped) {
        logger.debug(
          {
            reason: result.reason,
            nextEligibleAt: result.nextEligibleAt
          },
          "Analytics autonomous dispatch skipped"
        );
      } else {
        logger.info(
          {
            runId: result.runId,
            dispatchedCount: result.response?.summary.dispatchedCount ?? 0,
            reusedCount: result.response?.summary.reusedCount ?? 0,
            totalEligibleSubjects: result.response?.summary.totalEligibleSubjects ?? 0
          },
          "Analytics autonomous dispatch completed"
        );
      }
    } catch (error) {
      logger.error({ err: error }, "Analytics autonomous scheduler cycle failed");
    }

    if (!shuttingDown) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  await db.close();
  logger.info("Analytics autonomous scheduler stopped");
};

void run().catch(async (error: unknown) => {
  logger.error({ err: error }, "Analytics autonomous scheduler failed");
  await db.close();
  process.exit(1);
});
