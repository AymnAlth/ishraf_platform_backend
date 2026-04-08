export const INTEGRATION_OUTBOX_PROVIDER_KEYS = [
  "pushNotifications",
  "transportMaps",
  "analytics"
] as const;

export type IntegrationOutboxProviderKey =
  (typeof INTEGRATION_OUTBOX_PROVIDER_KEYS)[number];

export const INTEGRATION_OUTBOX_STATUS_VALUES = [
  "pending",
  "processing",
  "delivered",
  "failed",
  "dead"
] as const;

export type IntegrationOutboxStatus = (typeof INTEGRATION_OUTBOX_STATUS_VALUES)[number];

export interface IntegrationOutboxRow {
  id: string;
  providerKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  status: IntegrationOutboxStatus;
  payloadJson: unknown;
  headersJson: unknown;
  idempotencyKey: string | null;
  availableAt: Date;
  reservedAt: Date | null;
  processedAt: Date | null;
  attemptCount: number;
  maxAttempts: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdByUserId: string | null;
  requestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationOutboxStatusSummaryRow {
  providerKey: string;
  pendingOutboxCount: number;
  failedOutboxCount: number;
}

export interface IntegrationOutboxWriteInput {
  providerKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payloadJson: unknown;
  headersJson?: unknown;
  idempotencyKey?: string | null;
  availableAt?: Date | null;
  maxAttempts?: number;
  createdByUserId?: string | null;
  requestId?: string | null;
}
