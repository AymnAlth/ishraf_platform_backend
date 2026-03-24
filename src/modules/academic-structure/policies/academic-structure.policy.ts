import { authPolicies } from "../../auth/policies/auth.policy";

export const academicStructurePolicies = {
  adminOnly: authPolicies.adminOnly
} as const;
