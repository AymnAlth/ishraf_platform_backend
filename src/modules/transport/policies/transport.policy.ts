import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";

const adminOnly = [authenticate, requireActiveUser, authorize("admin")] as const;
const driverOrAdmin = [authenticate, requireActiveUser, authorize("admin", "driver")] as const;
const driverOnly = [authenticate, requireActiveUser, authorize("driver")] as const;

export const transportPolicies = {
  manageStatic: adminOnly,
  manageAssignments: adminOnly,
  manageRouteAssignments: adminOnly,
  manageHomeLocations: adminOnly,
  accessTrips: driverOrAdmin,
  operateTrips: driverOrAdmin,
  driverRouteAssignments: driverOnly
} as const;
