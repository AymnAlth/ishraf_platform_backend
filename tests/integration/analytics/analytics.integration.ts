import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";

const enableAnalytics = async (context: IntegrationTestContext, accessToken: string) =>
  request(context.app)
    .patch("/api/v1/system-settings/analytics")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      reason: "Enable AI analytics for integration coverage",
      values: {
        aiAnalyticsEnabled: true,
        primaryProvider: "openai",
        fallbackProvider: "groq"
      }
    });

const buildStudentRiskFeaturePayload = () => ({
  student: {
    studentId: "1",
    academicNo: "STU-1001",
    fullName: "Student One",
    classId: "1",
    className: "A",
    section: "A",
    academicYearId: "1",
    academicYearName: "2025-2026",
    semesterId: "2",
    semesterName: "Semester 2"
  },
  attendance: {
    totalSessions: 12,
    presentCount: 9,
    absentCount: 2,
    lateCount: 1,
    excusedCount: 0,
    attendancePercentage: 75
  },
  assessments: {
    totalSubjects: 2,
    averagePercentage: 63.5,
    lowPerformanceSubjects: [
      {
        subjectId: "1",
        subjectName: "Science",
        overallPercentage: 55
      }
    ]
  },
  behavior: {
    totalBehaviorRecords: 4,
    positiveCount: 1,
    negativeCount: 3,
    negativeSeverityTotal: 6
  },
  homework: {
    totalHomework: 10,
    submittedCount: 6,
    lateCount: 2,
    notSubmittedCount: 2,
    submissionPercentage: 60
  },
  computed: {
    riskScore: 71,
    riskLevel: "high" as const,
    confidenceScore: 0.84,
    keySignals: [
      "Attendance trend is below the healthy threshold.",
      "Recent behavior pattern includes repeated negative incidents."
    ]
  }
});

const buildStudentRiskInsight = () => ({
  riskLevel: "high" as const,
  confidenceScore: 0.84,
  summary:
    "Student One requires coordinated intervention due to attendance, behavior, and homework signals.",
  keySignals: [
    "Attendance trend is below the healthy threshold.",
    "Recent behavior pattern includes repeated negative incidents."
  ],
  adminRecommendations: [
    "Schedule an intervention review with the class team.",
    "Monitor attendance recovery weekly."
  ],
  parentGuidance: [
    "Review the weekly homework routine at home.",
    "Follow up with the school about recent absences."
  ]
});

const buildTeacherComplianceFeaturePayload = () => ({
  teacher: {
    teacherId: "1",
    teacherUserId: AUTH_TEST_FIXTURES.activePhoneUser.id,
    fullName: AUTH_TEST_FIXTURES.activePhoneUser.fullName,
    specialization: "Mathematics",
    academicYearId: "1",
    academicYearName: "2025-2026",
    semesterId: "2",
    semesterName: "Semester 2"
  },
  assignments: {
    totalAssignments: 2
  },
  attendance: {
    sessionCount: 6,
    recordedCount: 4,
    expectedCount: 6,
    coveragePercentage: 66.67,
    lastSessionDate: "2026-03-18"
  },
  assessments: {
    assessmentCount: 3,
    publishedCount: 2,
    gradedCount: 2,
    expectedCount: 3,
    publicationPercentage: 66.67,
    gradingCoveragePercentage: 66.67,
    lastAssessmentDate: "2026-03-17"
  },
  homework: {
    homeworkCount: 4,
    recordedCount: 3,
    expectedCount: 4,
    submissionCoveragePercentage: 75,
    lastDueDate: "2026-03-16"
  },
  behavior: {
    totalRecords: 1,
    positiveRecords: 1,
    negativeRecords: 0,
    lastBehaviorDate: "2026-03-15"
  },
  computed: {
    complianceScore: 74,
    complianceLevel: "watch" as const,
    confidenceScore: 0.8,
    keySignals: [
      "Attendance recording coverage is below the expected threshold.",
      "Assessment publication cadence is inconsistent."
    ],
    operationalGaps: [
      "Two attendance sessions are missing recorded outcomes.",
      "One recent assessment has not been published."
    ]
  }
});

const buildTeacherComplianceInsight = () => ({
  complianceLevel: "watch" as const,
  confidenceScore: 0.8,
  summary:
    "Teacher workflow execution is functional but still missing part of the required academic cadence.",
  keySignals: [
    "Attendance recording coverage is below the expected threshold.",
    "Assessment publication cadence is inconsistent."
  ],
  operationalGaps: [
    "Two attendance sessions are missing recorded outcomes.",
    "One recent assessment has not been published."
  ],
  adminRecommendations: [
    "Review weekly execution cadence with the teacher.",
    "Track publication and grading completion before the next cycle."
  ]
});

