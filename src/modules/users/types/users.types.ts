import type { Role } from "../../../config/constants";
import type { PaginationQuery, SortQuery } from "../../../common/types/pagination.types";

export const DRIVER_STATUS_VALUES = ["active", "inactive", "suspended"] as const;

export type DriverStatus = (typeof DRIVER_STATUS_VALUES)[number];

export interface UserRecordRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithProfileRow extends UserRecordRow {
  parentAddress: string | null;
  parentRelationType: string | null;
  teacherSpecialization: string | null;
  teacherQualification: string | null;
  teacherHireDate: Date | null;
  supervisorDepartment: string | null;
  driverLicenseNumber: string | null;
  driverStatus: DriverStatus | null;
}

export interface CreateUserRowInput {
  fullName: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  role: Role;
}

export interface ParentProfileInput {
  address: string | null;
  relationType: string | null;
}

export interface TeacherProfileInput {
  specialization: string | null;
  qualification: string | null;
  hireDate: string | null;
}

export interface SupervisorProfileInput {
  department: string | null;
}

export interface DriverProfileInput {
  licenseNumber: string;
  driverStatus: DriverStatus;
}

export interface UpdateUserBaseInput {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface UserRouteParams {
  id: string;
}

export const USER_LIST_SORT_FIELDS = [
  "createdAt",
  "fullName",
  "email",
  "role"
] as const;

export type UserListSortField = (typeof USER_LIST_SORT_FIELDS)[number];

export interface ListUsersQuery
  extends PaginationQuery,
    SortQuery<UserListSortField> {
  role?: Role;
  isActive?: boolean;
}
