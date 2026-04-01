import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

const adminOnly = [authenticate, requireActiveUser, authorize("admin")] as const;

export const adminImportsPolicies = {
  schoolOnboarding: adminOnly
} as const;
