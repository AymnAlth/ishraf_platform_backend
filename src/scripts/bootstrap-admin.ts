import "dotenv/config";

import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { z } from "zod";

import { hashPassword } from "../common/utils/password.util";

const booleanStringSchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .default(false)
  .transform((value) => (typeof value === "boolean" ? value : value === "true"));

const scriptEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_MIGRATIONS: z.string().min(1).optional(),
  DATABASE_SCHEMA: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .default("public"),
  BOOTSTRAP_ADMIN_EMAIL: z.email(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).max(72),
  BOOTSTRAP_ADMIN_FULL_NAME: z.string().min(1).default("System Administrator"),
  BOOTSTRAP_ADMIN_PHONE: z.string().trim().min(1).optional(),
  BOOTSTRAP_ADMIN_RESET_PASSWORD: booleanStringSchema
});

interface ExistingUserRow extends QueryResultRow {
  id: string;
  role: string;
}

const selectExistingUser = async (
  client: PoolClient,
  schema: string,
  email: string
): Promise<ExistingUserRow | null> => {
  const result = await client.query<ExistingUserRow>(
    `
      SELECT id, role
      FROM ${schema}.users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] ?? null;
};

const createAdminUser = async (
  client: PoolClient,
  schema: string,
  input: {
    email: string;
    fullName: string;
    phone: string | null;
    passwordHash: string;
  }
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO ${schema}.users (
        full_name,
        email,
        phone,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, 'admin', TRUE)
      RETURNING id
    `,
    [input.fullName, input.email, input.phone, input.passwordHash]
  );

  return result.rows[0].id;
};

const updateAdminUser = async (
  client: PoolClient,
  schema: string,
  existingUserId: string,
  input: {
    fullName: string;
    phone: string | undefined;
    passwordHash: string | null;
  }
): Promise<void> => {
  const assignments = ["full_name = $2", "is_active = TRUE", "updated_at = NOW()"];
  const values: unknown[] = [existingUserId, input.fullName];

  if (input.phone !== undefined) {
    values.push(input.phone);
    assignments.push(`phone = $${values.length}`);
  }

  if (input.passwordHash) {
    values.push(input.passwordHash);
    assignments.push(`password_hash = $${values.length}`);
  }

  await client.query(
    `
      UPDATE ${schema}.users
      SET ${assignments.join(", ")}
      WHERE id = $1
    `,
    values
  );
};

const bootstrapAdmin = async (): Promise<void> => {
  const env = scriptEnvSchema.parse(process.env);
  const pool = new Pool({
    connectionString: env.DATABASE_URL_MIGRATIONS ?? env.DATABASE_URL
  });

  const passwordHash = await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD);

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingUser = await selectExistingUser(
        client,
        env.DATABASE_SCHEMA,
        env.BOOTSTRAP_ADMIN_EMAIL
      );

      if (!existingUser) {
        const userId = await createAdminUser(client, env.DATABASE_SCHEMA, {
          email: env.BOOTSTRAP_ADMIN_EMAIL,
          fullName: env.BOOTSTRAP_ADMIN_FULL_NAME,
          phone: env.BOOTSTRAP_ADMIN_PHONE ?? null,
          passwordHash
        });

        await client.query("COMMIT");
        console.log(`Created bootstrap admin user with id=${userId}`);
        return;
      }

      if (existingUser.role !== "admin") {
        throw new Error(
          `Cannot bootstrap admin: ${env.BOOTSTRAP_ADMIN_EMAIL} already exists with role=${existingUser.role}`
        );
      }

      await updateAdminUser(client, env.DATABASE_SCHEMA, existingUser.id, {
        fullName: env.BOOTSTRAP_ADMIN_FULL_NAME,
        phone: env.BOOTSTRAP_ADMIN_PHONE,
        passwordHash: env.BOOTSTRAP_ADMIN_RESET_PASSWORD ? passwordHash : null
      });

      await client.query("COMMIT");
      console.log(
        `Bootstrap admin user already exists with id=${existingUser.id}. Record refreshed successfully.`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  void bootstrapAdmin().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