const buildAdminOperationalDigestFeaturePayload = () => ({
  context: {
    academicYearId: "1",
    academicYearName: "2025-2026",
    semesterId: "2",
    semesterName: "Semester 2"
  },
  overview: {
    totalActiveStudents: 15,
    totalActiveClasses: 2,
    totalTeachers: 1,
    totalSupervisors: 1,
    totalDrivers: 1,
    totalActiveTrips: 1,
    totalActiveRoutes: 1,
    totalActiveBuses: 1
  },
  attendance: {
    sessionCount: 6,
    recordedCount: 54,
    expectedCount: 60,
    coveragePercentage: 90
  },
  assessments: {
    assessmentCount: 4,
    publishedCount: 4,
    gradedCount: 54,
    expectedCount: 60,
    publicationPercentage: 100,
    gradingCoveragePercentage: 90
  },
  homework: {
    homeworkCount: 5,
    recordedCount: 52,
    expectedCount: 60,
    submissionCoveragePercentage: 86.67
  },
  behavior: {
    totalRecords: 3,
    negativeRecords: 1,
    highSeverityNegativeRecords: 0
  },
  computed: {
    operationalScore: 88,
    status: "stable" as const,
    confidenceScore: 0.82,
    keySignals: [
      "Attendance recording coverage is within the acceptable operating range.",
      "Assessment publication cadence is stable."
    ]
  }
});
const buildAdminOperationalDigestInsight = () => ({
  status: "stable" as const,
  confidenceScore: 0.82,
  summary: "Operational indicators are stable across the active academic context.",
  keySignals: [
    "Attendance recording coverage is within the acceptable operating range.",
    "Assessment publication cadence is stable."
  ],
  adminRecommendations: [
    "Continue weekly monitoring for institutional execution quality.",
    "Review any delayed grading items in the next operational checkpoint."
  ],
  priorityActions: [
    "Keep attendance completeness above the current baseline.",
    "Maintain the current assessment publication cadence."
  ]
});

const buildClassOverviewFeaturePayload = () => ({
  class: {
    classId: "1",
    className: "A",
    section: "A",
    capacity: 40,
    gradeLevelId: "1",
    gradeLevelName: "Grade 1",
    academicYearId: "1",
    academicYearName: "2025-2026",
    semesterId: "2",
    semesterName: "Semester 2"
  },
  roster: {
    activeStudents: 12,
    capacity: 40,
    occupancyPercentage: 30
  },
  attendance: {
    studentsWithSessions: 12,
    averageAttendancePercentage: 82.5,
    studentsBelowThreshold: 4,
    chronicAbsenceStudents: 2
  },
  assessments: {
    studentsWithAssessments: 12,
    overallAveragePercentage: 68.4,
    lowPerformanceStudents: 3,
    lowPerformanceSubjects: [
      {
        subjectId: "1",
        subjectName: "Science",
        averagePercentage: 61.2
      }
    ]
  },
  behavior: {
    studentsWithNegativeRecords: 2,
    totalNegativeRecords: 3,
    negativeSeverityTotal: 5,
    positiveRecords: 4
  },
  homework: {
    totalHomework: 8,
    submittedCount: 70,
    lateCount: 6,
    notSubmittedCount: 20,
    averageSubmissionPercentage: 74.5,
    studentsBelowSubmissionThreshold: 3
  },
  computed: {
    classHealthScore: 69,
    status: "watch" as const,
    confidenceScore: 0.88,
    keySignals: [
      "Average class attendance is below the healthy threshold.",
      "The weakest subject trend is Science."
    ]
  }
});

const buildClassOverviewInsight = () => ({
  status: "watch" as const,
  confidenceScore: 0.88,
  summary:
    "The class is operationally stable but needs targeted intervention in attendance and academic performance.",
  keySignals: [
    "Average class attendance is below the healthy threshold.",
    "The weakest subject trend is Science."
  ],
  recommendedActions: [
    "Run a short attendance recovery plan for high-risk students.",
    "Coordinate subject support for the lowest-performing subject cluster."
  ],
  focusAreas: ["attendance", "academic_performance"]
});

const buildTransportRouteAnomalyFeaturePayload = (routeId: string, routeName: string) => ({
  route: {
    routeId,
    routeName,
    startPoint: "School",
    endPoint: "North District",
    stopCount: 3,
    estimatedDurationMinutes: 35,
    academicYearId: "1",
    academicYearName: "2025-2026",
    semesterId: "2",
    semesterName: "Semester 2"
  },
  inputWindow: {
    fromDate: "2026-02-01",
    toDate: "2026-03-18",
    totalDays: 46
  },
  trips: {
    totalTrips: 8,
    completedTrips: 5,
    endedTrips: 1,
    cancelledTrips: 1,
    activeTrips: 1,
    completionPercentage: 62.5,
    manualClosurePercentage: 12.5,
    cancellationPercentage: 12.5,
    tripsWithLocations: 6,
    tripsWithoutLocations: 2,
    tripsWithEvents: 5,
    tripsWithoutEvents: 3,
    averageActualDurationMinutes: 41.5,
    delayedTripsCount: 2,
    staleActiveTripsCount: 1
  },
  events: {
    totalBoardedCount: 36,
    totalDroppedOffCount: 33,
    totalAbsentCount: 3,
    averageBoardedPerTrip: 4.5,
    averageAbsentPerTrip: 0.38
  },
  eta: {
    freshSnapshots: 4,
    staleSnapshots: 2,
    unavailableSnapshots: 1,
    completedSnapshots: 1,
    averageStopCompletionPercentage: 71.25
  },
  computed: {
    anomalyScore: 44,
    status: "watch" as const,
    confidenceScore: 0.86,
    keySignals: [
      "Delayed trip rate is above the accepted baseline.",
      "ETA freshness is inconsistent across recent route executions."
    ],
    anomalyFlags: ["delay_rate", "stale_eta"]
  }
});

