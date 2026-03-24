import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import type { Queryable } from "../common/interfaces/queryable.interface";
import { databaseConfig } from "../config/database";

const connectionString =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? databaseConfig.connectionString
    : databaseConfig.connectionString;

const pool = new Pool({
  ...databaseConfig,
  connectionString
});

export const db = {
  pool,
  query: <T extends QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> => pool.query<T>(text, params),
  ping: async (): Promise<void> => {
    await pool.query("SELECT 1");
  },
  getClient: (): Promise<PoolClient> => pool.connect(),
  withTransaction: async <T>(callback: (client: Queryable & PoolClient) => Promise<T>) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
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
