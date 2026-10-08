import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import type { Queryable } from "../common/interfaces/queryable.interface";
import { performanceTelemetryService } from "../common/services/performance-telemetry.service";
import { queryPerformanceAuditService } from "../common/services/query-performance-audit.service";
import { requestExecutionContextService } from "../common/services/request-execution-context.service";
import { databaseConfig } from "../config/database";
import { logger } from "../config/logger";

const connectionString =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? databaseConfig.connectionString
    : databaseConfig.connectionString;

const pool = new Pool({
  ...databaseConfig,
  connectionString
});

const instrumentQuery = async <T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  executor: () => Promise<QueryResult<T>>
): Promise<QueryResult<T>> => {
  const startedAt = process.hrtime.bigint();
  const context = requestExecutionContextService.getCurrentContext();
  const routePattern = requestExecutionContextService.getCurrentRoutePattern();
  const normalizedSqlPreview = text.replace(/\s+/g, " ").trim();
  const sqlPreview =
    normalizedSqlPreview.length > 300
      ? `${normalizedSqlPreview.slice(0, 300)}...`
      : normalizedSqlPreview;

  try {
    const result = await executor();
    const durationInMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const rowCount = typeof result.rowCount === "number" ? result.rowCount : null;

    queryPerformanceAuditService.record({
      requestId: context?.requestId,
      method: context?.method,
      routePattern,
      originalPath: context?.originalPath,
      sql: text,
      durationInMs,
      rowCount
    });

    performanceTelemetryService.recordQuery({
      requestId: context?.requestId,
      method: context?.method,
      routePattern,
      originalPath: context?.originalPath,
      sql: text,
      durationInMs,
      rowCount
    });

    if (performanceTelemetryService.isSlowQuery(durationInMs)) {
      logger.warn(
        {
          requestId: context?.requestId,
          method: context?.method,
          routePattern,
          originalPath: context?.originalPath,
          durationInMs: Number(durationInMs.toFixed(2)),
          rowCount,
          sql: sqlPreview
        },
        "Slow SQL query detected"
      );
    }

    return result;
  } catch (error) {
    const durationInMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    performanceTelemetryService.recordQuery({
      requestId: context?.requestId,
      method: context?.method,
      routePattern,
      originalPath: context?.originalPath,
      sql: text,
      durationInMs,
      rowCount: null
    });

    if (performanceTelemetryService.isSlowQuery(durationInMs)) {
      logger.warn(
        {
          requestId: context?.requestId,
          method: context?.method,
          routePattern,
          originalPath: context?.originalPath,
          durationInMs: Number(durationInMs.toFixed(2)),
          rowCount: null,
          sql: sqlPreview
        },
        "Slow SQL query detected before failure"
      );
    }

    throw error;
  }
};

export const db = {
  pool,
  query: <T extends QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> => instrumentQuery(text, params, () => pool.query<T>(text, params)),
  ping: async (): Promise<void> => {
    await instrumentQuery("SELECT 1", [], () => pool.query("SELECT 1"));
  },
  getClient: (): Promise<PoolClient> => pool.connect(),
  withTransaction: async <T>(callback: (client: Queryable & PoolClient) => Promise<T>) => {
    const client = await pool.connect();
    const instrumentedClient = Object.assign(Object.create(client), client, {
      query: <TRow extends QueryResultRow>(text: string, params: unknown[] = []) =>
        instrumentQuery(text, params, () => client.query<TRow>(text, params))
    }) as Queryable & PoolClient;

    try {
      await client.query("BEGIN");
      const result = await callback(instrumentedClient);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  close: (): Promise<void> => pool.end()
};
