import type { Pool } from "pg";
import { expect, it } from "vitest";

import { runMigration } from "../../setup/test-db";

interface MigrationSuiteContext {
  pool: Pool;
}

export const registerMigrationSmokeTests = ({ pool }: MigrationSuiteContext): void => {
  it(
    "applies migrations with user, role profile, academic, operational, homework, communication, and system settings tables",
    async () => {
      runMigration("up");

      const tables = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN (
              'users',
              'auth_refresh_tokens',
              'password_reset_tokens',
              'parents',
              'teachers',
              'supervisors',
              'drivers',
              'academic_years',
              'semesters',
              'grade_levels',
              'classes',
              'subjects',
              'subject_offerings',
              'teacher_classes',
              'supervisor_classes',
              'students',
              'student_academic_enrollments',
              'student_parents',
              'student_promotions',
              'assessment_types',
              'assessments',
              'student_assessments',
              'homework',
              'homework_submissions',
              'behavior_categories',
              'behavior_records',
              'attendance_sessions',
              'attendance',
              'buses',
              'routes',
              'bus_stops',
              'student_bus_assignments',
              'trips',
              'bus_location_history',
              'trip_student_events',
              'messages',
              'announcements',
              'announcement_target_roles',
              'notifications',
              'school_onboarding_import_runs',
              'system_settings',
              'system_setting_audit_logs',
              'integration_outbox'
            )
        `
      );

      expect(tables.rows.map((row) => row.table_name).sort()).toEqual([
        "academic_years",
        "announcement_target_roles",
        "announcements",
        "assessment_types",
        "assessments",
        "attendance",
        "attendance_sessions",
        "auth_refresh_tokens",
        "behavior_categories",
        "behavior_records",
        "bus_location_history",
        "bus_stops",
        "buses",
        "classes",
        "drivers",
        "grade_levels",
        "homework",
        "homework_submissions",
        "integration_outbox",
        "messages",
        "notifications",
        "parents",
        "password_reset_tokens",
        "routes",
        "school_onboarding_import_runs",
        "semesters",
        "student_academic_enrollments",
        "student_assessments",
        "student_bus_assignments",
        "student_parents",
        "student_promotions",
        "students",
        "subject_offerings",
        "subjects",
        "supervisor_classes",
        "supervisors",
        "system_setting_audit_logs",
        "system_settings",
        "teacher_classes",
        "teachers",
        "trip_student_events",
        "trips",
        "users"
      ]);

      const views = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.views
          WHERE table_schema = 'public'
            AND table_name IN (
              'vw_active_academic_context',
              'vw_student_attendance_summary',
              'vw_class_attendance_summary',
              'vw_homework_details',
              'vw_homework_submission_details',
              'vw_admin_dashboard_summary'
            )
        `
      );

      expect(views.rows.map((row) => row.table_name).sort()).toEqual([
        "vw_active_academic_context",
        "vw_admin_dashboard_summary",
        "vw_class_attendance_summary",
        "vw_homework_details",
        "vw_homework_submission_details",
        "vw_student_attendance_summary"
      ]);

      const systemSettingsIndexes = await pool.query<{ indexname: string }>(
        `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'uq_system_settings_group_key',
              'idx_system_setting_audit_logs_created_at',
              'idx_system_setting_audit_logs_group_key_created_at',
              'idx_system_setting_audit_logs_changed_by_created_at',
              'idx_system_setting_audit_logs_request_id',
              'idx_integration_outbox_dispatch_queue',
              'idx_integration_outbox_provider_status_created_at',
              'idx_integration_outbox_aggregate_created_at',
              'uq_integration_outbox_idempotency_key',
              'idx_integration_outbox_request_id'
            )
        `
      );

      expect(systemSettingsIndexes.rows.map((row) => row.indexname).sort()).toEqual([
        "idx_integration_outbox_aggregate_created_at",
        "idx_integration_outbox_dispatch_queue",
        "idx_integration_outbox_provider_status_created_at",
        "idx_integration_outbox_request_id",
        "idx_system_setting_audit_logs_changed_by_created_at",
        "idx_system_setting_audit_logs_created_at",
        "idx_system_setting_audit_logs_group_key_created_at",
        "idx_system_setting_audit_logs_request_id",
        "uq_integration_outbox_idempotency_key",
        "uq_system_settings_group_key"
      ]);

      const systemSettingsTriggers = await pool.query<{ tgname: string }>(
        `
          SELECT tgname
          FROM pg_trigger
          WHERE NOT tgisinternal
            AND tgname IN (
              'trg_system_settings_set_updated_at',
              'trg_integration_outbox_set_updated_at'
            )
        `
      );

      expect(systemSettingsTriggers.rows.map((row) => row.tgname).sort()).toEqual([
        "trg_integration_outbox_set_updated_at",
        "trg_system_settings_set_updated_at"
      ]);

      const systemSettingsConstraints = await pool.query<{ conname: string }>(
        `
          SELECT conname
          FROM pg_constraint
          WHERE conname IN (
            'chk_system_settings_group',
            'uq_system_settings_group_key',
            'chk_system_setting_audit_logs_group',
            'chk_system_setting_audit_logs_action',
            'chk_system_setting_audit_logs_values',
            'chk_integration_outbox_status',
            'chk_integration_outbox_attempt_count',
            'chk_integration_outbox_max_attempts'
          )
        `
      );

      expect(systemSettingsConstraints.rows.map((row) => row.conname).sort()).toEqual([
        "chk_integration_outbox_attempt_count",
        "chk_integration_outbox_max_attempts",
        "chk_integration_outbox_status",
        "chk_system_setting_audit_logs_action",
        "chk_system_setting_audit_logs_group",
        "chk_system_setting_audit_logs_values",
        "chk_system_settings_group",
        "uq_system_settings_group_key"
      ]);
    },
    20_000
  );

  it(
    "rolls back the last migration and can be applied again",
    async () => {
      runMigration("down");

      const systemSettingsTables = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN (
              'system_settings',
              'system_setting_audit_logs',
              'integration_outbox'
            )
        `
      );

      expect(systemSettingsTables.rows).toHaveLength(0);

      const systemSettingsIndexes = await pool.query<{ indexname: string }>(
        `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'uq_system_settings_group_key',
              'idx_system_setting_audit_logs_created_at',
              'idx_system_setting_audit_logs_group_key_created_at',
              'idx_system_setting_audit_logs_changed_by_created_at',
              'idx_system_setting_audit_logs_request_id',
              'idx_integration_outbox_dispatch_queue',
              'idx_integration_outbox_provider_status_created_at',
              'idx_integration_outbox_aggregate_created_at',
              'uq_integration_outbox_idempotency_key',
              'idx_integration_outbox_request_id'
            )
        `
      );

      expect(systemSettingsIndexes.rows).toHaveLength(0);

      const systemSettingsTriggers = await pool.query<{ tgname: string }>(
        `
          SELECT tgname
          FROM pg_trigger
          WHERE NOT tgisinternal
            AND tgname IN (
              'trg_system_settings_set_updated_at',
              'trg_integration_outbox_set_updated_at'
            )
        `
      );

      expect(systemSettingsTriggers.rows).toHaveLength(0);

      const rosterIndexes = await pool.query<{ indexname: string }>(
        `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'idx_student_academic_enrollments_class_year_student'
        `
      );

      expect(rosterIndexes.rows).toHaveLength(1);

      const behaviorPerformanceIndexes = await pool.query<{ indexname: string }>(
        `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'idx_behavior_records_student_year_semester_date',
              'idx_behavior_records_teacher_year_semester_date',
              'idx_behavior_records_supervisor_year_semester_date'
            )
        `
      );

      expect(behaviorPerformanceIndexes.rows).toHaveLength(3);

      const previousPerformanceIndexes = await pool.query<{ indexname: string }>(
        `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'idx_attendance_sessions_teacher_year_semester_date',
              'idx_assessments_teacher_year_semester_date',
              'idx_homework_teacher_year_semester_due_date'
            )
        `
      );

      expect(previousPerformanceIndexes.rows).toHaveLength(3);

      const importTables = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'school_onboarding_import_runs'
        `
      );

      expect(importTables.rows).toHaveLength(1);

      runMigration("up");
    },
    20_000
  );
};
