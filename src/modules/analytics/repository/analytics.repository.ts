import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { databaseTables, databaseViews } from "../../../config/database";
import { db } from "../../../database/db";

import type {
  AnalyticsAnalysisType,
  AnalyticsClassHomeworkSummaryRow,
  AnalyticsFeedbackAggregateRow,
  AnalyticsFeedbackRow,
  AnalyticsFeedbackWriteInput,
  AnalyticsJobRow,
  AnalyticsJobStatus,
  AnalyticsJobWriteInput,
  AnalyticsObsoleteSnapshotCleanupResult,
  AnalyticsOperationalAssessmentSummaryRow,
  AnalyticsOperationalAttendanceSummaryRow,
  AnalyticsOperationalBehaviorSummaryRow,
  AnalyticsOperationalHomeworkSummaryRow,
  AnalyticsScheduledClassCandidateRow,
  AnalyticsScheduledRouteCandidateRow,
  AnalyticsScheduledStudentCandidateRow,
  AnalyticsScheduledTeacherCandidateRow,
  AnalyticsSchedulerRunRow,
  AnalyticsSchedulerRunStatus,
  AnalyticsSchedulerRunWriteInput,
  AnalyticsSchedulerTriggerMode,
  AnalyticsSnapshotReviewStatus,
  AnalyticsSnapshotReviewWriteInput,
  AnalyticsSnapshotRow,
  AnalyticsSnapshotWriteInput,
  AnalyticsStudentHomeworkSummaryRow,
  AnalyticsStudentSubjectRow,
  AnalyticsSubjectType,
  AnalyticsTeacherAssessmentSummaryRow,
  AnalyticsTeacherAssignmentCountRow,
  AnalyticsTeacherAttendanceSummaryRow,
  AnalyticsTeacherBehaviorSummaryRow,
  AnalyticsTeacherHomeworkSummaryRow,
  AnalyticsTransportRouteOperationalSummaryRow
} from "../types/analytics.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const analyticsJobColumns = `
  id::text AS id,
  analysis_type AS "analysisType",
  subject_type AS "subjectType",
  subject_id::text AS "subjectId",
  academic_year_id::text AS "academicYearId",
  semester_id::text AS "semesterId",
  requested_by_user_id::text AS "requestedByUserId",
  status,
  primary_provider AS "primaryProvider",
  fallback_provider AS "fallbackProvider",
  selected_provider AS "selectedProvider",
  fallback_used AS "fallbackUsed",
  input_json AS "inputJson",
  snapshot_id::text AS "snapshotId",
  started_at AS "startedAt",
  completed_at AS "completedAt",
  last_error_code AS "lastErrorCode",
  last_error_message AS "lastErrorMessage",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const analyticsJobSelect = `
  SELECT
    ${analyticsJobColumns}
  FROM ${databaseTables.analyticsJobs} aj
`;

const analyticsSnapshotColumns = `
  id::text AS id,
  analysis_type AS "analysisType",
  subject_type AS "subjectType",
  subject_id::text AS "subjectId",
  academic_year_id::text AS "academicYearId",
  semester_id::text AS "semesterId",
  source_job_id::text AS "sourceJobId",
  provider_key AS "providerKey",
  fallback_used AS "fallbackUsed",
  review_status AS "reviewStatus",
  reviewed_by_user_id::text AS "reviewedByUserId",
  reviewed_at AS "reviewedAt",
  published_at AS "publishedAt",
  review_notes AS "reviewNotes",
  feature_payload_json AS "featurePayloadJson",
  result_json AS "resultJson",
  computed_at AS "computedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const analyticsSnapshotSelect = `
  SELECT
    ${analyticsSnapshotColumns}
  FROM ${databaseTables.analyticsSnapshots} snap
`;

const analyticsFeedbackColumns = `
  af.id::text AS id,
  af.snapshot_id::text AS "snapshotId",
  af.user_id::text AS "userId",
  u.full_name AS "userFullName",
  u.role::text AS "userRole",
  af.rating,
  af.feedback_text AS "feedbackText",
  af.created_at AS "createdAt"
`;

const analyticsFeedbackSelect = `
  SELECT
    ${analyticsFeedbackColumns}
  FROM ${databaseTables.analyticsFeedback} af
  JOIN ${databaseTables.users} u ON u.id = af.user_id
`;

const analyticsSchedulerRunColumns = `
  id::text AS id,
  trigger_mode AS "triggerMode",
  status,
  requested_by_user_id::text AS "requestedByUserId",
  academic_year_id::text AS "academicYearId",
  semester_id::text AS "semesterId",
  stale_before AS "staleBefore",
  scheduled_targets_json AS "scheduledTargetsJson",
  summary_json AS "summaryJson",
  started_at AS "startedAt",
  completed_at AS "completedAt",
  last_error_code AS "lastErrorCode",
  last_error_message AS "lastErrorMessage",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const analyticsSchedulerRunSelect = `
  SELECT
    ${analyticsSchedulerRunColumns}
  FROM ${databaseTables.analyticsSchedulerRuns} scheduler
`;

export class AnalyticsRepository {
  async findActiveJobByNaturalKey(
    input: {
      analysisType: AnalyticsAnalysisType;
      subjectType: AnalyticsSubjectType;
      subjectId: string;
      academicYearId: string;
      semesterId: string;
    },
    queryable: Queryable = db
  ): Promise<AnalyticsJobRow | null> {
    const result = await queryable.query<AnalyticsJobRow>(
      `
        ${analyticsJobSelect}
        WHERE aj.analysis_type = $1
          AND aj.subject_type = $2
          AND aj.subject_id = $3::bigint
          AND aj.academic_year_id = $4::bigint
          AND aj.semester_id = $5::bigint
          AND aj.status IN ('pending', 'processing')
        ORDER BY aj.created_at DESC, aj.id DESC
        LIMIT 1
      `,
      [
        input.analysisType,
        input.subjectType,
        input.subjectId,
        input.academicYearId,
        input.semesterId
      ]
    );

    return mapSingleRow(result.rows);
  }

