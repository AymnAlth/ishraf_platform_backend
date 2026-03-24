import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

const activeUser = [authenticate, requireActiveUser] as const;
const adminOnly = [authenticate, requireActiveUser, authorize("admin")] as const;

export const communicationPolicies = {
  messages: activeUser,
  readAnnouncements: activeUser,
  manageAnnouncements: adminOnly,
  readNotifications: activeUser,
  manageNotifications: adminOnly
} as const;
