require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DATABASE_URL_MIGRATIONS is required to run migrations.");
}

module.exports = {
  databaseUrl,
  dir: "src/database/migrations",
  migrationsTable: "pgmigrations",
  direction: "up",
  count: Infinity,
  createSchema: false
};
