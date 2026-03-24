import { describe, expect, it } from "vitest";

import {
  createBusSchema,
  createStudentBusAssignmentSchema,
  createTripStudentEventSchema,
  listTripsQuerySchema
} from "../../src/modules/transport/validator/transport.validator";

describe("transport.validator", () => {
  it("accepts bus and assignment payloads and normalizes identifiers", () => {
    const busResult = createBusSchema.safeParse({
      plateNumber: "BUS-001",
      driverId: 1,
      capacity: "40",
      status: "active"
    });
    const assignmentResult = createStudentBusAssignmentSchema.safeParse({
      studentId: 1,
      routeId: "2",
      stopId: "3",
      startDate: "2026-03-13"
    });

    expect(busResult.success).toBe(true);
    expect(assignmentResult.success).toBe(true);

    if (busResult.success) {
      expect(busResult.data.driverId).toBe("1");
      expect(busResult.data.capacity).toBe(40);
    }

    if (assignmentResult.success) {
      expect(assignmentResult.data.studentId).toBe("1");
      expect(assignmentResult.data.routeId).toBe("2");
      expect(assignmentResult.data.stopId).toBe("3");
    }
  });

  it("rejects invalid trip query date ranges", () => {
    const result = listTripsQuerySchema.safeParse({
      dateFrom: "2026-03-20",
      dateTo: "2026-03-19"
    });

    expect(result.success).toBe(false);
  });

  it("enforces stop rules for trip student events", () => {
    const missingStop = createTripStudentEventSchema.safeParse({
      studentId: "1",
      eventType: "boarded"
    });
    const unexpectedStop = createTripStudentEventSchema.safeParse({
      studentId: "1",
      eventType: "absent",
      stopId: "10"
    });

    expect(missingStop.success).toBe(false);
    expect(unexpectedStop.success).toBe(false);
  });
});
