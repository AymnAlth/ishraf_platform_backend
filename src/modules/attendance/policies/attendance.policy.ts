import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

const baseAttendanceAccess = [
  authenticate,
  requireActiveUser,
  authorize("admin", "teacher", "supervisor")
] as const;

export const attendancePolicies = {
  createSession: [authenticate, requireActiveUser, authorize("admin", "teacher")] as const,
  accessSessions: baseAttendanceAccess,
  updateRecords: baseAttendanceAccess
} as const;
