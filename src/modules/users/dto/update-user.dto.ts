import type { DriverStatus } from "../types/users.types";

export interface UpdateUserRequestDto {
  fullName?: string;
  email?: string;
  phone?: string;
  profile?: {
    address?: string;
    relationType?: string;
    specialization?: string;
    qualification?: string;
    hireDate?: string;
    department?: string;
    licenseNumber?: string;
    driverStatus?: DriverStatus;
  };
}
