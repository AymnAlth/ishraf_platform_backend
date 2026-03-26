import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { Pool } from "pg";
import { z } from "zod";

const scriptEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_MIGRATIONS: z.string().min(1).optional()
});

const runSeed = async (): Promise<void> => {
  const env = scriptEnvSchema.parse(process.env);
  const candidatePaths = [
    path.resolve(__dirname, "../database/seeds/staging_frontend_seed.sql"),
    path.resolve(__dirname, "../../src/database/seeds/staging_frontend_seed.sql")
  ];

  let sqlPath: string | null = null;

  for (const candidatePath of candidatePaths) {
    try {
      await fs.access(candidatePath);
      sqlPath = candidatePath;
      break;
    } catch {
      // Try the next candidate path.
    }
  }

  if (!sqlPath) {
    throw new Error("Could not locate staging_frontend_seed.sql");
  }

  const sql = await fs.readFile(sqlPath, "utf8");

  const pool = new Pool({
    connectionString: env.DATABASE_URL_MIGRATIONS ?? env.DATABASE_URL
  });

  try {
    await pool.query(sql);
    console.log("Staging frontend seed applied successfully.");
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  void runSeed().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
