import { logger } from "../../../config/logger";
import { db } from "../../../database/db";
import type { AnalyticsOutboxRepository } from "../repository/analytics-outbox.repository";
import { isAnalyticsJobExecuteOutboxPayload } from "../types/analytics.types";
import {
  ANALYTICS_OUTBOX_EVENT_TYPE,
  ANALYTICS_OUTBOX_PROVIDER_KEY
} from "../types/analytics.types";
import type { AnalyticsJobExecutionServicePort } from "./analytics.service";

const INVALID_PAYLOAD_ERROR_CODE = "INVALID_OUTBOX_PAYLOAD";
const DEFAULT_BACKOFF_SECONDS = 1800;
const BACKOFF_SEQUENCE_SECONDS = [30, 120, 600, 1800] as const;

const addSeconds = (value: Date, seconds: number): Date =>
  new Date(value.getTime() + seconds * 1000);

const getBackoffSeconds = (attemptNumber: number): number => {
  if (attemptNumber <= 0) {
    return BACKOFF_SEQUENCE_SECONDS[0];
  }

  return BACKOFF_SEQUENCE_SECONDS[attemptNumber - 1] ?? DEFAULT_BACKOFF_SECONDS;
};

export class AnalyticsOutboxProcessorService {
  constructor(
    private readonly analyticsOutboxRepository: AnalyticsOutboxRepository,
    private readonly analyticsService: AnalyticsJobExecutionServicePort
  ) {}

  async processNextBatch(limit = 50, concurrency = 10): Promise<number> {
    const claimedItems = await db.withTransaction((client) =>
      this.analyticsOutboxRepository.claimJobExecutionDispatchBatch(limit, client)
    );

    if (claimedItems.length === 0) {
      return 0;
    }

    const queue = [...claimedItems];
    const workerCount = Math.max(1, Math.min(concurrency, claimedItems.length));

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (queue.length > 0) {
          const item = queue.shift();

          if (!item) {
            return;
          }

          await this.processOne(item.id, item.payloadJson, item.attemptCount, item.maxAttempts);
        }
      })
    );

    return claimedItems.length;
  }

  private async processOne(
    outboxId: string,
    payloadJson: unknown,
    attemptCount: number,
    maxAttempts: number
  ): Promise<void> {
    if (!isAnalyticsJobExecuteOutboxPayload(payloadJson)) {
      await this.analyticsOutboxRepository.markFailed(outboxId, {
        nextStatus: "dead",
        errorCode: INVALID_PAYLOAD_ERROR_CODE,
        errorMessage: "Outbox payload does not match the analytics job execution contract"
      });
      return;
    }

    try {
      await this.analyticsService.executeJob(payloadJson.jobId);
      await this.analyticsOutboxRepository.markDelivered(outboxId);
    } catch (error) {
      logger.error(
        {
          outboxId,
          providerKey: ANALYTICS_OUTBOX_PROVIDER_KEY,
          eventType: ANALYTICS_OUTBOX_EVENT_TYPE,
          jobId: payloadJson.jobId,
          err: error
        },
        "Analytics outbox processing failed"
      );

      const nextAttemptNumber = attemptCount + 1;
      const isTerminal = nextAttemptNumber >= maxAttempts;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown analytics processing error";

      await this.analyticsService.markJobFailure(
        payloadJson.jobId,
        isTerminal ? "dead" : "failed",
        "ANALYTICS_JOB_PROCESSING_FAILED",
        errorMessage
      );

      await this.analyticsOutboxRepository.markFailed(outboxId, {
        nextStatus: isTerminal ? "dead" : "failed",
        nextAvailableAt: isTerminal
          ? null
          : addSeconds(new Date(), getBackoffSeconds(nextAttemptNumber)),
        errorCode: "ANALYTICS_JOB_PROCESSING_FAILED",
        errorMessage
      });
    }
  }
}
