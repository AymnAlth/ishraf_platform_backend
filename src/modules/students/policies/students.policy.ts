import { authPolicies } from "../../auth/policies/auth.policy";

export const studentsPolicies = {
  adminOnly: authPolicies.adminOnly
} as const;
