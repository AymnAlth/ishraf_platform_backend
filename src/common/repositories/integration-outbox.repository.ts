import type { QueryResultRow } from "pg";

import type { Queryable } from "../interfaces/queryable.interface";
import { databaseTables } from "../../config/database";
import { db } from "../../database/db";
import type {
  IntegrationOutboxRow,
  IntegrationOutboxStatus,
  IntegrationOutboxStatusSummaryRow,
  IntegrationOutboxWriteInput
} from "../types/integration-outbox.types";

const integrationOutboxSelect = `
  SELECT
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
  FROM ${databaseTables.integrationOutbox} io
`;

const mapSingleRow = <TRow extends QueryResultRow>(rows: TRow[]): TRow | null => rows[0] ?? null;

export class IntegrationOutboxRepository {
  async summarizeByProvider(
    providerKeys: readonly string[],
    queryable: Queryable = db
  ): Promise<IntegrationOutboxStatusSummaryRow[]> {
    const result = await queryable.query<IntegrationOutboxStatusSummaryRow>(
      `
        SELECT
          io.provider_key AS "providerKey",
          COUNT(*) FILTER (WHERE io.status = 'pending')::int AS "pendingOutboxCount",
          COUNT(*) FILTER (WHERE io.status = 'failed')::int AS "failedOutboxCount"
        FROM ${databaseTables.integrationOutbox} io
        WHERE io.provider_key = ANY($1::text[])
        GROUP BY io.provider_key
      `,
      [providerKeys]
    );

    return result.rows;
  }

  async enqueueEvent(
    input: IntegrationOutboxWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
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
          available_at,
          max_attempts,
          created_by_user_id,
          request_id
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11)
        RETURNING id::text AS id
      `,
      [
        input.providerKey,
        input.eventType,
        input.aggregateType,
        input.aggregateId,
        JSON.stringify(input.payloadJson),
        JSON.stringify(input.headersJson ?? {}),
        input.idempotencyKey ?? null,
        input.availableAt ?? new Date(),
        input.maxAttempts ?? 10,
        input.createdByUserId ?? null,
        input.requestId ?? null
      ]
    );

    const outboxId = result.rows[0]?.id;

    if (!outboxId) {
      throw new Error("Failed to persist integration outbox event");
    }

    return outboxId;
  }

  async claimDispatchBatch(
    providerKey: string,
    limit: number,
    queryable: Queryable = db
  ): Promise<IntegrationOutboxRow[]> {
    const result = await queryable.query<IntegrationOutboxRow>(
      `
        WITH candidates AS (
          SELECT io.id
          FROM ${databaseTables.integrationOutbox} io
          WHERE io.provider_key = $1
            AND io.status IN ('pending', 'failed')
            AND io.available_at <= NOW()
          ORDER BY io.available_at ASC, io.id ASC
          LIMIT $2
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
      [providerKey, limit]
    );

    return result.rows;
  }

  async findById(
    outboxId: string,
    queryable: Queryable = db
  ): Promise<IntegrationOutboxRow | null> {
    const result = await queryable.query<IntegrationOutboxRow>(
      `
        ${integrationOutboxSelect}
        WHERE io.id = $1
        LIMIT 1
      `,
      [outboxId]
    );

    return mapSingleRow(result.rows);
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
