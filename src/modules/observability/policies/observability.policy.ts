import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

export const observabilityPolicies = {
  admin: [authenticate, requireActiveUser, authorize("admin")]
} as const;
