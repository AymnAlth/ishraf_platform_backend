import "dotenv/config";

import bcrypt from "bcrypt";
import { Pool, type QueryResultRow } from "pg";
import { z } from "zod";

const PLACEHOLDER_MARKER = "REPLACE_WITH_REAL_BCRYPT_HASH";
const DEFAULT_TEMPORARY_PASSWORD = "ChangeMe123!";

const scriptEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_SCHEMA: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .default("eshraf"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  TEMPORARY_PASSWORD: z.string().min(8).max(72).default(DEFAULT_TEMPORARY_PASSWORD)
});

export interface PlaceholderUserRow extends QueryResultRow {
  id: string;
  email: string | null;
  phone: string | null;
}

export const getPlaceholderPasswordMarker = (): string => PLACEHOLDER_MARKER;

export const updatePlaceholderPasswords = async (
  queryable: {
    query<T extends QueryResultRow>(text: string, params: unknown[]): Promise<{ rows: T[] }>;
  },
  options: {
    schema: string;
    temporaryPassword: string;
    saltRounds: number;
  }
): Promise<PlaceholderUserRow[]> => {
  const passwordHash = await bcrypt.hash(options.temporaryPassword, options.saltRounds);
  const result = await queryable.query<PlaceholderUserRow>(
    `
      UPDATE ${options.schema}.users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE password_hash LIKE $2
      RETURNING id, email, phone
    `,
    [passwordHash, `%${PLACEHOLDER_MARKER}%`]
  );

  return result.rows;
};

export const fixPlaceholderPasswords = async (options: {
  connectionString: string;
  schema: string;
  temporaryPassword: string;
  saltRounds: number;
}): Promise<PlaceholderUserRow[]> => {
  const pool = new Pool({
    connectionString: options.connectionString
  });

  try {
    return await updatePlaceholderPasswords(pool, {
      schema: options.schema,
      temporaryPassword: options.temporaryPassword,
      saltRounds: options.saltRounds
    });
  } finally {
    await pool.end();
  }
};

const main = async (): Promise<void> => {
  const env = scriptEnvSchema.parse(process.env);
  const updatedUsers = await fixPlaceholderPasswords({
    connectionString: env.DATABASE_URL,
    schema: env.DATABASE_SCHEMA,
    temporaryPassword: env.TEMPORARY_PASSWORD,
    saltRounds: env.BCRYPT_SALT_ROUNDS
  });

  console.log(
    `Updated ${updatedUsers.length} user password hash(es) in ${env.DATABASE_SCHEMA}.users`
  );

  for (const user of updatedUsers) {
    console.log(
      `- id=${user.id} email=${user.email ?? "null"} phone=${user.phone ?? "null"}`
    );
  }
};

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