  async createJob(
    input: AnalyticsJobWriteInput,
    queryable: Queryable = db
  ): Promise<AnalyticsJobRow> {
    const result = await queryable.query<AnalyticsJobRow>(
      `
        INSERT INTO ${databaseTables.analyticsJobs} (
          analysis_type,
          subject_type,
          subject_id,
          academic_year_id,
          semester_id,
          requested_by_user_id,
          status,
          primary_provider,
          fallback_provider,
          input_json
        )
        VALUES ($1, $2, $3::bigint, $4::bigint, $5::bigint, $6::bigint, 'pending', $7, $8, $9::jsonb)
        RETURNING ${analyticsJobColumns}
      `,
      [
        input.analysisType,
        input.subjectType,
        input.subjectId,
        input.academicYearId,
        input.semesterId,
        input.requestedByUserId,
        input.primaryProvider,
        input.fallbackProvider,
        JSON.stringify(input.inputJson)
      ]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to create analytics job");
    }

    return row;
  }

  async findJobById(jobId: string, queryable: Queryable = db): Promise<AnalyticsJobRow | null> {
    const result = await queryable.query<AnalyticsJobRow>(
      `
        ${analyticsJobSelect}
        WHERE aj.id = $1::bigint
        LIMIT 1
      `,
      [jobId]
    );

    return mapSingleRow(result.rows);
  }

