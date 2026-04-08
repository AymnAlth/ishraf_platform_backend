import { logger } from "../../../config/logger";
import { db } from "../../../database/db";
import type { TransportEtaOutboxRepository } from "../repository/transport-eta-outbox.repository";
import type {
  TransportEtaRefreshEventTrigger,
  TransportEtaRefreshOutboxPayload
} from "../types/transport-eta.types";
import {
  TRANSPORT_ETA_OUTBOX_EVENT_TYPE,
  TRANSPORT_ETA_OUTBOX_PROVIDER_KEY,
  TRANSPORT_ETA_REFRESH_EVENT_TRIGGER_VALUES
} from "../types/transport-eta.types";
import type { TransportEtaRefreshServicePort } from "./transport-eta.service";

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

const isRefreshTrigger = (value: unknown): value is TransportEtaRefreshEventTrigger =>
  typeof value === "string" &&
  (TRANSPORT_ETA_REFRESH_EVENT_TRIGGER_VALUES as readonly string[]).includes(value);

const isTransportEtaRefreshOutboxPayload = (
  value: unknown
): value is TransportEtaRefreshOutboxPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  if (typeof payload.tripId !== "string" || payload.tripId.trim().length === 0) {
    return false;
  }

  if (!isRefreshTrigger(payload.trigger)) {
    return false;
  }

  if (
    payload.heartbeatRecordedAt !== undefined &&
    typeof payload.heartbeatRecordedAt !== "string"
  ) {
    return false;
  }

  return true;
};

export class TransportEtaOutboxProcessorService {
  constructor(
    private readonly transportEtaOutboxRepository: TransportEtaOutboxRepository,
    private readonly transportEtaService: TransportEtaRefreshServicePort
  ) {}

  async processNextBatch(limit = 50, concurrency = 10): Promise<number> {
    const claimedItems = await db.withTransaction((client) =>
      this.transportEtaOutboxRepository.claimTripRefreshDispatchBatch(limit, client)
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
    if (!isTransportEtaRefreshOutboxPayload(payloadJson)) {
      await this.transportEtaOutboxRepository.markFailed(outboxId, {
        nextStatus: "dead",
        errorCode: INVALID_PAYLOAD_ERROR_CODE,
        errorMessage: "Outbox payload does not match the transport ETA refresh contract"
      });
      return;
    }

    try {
      await this.transportEtaService.refreshTripEtaSnapshot(payloadJson.tripId);
      await this.transportEtaOutboxRepository.markDelivered(outboxId);
    } catch (error) {
      logger.error(
        {
          outboxId,
          providerKey: TRANSPORT_ETA_OUTBOX_PROVIDER_KEY,
          eventType: TRANSPORT_ETA_OUTBOX_EVENT_TYPE,
          tripId: payloadJson.tripId,
          err: error
        },
        "Transport ETA outbox processing failed"
      );

      const nextAttemptNumber = attemptCount + 1;
      const isTerminal = nextAttemptNumber >= maxAttempts;

      await this.transportEtaOutboxRepository.markFailed(outboxId, {
        nextStatus: isTerminal ? "dead" : "failed",
        nextAvailableAt: isTerminal
          ? null
          : addSeconds(new Date(), getBackoffSeconds(nextAttemptNumber)),
        errorCode: "TRANSPORT_ETA_PROCESSING_FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown transport ETA processing error"
      });
    }
  }
}
