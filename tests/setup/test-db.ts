import { execSync } from "node:child_process";

import { config as loadDotEnv } from "dotenv";
import { Pool } from "pg";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const rootDir = process.cwd();

const DEFAULT_TEST_DATABASE_URL = "postgresql://postgres:QAZwsx123@localhost:5432/ishraf_platform_test";
const DEFAULT_TEST_SCHEMA = "public";
const TEST_DATABASE_NAME_PATTERN = /test/i;

const applyTestDefaults = (): void => {
  process.env.NODE_ENV ??= "test";
  process.env.PORT ??= "4001";
  process.env.APP_NAME ??= "ishraf-platform-backend-test";
  process.env.API_PREFIX ??= "/api/v1";
  process.env.TEST_DATABASE_URL ??= process.env.DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL;
  process.env.DATABASE_SCHEMA ??= DEFAULT_TEST_SCHEMA;
  process.env.ACCESS_TOKEN_SECRET ??= "test-access-secret";
  process.env.ACCESS_TOKEN_TTL_MINUTES ??= "15";
  process.env.REFRESH_TOKEN_SECRET ??= "test-refresh-secret";
  process.env.REFRESH_TOKEN_TTL_DAYS ??= "7";
  process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ??= "30";
  process.env.CORS_ALLOWED_ORIGINS ??= "http://localhost:3000,http://localhost:5173";
  process.env.TRUST_PROXY ??= "false";
  process.env.REQUEST_BODY_LIMIT ??= "1mb";
  process.env.AUTH_LOGIN_RATE_LIMIT_MAX ??= "5";
  process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ??= "900000";
  process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX ??= "5";
  process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS ??= "900000";
  process.env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE ??= "true";
  process.env.BCRYPT_SALT_ROUNDS ??= "10";
  process.env.LOG_LEVEL ??= "silent";
};

export const loadTestEnvironment = (): void => {
  loadDotEnv({
    path: ".env.test",
    override: false,
    quiet: true
  });
  applyTestDefaults();
};

loadTestEnvironment();

export const getTestDatabaseUrl = (): string => {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Test database URL is not configured");
  }

  return databaseUrl;
};

export const assertSafeTestDatabaseTarget = (): void => {
  loadTestEnvironment();

  if (process.env.NODE_ENV !== "test") {
    throw new Error("Refusing to run destructive test database commands outside NODE_ENV=test");
  }

  const databaseUrl = getTestDatabaseUrl();
  const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");

  if (!databaseName || !TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to target a non-test database: ${databaseName || "<unknown>"}`);
  }

  const schema = process.env.DATABASE_SCHEMA ?? DEFAULT_TEST_SCHEMA;

  if (schema !== DEFAULT_TEST_SCHEMA) {
    throw new Error(`Refusing to run destructive test database commands on schema "${schema}"`);
  }
};

export const hasTestDatabase =
  (() => {
    try {
      assertSafeTestDatabaseTarget();
      return process.env.RUN_DESTRUCTIVE_INTEGRATION_TESTS === "true";
    } catch {
      return false;
    }
  })();

export const createTestPool = (): Pool => {
  assertSafeTestDatabaseTarget();

  return new Pool({
    connectionString: getTestDatabaseUrl()
  });
};

export const runMigration = (direction: "up" | "down"): void => {
  assertSafeTestDatabaseTarget();

  execSync(
    `${pnpmCommand} exec node-pg-migrate ${direction} -d DATABASE_URL -m src/database/migrations -t pgmigrations`,
    {
      cwd: rootDir,
      env: {
        ...process.env,
        DATABASE_URL: getTestDatabaseUrl(),
        DATABASE_URL_MIGRATIONS: getTestDatabaseUrl(),
        TEST_DATABASE_URL: getTestDatabaseUrl(),
        DATABASE_SCHEMA: process.env.DATABASE_SCHEMA ?? DEFAULT_TEST_SCHEMA
      },
      stdio: "pipe"
    }
  );
};

export const bootstrapTestDatabase = (): void => {
  runMigration("up");
};

export const dropAllTestObjects = async (pool: Pool): Promise<void> => {
  assertSafeTestDatabaseTarget();

  await pool.query(
    "DROP VIEW IF EXISTS vw_admin_dashboard_summary, vw_user_notification_summary, vw_notification_details, vw_active_announcements, vw_announcement_details, vw_user_inbox_summary, vw_message_details, vw_trip_student_event_details, vw_active_trip_live_status, vw_latest_trip_location, vw_trip_details, vw_active_student_bus_assignments, vw_route_stops, vw_student_behavior_summary, vw_behavior_details, vw_homework_submission_details, vw_homework_details, vw_student_assessment_summary, vw_student_assessment_details, vw_assessment_details, vw_class_attendance_summary, vw_student_attendance_summary, vw_attendance_details, vw_class_students, vw_student_primary_parent, vw_student_profiles CASCADE;"
  );
  await pool.query(
    "DROP TABLE IF EXISTS notifications, announcements, messages, trip_student_events, bus_location_history, trips, student_bus_assignments, bus_stops, routes, buses, behavior_records, behavior_categories, homework_submissions, homework, student_assessments, assessments, assessment_types, attendance, attendance_sessions, student_promotions, student_parents, students, auth_refresh_tokens, password_reset_tokens, teacher_classes, supervisor_classes, subjects, classes, semesters, grade_levels, academic_years, drivers, supervisors, teachers, parents, users, pgmigrations CASCADE;"
  );
};

export const resetTestDatabase = async (pool: Pool): Promise<void> => {
  assertSafeTestDatabaseTarget();

  await pool.query(
    "TRUNCATE TABLE notifications, announcements, messages, trip_student_events, bus_location_history, trips, student_bus_assignments, bus_stops, routes, buses, behavior_records, behavior_categories, homework_submissions, homework, student_assessments, assessments, assessment_types, attendance, attendance_sessions, student_promotions, student_parents, students, auth_refresh_tokens, password_reset_tokens, teacher_classes, supervisor_classes, subjects, classes, semesters, grade_levels, academic_years, drivers, supervisors, teachers, parents, users RESTART IDENTITY CASCADE;"
  );

  const [{ seedBaseTestData }, { resetAuthRateLimiters }] = await Promise.all([
    import("./seed-test-data"),
    import("../../src/modules/auth/policies/auth.policy")
  ]);

  resetAuthRateLimiters();
  await seedBaseTestData(pool);
};
