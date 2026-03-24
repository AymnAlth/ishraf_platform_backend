import type { Role } from "../../config/constants";

export interface AuthenticatedUser {
  userId: string;
  role: Role;
  email: string | null;
  isActive: boolean;
}
