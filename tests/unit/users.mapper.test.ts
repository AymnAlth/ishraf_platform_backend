import { describe, expect, it } from "vitest";

import { toUserResponseDto } from "../../src/modules/users/mapper/users.mapper";
import type { UserWithProfileRow } from "../../src/modules/users/types/users.types";

const teacherRow: UserWithProfileRow = {
  id: "3",
  fullName: "Sara Teacher",
  email: "teacher1@eshraf.local",
  phone: "700000003",
  role: "teacher",
  isActive: true,
  lastLoginAt: new Date("2026-03-13T10:00:00.000Z"),
  createdAt: new Date("2026-03-10T10:00:00.000Z"),
  updatedAt: new Date("2026-03-12T10:00:00.000Z"),
  parentAddress: null,
  parentRelationType: null,
  teacherSpecialization: "Mathematics",
  teacherQualification: "Bachelor",
  teacherHireDate: new Date("2025-09-01T00:00:00.000Z"),
  supervisorDepartment: null,
  driverLicenseNumber: null,
  driverStatus: null
};

describe("users.mapper", () => {
  it("maps teacher users with a date-only profile field", () => {
    expect(toUserResponseDto(teacherRow)).toEqual({
      id: "3",
      fullName: "Sara Teacher",
      email: "teacher1@eshraf.local",
      phone: "700000003",
      role: "teacher",
      isActive: true,
      lastLoginAt: "2026-03-13T10:00:00.000Z",
      createdAt: "2026-03-10T10:00:00.000Z",
      updatedAt: "2026-03-12T10:00:00.000Z",
      profile: {
        specialization: "Mathematics",
        qualification: "Bachelor",
        hireDate: "2025-09-01"
      }
    });
  });

  it("maps admin users without profile data", () => {
    expect(
      toUserResponseDto({
        ...teacherRow,
        id: "1",
        role: "admin"
      })
    ).toMatchObject({
      id: "1",
      role: "admin",
      profile: null
    });
  });
});
