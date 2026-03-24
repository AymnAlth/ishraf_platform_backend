import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../../src/common/interfaces/queryable.interface";
import { OwnershipService } from "../../../src/common/services/ownership.service";

const createQueryable = (
  exists: boolean
): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({
    rows: [{ exists }]
  })
});

describe("OwnershipService", () => {
  const service = new OwnershipService();

  describe("teacher assignment checks", () => {
    it("returns true when a teacher assignment exists with a subject filter", async () => {
      const queryable = createQueryable(true);

      const result = await service.hasTeacherAssignment("1", "2", "3", "4", queryable);

      expect(result).toBe(true);
      expect(queryable.query).toHaveBeenCalledTimes(1);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["1", "2", "3", "4"]);
    });

    it("returns false when a teacher assignment does not exist", async () => {
      const queryable = createQueryable(false);

      await expect(service.hasTeacherAssignment("1", "2", "3", "4", queryable)).resolves.toBe(
        false
      );
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["1", "2", "3", "4"]);
    });

    it("does not add a subject parameter when the subject filter is omitted", async () => {
      const queryable = createQueryable(true);

      const result = await service.hasTeacherAssignment("1", "2", "3", undefined, queryable);

      expect(result).toBe(true);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["1", "2", "3"]);
    });

    it("resolves when the teacher is assigned to the class and year", async () => {
      await expect(
        service.assertTeacherAssignedToClassYear("1", "2", "3", "4", createQueryable(true))
      ).resolves.toBeUndefined();
    });

    it("throws a forbidden error when a teacher is not assigned to the class and year", async () => {
      await expect(
        service.assertTeacherAssignedToClassYear("1", "2", "3", "4", createQueryable(false))
      ).rejects.toMatchObject({
        message: "You do not have permission to access this teacher-assigned resource",
        statusCode: 403,
        code: "FORBIDDEN"
      });
    });
  });

  describe("supervisor assignment checks", () => {
    it("returns true when a supervisor assignment exists", async () => {
      const queryable = createQueryable(true);

      const result = await service.hasSupervisorAssignment("1", "2", "3", queryable);

      expect(result).toBe(true);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["1", "2", "3"]);
    });

    it("returns false when a supervisor assignment does not exist", async () => {
      await expect(
        service.hasSupervisorAssignment("1", "2", "3", createQueryable(false))
      ).resolves.toBe(false);
    });

    it("resolves when the supervisor is assigned to the class and year", async () => {
      await expect(
        service.assertSupervisorAssignedToClassYear("1", "2", "3", createQueryable(true))
      ).resolves.toBeUndefined();
    });

    it("throws a forbidden error when a supervisor is not assigned to the class and year", async () => {
      await expect(
        service.assertSupervisorAssignedToClassYear("1", "2", "3", createQueryable(false))
      ).rejects.toMatchObject({
        message: "You do not have permission to access this supervisor-assigned resource",
        statusCode: 403,
        code: "FORBIDDEN"
      });
    });
  });

  describe("parent ownership checks", () => {
    it("returns true when a parent owns the student", async () => {
      const queryable = createQueryable(true);

      const result = await service.hasParentStudentOwnership("10", "20", queryable);

      expect(result).toBe(true);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["10", "20"]);
    });

    it("returns false when a parent does not own the student", async () => {
      await expect(
        service.hasParentStudentOwnership("10", "20", createQueryable(false))
      ).resolves.toBe(false);
    });

    it("resolves when a parent owns the student", async () => {
      await expect(service.assertParentOwnsStudent("10", "20", createQueryable(true))).resolves.toBeUndefined();
    });

    it("throws a forbidden error when a parent does not own the student", async () => {
      await expect(
        service.assertParentOwnsStudent("10", "20", createQueryable(false))
      ).rejects.toMatchObject({
        message: "You do not have permission to access this student",
        statusCode: 403,
        code: "FORBIDDEN"
      });
    });
  });

  describe("driver ownership checks", () => {
    it("returns true when a driver owns a bus", async () => {
      const queryable = createQueryable(true);

      const result = await service.hasDriverBusOwnership("7", "9", queryable);

      expect(result).toBe(true);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["9", "7"]);
    });

    it("returns false when a driver does not own a bus", async () => {
      await expect(service.hasDriverBusOwnership("7", "9", createQueryable(false))).resolves.toBe(
        false
      );
    });

    it("resolves when a driver owns the bus", async () => {
      await expect(service.assertDriverOwnsBus("7", "9", createQueryable(true))).resolves.toBeUndefined();
    });

    it("throws a forbidden error when a driver does not own the bus", async () => {
      await expect(
        service.assertDriverOwnsBus("7", "9", createQueryable(false))
      ).rejects.toMatchObject({
        message: "You do not have permission to access this bus",
        statusCode: 403,
        code: "FORBIDDEN"
      });
    });

    it("returns true when a driver owns a trip through the assigned bus", async () => {
      const queryable = createQueryable(true);

      const result = await service.hasDriverTripOwnership("7", "9", queryable);

      expect(result).toBe(true);
      expect(queryable.query).toHaveBeenCalledWith(expect.any(String), ["9", "7"]);
    });

    it("returns false when a driver does not own a trip", async () => {
      await expect(service.hasDriverTripOwnership("7", "9", createQueryable(false))).resolves.toBe(
        false
      );
    });

    it("resolves when a driver owns the trip", async () => {
      await expect(service.assertDriverOwnsTrip("7", "9", createQueryable(true))).resolves.toBeUndefined();
    });

    it("throws a forbidden error when a driver does not own the trip", async () => {
      await expect(
        service.assertDriverOwnsTrip("7", "9", createQueryable(false))
      ).rejects.toMatchObject({
        message: "You do not have permission to access this trip",
        statusCode: 403,
        code: "FORBIDDEN"
      });
    });
  });
});
