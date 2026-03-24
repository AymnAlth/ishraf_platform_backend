import type { Role } from "../../../config/constants";

export interface AuthUserRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export interface AuthRefreshTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface PasswordResetTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface AuthRequestContext {
  deviceInfo: string | null;
  ipAddress: string | null;
}
