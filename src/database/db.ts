import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import type { Queryable } from "../common/interfaces/queryable.interface";
import { queryPerformanceAuditService } from "../common/services/query-performance-audit.service";
import { requestExecutionContextService } from "../common/services/request-execution-context.service";
import { databaseConfig } from "../config/database";

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
  const result = await executor();
  const durationInMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const context = requestExecutionContextService.getCurrentContext();

  queryPerformanceAuditService.record({
    requestId: context?.requestId,
    method: context?.method,
    routePattern: requestExecutionContextService.getCurrentRoutePattern(),
    originalPath: context?.originalPath,
    sql: text,
    durationInMs,
    rowCount: typeof result.rowCount === "number" ? result.rowCount : null
  });

  return result;
};

export const db = {
  pool,
  query: <T extends QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> => instrumentQuery(text, params, () => pool.query<T>(text, params)),
  ping: async (): Promise<void> => {
    await pool.query("SELECT 1");
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
