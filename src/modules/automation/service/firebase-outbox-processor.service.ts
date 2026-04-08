import { db } from "../../../database/db";
import { logger } from "../../../config/logger";
import { IntegrationOutboxRepository } from "../../../common/repositories/integration-outbox.repository";
import { firebasePushService, type FirebasePushService } from "../../../integrations/firebase/firebase-push.service";
import { CommunicationRepository } from "../../communication/repository/communication.repository";
import type { SystemSettingsReadService } from "../../system-settings/service/system-settings-read.service";
import type { IntegrationOutboxRow } from "../../../common/types/integration-outbox.types";

interface FirebaseTransportOutboxPayload {
  targetUserIds: string[];
  subscriptionKey: "transportRealtime";
  title: string;
  body: string;
  data: {
    eventType: string;
    tripId: string;
    routeId: string;
    studentId?: string;
    notificationType?: string;
  };
  referenceType: string;
  referenceId: string;
}

const PUSH_PROVIDER_KEY = "pushNotifications";
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

const isFirebaseTransportOutboxPayload = (
  value: unknown
): value is FirebaseTransportOutboxPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    Array.isArray(payload.targetUserIds) &&
    payload.targetUserIds.every((item) => typeof item === "string") &&
    payload.subscriptionKey === "transportRealtime" &&
    typeof payload.title === "string" &&
    typeof payload.body === "string" &&
    payload.data !== null &&
    typeof payload.data === "object" &&
    typeof payload.referenceType === "string" &&
    typeof payload.referenceId === "string"
  );
};

export class FirebaseOutboxProcessorService {
  constructor(
    private readonly integrationOutboxRepository: IntegrationOutboxRepository = new IntegrationOutboxRepository(),
    private readonly communicationRepository: CommunicationRepository = new CommunicationRepository(),
    private readonly systemSettingsReadService: SystemSettingsReadService | null = null,
    private readonly firebasePushService: FirebasePushService = firebasePushService
  ) {}

  async processNextBatch(limit = 50, concurrency = 10): Promise<number> {
    const pushSettings = await this.systemSettingsReadService?.getPushNotificationsSettings();

    if (!pushSettings?.fcmEnabled || !pushSettings.transportRealtimeEnabled) {
      return 0;
    }

    const claimedItems = await db.withTransaction((client) =>
      this.integrationOutboxRepository.claimDispatchBatch(PUSH_PROVIDER_KEY, limit, client)
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

          await this.processOne(item);
        }
      })
    );

    return claimedItems.length;
  }

  private async processOne(item: IntegrationOutboxRow): Promise<void> {
    try {
      if (!this.firebasePushService.isConfigured()) {
        await this.markRetryableFailure(
          item,
          "INTEGRATION_NOT_CONFIGURED",
          "Firebase push integration is not configured"
        );
        return;
      }

      if (!isFirebaseTransportOutboxPayload(item.payloadJson)) {
        await this.integrationOutboxRepository.markFailed(item.id, {
          nextStatus: "dead",
          errorCode: INVALID_PAYLOAD_ERROR_CODE,
          errorMessage: "Outbox payload does not match the Firebase transport contract"
        });
        return;
      }

      const deviceTokens = await this.communicationRepository.listActiveDeviceTokensByUserIds(
        item.payloadJson.targetUserIds,
        "fcm",
        item.payloadJson.subscriptionKey
      );

      if (deviceTokens.length === 0) {
        await this.integrationOutboxRepository.markDelivered(item.id);
        return;
      }

      const pushResult = await this.firebasePushService.sendMessage({
        tokens: deviceTokens.map((row) => row.deviceToken),
        title: item.payloadJson.title,
        body: item.payloadJson.body,
        data: item.payloadJson.data
      });

      if (pushResult.invalidDeviceTokens.length > 0) {
        await this.communicationRepository.deactivateDevicesByTokens(
          "fcm",
          pushResult.invalidDeviceTokens
        );
      }

      if (pushResult.successCount > 0) {
        await this.integrationOutboxRepository.markDelivered(item.id);
        return;
      }

      await this.markRetryableFailure(
        item,
        "FCM_DELIVERY_FAILED",
        "Firebase push delivery failed for all target devices"
      );
    } catch (error) {
      logger.error(
        {
          outboxId: item.id,
          providerKey: item.providerKey,
          eventType: item.eventType,
          err: error
        },
        "Firebase outbox processing failed"
      );

      await this.markRetryableFailure(
        item,
        "FCM_PROCESSING_ERROR",
        error instanceof Error ? error.message : "Unknown Firebase outbox processing error"
      );
    }
  }

  private async markRetryableFailure(
    item: IntegrationOutboxRow,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    const nextAttemptNumber = item.attemptCount + 1;
    const isTerminal = nextAttemptNumber >= item.maxAttempts;

    await this.integrationOutboxRepository.markFailed(item.id, {
      nextStatus: isTerminal ? "dead" : "failed",
      nextAvailableAt: isTerminal
        ? null
        : addSeconds(new Date(), getBackoffSeconds(nextAttemptNumber)),
      errorCode,
      errorMessage
    });
  }
}