const buildTransportRouteAnomalyInsight = () => ({
  status: "watch" as const,
  confidenceScore: 0.86,
  summary:
    "The route is operationally functional but still shows repeated delay and ETA freshness issues.",
  keySignals: [
    "Delayed trip rate is above the accepted baseline.",
    "ETA freshness is inconsistent across recent route executions."
  ],
  anomalyFlags: ["delay_rate", "stale_eta"],
  recommendedActions: [
    "Review recurring congestion or dispatch causes on this route.",
    "Monitor ETA refresh quality during the next operating window."
  ]
});

const insertAnalyticsSnapshot = async (
  context: IntegrationTestContext,
  input: {
    analysisType: string;
    subjectType: string;
    subjectId: string;
    providerKey?: string;
    fallbackUsed?: boolean;
    reviewStatus?: "draft" | "approved" | "rejected" | "superseded";
    reviewedByUserId?: string | null;
    reviewedAt?: string | null;
    publishedAt?: string | null;
    reviewNotes?: string | null;
    featurePayload: unknown;
    resultJson: unknown;
  }
) => {
  const result = await context.pool.query<{ id: string }>(
    `
      INSERT INTO analytics_snapshots (
        analysis_type,
        subject_type,
        subject_id,
        academic_year_id,
        semester_id,
        source_job_id,
        provider_key,
        fallback_used,
        review_status,
        reviewed_by_user_id,
        reviewed_at,
        published_at,
        review_notes,
        feature_payload_json,
        result_json,
        computed_at
      )
      VALUES ($1, $2, $3::bigint, '1', '2', NULL, $4, $5, $6, $7::bigint, $8, $9, $10, $11::jsonb, $12::jsonb, NOW())
      RETURNING id::text AS id
    `,
    [
      input.analysisType,
      input.subjectType,
      input.subjectId,
      input.providerKey ?? "openai",
      input.fallbackUsed ?? false,
      input.reviewStatus ?? "approved",
      input.reviewedByUserId ?? AUTH_TEST_FIXTURES.activeEmailUser.id,
      input.reviewedAt ?? new Date().toISOString(),
      input.publishedAt ?? new Date().toISOString(),
      input.reviewNotes ?? null,
      JSON.stringify(input.featurePayload),
      JSON.stringify(input.resultJson)
    ]
  );

  return result.rows[0]?.id ?? null;
};
const insertStudentRiskSnapshot = (context: IntegrationTestContext) =>
  insertAnalyticsSnapshot(context, {
    analysisType: "student_risk_summary",
    subjectType: "student",
    subjectId: "1",
    featurePayload: buildStudentRiskFeaturePayload(),
    resultJson: buildStudentRiskInsight()
  });

const insertTeacherComplianceSnapshot = (context: IntegrationTestContext) =>
  insertAnalyticsSnapshot(context, {
    analysisType: "teacher_compliance_summary",
    subjectType: "teacher",
    subjectId: "1",
    providerKey: "groq",
    fallbackUsed: true,
    featurePayload: buildTeacherComplianceFeaturePayload(),
    resultJson: buildTeacherComplianceInsight()
  });

const insertAdminOperationalDigestSnapshot = (context: IntegrationTestContext) =>
  insertAnalyticsSnapshot(context, {
    analysisType: "admin_operational_digest",
    subjectType: "system",
    subjectId: "0",
    featurePayload: buildAdminOperationalDigestFeaturePayload(),
    resultJson: buildAdminOperationalDigestInsight()
  });

const insertClassOverviewSnapshot = (context: IntegrationTestContext) =>
  insertAnalyticsSnapshot(context, {
    analysisType: "class_overview",
    subjectType: "class",
    subjectId: "1",
    featurePayload: buildClassOverviewFeaturePayload(),
    resultJson: buildClassOverviewInsight()
  });

const insertTransportRouteAnomalySnapshot = (
  context: IntegrationTestContext,
  routeId: string,
  routeName: string
) =>
  insertAnalyticsSnapshot(context, {
    analysisType: "transport_route_anomaly_summary",
    subjectType: "route",
    subjectId: routeId,
    featurePayload: buildTransportRouteAnomalyFeaturePayload(routeId, routeName),
    resultJson: buildTransportRouteAnomalyInsight()
  });

