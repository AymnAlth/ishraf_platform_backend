import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

export const analyticsPolicies = {
  admin: [authenticate, requireActiveUser, authorize("admin")],
  studentRiskRead: [authenticate, requireActiveUser, authorize("admin", "parent")],
  classOverviewRead: [authenticate, requireActiveUser, authorize("admin", "teacher", "supervisor")],
  feedbackWrite: [
    authenticate,
    requireActiveUser,
    authorize("admin", "parent", "teacher", "supervisor")
  ],
  feedbackRead: [authenticate, requireActiveUser, authorize("admin")],
  snapshotReview: [authenticate, requireActiveUser, authorize("admin")]
} as const;
