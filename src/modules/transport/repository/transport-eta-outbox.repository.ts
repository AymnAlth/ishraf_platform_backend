import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type {
  IntegrationOutboxRow,
  IntegrationOutboxStatus
} from "../../../common/types/integration-outbox.types";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import {
  TRANSPORT_ETA_OUTBOX_EVENT_TYPE,
  TRANSPORT_ETA_OUTBOX_PROVIDER_KEY
} from "../types/transport-eta.types";

interface TransportEtaOutboxEnqueueInput {
  tripId: string;
  payloadJson: unknown;
  idempotencyKey: string;
  requestId: string | null;
}

export class TransportEtaOutboxRepository {
  async enqueueTripRefreshEvent(
    input: TransportEtaOutboxEnqueueInput,
    queryable: Queryable = db
  ): Promise<string | null> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.integrationOutbox} (
          provider_key,
          event_type,
          aggregate_type,
          aggregate_id,
          payload_json,
          headers_json,
          idempotency_key,
          request_id
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
        ON CONFLICT (idempotency_key)
          WHERE idempotency_key IS NOT NULL
        DO NOTHING
        RETURNING id::text AS id
      `,
      [
        TRANSPORT_ETA_OUTBOX_PROVIDER_KEY,
        TRANSPORT_ETA_OUTBOX_EVENT_TYPE,
        "trip",
        input.tripId,
        JSON.stringify(input.payloadJson),
        JSON.stringify({}),
        input.idempotencyKey,
        input.requestId
      ]
    );

    return result.rows[0]?.id ?? null;
  }

  async claimTripRefreshDispatchBatch(
    limit: number,
    queryable: Queryable = db
  ): Promise<IntegrationOutboxRow[]> {
    const result = await queryable.query<IntegrationOutboxRow>(
      `
        WITH candidates AS (
          SELECT io.id
          FROM ${databaseTables.integrationOutbox} io
          WHERE io.provider_key = $1
            AND io.event_type = $2
            AND io.status IN ('pending', 'failed')
            AND io.available_at <= NOW()
          ORDER BY io.available_at ASC, io.id ASC
          LIMIT $3
          FOR UPDATE SKIP LOCKED
        )
        UPDATE ${databaseTables.integrationOutbox} io
        SET
          status = 'processing',
          reserved_at = NOW()
        FROM candidates
        WHERE io.id = candidates.id
        RETURNING
          io.id::text AS id,
          io.provider_key AS "providerKey",
          io.event_type AS "eventType",
          io.aggregate_type AS "aggregateType",
          io.aggregate_id AS "aggregateId",
          io.status,
          io.payload_json AS "payloadJson",
          io.headers_json AS "headersJson",
          io.idempotency_key AS "idempotencyKey",
          io.available_at AS "availableAt",
          io.reserved_at AS "reservedAt",
          io.processed_at AS "processedAt",
          io.attempt_count AS "attemptCount",
          io.max_attempts AS "maxAttempts",
          io.last_error_code AS "lastErrorCode",
          io.last_error_message AS "lastErrorMessage",
          io.created_by_user_id::text AS "createdByUserId",
          io.request_id::text AS "requestId",
          io.created_at AS "createdAt",
          io.updated_at AS "updatedAt"
      `,
      [TRANSPORT_ETA_OUTBOX_PROVIDER_KEY, TRANSPORT_ETA_OUTBOX_EVENT_TYPE, limit]
    );

    return result.rows;
  }

  async markDelivered(outboxId: string, queryable: Queryable = db): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.integrationOutbox}
        SET
          status = 'delivered',
          processed_at = NOW(),
          last_error_code = NULL,
          last_error_message = NULL
        WHERE id = $1
      `,
      [outboxId]
    );
  }

  async markFailed(
    outboxId: string,
    input: {
      nextStatus: Extract<IntegrationOutboxStatus, "failed" | "dead">;
      nextAvailableAt?: Date | null;
      errorCode: string;
      errorMessage: string;
    },
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.integrationOutbox}
        SET
          status = $2,
          attempt_count = attempt_count + 1,
          available_at = COALESCE($3, available_at),
          last_error_code = $4,
          last_error_message = $5
        WHERE id = $1
      `,
      [
        outboxId,
        input.nextStatus,
        input.nextAvailableAt ?? null,
        input.errorCode,
        input.errorMessage
      ]
    );
  }
}
