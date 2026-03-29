import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { ReportingController } from "../controller/reporting.controller";
import { reportingPolicies } from "../policies/reporting.policy";
import {
  parentPreviewParamsSchema,
  parentPreviewStudentParamsSchema,
  studentIdParamsSchema,
  supervisorPreviewParamsSchema,
  teacherPreviewParamsSchema
} from "../validator/reporting.validator";

export const createReportingRouter = (controller: ReportingController): Router => {
  const router = Router();

  router.get(
    "/students/:studentId/profile",
    ...reportingPolicies.studentReports,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getStudentProfile(req, res))
  );

  router.get(
    "/students/:studentId/reports/attendance-summary",
    ...reportingPolicies.studentReports,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getStudentAttendanceReport(req, res))
  );

  router.get(
    "/students/:studentId/reports/assessment-summary",
    ...reportingPolicies.studentReports,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getStudentAssessmentReport(req, res))
  );

  router.get(
    "/students/:studentId/reports/behavior-summary",
    ...reportingPolicies.studentReports,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getStudentBehaviorReport(req, res))
  );

  router.get(
    "/admin-preview/parents/:parentUserId/dashboard",
    ...reportingPolicies.adminPreview,
    validateRequest({ params: parentPreviewParamsSchema }),
    asyncHandler((req, res) => controller.getAdminPreviewParentDashboard(req, res))
  );

  router.get(
    "/admin-preview/parents/:parentUserId/students/:studentId/profile",
    ...reportingPolicies.adminPreview,
    validateRequest({ params: parentPreviewStudentParamsSchema }),
    asyncHandler((req, res) => controller.getAdminPreviewParentStudentProfile(req, res))
  );

  router.get(
    "/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary",
    ...reportingPolicies.adminPreview,
    validateRequest({ params: parentPreviewStudentParamsSchema }),
    asyncHandler((req, res) => controller.getAdminPreviewParentStudentAttendanceReport(req, res))
  );

  router.get(
    "/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary",
    ...reportingPolicies.adminPreview,
    validateRequest({ params: parentPreviewStudentParamsSchema }),
    asyncHandler((req, res) => controller.getAdminPreviewParentStudentAssessmentReport(req, res))
  );

  router.get(
    "/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary",
    ...reportingPolicies.adminPreview,
    validateRequest({ params: parentPreviewStudentParamsSchema }),
    asyncHandler((req, res) => controller.getAdminPreviewParentStudentBehaviorReport(req, res))
  );

  router.get(
    "/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status",
    ...reportingPolicies.adminPreview,
    validateRequest({ params: parentPreviewStudentParamsSchema }),
    asyncHandler((req, res) => controller.getAdminPreviewParentTransportLiveStatus(req, res))
  );

  router.get(
    "/admin-preview/teachers/:teacherUserId/dashboard",
    ...reportingPolicies.adminPreview,
    validateRequest({ params: teacherPreviewParamsSchema }),
    asyncHandler((req, res) => controller.getAdminPreviewTeacherDashboard(req, res))
  );

  router.get(
    "/admin-preview/supervisors/:supervisorUserId/dashboard",
    ...reportingPolicies.adminPreview,
    validateRequest({ params: supervisorPreviewParamsSchema }),
    asyncHandler((req, res) => controller.getAdminPreviewSupervisorDashboard(req, res))
  );

  router.get(
    "/dashboards/parent/me",
    ...reportingPolicies.parentDashboard,
    asyncHandler((req, res) => controller.getParentDashboard(req, res))
  );

  router.get(
    "/dashboards/parent/me/students/:studentId/profile",
    ...reportingPolicies.parentStudentReports,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getParentStudentProfile(req, res))
  );

  router.get(
    "/dashboards/parent/me/students/:studentId/reports/attendance-summary",
    ...reportingPolicies.parentStudentReports,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getParentStudentAttendanceReport(req, res))
  );

  router.get(
    "/dashboards/parent/me/students/:studentId/reports/assessment-summary",
    ...reportingPolicies.parentStudentReports,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getParentStudentAssessmentReport(req, res))
  );

  router.get(
    "/dashboards/parent/me/students/:studentId/reports/behavior-summary",
    ...reportingPolicies.parentStudentReports,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getParentStudentBehaviorReport(req, res))
  );

  router.get(
    "/dashboards/teacher/me",
    ...reportingPolicies.teacherDashboard,
    asyncHandler((req, res) => controller.getTeacherDashboard(req, res))
  );

  router.get(
    "/dashboards/supervisor/me",
    ...reportingPolicies.supervisorDashboard,
    asyncHandler((req, res) => controller.getSupervisorDashboard(req, res))
  );

  router.get(
    "/dashboards/admin/me",
    ...reportingPolicies.adminDashboard,
    asyncHandler((req, res) => controller.getAdminDashboard(req, res))
  );

  router.get(
    "/transport/summary",
    ...reportingPolicies.transportSummary,
    asyncHandler((req, res) => controller.getTransportSummary(req, res))
  );

  router.get(
    "/transport/parent/me/students/:studentId/live-status",
    ...reportingPolicies.parentTransport,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getParentTransportLiveStatus(req, res))
  );

  return router;
};
