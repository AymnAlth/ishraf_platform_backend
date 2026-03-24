import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/common/errors/validation-error";
import { db } from "../../src/database/db";
import { UsersService } from "../../src/modules/users/service/users.service";
import type { UsersRepository } from "../../src/modules/users/repository/users.repository";
import type { UserWithProfileRow } from "../../src/modules/users/types/users.types";

const createUserRow = (overrides: Partial<UserWithProfileRow> = {}): UserWithProfileRow => ({
  id: "2001",
  fullName: "Teacher User",
  email: "teacher@example.com",
  phone: "700000010",
  role: "teacher",
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  parentAddress: null,
  parentRelationType: null,
  teacherSpecialization: "Math",
  teacherQualification: "Bachelor",
  teacherHireDate: new Date("2025-09-01T00:00:00.000Z"),
  supervisorDepartment: null,
  driverLicenseNumber: null,
  driverStatus: null,
  ...overrides
});

describe("UsersService", () => {
  const repositoryMock = {
    createUser: vi.fn(),
    createParentProfile: vi.fn(),
    createTeacherProfile: vi.fn(),
    createSupervisorProfile: vi.fn(),
    createDriverProfile: vi.fn(),
    findUserById: vi.fn(),
    listUsers: vi.fn(),
    updateUserBase: vi.fn(),
    updateParentProfile: vi.fn(),
    updateTeacherProfile: vi.fn(),
    updateSupervisorProfile: vi.fn(),
    updateDriverProfile: vi.fn(),
    updateUserStatus: vi.fn(),
    revokeAllUserRefreshTokens: vi.fn()
  };

  let usersService: UsersService;

  beforeEach(() => {
    usersService = new UsersService(repositoryMock as unknown as UsersRepository);

    vi.restoreAllMocks();
    vi.spyOn(db, "withTransaction").mockImplementation(async (callback) => {
      const fakeClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      return callback(fakeClient as never);
    });

    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
  });

  it("creates a teacher user and returns the joined response", async () => {
    vi.mocked(repositoryMock.createUser).mockResolvedValue("2001");
    vi.mocked(repositoryMock.createTeacherProfile).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.findUserById).mockResolvedValue(createUserRow());

    const response = await usersService.createUser({
      fullName: "Teacher User",
      email: "teacher@example.com",
      password: "StrongPass123",
      role: "teacher",
      profile: {
        specialization: "Math",
        qualification: "Bachelor",
        hireDate: "2025-09-01"
      }
    });

    expect(response.id).toBe("2001");
    expect(response.role).toBe("teacher");
    expect(repositoryMock.createTeacherProfile).toHaveBeenCalledOnce();
  });

  it("stops user creation when profile creation fails", async () => {
    vi.mocked(repositoryMock.createUser).mockResolvedValue("2001");
    vi.mocked(repositoryMock.createTeacherProfile).mockRejectedValue(new Error("boom"));

    await expect(
      usersService.createUser({
        fullName: "Teacher User",
        email: "teacher@example.com",
        password: "StrongPass123",
        role: "teacher",
        profile: {
          specialization: "Math"
        }
      })
    ).rejects.toThrow("boom");

    expect(repositoryMock.findUserById).not.toHaveBeenCalled();
  });

  it("rejects profile fields that do not match the stored role", async () => {
    vi.mocked(repositoryMock.findUserById).mockResolvedValue(createUserRow());

    await expect(
      usersService.updateUser("2001", {
        profile: {
          department: "Student Affairs"
        }
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(repositoryMock.updateUserBase).not.toHaveBeenCalled();
  });

  it("revokes refresh tokens when disabling a user", async () => {
    vi.mocked(repositoryMock.findUserById)
      .mockResolvedValueOnce(createUserRow({ isActive: true }))
      .mockResolvedValueOnce(createUserRow({ isActive: false }));
    vi.mocked(repositoryMock.updateUserStatus).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.revokeAllUserRefreshTokens).mockResolvedValue(undefined);

    const response = await usersService.updateUserStatus("2001", {
      isActive: false
    });

    expect(response.isActive).toBe(false);
    expect(repositoryMock.revokeAllUserRefreshTokens).toHaveBeenCalledOnce();
  });
});
