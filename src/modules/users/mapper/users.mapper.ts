import type { UserResponseDto } from "../dto/user-response.dto";
import type { UserWithProfileRow } from "../types/users.types";

const toIsoDate = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

const padDatePart = (value: number): string => value.toString().padStart(2, "0");

const toDateOnly = (value: Date | null): string | null =>
  value
    ? `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(
        value.getDate()
      )}`
    : null;

export const toUserResponseDto = (row: UserWithProfileRow): UserResponseDto => ({
  id: row.id,
  fullName: row.fullName,
  email: row.email,
  phone: row.phone,
  role: row.role,
  isActive: row.isActive,
  lastLoginAt: toIsoDate(row.lastLoginAt),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  profile:
    row.role === "admin"
      ? null
      : row.role === "parent"
        ? {
            address: row.parentAddress,
            relationType: row.parentRelationType
          }
        : row.role === "teacher"
          ? {
              specialization: row.teacherSpecialization,
              qualification: row.teacherQualification,
              hireDate: toDateOnly(row.teacherHireDate)
            }
          : row.role === "supervisor"
            ? {
                department: row.supervisorDepartment
              }
            : {
                licenseNumber: row.driverLicenseNumber,
                driverStatus: row.driverStatus
              }
});
