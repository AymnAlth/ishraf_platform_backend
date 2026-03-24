import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

export const reportingPolicies = {
  studentReports: [authenticate, requireActiveUser, authorize("admin", "teacher", "supervisor")] as const,
  parentDashboard: [authenticate, requireActiveUser, authorize("parent")] as const,
  parentStudentReports: [authenticate, requireActiveUser, authorize("parent")] as const,
  parentTransport: [authenticate, requireActiveUser, authorize("parent")] as const,
  teacherDashboard: [authenticate, requireActiveUser, authorize("teacher")] as const,
  supervisorDashboard: [authenticate, requireActiveUser, authorize("supervisor")] as const,
  adminDashboard: [authenticate, requireActiveUser, authorize("admin")] as const,
  transportSummary: [authenticate, requireActiveUser, authorize("admin", "driver")] as const
} as const;