const backdateAnalyticsSnapshot = async (
  context: IntegrationTestContext,
  snapshotId: string,
  timestamp: string
) => {
  await context.pool.query(
    `      UPDATE analytics_snapshots
      SET computed_at = $2::timestamptz,
          created_at = $2::timestamptz,
          updated_at = $2::timestamptz
      WHERE id = $1::bigint
    `,
    [snapshotId, timestamp]
  );
};

const seedAnalyticsRetentionFixtures = async (context: IntegrationTestContext) => {
  const obsoleteTimestamp = "2026-01-15T00:00:00.000Z";
  const obsoleteDraftSnapshotId = await insertAnalyticsSnapshot(context, {
    analysisType: "student_risk_summary",
    subjectType: "student",
    subjectId: "1",
    reviewStatus: "draft",
    reviewedByUserId: null,
    reviewedAt: null,
    publishedAt: null,
    reviewNotes: null,
    featurePayload: buildStudentRiskFeaturePayload(),
    resultJson: {
      ...buildStudentRiskInsight(),
      summary: "Obsolete draft snapshot"
    }
  });
  const approvedSnapshotId = await insertAnalyticsSnapshot(context, {
    analysisType: "student_risk_summary",
    subjectType: "student",
    subjectId: "1",
    reviewStatus: "approved",
    reviewedByUserId: AUTH_TEST_FIXTURES.activeEmailUser.id,
    reviewedAt: obsoleteTimestamp,
    publishedAt: obsoleteTimestamp,
    reviewNotes: "Published baseline snapshot",
    featurePayload: buildStudentRiskFeaturePayload(),
    resultJson: {
      ...buildStudentRiskInsight(),
      summary: "Approved snapshot should remain"
    }
  });

  await backdateAnalyticsSnapshot(context, obsoleteDraftSnapshotId as string, obsoleteTimestamp);
  await backdateAnalyticsSnapshot(context, approvedSnapshotId as string, obsoleteTimestamp);

  await context.pool.query(
    `      INSERT INTO analytics_feedback (
        snapshot_id,
        user_id,
        rating,
        feedback_text,
        created_at
      )
      VALUES ($1::bigint, $2::bigint, 2, $3, $4::timestamptz)
    `,
    [
      obsoleteDraftSnapshotId as string,
      AUTH_TEST_FIXTURES.activeEmailUser.id,
      "Cleanup candidate feedback",
      obsoleteTimestamp
    ]
  );

  const jobResult = await context.pool.query<{ id: string }>(
    `      INSERT INTO analytics_jobs (
        analysis_type,
        subject_type,
        subject_id,
        academic_year_id,
        semester_id,
        requested_by_user_id,
        status,
        primary_provider,
        fallback_provider,
        selected_provider,
        fallback_used,
        input_json,
        snapshot_id,
        started_at,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (
        'student_risk_summary',
        'student',
        1,
        1,
        2,
        $1::bigint,
        'completed',
        'openai',
        'groq',
        'openai',
        false,
        '{}'::jsonb,
        NULL,
        $2::timestamptz,
        $2::timestamptz,
        $2::timestamptz,
        $2::timestamptz
      )
      RETURNING id::text AS id
    `,
    [AUTH_TEST_FIXTURES.activeEmailUser.id, obsoleteTimestamp]
  );

  const schedulerRunResult = await context.pool.query<{ id: string }>(
    `      INSERT INTO analytics_scheduler_runs (
        trigger_mode,
        status,
        requested_by_user_id,
        academic_year_id,
        semester_id,
        stale_before,
        scheduled_targets_json,
        summary_json,
        started_at,
        completed_at,
        created_at,
        updated_at,
        last_error_code,
        last_error_message
      )
      VALUES (
        'autonomous_dispatch',
        'failed',
        $1::bigint,
        1,
        2,
        $2::timestamptz,
        '["student_risk_summary"]'::jsonb,
        '{"totalEligibleSubjects":1}'::jsonb,
        $2::timestamptz,
        $2::timestamptz,
        $2::timestamptz,
        $2::timestamptz,
        'TEST_FAILURE',
        'cleanup candidate'
      )
      RETURNING id::text AS id
    `,
    [AUTH_TEST_FIXTURES.activeEmailUser.id, obsoleteTimestamp]
  );

  return {
    obsoleteDraftSnapshotId,
    approvedSnapshotId,
    obsoleteJobId: jobResult.rows[0]?.id ?? null,
    obsoleteSchedulerRunId: schedulerRunResult.rows[0]?.id ?? null
  };
};

