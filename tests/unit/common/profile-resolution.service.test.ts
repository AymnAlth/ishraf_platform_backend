import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../../src/common/interfaces/queryable.interface";
import { ProfileResolutionService } from "../../../src/common/services/profile-resolution.service";
import { requestMemoService } from "../../../src/common/services/request-memo.service";

const createQueryable = (rows: unknown[]): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({
    rows
  })
});

const createQueryableSequence = (
  rowsSequence: unknown[][]
): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi
    .fn()
    .mockImplementationOnce(async () => ({ rows: rowsSequence[0] ?? [] }))
    .mockImplementationOnce(async () => ({ rows: rowsSequence[1] ?? [] }))
});

describe("ProfileResolutionService", () => {
  const service = new ProfileResolutionService();

  describe("parent profiles", () => {
    it("returns a parent profile when found", async () => {
      const queryable = createQueryable([
        {
          parentId: "12",
          userId: "42",
          fullName: "Parent Name",
          email: "parent@example.com",
          phone: "700000012",
          address: "Main Street",
          relationType: "father"
        }
      ]);

      const result = await service.findParentProfileByUserId("42", queryable);

      expect(result).toEqual({
        parentId: "12",
        userId: "42",
        fullName: "Parent Name",
        email: "parent@example.com",
        phone: "700000012",
        address: "Main Street",
        relationType: "father"
      });
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["42"]);
    });

    it("returns null when a parent profile does not exist", async () => {
      const queryable = createQueryable([]);

      const result = await service.findParentProfileByUserId("42", queryable);

      expect(result).toBeNull();
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["42"]);
    });

    it("returns the resolved parent profile when requireParentProfile succeeds", async () => {
      const queryable = createQueryable([
        {
          parentId: "12",
          userId: "42",
          fullName: "Parent Name",
          email: "parent@example.com",
          phone: "700000012",
          address: "Main Street",
          relationType: "father"
        }
      ]);

      await expect(service.requireParentProfile("42", queryable)).resolves.toEqual({
        parentId: "12",
        userId: "42",
        fullName: "Parent Name",
        email: "parent@example.com",
        phone: "700000012",
        address: "Main Street",
        relationType: "father"
      });
    });

    it("memoizes the same parent profile lookup within a request scope", async () => {
      const queryable = createQueryable([
        {
          parentId: "12",
          userId: "42",
          fullName: "Parent Name",
          email: "parent@example.com",
          phone: "700000012",
          address: "Main Street",
          relationType: "father"
        }
      ]);

      await requestMemoService.run(async () => {
        await service.findParentProfileByUserId("42", queryable);
        await service.findParentProfileByUserId("42", queryable);
      });

      expect(queryable.query).toHaveBeenCalledTimes(1);
    });

    it("throws a domain-aware not found error when a parent profile is missing", async () => {
      const queryable = createQueryable([]);

      await expect(service.requireParentProfile("42", queryable)).rejects.toMatchObject({
        message: "Parent profile not found",
        statusCode: 404,
        code: "NOT_FOUND"
      });
    });
  });

  describe("teacher profiles", () => {
    it("returns a teacher profile when found", async () => {
      const queryable = createQueryable([
        {
          teacherId: "7",
          userId: "3",
          fullName: "Teacher Name",
          email: "teacher@example.com",
          phone: "700000001",
          specialization: "Mathematics",
          qualification: "Bachelor",
          hireDate: "2025-09-01"
        }
      ]);

      const result = await service.findTeacherProfileByUserId("3", queryable);

      expect(result).toEqual({
        teacherId: "7",
        userId: "3",
        fullName: "Teacher Name",
        email: "teacher@example.com",
        phone: "700000001",
        specialization: "Mathematics",
        qualification: "Bachelor",
        hireDate: "2025-09-01"
      });
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["3"]);
    });

    it("returns null when a teacher profile does not exist", async () => {
      const queryable = createQueryable([]);

      await expect(service.findTeacherProfileByUserId("3", queryable)).resolves.toBeNull();
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["3"]);
    });

    it("returns the resolved teacher profile when requireTeacherProfile succeeds", async () => {
      const queryable = createQueryable([
        {
          teacherId: "7",
          userId: "3",
          fullName: "Teacher Name",
          email: "teacher@example.com",
          phone: "700000001",
          specialization: "Mathematics",
          qualification: "Bachelor",
          hireDate: "2025-09-01"
        }
      ]);

      await expect(service.requireTeacherProfile("3", queryable)).resolves.toEqual({
        teacherId: "7",
        userId: "3",
        fullName: "Teacher Name",
        email: "teacher@example.com",
        phone: "700000001",
        specialization: "Mathematics",
        qualification: "Bachelor",
        hireDate: "2025-09-01"
      });
    });

    it("memoizes the same teacher profile lookup within a request scope", async () => {
      const queryable = createQueryable([
        {
          teacherId: "7",
          userId: "3",
          fullName: "Teacher Name",
          email: "teacher@example.com",
          phone: "700000001",
          specialization: "Mathematics",
          qualification: "Bachelor",
          hireDate: "2025-09-01"
        }
      ]);

      await requestMemoService.run(async () => {
        await service.findTeacherProfileByUserId("3", queryable);
        await service.findTeacherProfileByUserId("3", queryable);
      });

      expect(queryable.query).toHaveBeenCalledTimes(1);
    });

    it("throws a domain-aware not found error when a teacher profile is missing", async () => {
      const queryable = createQueryable([]);

      await expect(service.requireTeacherProfile("9", queryable)).rejects.toMatchObject({
        message: "Teacher profile not found",
        statusCode: 404,
        code: "NOT_FOUND"
      });
    });

    it("resolves teacher identifiers from either the teacher profile id or teacher user id", async () => {
      const teacherProfile = {
        teacherId: "7",
        userId: "1002",
        fullName: "Teacher Name",
        email: "teacher@example.com",
        phone: "700000001",
        specialization: "Mathematics",
        qualification: "Bachelor",
        hireDate: "2025-09-01"
      };

      const userIdQueryable = createQueryableSequence([[teacherProfile], []]);
      const profileIdQueryable = createQueryableSequence([[], [teacherProfile]]);

      await expect(
        service.requireTeacherProfileIdentifier("1002", userIdQueryable)
      ).resolves.toEqual(teacherProfile);
      await expect(
        service.requireTeacherProfileIdentifier("7", profileIdQueryable)
      ).resolves.toEqual(teacherProfile);
    });

    it("rejects ambiguous teacher identifiers instead of resolving the wrong profile", async () => {
      const queryable = createQueryableSequence([
        [
          {
            teacherId: "9",
            userId: "3",
            fullName: "Teacher A",
            email: "teacher-a@example.com",
            phone: "700000001",
            specialization: "Math",
            qualification: "Bachelor",
            hireDate: "2025-09-01"
          }
        ],
        [
          {
            teacherId: "3",
            userId: "99",
            fullName: "Teacher B",
            email: "teacher-b@example.com",
            phone: "700000002",
            specialization: "Science",
            qualification: "Bachelor",
            hireDate: "2025-09-01"
          }
        ]
      ]);

      await expect(
        service.requireTeacherProfileIdentifier("3", queryable)
      ).rejects.toMatchObject({
        message: "teacherId is ambiguous",
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "teacherId",
            code: "TEACHER_ID_AMBIGUOUS"
          })
        ])
      });
    });
  });

  describe("supervisor profiles", () => {
    it("returns a supervisor profile when found", async () => {
      const queryable = createQueryable([
        {
          supervisorId: "6",
          userId: "11",
          fullName: "Supervisor Name",
          email: "supervisor@example.com",
          phone: "700000011",
          department: "Academic Affairs"
        }
      ]);

      const result = await service.findSupervisorProfileByUserId("11", queryable);

      expect(result).toEqual({
        supervisorId: "6",
        userId: "11",
        fullName: "Supervisor Name",
        email: "supervisor@example.com",
        phone: "700000011",
        department: "Academic Affairs"
      });
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["11"]);
    });

    it("returns null when a supervisor profile does not exist", async () => {
      const queryable = createQueryable([]);

      await expect(service.findSupervisorProfileByUserId("11", queryable)).resolves.toBeNull();
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["11"]);
    });

    it("returns the resolved supervisor profile when requireSupervisorProfile succeeds", async () => {
      const queryable = createQueryable([
        {
          supervisorId: "6",
          userId: "11",
          fullName: "Supervisor Name",
          email: "supervisor@example.com",
          phone: "700000011",
          department: "Academic Affairs"
        }
      ]);

      await expect(service.requireSupervisorProfile("11", queryable)).resolves.toEqual({
        supervisorId: "6",
        userId: "11",
        fullName: "Supervisor Name",
        email: "supervisor@example.com",
        phone: "700000011",
        department: "Academic Affairs"
      });
    });

    it("throws a domain-aware not found error when a supervisor profile is missing", async () => {
      const queryable = createQueryable([]);

      await expect(service.requireSupervisorProfile("11", queryable)).rejects.toMatchObject({
        message: "Supervisor profile not found",
        statusCode: 404,
        code: "NOT_FOUND"
      });
    });

    it("resolves supervisor identifiers from either the supervisor profile id or supervisor user id", async () => {
      const supervisorProfile = {
        supervisorId: "6",
        userId: "1005",
        fullName: "Supervisor Name",
        email: "supervisor@example.com",
        phone: "700000011",
        department: "Academic Affairs"
      };

      const userIdQueryable = createQueryableSequence([[supervisorProfile], []]);
      const profileIdQueryable = createQueryableSequence([[], [supervisorProfile]]);

      await expect(
        service.requireSupervisorProfileIdentifier("1005", userIdQueryable)
      ).resolves.toEqual(supervisorProfile);
      await expect(
        service.requireSupervisorProfileIdentifier("6", profileIdQueryable)
      ).resolves.toEqual(supervisorProfile);
    });

    it("rejects ambiguous supervisor identifiers instead of resolving the wrong profile", async () => {
      const queryable = createQueryableSequence([
        [
          {
            supervisorId: "8",
            userId: "5",
            fullName: "Supervisor A",
            email: "supervisor-a@example.com",
            phone: "700000011",
            department: "Academic Affairs"
          }
        ],
        [
          {
            supervisorId: "5",
            userId: "88",
            fullName: "Supervisor B",
            email: "supervisor-b@example.com",
            phone: "700000012",
            department: "Operations"
          }
        ]
      ]);

      await expect(
        service.requireSupervisorProfileIdentifier("5", queryable)
      ).rejects.toMatchObject({
        message: "supervisorId is ambiguous",
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "supervisorId",
            code: "SUPERVISOR_ID_AMBIGUOUS"
          })
        ])
      });
    });
  });

  describe("driver profiles", () => {
    it("returns a driver profile when found", async () => {
      const queryable = createQueryable([
        {
          driverId: "5",
          userId: "8",
          fullName: "Driver Name",
          email: "driver@example.com",
          phone: "700000005",
          licenseNumber: "DRV-001",
          driverStatus: "active"
        }
      ]);

      const result = await service.findDriverProfileByUserId("8", queryable);

      expect(result).toEqual({
        driverId: "5",
        userId: "8",
        fullName: "Driver Name",
        email: "driver@example.com",
        phone: "700000005",
        licenseNumber: "DRV-001",
        driverStatus: "active"
      });
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["8"]);
    });

    it("returns null when a driver profile does not exist", async () => {
      const queryable = createQueryable([]);

      await expect(service.findDriverProfileByUserId("8", queryable)).resolves.toBeNull();
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["8"]);
    });

    it("returns the resolved driver profile when requireDriverProfile succeeds", async () => {
      const queryable = createQueryable([
        {
          driverId: "5",
          userId: "8",
          fullName: "Driver Name",
          email: "driver@example.com",
          phone: "700000005",
          licenseNumber: "DRV-001",
          driverStatus: "active"
        }
      ]);

      await expect(service.requireDriverProfile("8", queryable)).resolves.toEqual({
        driverId: "5",
        userId: "8",
        fullName: "Driver Name",
        email: "driver@example.com",
        phone: "700000005",
        licenseNumber: "DRV-001",
        driverStatus: "active"
      });
    });

    it("throws a domain-aware not found error when a driver profile is missing", async () => {
      const queryable = createQueryable([]);

      await expect(service.requireDriverProfile("8", queryable)).rejects.toMatchObject({
        message: "Driver profile not found",
        statusCode: 404,
        code: "NOT_FOUND"
      });
    });
  });
});
