import type { DriverStatus } from "../types/users.types";
import type { Role } from "../../../config/constants";

export interface ParentProfileDto {
  address: string | null;
  relationType: string | null;
}

export interface TeacherProfileDto {
  specialization: string | null;
  qualification: string | null;
  hireDate: string | null;
}

export interface SupervisorProfileDto {
  department: string | null;
}

export interface DriverProfileDto {
  licenseNumber: string | null;
  driverStatus: DriverStatus | null;
}

export type UserProfileDto =
  | ParentProfileDto
  | TeacherProfileDto
  | SupervisorProfileDto
  | DriverProfileDto
  | null;

export interface UserResponseDto {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: UserProfileDto;
}