export const registerAnalyticsIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Analytics", () => {
    it("creates a student risk job after analytics is enabled and enqueues an analytics outbox event", async () => {
      const adminLogin = await context.loginAsAdmin();

      const enableResponse = await enableAnalytics(context, adminLogin.accessToken);
      const createResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/student-risk")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({ studentId: "1" });

      expect(enableResponse.status).toBe(200);
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.created).toBe(true);
      expect(createResponse.body.data.job).toMatchObject({
        analysisType: "student_risk_summary",
        subjectType: "student",
        subjectId: "1",
        academicYearId: "1",
        semesterId: "2",
        status: "pending",
        primaryProvider: "openai",
        fallbackProvider: "groq",
        selectedProvider: null,
        fallbackUsed: false,
        snapshotId: null
      });

      const outboxRows = await context.pool.query<{ payload_json: { jobId?: string } }>(
        `
          SELECT payload_json
          FROM integration_outbox
          WHERE provider_key = 'analytics'
            AND aggregate_id = $1
        `,
        [createResponse.body.data.job.jobId as string]
      );

      expect(outboxRows.rows).toHaveLength(1);
      expect(outboxRows.rows[0]?.payload_json.jobId).toBe(createResponse.body.data.job.jobId);
    });

    it("processes pending analytics jobs on demand through the web service", async () => {
      const adminLogin = await context.loginAsAdmin();

      await enableAnalytics(context, adminLogin.accessToken);

      const createResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/student-risk")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({ studentId: "1" });
      const processResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/process-pending")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          batchSize: 2,
          maxBatches: 2,
          concurrency: 1,
          staleProcessingThresholdMinutes: 10
        });
      const jobResponse = await request(context.app)
        .get(`/api/v1/analytics/jobs/${createResponse.body.data.job.jobId as string}`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const summaryResponse = await request(context.app)
        .get("/api/v1/analytics/students/1/risk-summary")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(createResponse.status).toBe(201);
      expect(processResponse.status).toBe(200);
      expect(processResponse.body.data.processing).toMatchObject({
        batchSize: 2,
        maxBatches: 2,
        concurrency: 1,
        staleProcessingThresholdMinutes: 10
      });
      expect(processResponse.body.data.summary.processedDispatches).toBeGreaterThanOrEqual(1);
      expect(jobResponse.status).toBe(200);
      expect(jobResponse.body.data.status).toBe("completed");
      expect(jobResponse.body.data.snapshotId).toEqual(expect.any(String));
      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.data.student.studentId).toBe("1");
    });

    it("reuses an active teacher compliance job instead of creating duplicates and resolves teacher user ids", async () => {
      const adminLogin = await context.loginAsAdmin();

      await enableAnalytics(context, adminLogin.accessToken);

      const firstResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/teacher-compliance")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({ teacherId: AUTH_TEST_FIXTURES.activePhoneUser.id });
      const secondResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/teacher-compliance")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({ teacherId: AUTH_TEST_FIXTURES.activePhoneUser.id });

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.created).toBe(false);
      expect(secondResponse.body.data.job.jobId).toBe(firstResponse.body.data.job.jobId);
    });

    it("creates admin, class, and transport route analytics jobs", async () => {
      const adminLogin = await context.loginAsAdmin();

      await enableAnalytics(context, adminLogin.accessToken);

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Analytics Route"
      });
      const routeId = routeResponse.body.data.id as string;

      const adminDigestResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/admin-operational-digest")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({});
      const classResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/class-overview")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({ classId: "1" });
      const routeAnomalyResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/transport-route-anomalies")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({ routeId });

      expect(routeResponse.status).toBe(201);
      expect(adminDigestResponse.status).toBe(201);
      expect(classResponse.status).toBe(201);
      expect(routeAnomalyResponse.status).toBe(201);
      expect(routeAnomalyResponse.body.data.job).toMatchObject({
        analysisType: "transport_route_anomaly_summary",
        subjectType: "route",
        subjectId: routeId
      });
    });
    it("dispatches recompute jobs across all supported analytics targets and reuses active jobs on repeat calls", async () => {
      const adminLogin = await context.loginAsAdmin();

      await enableAnalytics(context, adminLogin.accessToken);

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Recompute Route"
      });
      const routeId = routeResponse.body.data.id as string;

      const firstResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/recompute")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          target: "all_supported",
          studentIds: ["1"],
          teacherIds: [AUTH_TEST_FIXTURES.activePhoneUser.id],
          classIds: ["1"],
          routeIds: [routeId]
        });
      const secondResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/recompute")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          target: "all_supported",
          studentIds: ["1"],
          teacherIds: [AUTH_TEST_FIXTURES.activePhoneUser.id],
          classIds: ["1"],
          routeIds: [routeId]
        });

      expect(routeResponse.status).toBe(201);
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.data.summary).toEqual({
        totalJobs: 5,
        createdCount: 5,
        reusedCount: 0
      });
      expect(firstResponse.body.data.items).toHaveLength(5);
      expect(firstResponse.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            created: true,
            job: expect.objectContaining({ analysisType: "student_risk_summary", subjectId: "1" })
          }),
          expect.objectContaining({
            created: true,
            job: expect.objectContaining({ analysisType: "teacher_compliance_summary", subjectId: "1" })
          }),
          expect.objectContaining({
            created: true,
            job: expect.objectContaining({ analysisType: "class_overview", subjectId: "1" })
          }),
          expect.objectContaining({
            created: true,
            job: expect.objectContaining({
              analysisType: "transport_route_anomaly_summary",
              subjectId: routeId
            })
          }),
          expect.objectContaining({
            created: true,
            job: expect.objectContaining({ analysisType: "admin_operational_digest", subjectId: "0" })
          })
        ])
      );

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.summary).toEqual({
        totalJobs: 5,
        createdCount: 0,
        reusedCount: 5
      });
      expect(secondResponse.body.data.items.every((item: { created: boolean }) => item.created === false)).toBe(true);

      const outboxRows = await context.pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM integration_outbox
          WHERE provider_key = 'analytics'
            AND event_type = 'analytics_job_execute'
        `
      );

      expect(outboxRows.rows[0]?.count).toBe("5");
    });

    it("dispatches scheduled stale analytics jobs from admin-controlled settings and reuses active jobs on repeat calls", async () => {
      const adminLogin = await context.loginAsAdmin();

      const settingsResponse = await request(context.app)
        .patch("/api/v1/system-settings/analytics")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Enable admin-controlled scheduled analytics dispatch",
          values: {
            aiAnalyticsEnabled: true,
            primaryProvider: "openai",
            fallbackProvider: "groq",
            scheduledRecomputeEnabled: true,
            scheduledRecomputeIntervalMinutes: 720,
            scheduledRecomputeMaxSubjectsPerTarget: 1,
            scheduledTargets: ["student_risk_summary", "admin_operational_digest"]
          }
        });

      const firstResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/scheduled-dispatch")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({});
      const secondResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/scheduled-dispatch")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({});

      expect(settingsResponse.status).toBe(200);
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.data.triggerMode).toBe("admin_scheduled_dispatch");
      expect(firstResponse.body.data.schedule).toMatchObject({
        intervalMinutes: 720,
        maxSubjectsPerTarget: 1,
        targets: ["student_risk_summary", "admin_operational_digest"]
      });
      expect(firstResponse.body.data.summary).toEqual({
        totalEligibleSubjects: 2,
        dispatchedCount: 2,
        reusedCount: 0
      });
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.summary).toEqual({
        totalEligibleSubjects: 2,
        dispatchedCount: 0,
        reusedCount: 2
      });

      const outboxRows = await context.pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM integration_outbox
          WHERE provider_key = 'analytics'
            AND event_type = 'analytics_job_execute'
        `
      );

      expect(outboxRows.rows[0]?.count).toBe("2");
    });

    it("runs analytics retention cleanup without deleting approved published snapshots", async () => {
      const adminLogin = await context.loginAsAdmin();

      const settingsResponse = await request(context.app)
        .patch("/api/v1/system-settings/analytics")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Enable analytics retention cleanup",
          values: {
            aiAnalyticsEnabled: true,
            primaryProvider: "openai",
            fallbackProvider: "groq",
            retentionCleanupEnabled: true,
            obsoleteSnapshotRetentionDays: 30,
            jobRetentionDays: 30,
            schedulerRunRetentionDays: 30
          }
        });

      const seeded = await seedAnalyticsRetentionFixtures(context);
      const cleanupResponse = await request(context.app)
        .post("/api/v1/analytics/jobs/retention-cleanup")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({});

      expect(settingsResponse.status).toBe(200);
      expect(cleanupResponse.status).toBe(200);
      expect(cleanupResponse.body.data.summary).toEqual({
        deletedSnapshots: 1,
        cascadedFeedbackCount: 1,
        deletedJobs: 1,
        deletedSchedulerRuns: 1
      });
      expect(cleanupResponse.body.data.retention).toMatchObject({
        obsoleteSnapshotRetentionDays: 30,
        jobRetentionDays: 30,
        schedulerRunRetentionDays: 30
      });

      const snapshotRows = await context.pool.query<{
        id: string;
        review_status: string;
      }>(
        `
          SELECT id::text AS id, review_status
          FROM analytics_snapshots
          WHERE id = ANY($1::bigint[])
          ORDER BY id ASC
        `,
        [[seeded.obsoleteDraftSnapshotId, seeded.approvedSnapshotId]]
      );
      const feedbackCount = await context.pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM analytics_feedback
          WHERE snapshot_id = $1::bigint
        `,
        [seeded.obsoleteDraftSnapshotId as string]
      );
      const jobCount = await context.pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM analytics_jobs
          WHERE id = $1::bigint
        `,
        [seeded.obsoleteJobId as string]
      );
      const schedulerRunCount = await context.pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM analytics_scheduler_runs
          WHERE id = $1::bigint
        `,
        [seeded.obsoleteSchedulerRunId as string]
      );

      expect(snapshotRows.rows).toEqual([
        {
          id: seeded.approvedSnapshotId,
          review_status: "approved"
        }
      ]);
      expect(feedbackCount.rows[0]?.count).toBe("0");
      expect(jobCount.rows[0]?.count).toBe("0");
      expect(schedulerRunCount.rows[0]?.count).toBe("0");
    });

    it("returns the latest student risk snapshot for admin and linked parents while stripping admin recommendations from parent responses", async () => {
      const adminLogin = await context.loginAsAdmin();
      const linkedParent = await context.createAdditionalParentAccount({
        email: "analytics-parent@example.com",
        phone: "01000000031"
      });
      const unrelatedParent = await context.createAdditionalParentAccount({
        email: "analytics-unrelated-parent@example.com",
        phone: "01000000032"
      });

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: linkedParent.parentId,
          relationType: "mother",
          isPrimary: false
        });

      const parentLogin = await context.login(linkedParent.email, linkedParent.password);
      const unrelatedParentLogin = await context.login(unrelatedParent.email, unrelatedParent.password);
      await insertStudentRiskSnapshot(context);

      const adminResponse = await request(context.app)
        .get("/api/v1/analytics/students/1/risk-summary")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const parentResponse = await request(context.app)
        .get("/api/v1/analytics/students/1/risk-summary")
        .set("Authorization", `Bearer ${parentLogin.body.data.tokens.accessToken as string}`);
      const unrelatedParentResponse = await request(context.app)
        .get("/api/v1/analytics/students/1/risk-summary")
        .set("Authorization", `Bearer ${unrelatedParentLogin.body.data.tokens.accessToken as string}`);

      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.data.insight.adminRecommendations).toEqual([
        "Schedule an intervention review with the class team.",
        "Monitor attendance recovery weekly."
      ]);
      expect(parentResponse.status).toBe(200);
      expect(parentResponse.body.data.insight.adminRecommendations).toEqual([]);
      expect(unrelatedParentResponse.status).toBe(403);
    });

    it("requires admin review before parent consumers can read the newly generated analytics snapshot and supersedes the previous published one", async () => {
      const adminLogin = await context.loginAsAdmin();
      const linkedParent = await context.createAdditionalParentAccount({
        email: "analytics-review-parent@example.com",
        phone: "01000000033"
      });

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: linkedParent.parentId,
          relationType: "father",
          isPrimary: false
        });

      const parentLogin = await context.login(linkedParent.email, linkedParent.password);
      const approvedSnapshotId = await insertStudentRiskSnapshot(context);
      const draftSnapshotId = await insertAnalyticsSnapshot(context, {
        analysisType: "student_risk_summary",
        subjectType: "student",
        subjectId: "1",
        reviewStatus: "draft",
        reviewedByUserId: null,
        reviewedAt: null,
        publishedAt: null,
        reviewNotes: null,
        featurePayload: buildStudentRiskFeaturePayload(),
        resultJson: {
          ...buildStudentRiskInsight(),
          summary: "Draft AI summary pending review"
        }
      });

      const parentBeforeReview = await request(context.app)
        .get("/api/v1/analytics/students/1/risk-summary")
        .set("Authorization", `Bearer ${parentLogin.body.data.tokens.accessToken as string}`);
      const adminPreview = await request(context.app)
        .get("/api/v1/analytics/students/1/risk-summary")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const reviewResponse = await request(context.app)
        .post(`/api/v1/analytics/snapshots/${draftSnapshotId as string}/review`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({ action: "approve", reviewNotes: "Approved for parent visibility" });
      const parentAfterReview = await request(context.app)
        .get("/api/v1/analytics/students/1/risk-summary")
        .set("Authorization", `Bearer ${parentLogin.body.data.tokens.accessToken as string}`);

      expect(parentBeforeReview.status).toBe(200);
      expect(parentBeforeReview.body.data.snapshot.snapshotId).toBe(approvedSnapshotId);
      expect(parentBeforeReview.body.data.snapshot.reviewStatus).toBe("approved");
      expect(adminPreview.status).toBe(200);
      expect(adminPreview.body.data.snapshot.snapshotId).toBe(draftSnapshotId);
      expect(adminPreview.body.data.snapshot.reviewStatus).toBe("draft");
      expect(reviewResponse.status).toBe(200);
      expect(reviewResponse.body.data).toMatchObject({
        snapshotId: draftSnapshotId,
        reviewStatus: "approved"
      });
      expect(parentAfterReview.status).toBe(200);
      expect(parentAfterReview.body.data.snapshot.snapshotId).toBe(draftSnapshotId);
      expect(parentAfterReview.body.data.snapshot.reviewStatus).toBe("approved");
      expect(parentAfterReview.body.data.insight.summary).toBe("Draft AI summary pending review");

      const supersededSnapshot = await context.pool.query<{ review_status: string }>(
        `SELECT review_status FROM analytics_snapshots WHERE id = $1::bigint LIMIT 1`,
        [approvedSnapshotId as string]
      );
      expect(supersededSnapshot.rows[0]?.review_status).toBe("superseded");
    });

    it("returns teacher compliance and admin digest summaries for admin only", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();

      await insertTeacherComplianceSnapshot(context);
      await insertAdminOperationalDigestSnapshot(context);

      const teacherSummaryResponse = await request(context.app)
        .get(`/api/v1/analytics/teachers/${AUTH_TEST_FIXTURES.activePhoneUser.id}/compliance-summary`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const teacherForbiddenResponse = await request(context.app)
        .get(`/api/v1/analytics/teachers/${AUTH_TEST_FIXTURES.activePhoneUser.id}/compliance-summary`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const digestResponse = await request(context.app)
        .get("/api/v1/analytics/admin/operational-digest")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(teacherSummaryResponse.status).toBe(200);
      expect(teacherSummaryResponse.body.data.providerKey).toBe("groq");
      expect(teacherForbiddenResponse.status).toBe(403);
      expect(digestResponse.status).toBe(200);
      expect(digestResponse.body.data.insight.status).toBe("stable");
    });
    it("returns class overview summaries for admin, assigned teacher, and assigned supervisor while rejecting unassigned teachers", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();
      const secondTeacher = await context.createAdditionalTeacher();
      const secondTeacherLogin = await context.login(secondTeacher.email, secondTeacher.password);

      await context.seedTeacherAssignment("1", "1", "1", "1");
      await context.seedSupervisorAssignment("1", "1", "1");
      await insertClassOverviewSnapshot(context);

      const adminResponse = await request(context.app)
        .get("/api/v1/analytics/classes/1/overview")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const teacherResponse = await request(context.app)
        .get("/api/v1/analytics/classes/1/overview")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const supervisorResponse = await request(context.app)
        .get("/api/v1/analytics/classes/1/overview")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);
      const unassignedTeacherResponse = await request(context.app)
        .get("/api/v1/analytics/classes/1/overview")
        .set("Authorization", `Bearer ${secondTeacherLogin.body.data.tokens.accessToken as string}`);

      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.data.insight.status).toBe("watch");
      expect(teacherResponse.status).toBe(200);
      expect(supervisorResponse.status).toBe(200);
      expect(unassignedTeacherResponse.status).toBe(403);
    });

    it("returns transport route anomaly summaries for admin only", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "North Route"
      });
      const routeId = routeResponse.body.data.id as string;
      await insertTransportRouteAnomalySnapshot(context, routeId, "North Route");

      const adminResponse = await request(context.app)
        .get(`/api/v1/analytics/transport/routes/${routeId}/anomalies`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const teacherResponse = await request(context.app)
        .get(`/api/v1/analytics/transport/routes/${routeId}/anomalies`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);

      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.data.route).toMatchObject({ routeId, routeName: "North Route" });
      expect(adminResponse.body.data.insight.status).toBe("watch");
      expect(teacherResponse.status).toBe(403);
    });

    it("allows feedback submission on supported analytics snapshots with ownership rules", async () => {
      const adminLogin = await context.loginAsAdmin();
      const linkedParent = await context.createAdditionalParentAccount({
        email: "analytics-feedback-parent@example.com",
        phone: "01000000041"
      });
      const secondTeacher = await context.createAdditionalTeacher();
      const parentLogin = await context.login(linkedParent.email, linkedParent.password);
      const teacherLogin = await context.loginAsTeacher();
      const secondTeacherLogin = await context.login(secondTeacher.email, secondTeacher.password);

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: linkedParent.parentId,
          relationType: "mother",
          isPrimary: false
        });
      await context.seedTeacherAssignment("1", "1", "1", "1");

      const studentSnapshotId = await insertStudentRiskSnapshot(context);
      const classSnapshotId = await insertClassOverviewSnapshot(context);

      const parentCreateResponse = await request(context.app)
        .post(`/api/v1/analytics/snapshots/${studentSnapshotId as string}/feedback`)
        .set("Authorization", `Bearer ${parentLogin.body.data.tokens.accessToken as string}`)
        .send({ rating: 4, feedbackText: "Useful summary for home follow-up" });
      const teacherCreateResponse = await request(context.app)
        .post(`/api/v1/analytics/snapshots/${classSnapshotId as string}/feedback`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({ rating: 5, feedbackText: "Class insight matches the classroom reality" });
      const unassignedTeacherResponse = await request(context.app)
        .post(`/api/v1/analytics/snapshots/${classSnapshotId as string}/feedback`)
        .set("Authorization", `Bearer ${secondTeacherLogin.body.data.tokens.accessToken as string}`)
        .send({ rating: 1, feedbackText: "Should not be allowed" });
      const adminListResponse = await request(context.app)
        .get(`/api/v1/analytics/snapshots/${classSnapshotId as string}/feedback`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(parentCreateResponse.status).toBe(201);
      expect(teacherCreateResponse.status).toBe(201);
      expect(unassignedTeacherResponse.status).toBe(403);
      expect(adminListResponse.status).toBe(200);
      expect(adminListResponse.body.data.items).toHaveLength(1);
    });
  });
};

