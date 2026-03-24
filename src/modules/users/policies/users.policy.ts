import { authPolicies } from "../../auth/policies/auth.policy";

export const usersPolicies = {
  adminOnly: authPolicies.adminOnly
} as const;
