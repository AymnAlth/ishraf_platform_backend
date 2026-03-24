import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

export const assessmentsPolicies = {
  manageTypes: [authenticate, requireActiveUser, authorize("admin")] as const,
  readTypes: [authenticate, requireActiveUser, authorize("admin", "teacher")] as const,
  manageAssessments: [authenticate, requireActiveUser, authorize("admin", "teacher")] as const
} as const;
