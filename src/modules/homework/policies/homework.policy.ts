import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

export const homeworkPolicies = {
  manageHomework: [authenticate, requireActiveUser, authorize("admin", "teacher")] as const,
  readHomework: [authenticate, requireActiveUser, authorize("admin", "teacher")] as const,
  studentHomework: [authenticate, requireActiveUser, authorize("admin", "teacher", "parent")] as const
} as const;
