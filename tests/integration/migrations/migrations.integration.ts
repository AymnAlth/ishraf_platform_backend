import type { Pool } from "pg";
import { expect, it } from "vitest";

import { runMigration } from "../../setup/test-db";

interface MigrationSuiteContext {
  pool: Pool;
}

export const registerMigrationSmokeTests = ({ pool }: MigrationSuiteContext): void => {
  it(
    "applies migrations with user, role profile, academic, operational, system settings, and ETA provider metadata tables",
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
              'student_transport_home_locations',
              'transport_route_assignments',
              'trips',
              'bus_location_history',
              'trip_student_events',
              'transport_route_map_cache',
              'transport_trip_eta_snapshots',
              'transport_trip_eta_stop_snapshots',
              'messages',
              'announcements',
              'announcement_target_roles',
              'notifications',
              'school_onboarding_import_runs',
              'system_settings',
              'system_setting_audit_logs',
              'integration_outbox',
              'user_devices',
              'user_device_subscriptions'
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
        "student_transport_home_locations",
        "students",
        "subject_offerings",
        "subjects",
        "supervisor_classes",
        "supervisors",
        "system_setting_audit_logs",
        "system_settings",
        "teacher_classes",
        "teachers",
        "transport_route_assignments",
        "transport_route_map_cache",
        "transport_trip_eta_snapshots",
        "transport_trip_eta_stop_snapshots",
        "trip_student_events",
        "trips",
        "user_device_subscriptions",
        "user_devices",
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

      const etaSnapshotColumns = await pool.query<{ column_name: string }>(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'transport_trip_eta_snapshots'
            AND column_name IN ('provider_key', 'refresh_reason')
        `
      );

      expect(etaSnapshotColumns.rows.map((row) => row.column_name).sort()).toEqual([
        "provider_key",
        "refresh_reason"
      ]);

      const etaStopSnapshotColumns = await pool.query<{ column_name: string }>(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'transport_trip_eta_stop_snapshots'
            AND column_name IN ('approaching_notified', 'arrived_notified')
        `
      );

      expect(etaStopSnapshotColumns.rows.map((row) => row.column_name).sort()).toEqual([
        "approaching_notified",
        "arrived_notified"
      ]);

      const indexes = await pool.query<{ indexname: string }>(
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
              'idx_integration_outbox_request_id',
              'idx_user_devices_user_active_updated_at',
              'idx_user_devices_provider_active_updated_at',
              'idx_user_device_subscriptions_device_enabled',
              'idx_user_device_subscriptions_key_enabled',
              'idx_transport_route_map_cache_route_id',
              'uq_transport_route_map_cache_route_provider_signature',
              'idx_transport_route_map_cache_route_provider_signature',
              'idx_transport_trip_eta_snapshots_trip_id',
              'idx_transport_trip_eta_snapshots_status',
              'idx_transport_trip_eta_snapshots_provider_refreshed_at',
              'idx_transport_trip_eta_stop_snapshots_trip_stop_order'
            )
        `
      );

      expect(indexes.rows.map((row) => row.indexname).sort()).toEqual([
        "idx_integration_outbox_aggregate_created_at",
        "idx_integration_outbox_dispatch_queue",
        "idx_integration_outbox_provider_status_created_at",
        "idx_integration_outbox_request_id",
        "idx_system_setting_audit_logs_changed_by_created_at",
        "idx_system_setting_audit_logs_created_at",
        "idx_system_setting_audit_logs_group_key_created_at",
        "idx_system_setting_audit_logs_request_id",
        "idx_transport_route_map_cache_route_id",
        "idx_transport_route_map_cache_route_provider_signature",
        "idx_transport_trip_eta_snapshots_provider_refreshed_at",
        "idx_transport_trip_eta_snapshots_status",
        "idx_transport_trip_eta_snapshots_trip_id",
        "idx_transport_trip_eta_stop_snapshots_trip_stop_order",
        "idx_user_device_subscriptions_device_enabled",
        "idx_user_device_subscriptions_key_enabled",
        "idx_user_devices_provider_active_updated_at",
        "idx_user_devices_user_active_updated_at",
        "uq_integration_outbox_idempotency_key",
        "uq_system_settings_group_key",
        "uq_transport_route_map_cache_route_provider_signature"
      ]);

      const triggers = await pool.query<{ tgname: string }>(
        `
          SELECT tgname
          FROM pg_trigger
          WHERE NOT tgisinternal
            AND tgname IN (
              'trg_system_settings_set_updated_at',
              'trg_integration_outbox_set_updated_at',
              'trg_user_devices_set_updated_at',
              'trg_user_device_subscriptions_set_updated_at'
            )
        `
      );

      expect(triggers.rows.map((row) => row.tgname).sort()).toEqual([
        "trg_integration_outbox_set_updated_at",
        "trg_system_settings_set_updated_at",
        "trg_user_device_subscriptions_set_updated_at",
        "trg_user_devices_set_updated_at"
      ]);

      const constraints = await pool.query<{ conname: string }>(
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
            'chk_integration_outbox_max_attempts',
            'chk_user_devices_provider_key',
            'chk_user_devices_platform',
            'uq_user_devices_provider_token',
            'chk_user_device_subscriptions_key',
            'uq_user_device_subscriptions_device_key',
            'uq_transport_route_map_cache_route_provider_signature',
            'chk_transport_trip_eta_snapshots_status',
            'chk_transport_trip_eta_snapshots_calculation_mode',
            'uq_transport_trip_eta_stop_snapshots_trip_stop'
          )
        `
      );

      expect(constraints.rows.map((row) => row.conname).sort()).toEqual([
        "chk_integration_outbox_attempt_count",
        "chk_integration_outbox_max_attempts",
        "chk_integration_outbox_status",
        "chk_system_setting_audit_logs_action",
        "chk_system_setting_audit_logs_group",
        "chk_system_setting_audit_logs_values",
        "chk_system_settings_group",
        "chk_transport_trip_eta_snapshots_calculation_mode",
        "chk_transport_trip_eta_snapshots_status",
        "chk_user_device_subscriptions_key",
        "chk_user_devices_platform",
        "chk_user_devices_provider_key",
        "uq_system_settings_group_key",
        "uq_transport_route_map_cache_route_provider_signature",
        "uq_transport_trip_eta_stop_snapshots_trip_stop",
        "uq_user_device_subscriptions_device_key",
        "uq_user_devices_provider_token"
      ]);

      const calculationModeConstraint = await pool.query<{ definition: string }>(
        `
          SELECT pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE conname = 'chk_transport_trip_eta_snapshots_calculation_mode'
          LIMIT 1
        `
      );

      expect(calculationModeConstraint.rows[0]?.definition).toContain("provider_snapshot");
      expect(calculationModeConstraint.rows[0]?.definition).toContain("derived_estimate");

      const tripStatusConstraint = await pool.query<{ definition: string }>(
        `
          SELECT pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE conname = 'chk_trips_status'
          LIMIT 1
        `
      );

      expect(tripStatusConstraint.rows[0]?.definition).toContain("completed");
    },
    20_000
  );

  it(
    "rolls back only the last ETA arrival migration and can be applied again",
    async () => {
      runMigration("down");

      const etaTables = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN (
              'transport_route_map_cache',
              'transport_trip_eta_snapshots',
              'transport_trip_eta_stop_snapshots'
            )
        `
      );

      expect(etaTables.rows).toHaveLength(3);

      const etaSnapshotColumns = await pool.query<{ column_name: string }>(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'transport_trip_eta_snapshots'
            AND column_name IN ('provider_key', 'refresh_reason')
        `
      );

      expect(etaSnapshotColumns.rows.map((row) => row.column_name).sort()).toEqual([
        "provider_key",
        "refresh_reason"
      ]);

      const etaStopSnapshotColumns = await pool.query<{ column_name: string }>(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'transport_trip_eta_stop_snapshots'
            AND column_name IN ('approaching_notified', 'arrived_notified')
        `
      );

      expect(etaStopSnapshotColumns.rows.map((row) => row.column_name).sort()).toEqual([
        "approaching_notified"
      ]);

      const providerAwareIndexes = await pool.query<{ indexname: string }>(
        `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'idx_transport_route_map_cache_route_provider_signature',
              'uq_transport_route_map_cache_route_provider_signature'
            )
        `
      );

      expect(providerAwareIndexes.rows).toHaveLength(2);

      const etaIndexes = await pool.query<{ indexname: string }>(
        `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'idx_transport_route_map_cache_route_id',
              'idx_transport_trip_eta_snapshots_trip_id',
              'idx_transport_trip_eta_snapshots_status',
              'idx_transport_trip_eta_snapshots_provider_refreshed_at',
              'idx_transport_trip_eta_stop_snapshots_trip_stop_order'
            )
        `
      );

      expect(etaIndexes.rows).toHaveLength(5);

      const etaConstraints = await pool.query<{ conname: string }>(
        `
          SELECT conname
          FROM pg_constraint
          WHERE conname IN (
            'uq_transport_route_map_cache_route_provider_signature',
            'chk_transport_trip_eta_snapshots_status',
            'chk_transport_trip_eta_snapshots_calculation_mode',
            'uq_transport_trip_eta_stop_snapshots_trip_stop'
          )
        `
      );

      expect(etaConstraints.rows.map((row) => row.conname).sort()).toEqual([
        "chk_transport_trip_eta_snapshots_calculation_mode",
        "chk_transport_trip_eta_snapshots_status",
        "uq_transport_route_map_cache_route_provider_signature",
        "uq_transport_trip_eta_stop_snapshots_trip_stop"
      ]);

      const calculationModeConstraint = await pool.query<{ definition: string }>(
        `
          SELECT pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE conname = 'chk_transport_trip_eta_snapshots_calculation_mode'
          LIMIT 1
        `
      );

      expect(calculationModeConstraint.rows[0]?.definition).toContain("provider_snapshot");
      expect(calculationModeConstraint.rows[0]?.definition).toContain("derived_estimate");

      const tripStatusConstraint = await pool.query<{ definition: string }>(
        `
          SELECT pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE conname = 'chk_trips_status'
          LIMIT 1
        `
      );

      expect(tripStatusConstraint.rows[0]?.definition).not.toContain("completed");

      const deviceTables = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN (
              'user_devices',
              'user_device_subscriptions'
          )
        `
      );

      expect(deviceTables.rows).toHaveLength(2);

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

      expect(systemSettingsTables.rows).toHaveLength(3);

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
