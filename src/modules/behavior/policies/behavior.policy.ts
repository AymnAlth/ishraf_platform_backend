import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

export const behaviorPolicies = {
  manageCategories: [authenticate, requireActiveUser, authorize("admin")] as const,
  readCategories: [
    authenticate,
    requireActiveUser,
    authorize("admin", "teacher", "supervisor")
  ] as const,
  manageRecords: [
    authenticate,
    requireActiveUser,
    authorize("admin", "teacher", "supervisor")
  ] as const
} as const;
