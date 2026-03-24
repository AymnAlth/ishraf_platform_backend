import {
  assertSafeTestDatabaseTarget,
  bootstrapTestDatabase,
  createTestPool,
  loadTestEnvironment,
  resetTestDatabase
} from "./test-db";

const main = async (): Promise<void> => {
  loadTestEnvironment();
  assertSafeTestDatabaseTarget();

  const bootstrapOnly = process.argv.includes("--bootstrap-only");
  const pool = createTestPool();

  try {
    bootstrapTestDatabase();

    if (!bootstrapOnly) {
      await resetTestDatabase(pool);
      console.log("Test database reset and reseeded successfully");
      return;
    }

    console.log("Test database bootstrap completed successfully");
  } finally {
    await pool.end();
  }
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
