import type { Role } from "../../../config/constants";
import type { DriverStatus } from "../types/users.types";

interface CreateUserBaseRequestDto {
  fullName: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface CreateAdminUserRequestDto extends CreateUserBaseRequestDto {
  role: Extract<Role, "admin">;
  profile?: null;
}

export interface CreateParentUserRequestDto extends CreateUserBaseRequestDto {
  role: Extract<Role, "parent">;
  profile: {
    address?: string;
    relationType?: string;
  };
}

export interface CreateTeacherUserRequestDto extends CreateUserBaseRequestDto {
  role: Extract<Role, "teacher">;
  profile: {
    specialization?: string;
    qualification?: string;
    hireDate?: string;
  };
}

export interface CreateSupervisorUserRequestDto extends CreateUserBaseRequestDto {
  role: Extract<Role, "supervisor">;
  profile: {
    department?: string;
  };
}

export interface CreateDriverUserRequestDto extends CreateUserBaseRequestDto {
  role: Extract<Role, "driver">;
  profile: {
    licenseNumber: string;
    driverStatus?: DriverStatus;
  };
}

export type CreateUserRequestDto =
  | CreateAdminUserRequestDto
  | CreateParentUserRequestDto
  | CreateTeacherUserRequestDto
  | CreateSupervisorUserRequestDto
  | CreateDriverUserRequestDto;
