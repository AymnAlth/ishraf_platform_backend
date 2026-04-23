import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { AnalyticsController } from "../controller/analytics.controller";
import { analyticsPolicies } from "../policies/analytics.policy";
import {
  analyticsClassIdParamsSchema,
  analyticsJobIdParamsSchema,
  analyticsRouteIdParamsSchema,
  analyticsSnapshotIdParamsSchema,
  analyticsStudentIdParamsSchema,
  analyticsTeacherIdParamsSchema,
  createAdminOperationalDigestJobBodySchema,
  createAnalyticsFeedbackBodySchema,
  processPendingAnalyticsJobsBodySchema,
  createAnalyticsRecomputeJobBodySchema,
  createAnalyticsRetentionCleanupBodySchema,
  createAnalyticsScheduledDispatchBodySchema,
  reviewAnalyticsSnapshotBodySchema,
  createClassOverviewJobBodySchema,
  createStudentRiskJobBodySchema,
  createTeacherComplianceJobBodySchema,
  createTransportRouteAnomalyJobBodySchema
} from "../validator/analytics.validator";

export const createAnalyticsRouter = (controller: AnalyticsController): Router => {
  const router = Router();

  router.post(
    "/jobs/student-risk",
    ...analyticsPolicies.admin,
    validateRequest({ body: createStudentRiskJobBodySchema }),
    asyncHandler((req, res) => controller.createStudentRiskJob(req, res))
  );

  router.post(
    "/jobs/teacher-compliance",
    ...analyticsPolicies.admin,
    validateRequest({ body: createTeacherComplianceJobBodySchema }),
    asyncHandler((req, res) => controller.createTeacherComplianceJob(req, res))
  );

  router.post(
    "/jobs/admin-operational-digest",
    ...analyticsPolicies.admin,
    validateRequest({ body: createAdminOperationalDigestJobBodySchema }),
    asyncHandler((req, res) => controller.createAdminOperationalDigestJob(req, res))
  );

  router.post(
    "/jobs/class-overview",
    ...analyticsPolicies.admin,
    validateRequest({ body: createClassOverviewJobBodySchema }),
    asyncHandler((req, res) => controller.createClassOverviewJob(req, res))
  );

  router.post(
    "/jobs/transport-route-anomalies",
    ...analyticsPolicies.admin,
    validateRequest({ body: createTransportRouteAnomalyJobBodySchema }),
    asyncHandler((req, res) => controller.createTransportRouteAnomalyJob(req, res))
  );

  router.post(
    "/jobs/scheduled-dispatch",
    ...analyticsPolicies.admin,
    validateRequest({ body: createAnalyticsScheduledDispatchBodySchema }),
    asyncHandler((req, res) => controller.createScheduledDispatch(req, res))
  );

  router.post(
    "/jobs/recompute",
    ...analyticsPolicies.admin,
    validateRequest({ body: createAnalyticsRecomputeJobBodySchema }),
    asyncHandler((req, res) => controller.createRecomputeJob(req, res))
  );

  router.post(
    "/jobs/process-pending",
    ...analyticsPolicies.admin,
    validateRequest({ body: processPendingAnalyticsJobsBodySchema }),
    asyncHandler((req, res) => controller.processPendingJobs(req, res))
  );

  router.post(
    "/jobs/retention-cleanup",
    ...analyticsPolicies.admin,
    validateRequest({ body: createAnalyticsRetentionCleanupBodySchema }),
    asyncHandler((req, res) => controller.runRetentionCleanup(req, res))
  );

  router.post(
    "/snapshots/:snapshotId/review",
    ...analyticsPolicies.snapshotReview,
    validateRequest({
      params: analyticsSnapshotIdParamsSchema,
      body: reviewAnalyticsSnapshotBodySchema
    }),
    asyncHandler((req, res) => controller.reviewSnapshot(req, res))
  );

  router.post(
    "/snapshots/:snapshotId/feedback",
    ...analyticsPolicies.feedbackWrite,
    validateRequest({
      params: analyticsSnapshotIdParamsSchema,
      body: createAnalyticsFeedbackBodySchema
    }),
    asyncHandler((req, res) => controller.createSnapshotFeedback(req, res))
  );

  router.get(
    "/jobs/:jobId",
    ...analyticsPolicies.admin,
    validateRequest({ params: analyticsJobIdParamsSchema }),
    asyncHandler((req, res) => controller.getJobById(req, res))
  );

  router.get(
    "/snapshots/:snapshotId/feedback",
    ...analyticsPolicies.feedbackRead,
    validateRequest({ params: analyticsSnapshotIdParamsSchema }),
    asyncHandler((req, res) => controller.listSnapshotFeedback(req, res))
  );

  router.get(
    "/students/:studentId/risk-summary",
    ...analyticsPolicies.studentRiskRead,
    validateRequest({ params: analyticsStudentIdParamsSchema }),
    asyncHandler((req, res) => controller.getStudentRiskSummary(req, res))
  );

  router.get(
    "/teachers/:teacherId/compliance-summary",
    ...analyticsPolicies.admin,
    validateRequest({ params: analyticsTeacherIdParamsSchema }),
    asyncHandler((req, res) => controller.getTeacherComplianceSummary(req, res))
  );

  router.get(
    "/admin/operational-digest",
    ...analyticsPolicies.admin,
    asyncHandler((req, res) => controller.getAdminOperationalDigestSummary(req, res))
  );

  router.get(
    "/classes/:classId/overview",
    ...analyticsPolicies.classOverviewRead,
    validateRequest({ params: analyticsClassIdParamsSchema }),
    asyncHandler((req, res) => controller.getClassOverviewSummary(req, res))
  );

  router.get(
    "/transport/routes/:routeId/anomalies",
    ...analyticsPolicies.admin,
    validateRequest({ params: analyticsRouteIdParamsSchema }),
    asyncHandler((req, res) => controller.getTransportRouteAnomalySummary(req, res))
  );

  return router;
};
