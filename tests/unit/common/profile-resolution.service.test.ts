import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../../src/common/interfaces/queryable.interface";
import { ProfileResolutionService } from "../../../src/common/services/profile-resolution.service";

const createQueryable = (rows: unknown[]): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({
    rows
  })
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

    it("throws a domain-aware not found error when a teacher profile is missing", async () => {
      const queryable = createQueryable([]);

      await expect(service.requireTeacherProfile("9", queryable)).rejects.toMatchObject({
        message: "Teacher profile not found",
        statusCode: 404,
        code: "NOT_FOUND"
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