  async claimJobForExecution(
    jobId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsJobRow | null> {
    const result = await queryable.query<AnalyticsJobRow>(
      `
        WITH target AS (
          SELECT aj.id
          FROM ${databaseTables.analyticsJobs} aj
          WHERE aj.id = $1::bigint
            AND aj.status IN ('pending', 'failed', 'processing')
          FOR UPDATE SKIP LOCKED
        )
        UPDATE ${databaseTables.analyticsJobs} aj
        SET
          status = 'processing',
          started_at = COALESCE(aj.started_at, NOW()),
          last_error_code = NULL,
          last_error_message = NULL
        FROM target
        WHERE aj.id = target.id
        RETURNING ${analyticsJobColumns}
      `,
      [jobId]
    );

    return mapSingleRow(result.rows);
  }

  async markJobProcessing(
    jobId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.analyticsJobs}
        SET
          status = 'processing',
          started_at = COALESCE(started_at, NOW()),
          last_error_code = NULL,
          last_error_message = NULL
        WHERE id = $1::bigint
      `,
      [jobId]
    );
  }

  async markJobCompleted(
    jobId: string,
    input: {
      selectedProvider: string | null;
      fallbackUsed: boolean;
      snapshotId: string;
    },
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.analyticsJobs}
        SET
          status = 'completed',
          selected_provider = $2,
          fallback_used = $3,
          snapshot_id = $4::bigint,
          completed_at = NOW(),
          last_error_code = NULL,
          last_error_message = NULL
        WHERE id = $1::bigint
      `,
      [jobId, input.selectedProvider, input.fallbackUsed, input.snapshotId]
    );
  }

  async markJobFailed(
    jobId: string,
    input: {
      status: Extract<AnalyticsJobStatus, "failed" | "dead">;
      errorCode: string;
      errorMessage: string;
    },
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.analyticsJobs}
        SET
          status = $2,
          last_error_code = $3,
          last_error_message = $4,
          completed_at = CASE WHEN $2 = 'dead' THEN NOW() ELSE completed_at END
        WHERE id = $1::bigint
      `,
      [jobId, input.status, input.errorCode, input.errorMessage]
    );
  }

  async createSnapshot(
    input: AnalyticsSnapshotWriteInput,
    queryable: Queryable = db
  ): Promise<AnalyticsSnapshotRow> {
    const result = await queryable.query<AnalyticsSnapshotRow>(
      `
        INSERT INTO ${databaseTables.analyticsSnapshots} (
          analysis_type,
          subject_type,
          subject_id,
          academic_year_id,
          semester_id,
          source_job_id,
          provider_key,
          fallback_used,
          feature_payload_json,
          result_json,
          computed_at
        )
        VALUES (
          $1,
          $2,
          $3::bigint,
          $4::bigint,
          $5::bigint,
          $6::bigint,
          $7,
          $8,
          $9::jsonb,
          $10::jsonb,
          $11
        )
        RETURNING ${analyticsSnapshotColumns}
      `,
      [
        input.analysisType,
        input.subjectType,
        input.subjectId,
        input.academicYearId,
        input.semesterId,
        input.sourceJobId,
        input.providerKey,
        input.fallbackUsed,
        JSON.stringify(input.featurePayloadJson),
        JSON.stringify(input.resultJson),
        input.computedAt
      ]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to create analytics snapshot");
    }

    return row;
  }

  async findLatestSnapshot(
    input: {
      analysisType: AnalyticsAnalysisType;
      subjectType: AnalyticsSubjectType;
      subjectId: string;
      academicYearId: string;
      semesterId: string;
      reviewStatuses?: AnalyticsSnapshotReviewStatus[];
    },
    queryable: Queryable = db
  ): Promise<AnalyticsSnapshotRow | null> {
    const result = await queryable.query<AnalyticsSnapshotRow>(
      `
        ${analyticsSnapshotSelect}
        WHERE snap.analysis_type = $1
          AND snap.subject_type = $2
          AND snap.subject_id = $3::bigint
          AND snap.academic_year_id = $4::bigint
          AND snap.semester_id = $5::bigint
          AND ($6::text[] IS NULL OR snap.review_status = ANY($6::text[]))
        ORDER BY snap.computed_at DESC, snap.id DESC
        LIMIT 1
      `,
      [
        input.analysisType,
        input.subjectType,
        input.subjectId,
        input.academicYearId,
        input.semesterId,
        input.reviewStatuses ?? null
      ]
    );

    return mapSingleRow(result.rows);
  }

  async findSnapshotById(
    snapshotId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsSnapshotRow | null> {
    const result = await queryable.query<AnalyticsSnapshotRow>(
      `
        ${analyticsSnapshotSelect}
        WHERE snap.id = $1::bigint
        LIMIT 1
      `,
      [snapshotId]
    );

    return mapSingleRow(result.rows);
  }

  async supersedeApprovedSnapshotsForContext(
    input: {
      analysisType: AnalyticsAnalysisType;
      subjectType: AnalyticsSubjectType;
      subjectId: string;
      academicYearId: string;
      semesterId: string;
      excludeSnapshotId: string;
      reviewedByUserId: string;
      reviewedAt: Date;
    },
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.analyticsSnapshots}
        SET
          review_status = 'superseded',
          reviewed_by_user_id = $6::bigint,
          reviewed_at = $7,
          review_notes = NULL
        WHERE analysis_type = $1
          AND subject_type = $2
          AND subject_id = $3::bigint
          AND academic_year_id = $4::bigint
          AND semester_id = $5::bigint
          AND review_status = 'approved'
          AND id <> $8::bigint
      `,
      [
        input.analysisType,
        input.subjectType,
        input.subjectId,
        input.academicYearId,
        input.semesterId,
        input.reviewedByUserId,
        input.reviewedAt,
        input.excludeSnapshotId
      ]
    );
  }

  async reviewSnapshot(
    snapshotId: string,
    input: AnalyticsSnapshotReviewWriteInput,
    queryable: Queryable = db
  ): Promise<AnalyticsSnapshotRow> {
    const result = await queryable.query<AnalyticsSnapshotRow>(
      `
        UPDATE ${databaseTables.analyticsSnapshots}
        SET
          review_status = $2,
          reviewed_by_user_id = $3::bigint,
          reviewed_at = $4,
          published_at = $5,
          review_notes = $6
        WHERE id = $1::bigint
        RETURNING ${analyticsSnapshotColumns}
      `,
      [
        snapshotId,
        input.reviewStatus,
        input.reviewedByUserId,
        input.reviewedAt,
        input.publishedAt,
        input.reviewNotes
      ]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to review analytics snapshot");
    }

    return row;
  }

  async createFeedback(
    input: AnalyticsFeedbackWriteInput,
    queryable: Queryable = db
  ): Promise<AnalyticsFeedbackRow> {
    const result = await queryable.query<AnalyticsFeedbackRow>(
      `
        WITH inserted AS (
          INSERT INTO ${databaseTables.analyticsFeedback} (
            snapshot_id,
            user_id,
            rating,
            feedback_text
          )
          VALUES ($1::bigint, $2::bigint, $3, $4)
          RETURNING
            id,
            snapshot_id,
            user_id,
            rating,
            feedback_text,
            created_at
        )
        SELECT
          inserted.id::text AS id,
          inserted.snapshot_id::text AS "snapshotId",
          inserted.user_id::text AS "userId",
          u.full_name AS "userFullName",
          u.role::text AS "userRole",
          inserted.rating,
          inserted.feedback_text AS "feedbackText",
          inserted.created_at AS "createdAt"
        FROM inserted
        JOIN ${databaseTables.users} u ON u.id = inserted.user_id
        LIMIT 1
      `,
      [input.snapshotId, input.userId, input.rating, input.feedbackText]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to create analytics feedback");
    }

    return row;
  }

  async listFeedbackBySnapshotId(
    snapshotId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsFeedbackRow[]> {
    const result = await queryable.query<AnalyticsFeedbackRow>(
      `
        ${analyticsFeedbackSelect}
        WHERE af.snapshot_id = $1::bigint
        ORDER BY af.created_at DESC, af.id DESC
      `,
      [snapshotId]
    );

    return result.rows;
  }

  async aggregateFeedbackForSubjectContext(
    input: {
      analysisType: AnalyticsAnalysisType;
      subjectType: AnalyticsSubjectType;
      subjectId: string;
      academicYearId: string;
      semesterId: string;
    },
    queryable: Queryable = db
  ): Promise<AnalyticsFeedbackAggregateRow | null> {
    const result = await queryable.query<AnalyticsFeedbackAggregateRow>(
      `
        WITH scoped_feedback AS (
          SELECT
            af.rating,
            af.feedback_text,
            af.created_at
          FROM ${databaseTables.analyticsFeedback} af
          JOIN ${databaseTables.analyticsSnapshots} snap ON snap.id = af.snapshot_id
          WHERE snap.analysis_type = $1
            AND snap.subject_type = $2
            AND snap.subject_id = $3::bigint
            AND snap.academic_year_id = $4::bigint
            AND snap.semester_id = $5::bigint
        ),
        recent_feedback AS (
          SELECT feedback_text
          FROM scoped_feedback
          WHERE feedback_text IS NOT NULL
            AND LENGTH(TRIM(feedback_text)) > 0
          ORDER BY created_at DESC
          LIMIT 3
        )
        SELECT
          $1::text AS "analysisType",
          $2::text AS "subjectType",
          $3::text AS "subjectId",
          $4::text AS "academicYearId",
          $5::text AS "semesterId",
          COUNT(*)::int AS "totalFeedbackCount",
          ROUND(AVG(rating)::numeric, 2) AS "averageRating",
          COUNT(*) FILTER (WHERE rating >= 4)::int AS "positiveFeedbackCount",
          COUNT(*) FILTER (WHERE rating <= 2)::int AS "negativeFeedbackCount",
          COUNT(*) FILTER (WHERE rating = 3)::int AS "neutralFeedbackCount",
          MAX(created_at) AS "latestFeedbackAt",
          COALESCE((SELECT array_agg(feedback_text ORDER BY feedback_text) FROM recent_feedback), ARRAY[]::text[]) AS "recentFeedbackTexts"
        FROM scoped_feedback
      `,
      [
        input.analysisType,
        input.subjectType,
        input.subjectId,
        input.academicYearId,
        input.semesterId
      ]
    );

    const row = result.rows[0];

    if (!row || row.totalFeedbackCount === 0) {
      return null;
    }

    return row;
  }

  async findLatestSchedulerRun(
    triggerMode: AnalyticsSchedulerTriggerMode,
    queryable: Queryable = db
  ): Promise<AnalyticsSchedulerRunRow | null> {
    const result = await queryable.query<AnalyticsSchedulerRunRow>(
      `
        ${analyticsSchedulerRunSelect}
        WHERE scheduler.trigger_mode = $1
        ORDER BY scheduler.started_at DESC, scheduler.id DESC
        LIMIT 1
      `,
      [triggerMode]
    );

    return mapSingleRow(result.rows);
  }

  async createSchedulerRun(
    input: AnalyticsSchedulerRunWriteInput,
    queryable: Queryable = db
  ): Promise<AnalyticsSchedulerRunRow> {
    const result = await queryable.query<AnalyticsSchedulerRunRow>(
      `
        INSERT INTO ${databaseTables.analyticsSchedulerRuns} (
          trigger_mode,
          status,
          requested_by_user_id,
          academic_year_id,
          semester_id,
          stale_before,
          scheduled_targets_json,
          summary_json
        )
        VALUES ($1, 'processing', $2::bigint, $3::bigint, $4::bigint, $5, $6::jsonb, $7::jsonb)
        RETURNING ${analyticsSchedulerRunColumns}
      `,
      [
        input.triggerMode,
        input.requestedByUserId,
        input.academicYearId,
        input.semesterId,
        input.staleBefore,
        JSON.stringify(input.scheduledTargetsJson),
        JSON.stringify(input.summaryJson ?? {})
      ]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to create analytics scheduler run");
    }

    return row;
  }

  async markSchedulerRunCompleted(
    runId: string,
    summaryJson: unknown,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.analyticsSchedulerRuns}
        SET
          status = 'completed',
          summary_json = $2::jsonb,
          completed_at = NOW(),
          last_error_code = NULL,
          last_error_message = NULL
        WHERE id = $1::bigint
      `,
      [runId, JSON.stringify(summaryJson)]
    );
  }

  async markSchedulerRunFailed(
    runId: string,
    input: {
      status?: Extract<AnalyticsSchedulerRunStatus, 'failed'>;
      errorCode: string;
      errorMessage: string;
    },
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.analyticsSchedulerRuns}
        SET
          status = $2,
          completed_at = NOW(),
          last_error_code = $3,
          last_error_message = $4
        WHERE id = $1::bigint
      `,
      [runId, input.status ?? 'failed', input.errorCode, input.errorMessage]
    );
  }

  async deleteObsoleteSnapshots(
    input: {
      obsoleteSnapshotCutoff: Date;
    },
    queryable: Queryable = db
  ): Promise<AnalyticsObsoleteSnapshotCleanupResult> {
    const result = await queryable.query<AnalyticsObsoleteSnapshotCleanupResult>(
      `
        WITH candidate_snapshots AS (
          SELECT snap.id
          FROM ${databaseTables.analyticsSnapshots} snap
          WHERE snap.review_status IN ('draft', 'rejected', 'superseded')
            AND snap.computed_at < $1
        ),
        feedback_impact AS (
          SELECT COUNT(*)::int AS "cascadedFeedbackCount"
          FROM ${databaseTables.analyticsFeedback} af
          WHERE af.snapshot_id IN (SELECT id FROM candidate_snapshots)
        ),
        deleted_snapshots AS (
          DELETE FROM ${databaseTables.analyticsSnapshots}
          WHERE id IN (SELECT id FROM candidate_snapshots)
          RETURNING id
        )
        SELECT
          COALESCE((SELECT COUNT(*)::int FROM deleted_snapshots), 0)::int AS "deletedSnapshotCount",
          COALESCE((SELECT "cascadedFeedbackCount" FROM feedback_impact), 0)::int AS "cascadedFeedbackCount"
      `,
      [input.obsoleteSnapshotCutoff]
    );

    return (
      result.rows[0] ?? {
        deletedSnapshotCount: 0,
        cascadedFeedbackCount: 0
      }
    );
  }

  async deleteStaleTerminalJobs(
    input: {
      jobCutoff: Date;
    },
    queryable: Queryable = db
  ): Promise<number> {
    const result = await queryable.query<{ deletedCount: number }>(
      `
        WITH deleted_jobs AS (
          DELETE FROM ${databaseTables.analyticsJobs}
          WHERE status IN ('completed', 'failed', 'dead')
            AND COALESCE(completed_at, updated_at, created_at) < $1
          RETURNING id
        )
        SELECT COALESCE(COUNT(*)::int, 0)::int AS "deletedCount"
        FROM deleted_jobs
      `,
      [input.jobCutoff]
    );

    return result.rows[0]?.deletedCount ?? 0;
  }

  async deleteStaleSchedulerRuns(
    input: {
      schedulerRunCutoff: Date;
    },
    queryable: Queryable = db
  ): Promise<number> {
    const result = await queryable.query<{ deletedCount: number }>(
      `
        WITH deleted_runs AS (
          DELETE FROM ${databaseTables.analyticsSchedulerRuns}
          WHERE status IN ('completed', 'failed')
            AND COALESCE(completed_at, started_at, created_at) < $1
          RETURNING id
        )
        SELECT COALESCE(COUNT(*)::int, 0)::int AS "deletedCount"
        FROM deleted_runs
      `,
      [input.schedulerRunCutoff]
    );

    return result.rows[0]?.deletedCount ?? 0;
  }
  async findStudentHomeworkSummary(
    studentId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsStudentHomeworkSummaryRow> {
    const result = await queryable.query<AnalyticsStudentHomeworkSummaryRow>(
      `
        SELECT
          COUNT(h.id)::int AS "totalHomework",
          COUNT(*) FILTER (WHERE hs.status = 'submitted')::int AS "submittedCount",
          COUNT(*) FILTER (WHERE hs.status = 'late')::int AS "lateCount",
          COUNT(*) FILTER (WHERE hs.status = 'not_submitted')::int AS "notSubmittedCount"
        FROM ${databaseTables.studentAcademicEnrollments} sae
        JOIN ${databaseTables.homework} h
          ON h.class_id = sae.class_id
         AND h.academic_year_id = sae.academic_year_id
        LEFT JOIN ${databaseTables.homeworkSubmissions} hs
          ON hs.homework_id = h.id
         AND hs.student_id = sae.student_id
        WHERE sae.student_id = $1::bigint
          AND sae.academic_year_id = $2::bigint
          AND h.semester_id = $3::bigint
      `,
      [studentId, academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        totalHomework: 0,
        submittedCount: 0,
        lateCount: 0,
        notSubmittedCount: 0
      }
    );
  }

  async findTeacherAssignmentCount(
    teacherId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsTeacherAssignmentCountRow> {
    const result = await queryable.query<AnalyticsTeacherAssignmentCountRow>(
      `
        SELECT COUNT(*)::int AS "totalAssignments"
        FROM ${databaseTables.teacherClasses}
        WHERE teacher_id = $1::bigint
          AND academic_year_id = $2::bigint
      `,
      [teacherId, academicYearId]
    );

    return result.rows[0] ?? { totalAssignments: 0 };
  }

  async findTeacherAttendanceSummary(
    teacherId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsTeacherAttendanceSummaryRow> {
    const result = await queryable.query<AnalyticsTeacherAttendanceSummaryRow>(
      `
        SELECT
          COUNT(ats.id)::int AS "sessionCount",
          COALESCE(SUM(ac.recorded_count), 0)::int AS "recordedCount",
          COALESCE(SUM(rc.expected_count), 0)::int AS "expectedCount",
          ROUND(
            100.0 * COALESCE(SUM(ac.recorded_count), 0) / NULLIF(SUM(rc.expected_count), 0),
            2
          ) AS "coveragePercentage",
          MAX(ats.session_date) AS "lastSessionDate"
        FROM ${databaseTables.attendanceSessions} ats
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS recorded_count
          FROM ${databaseTables.attendance} att
          WHERE att.attendance_session_id = ats.id
        ) ac ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS expected_count
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          WHERE sae.class_id = ats.class_id
            AND sae.academic_year_id = ats.academic_year_id
            AND st.status = 'active'
        ) rc ON true
        WHERE ats.teacher_id = $1::bigint
          AND ats.academic_year_id = $2::bigint
          AND ats.semester_id = $3::bigint
      `,
      [teacherId, academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        sessionCount: 0,
        recordedCount: 0,
        expectedCount: 0,
        coveragePercentage: null,
        lastSessionDate: null
      }
    );
  }

  async findTeacherAssessmentSummary(
    teacherId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsTeacherAssessmentSummaryRow> {
    const result = await queryable.query<AnalyticsTeacherAssessmentSummaryRow>(
      `
        SELECT
          COUNT(a.id)::int AS "assessmentCount",
          COUNT(*) FILTER (WHERE a.is_published = true)::int AS "publishedCount",
          COALESCE(SUM(sa.graded_count), 0)::int AS "gradedCount",
          COALESCE(SUM(rc.expected_count), 0)::int AS "expectedCount",
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE a.is_published = true) / NULLIF(COUNT(a.id), 0),
            2
          ) AS "publicationPercentage",
          ROUND(
            100.0 * COALESCE(SUM(sa.graded_count), 0) / NULLIF(SUM(rc.expected_count), 0),
            2
          ) AS "gradingCoveragePercentage",
          MAX(a.assessment_date) AS "lastAssessmentDate"
        FROM ${databaseTables.assessments} a
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS graded_count
          FROM ${databaseTables.studentAssessments} st_assessment
          WHERE st_assessment.assessment_id = a.id
        ) sa ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS expected_count
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          WHERE sae.class_id = a.class_id
            AND sae.academic_year_id = a.academic_year_id
            AND st.status = 'active'
        ) rc ON true
        WHERE a.teacher_id = $1::bigint
          AND a.academic_year_id = $2::bigint
          AND a.semester_id = $3::bigint
      `,
      [teacherId, academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        assessmentCount: 0,
        publishedCount: 0,
        gradedCount: 0,
        expectedCount: 0,
        publicationPercentage: null,
        gradingCoveragePercentage: null,
        lastAssessmentDate: null
      }
    );
  }

  async findTeacherHomeworkSummary(
    teacherId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsTeacherHomeworkSummaryRow> {
    const result = await queryable.query<AnalyticsTeacherHomeworkSummaryRow>(
      `
        SELECT
          COUNT(h.id)::int AS "homeworkCount",
          COALESCE(SUM(ss.recorded_count), 0)::int AS "recordedCount",
          COALESCE(SUM(rc.expected_count), 0)::int AS "expectedCount",
          ROUND(
            100.0 * COALESCE(SUM(ss.recorded_count), 0) / NULLIF(SUM(rc.expected_count), 0),
            2
          ) AS "submissionCoveragePercentage",
          MAX(h.due_date) AS "lastDueDate"
        FROM ${databaseTables.homework} h
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS recorded_count
          FROM ${databaseTables.homeworkSubmissions} hs
          WHERE hs.homework_id = h.id
        ) ss ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS expected_count
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          WHERE sae.class_id = h.class_id
            AND sae.academic_year_id = h.academic_year_id
            AND st.status = 'active'
        ) rc ON true
        WHERE h.teacher_id = $1::bigint
          AND h.academic_year_id = $2::bigint
          AND h.semester_id = $3::bigint
      `,
      [teacherId, academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        homeworkCount: 0,
        recordedCount: 0,
        expectedCount: 0,
        submissionCoveragePercentage: null,
        lastDueDate: null
      }
    );
  }

  async findTeacherBehaviorSummary(
    teacherId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsTeacherBehaviorSummaryRow> {
    const result = await queryable.query<AnalyticsTeacherBehaviorSummaryRow>(
      `
        SELECT
          COUNT(br.id)::int AS "totalRecords",
          COUNT(*) FILTER (WHERE bc.behavior_type = 'positive')::int AS "positiveRecords",
          COUNT(*) FILTER (WHERE bc.behavior_type = 'negative')::int AS "negativeRecords",
          MAX(br.behavior_date) AS "lastBehaviorDate"
        FROM ${databaseTables.behaviorRecords} br
        LEFT JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
        WHERE br.teacher_id = $1::bigint
          AND br.academic_year_id = $2::bigint
          AND br.semester_id = $3::bigint
      `,
      [teacherId, academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        totalRecords: 0,
        positiveRecords: 0,
        negativeRecords: 0,
        lastBehaviorDate: null
      }
    );
  }
  async findOperationalAttendanceSummary(
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsOperationalAttendanceSummaryRow> {
    const result = await queryable.query<AnalyticsOperationalAttendanceSummaryRow>(
      `
        SELECT
          COUNT(ats.id)::int AS "sessionCount",
          COALESCE(SUM(ac.recorded_count), 0)::int AS "recordedCount",
          COALESCE(SUM(rc.expected_count), 0)::int AS "expectedCount",
          ROUND(
            100.0 * COALESCE(SUM(ac.recorded_count), 0) / NULLIF(SUM(rc.expected_count), 0),
            2
          ) AS "coveragePercentage"
        FROM ${databaseTables.attendanceSessions} ats
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS recorded_count
          FROM ${databaseTables.attendance} att
          WHERE att.attendance_session_id = ats.id
        ) ac ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS expected_count
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          WHERE sae.class_id = ats.class_id
            AND sae.academic_year_id = ats.academic_year_id
            AND st.status = 'active'
        ) rc ON true
        WHERE ats.academic_year_id = $1::bigint
          AND ats.semester_id = $2::bigint
      `,
      [academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        sessionCount: 0,
        recordedCount: 0,
        expectedCount: 0,
        coveragePercentage: null
      }
    );
  }

  async findOperationalAssessmentSummary(
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsOperationalAssessmentSummaryRow> {
    const result = await queryable.query<AnalyticsOperationalAssessmentSummaryRow>(
      `
        SELECT
          COUNT(a.id)::int AS "assessmentCount",
          COUNT(*) FILTER (WHERE a.is_published = true)::int AS "publishedCount",
          COALESCE(SUM(sa.graded_count), 0)::int AS "gradedCount",
          COALESCE(SUM(rc.expected_count), 0)::int AS "expectedCount",
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE a.is_published = true) / NULLIF(COUNT(a.id), 0),
            2
          ) AS "publicationPercentage",
          ROUND(
            100.0 * COALESCE(SUM(sa.graded_count), 0) / NULLIF(SUM(rc.expected_count), 0),
            2
          ) AS "gradingCoveragePercentage"
        FROM ${databaseTables.assessments} a
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS graded_count
          FROM ${databaseTables.studentAssessments} st_assessment
          WHERE st_assessment.assessment_id = a.id
        ) sa ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS expected_count
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          WHERE sae.class_id = a.class_id
            AND sae.academic_year_id = a.academic_year_id
            AND st.status = 'active'
        ) rc ON true
        WHERE a.academic_year_id = $1::bigint
          AND a.semester_id = $2::bigint
      `,
      [academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        assessmentCount: 0,
        publishedCount: 0,
        gradedCount: 0,
        expectedCount: 0,
        publicationPercentage: null,
        gradingCoveragePercentage: null
      }
    );
  }

  async findOperationalHomeworkSummary(
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsOperationalHomeworkSummaryRow> {
    const result = await queryable.query<AnalyticsOperationalHomeworkSummaryRow>(
      `
        SELECT
          COUNT(h.id)::int AS "homeworkCount",
          COALESCE(SUM(ss.recorded_count), 0)::int AS "recordedCount",
          COALESCE(SUM(rc.expected_count), 0)::int AS "expectedCount",
          ROUND(
            100.0 * COALESCE(SUM(ss.recorded_count), 0) / NULLIF(SUM(rc.expected_count), 0),
            2
          ) AS "submissionCoveragePercentage"
        FROM ${databaseTables.homework} h
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS recorded_count
          FROM ${databaseTables.homeworkSubmissions} hs
          WHERE hs.homework_id = h.id
        ) ss ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS expected_count
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          WHERE sae.class_id = h.class_id
            AND sae.academic_year_id = h.academic_year_id
            AND st.status = 'active'
        ) rc ON true
        WHERE h.academic_year_id = $1::bigint
          AND h.semester_id = $2::bigint
      `,
      [academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        homeworkCount: 0,
        recordedCount: 0,
        expectedCount: 0,
        submissionCoveragePercentage: null
      }
    );
  }

  async findOperationalBehaviorSummary(
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsOperationalBehaviorSummaryRow> {
    const result = await queryable.query<AnalyticsOperationalBehaviorSummaryRow>(
      `
        SELECT
          COUNT(br.id)::int AS "totalRecords",
          COUNT(*) FILTER (WHERE bc.behavior_type = 'negative')::int AS "negativeRecords",
          COUNT(*) FILTER (WHERE bc.behavior_type = 'negative' AND br.severity >= 4)::int AS "highSeverityNegativeRecords"
        FROM ${databaseTables.behaviorRecords} br
        LEFT JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
        WHERE br.academic_year_id = $1::bigint
          AND br.semester_id = $2::bigint
      `,
      [academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        totalRecords: 0,
        negativeRecords: 0,
        highSeverityNegativeRecords: 0
      }
    );
  }

  async findClassHomeworkSummary(
    classId: string,
    academicYearId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsClassHomeworkSummaryRow> {
    const result = await queryable.query<AnalyticsClassHomeworkSummaryRow>(
      `
        WITH roster AS (
          SELECT sae.student_id
          FROM ${databaseTables.studentAcademicEnrollments} sae
          JOIN ${databaseTables.students} st ON st.id = sae.student_id
          WHERE sae.class_id = $1::bigint
            AND sae.academic_year_id = $2::bigint
            AND st.status = 'active'
        ),
        student_homework AS (
          SELECT
            r.student_id,
            COUNT(h.id)::int AS "totalHomework",
            COUNT(*) FILTER (WHERE hs.status = 'submitted')::int AS "submittedCount",
            COUNT(*) FILTER (WHERE hs.status = 'late')::int AS "lateCount",
            COUNT(*) FILTER (WHERE hs.status = 'not_submitted')::int AS "notSubmittedCount",
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE hs.status IN ('submitted', 'late')) / NULLIF(COUNT(h.id), 0),
              2
            ) AS "submissionPercentage"
          FROM roster r
          LEFT JOIN ${databaseTables.homework} h
            ON h.class_id = $1::bigint
           AND h.academic_year_id = $2::bigint
           AND h.semester_id = $3::bigint
          LEFT JOIN ${databaseTables.homeworkSubmissions} hs
            ON hs.homework_id = h.id
           AND hs.student_id = r.student_id
          GROUP BY r.student_id
        )
        SELECT
          COALESCE(MAX("totalHomework"), 0)::int AS "totalHomework",
          COALESCE(SUM("submittedCount"), 0)::int AS "submittedCount",
          COALESCE(SUM("lateCount"), 0)::int AS "lateCount",
          COALESCE(SUM("notSubmittedCount"), 0)::int AS "notSubmittedCount",
          ROUND(AVG("submissionPercentage"), 2) AS "averageSubmissionPercentage",
          COUNT(*) FILTER (
            WHERE "submissionPercentage" IS NOT NULL
              AND "submissionPercentage" < 75
          )::int AS "studentsBelowSubmissionThreshold"
        FROM student_homework
      `,
      [classId, academicYearId, semesterId]
    );

    return (
      result.rows[0] ?? {
        totalHomework: 0,
        submittedCount: 0,
        lateCount: 0,
        notSubmittedCount: 0,
        averageSubmissionPercentage: null,
        studentsBelowSubmissionThreshold: 0
      }
    );
  }

  async listActiveStudentSubjectsByAcademicYear(
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<AnalyticsStudentSubjectRow[]> {
    const result = await queryable.query<AnalyticsStudentSubjectRow>(
      `
        SELECT
          st.id::text AS "studentId",
          st.full_name AS "fullName"
        FROM ${databaseTables.students} st
        JOIN ${databaseTables.studentAcademicEnrollments} sae ON sae.student_id = st.id
        WHERE sae.academic_year_id = $1::bigint
          AND st.status = 'active'
        GROUP BY st.id, st.full_name
        ORDER BY "fullName" ASC, "studentId" ASC
      `,
      [academicYearId]
    );

    return result.rows;
  }


  async listStaleStudentRiskCandidates(
    input: {
      academicYearId: string;
      semesterId: string;
      staleBefore: Date;
      limit: number;
    },
    queryable: Queryable = db
  ): Promise<AnalyticsScheduledStudentCandidateRow[]> {
    const result = await queryable.query<AnalyticsScheduledStudentCandidateRow>(
      `
        SELECT
          st.id::text AS "studentId",
          st.full_name AS "fullName",
          latest_snapshot.computed_at AS "latestComputedAt"
        FROM ${databaseTables.students} st
        JOIN ${databaseTables.studentAcademicEnrollments} sae
          ON sae.student_id = st.id
         AND sae.academic_year_id = $1::bigint
        LEFT JOIN LATERAL (
          SELECT snap.computed_at
          FROM ${databaseTables.analyticsSnapshots} snap
          WHERE snap.analysis_type = 'student_risk_summary'
            AND snap.subject_type = 'student'
            AND snap.subject_id = st.id
            AND snap.academic_year_id = $1::bigint
            AND snap.semester_id = $2::bigint
          ORDER BY snap.computed_at DESC, snap.id DESC
          LIMIT 1
        ) latest_snapshot ON true
        WHERE st.status = 'active'
          AND (latest_snapshot.computed_at IS NULL OR latest_snapshot.computed_at < $3)
        ORDER BY latest_snapshot.computed_at ASC NULLS FIRST, st.full_name ASC, st.id ASC
        LIMIT $4
      `,
      [input.academicYearId, input.semesterId, input.staleBefore, input.limit]
    );

    return result.rows;
  }

  async listStaleTeacherComplianceCandidates(
    input: {
      academicYearId: string;
      semesterId: string;
      staleBefore: Date;
      limit: number;
    },
    queryable: Queryable = db
  ): Promise<AnalyticsScheduledTeacherCandidateRow[]> {
    const result = await queryable.query<AnalyticsScheduledTeacherCandidateRow>(
      `
        SELECT
          teacher_subjects.teacher_id::text AS "teacherId",
          teacher_subjects.teacher_user_id::text AS "teacherUserId",
          teacher_subjects.full_name AS "fullName",
          latest_snapshot.computed_at AS "latestComputedAt"
        FROM (
          SELECT DISTINCT
            t.id AS teacher_id,
            t.user_id AS teacher_user_id,
            u.full_name
          FROM ${databaseTables.teacherClasses} tc
          JOIN ${databaseTables.teachers} t ON t.id = tc.teacher_id
          JOIN ${databaseTables.users} u ON u.id = t.user_id
          WHERE tc.academic_year_id = $1::bigint
        ) teacher_subjects
        LEFT JOIN LATERAL (
          SELECT snap.computed_at
          FROM ${databaseTables.analyticsSnapshots} snap
          WHERE snap.analysis_type = 'teacher_compliance_summary'
            AND snap.subject_type = 'teacher'
            AND snap.subject_id = teacher_subjects.teacher_id
            AND snap.academic_year_id = $1::bigint
            AND snap.semester_id = $2::bigint
          ORDER BY snap.computed_at DESC, snap.id DESC
          LIMIT 1
        ) latest_snapshot ON true
        WHERE latest_snapshot.computed_at IS NULL OR latest_snapshot.computed_at < $3
        ORDER BY latest_snapshot.computed_at ASC NULLS FIRST, teacher_subjects.full_name ASC, teacher_subjects.teacher_id ASC
        LIMIT $4
      `,
      [input.academicYearId, input.semesterId, input.staleBefore, input.limit]
    );

    return result.rows;
  }

  async listStaleClassOverviewCandidates(
    input: {
      academicYearId: string;
      semesterId: string;
      staleBefore: Date;
      limit: number;
    },
    queryable: Queryable = db
  ): Promise<AnalyticsScheduledClassCandidateRow[]> {
    const result = await queryable.query<AnalyticsScheduledClassCandidateRow>(
      `
        SELECT
          c.id::text AS "classId",
          c.class_name AS "className",
          c.section,
          gl.name AS "gradeLevelName",
          latest_snapshot.computed_at AS "latestComputedAt"
        FROM ${databaseTables.classes} c
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
        LEFT JOIN LATERAL (
          SELECT snap.computed_at
          FROM ${databaseTables.analyticsSnapshots} snap
          WHERE snap.analysis_type = 'class_overview'
            AND snap.subject_type = 'class'
            AND snap.subject_id = c.id
            AND snap.academic_year_id = $1::bigint
            AND snap.semester_id = $2::bigint
          ORDER BY snap.computed_at DESC, snap.id DESC
          LIMIT 1
        ) latest_snapshot ON true
        WHERE c.academic_year_id = $1::bigint
          AND c.is_active = TRUE
          AND (latest_snapshot.computed_at IS NULL OR latest_snapshot.computed_at < $3)
        ORDER BY latest_snapshot.computed_at ASC NULLS FIRST, gl.level_order ASC, c.class_name ASC, c.id ASC
        LIMIT $4
      `,
      [input.academicYearId, input.semesterId, input.staleBefore, input.limit]
    );

    return result.rows;
  }

  async listStaleTransportRouteAnomalyCandidates(
    input: {
      academicYearId: string;
      semesterId: string;
      staleBefore: Date;
      limit: number;
    },
    queryable: Queryable = db
  ): Promise<AnalyticsScheduledRouteCandidateRow[]> {
    const result = await queryable.query<AnalyticsScheduledRouteCandidateRow>(
      `
        SELECT
          r.id::text AS "routeId",
          r.route_name AS "routeName",
          latest_snapshot.computed_at AS "latestComputedAt"
        FROM ${databaseTables.routes} r
        LEFT JOIN LATERAL (
          SELECT snap.computed_at
          FROM ${databaseTables.analyticsSnapshots} snap
          WHERE snap.analysis_type = 'transport_route_anomaly_summary'
            AND snap.subject_type = 'route'
            AND snap.subject_id = r.id
            AND snap.academic_year_id = $1::bigint
            AND snap.semester_id = $2::bigint
          ORDER BY snap.computed_at DESC, snap.id DESC
          LIMIT 1
        ) latest_snapshot ON true
        WHERE r.is_active = TRUE
          AND (latest_snapshot.computed_at IS NULL OR latest_snapshot.computed_at < $3)
        ORDER BY latest_snapshot.computed_at ASC NULLS FIRST, r.route_name ASC, r.id ASC
        LIMIT $4
      `,
      [input.academicYearId, input.semesterId, input.staleBefore, input.limit]
    );

    return result.rows;
  }
  async findTransportRouteOperationalSummary(
    input: {
      routeId: string;
      dateFrom: string;
      dateTo: string;
      delayThresholdMinutes: number;
      staleActiveThresholdMinutes: number;
    },
    queryable: Queryable = db
  ): Promise<AnalyticsTransportRouteOperationalSummaryRow> {
    const result = await queryable.query<AnalyticsTransportRouteOperationalSummaryRow>(
      `
        WITH trip_event_counts AS (
          SELECT
            trip_id,
            COUNT(*) FILTER (WHERE event_type = 'boarded')::int AS boarded_count,
            COUNT(*) FILTER (WHERE event_type = 'dropped_off')::int AS dropped_off_count,
            COUNT(*) FILTER (WHERE event_type = 'absent')::int AS absent_count,
            COUNT(*)::int AS total_events
          FROM ${databaseTables.tripStudentEvents}
          GROUP BY trip_id
        ),
        route_trips AS (
          SELECT
            tr.id,
            tr.trip_status,
            tr.started_at,
            tr.ended_at,
            loc.recorded_at AS latest_recorded_at,
            eta.status AS eta_status,
            COALESCE(ec.boarded_count, 0)::int AS boarded_count,
            COALESCE(ec.dropped_off_count, 0)::int AS dropped_off_count,
            COALESCE(ec.absent_count, 0)::int AS absent_count,
            COALESCE(ec.total_events, 0)::int AS total_events,
            stop_summary.completed_percentage AS stop_completion_percentage
          FROM ${databaseTables.trips} tr
          LEFT JOIN ${databaseViews.latestTripLocation} loc ON loc.trip_id = tr.id
          LEFT JOIN ${databaseTables.transportTripEtaSnapshots} eta ON eta.trip_id = tr.id
          LEFT JOIN trip_event_counts ec ON ec.trip_id = tr.id
          LEFT JOIN LATERAL (
            SELECT ROUND(
              100.0 * COUNT(*) FILTER (WHERE is_completed = TRUE) / NULLIF(COUNT(*), 0),
              2
            ) AS completed_percentage
            FROM ${databaseTables.transportTripEtaStopSnapshots} stops
            WHERE stops.trip_id = tr.id
          ) stop_summary ON true
          WHERE tr.route_id = $1::bigint
            AND tr.trip_date >= $2::date
            AND tr.trip_date <= $3::date
        )
        SELECT
          COUNT(*)::int AS "totalTrips",
          COUNT(*) FILTER (WHERE trip_status = 'completed')::int AS "completedTrips",
          COUNT(*) FILTER (WHERE trip_status = 'ended')::int AS "endedTrips",
          COUNT(*) FILTER (WHERE trip_status = 'cancelled')::int AS "cancelledTrips",
          COUNT(*) FILTER (WHERE trip_status = 'started')::int AS "activeTrips",
          COUNT(*) FILTER (WHERE latest_recorded_at IS NOT NULL)::int AS "tripsWithLocations",
          COUNT(*) FILTER (WHERE latest_recorded_at IS NULL)::int AS "tripsWithoutLocations",
          COUNT(*) FILTER (WHERE total_events > 0)::int AS "tripsWithEvents",
          COUNT(*) FILTER (WHERE total_events = 0)::int AS "tripsWithoutEvents",
          COALESCE(SUM(boarded_count), 0)::int AS "totalBoardedCount",
          COALESCE(SUM(dropped_off_count), 0)::int AS "totalDroppedOffCount",
          COALESCE(SUM(absent_count), 0)::int AS "totalAbsentCount",
          COUNT(*) FILTER (WHERE eta_status = 'fresh')::int AS "etaFreshCount",
          COUNT(*) FILTER (WHERE eta_status = 'stale')::int AS "etaStaleCount",
          COUNT(*) FILTER (WHERE eta_status = 'unavailable' OR eta_status IS NULL)::int AS "etaUnavailableCount",
          COUNT(*) FILTER (WHERE eta_status = 'completed')::int AS "etaCompletedCount",
          ROUND(AVG(stop_completion_percentage), 2) AS "averageStopCompletionPercentage",
          ROUND(
            AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0)
            FILTER (WHERE started_at IS NOT NULL AND ended_at IS NOT NULL),
            2
          ) AS "averageActualDurationMinutes",
          COUNT(*) FILTER (
            WHERE started_at IS NOT NULL
              AND ended_at IS NOT NULL
              AND EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0 > $4::numeric
          )::int AS "delayedTripsCount",
          COUNT(*) FILTER (
            WHERE trip_status = 'started'
              AND started_at IS NOT NULL
              AND EXTRACT(EPOCH FROM (NOW() - started_at)) / 60.0 > $5::numeric
          )::int AS "staleActiveTripsCount"
        FROM route_trips
      `,
      [
        input.routeId,
        input.dateFrom,
        input.dateTo,
        input.delayThresholdMinutes,
        input.staleActiveThresholdMinutes
      ]
    );

    return (
      result.rows[0] ?? {
        totalTrips: 0,
        completedTrips: 0,
        endedTrips: 0,
        cancelledTrips: 0,
        activeTrips: 0,
        tripsWithLocations: 0,
        tripsWithoutLocations: 0,
        tripsWithEvents: 0,
        tripsWithoutEvents: 0,
        totalBoardedCount: 0,
        totalDroppedOffCount: 0,
        totalAbsentCount: 0,
        etaFreshCount: 0,
        etaStaleCount: 0,
        etaUnavailableCount: 0,
        etaCompletedCount: 0,
        averageStopCompletionPercentage: null,
        averageActualDurationMinutes: null,
        delayedTripsCount: 0,
        staleActiveTripsCount: 0
      }
    );
  }
}



















