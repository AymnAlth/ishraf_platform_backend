import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { PaginatedQueryResult } from "../../../common/types/pagination.types";
import {
  buildLimitOffsetClause,
  buildPaginationWindow
} from "../../../common/utils/pagination.util";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import type { ListSystemSettingAuditLogsQueryDto } from "../dto/system-settings.dto";
import type {
  IntegrationOutboxStatusSummaryRow,
  IntegrationOutboxWriteInput,
  SystemIntegrationProviderKey,
  SystemSettingAuditLogRow,
  SystemSettingChangeOperation,
  SystemSettingGroup,
  SystemSettingOverrideRow
} from "../types/system-settings.types";

const mapSingleRow = <TRow extends QueryResultRow>(rows: TRow[]): TRow | null => rows[0] ?? null;

const systemSettingOverrideSelect = `
  SELECT
    ss.id::text AS id,
    ss.setting_group AS "settingGroup",
    ss.setting_key AS "settingKey",
    ss.value_json AS "valueJson",
    ss.updated_by_user_id::text AS "updatedByUserId",
    u.full_name AS "updatedByFullName",
    ss.created_at AS "createdAt",
    ss.updated_at AS "updatedAt"
  FROM ${databaseTables.systemSettings} ss
  JOIN ${databaseTables.users} u ON u.id = ss.updated_by_user_id
`;

const systemSettingAuditSelect = `
  SELECT
    sal.id::text AS id,
    sal.system_setting_id::text AS "systemSettingId",
    sal.setting_group AS "settingGroup",
    sal.setting_key AS "settingKey",
    sal.action,
    sal.previous_value_json AS "previousValueJson",
    sal.new_value_json AS "newValueJson",
    sal.changed_by_user_id::text AS "changedByUserId",
    u.full_name AS "changedByFullName",
    sal.change_reason AS "changeReason",
    sal.request_id::text AS "requestId",
    sal.created_at AS "createdAt"
  FROM ${databaseTables.systemSettingAuditLogs} sal
  JOIN ${databaseTables.users} u ON u.id = sal.changed_by_user_id
`;

export class SystemSettingsRepository {
  async listOverrides(queryable: Queryable = db): Promise<SystemSettingOverrideRow[]> {
    const result = await queryable.query<SystemSettingOverrideRow>(
      `
        ${systemSettingOverrideSelect}
        ORDER BY ss.setting_group ASC, ss.setting_key ASC
      `
    );

    return result.rows;
  }

  async listOverridesByGroup(
    group: SystemSettingGroup,
    queryable: Queryable = db
  ): Promise<SystemSettingOverrideRow[]> {
    const result = await queryable.query<SystemSettingOverrideRow>(
      `
        ${systemSettingOverrideSelect}
        WHERE ss.setting_group = $1
        ORDER BY ss.setting_key ASC
      `,
      [group]
    );

    return result.rows;
  }

  async findOverrideByGroupKey(
    group: SystemSettingGroup,
    key: string,
    queryable: Queryable = db
  ): Promise<SystemSettingOverrideRow | null> {
    const result = await queryable.query<SystemSettingOverrideRow>(
      `
        ${systemSettingOverrideSelect}
        WHERE ss.setting_group = $1
          AND ss.setting_key = $2
        LIMIT 1
      `,
      [group, key]
    );

    return mapSingleRow(result.rows);
  }

  async upsertOverride(
    input: {
      group: SystemSettingGroup;
      key: string;
      valueJson: unknown;
      updatedByUserId: string;
    },
    queryable: Queryable = db
  ): Promise<SystemSettingOverrideRow> {
    await queryable.query(
      `
        INSERT INTO ${databaseTables.systemSettings} (
          setting_group,
          setting_key,
          value_json,
          updated_by_user_id
        )
        VALUES ($1, $2, $3::jsonb, $4)
        ON CONFLICT (setting_group, setting_key)
        DO UPDATE SET
          value_json = EXCLUDED.value_json,
          updated_by_user_id = EXCLUDED.updated_by_user_id
      `,
      [input.group, input.key, JSON.stringify(input.valueJson), input.updatedByUserId]
    );

    const override = await this.findOverrideByGroupKey(input.group, input.key, queryable);

    if (!override) {
      throw new Error("Failed to reload system setting override");
    }

    return override;
  }

  async deleteOverrideByGroupKey(
    group: SystemSettingGroup,
    key: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        DELETE FROM ${databaseTables.systemSettings}
        WHERE setting_group = $1
          AND setting_key = $2
      `,
      [group, key]
    );
  }

  async insertAuditLogs(
    input: {
      changedByUserId: string;
      changeReason: string;
      requestId: string;
      operations: SystemSettingChangeOperation[];
    },
    queryable: Queryable = db
  ): Promise<void> {
    if (input.operations.length === 0) {
      return;
    }

    const valuesSql: string[] = [];
    const params: unknown[] = [];

    for (const [index, operation] of input.operations.entries()) {
      const baseIndex = index * 9;

      valuesSql.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}::jsonb, $${baseIndex + 6}::jsonb, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`
      );

      params.push(
        operation.systemSettingId,
        operation.settingGroup,
        operation.settingKey,
        operation.action,
        operation.previousValueJson === null ? null : JSON.stringify(operation.previousValueJson),
        operation.newValueJson === null ? null : JSON.stringify(operation.newValueJson),
        input.changedByUserId,
        input.changeReason,
        input.requestId
      );
    }

    await queryable.query(
      `
        INSERT INTO ${databaseTables.systemSettingAuditLogs} (
          system_setting_id,
          setting_group,
          setting_key,
          action,
          previous_value_json,
          new_value_json,
          changed_by_user_id,
          change_reason,
          request_id
        )
        VALUES ${valuesSql.join(", ")}
      `,
      params
    );
  }

  async listAuditLogs(
    filters: ListSystemSettingAuditLogsQueryDto,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<SystemSettingAuditLogRow>> {
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filters.group) {
      params.push(filters.group);
      whereClauses.push(`sal.setting_group = $${params.length}`);
    }

    if (filters.key) {
      params.push(filters.key);
      whereClauses.push(`sal.setting_key = $${params.length}`);
    }

    if (filters.changedByUserId) {
      params.push(filters.changedByUserId);
      whereClauses.push(`sal.changed_by_user_id = $${params.length}`);
    }

    if (filters.since) {
      params.push(filters.since);
      whereClauses.push(`sal.created_at >= $${params.length}::timestamptz`);
    }

    if (filters.until) {
      params.push(filters.until);
      whereClauses.push(`sal.created_at <= $${params.length}::timestamptz`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseTables.systemSettingAuditLogs} sal
        ${whereSql}
      `,
      params
    );
    const { limit, offset } = buildPaginationWindow(filters.page, filters.limit);
    const result = await queryable.query<SystemSettingAuditLogRow>(
      `
        ${systemSettingAuditSelect}
        ${whereSql}
        ORDER BY sal.created_at ${filters.sortOrder.toUpperCase()}, sal.id ${filters.sortOrder.toUpperCase()}
        ${buildLimitOffsetClause(params.length + 1)}
      `,
      [...params, limit, offset]
    );

    return {
      rows: result.rows,
      totalItems: Number(countResult.rows[0]?.total ?? 0)
    };
  }

  async summarizeOutboxByProvider(
    providerKeys: readonly SystemIntegrationProviderKey[],
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

  async enqueueOutboxEvent(
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
}
