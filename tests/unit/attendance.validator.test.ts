import { describe, expect, it } from "vitest";

import {
  createAttendanceSessionSchema,
  listAttendanceSessionsQuerySchema,
  saveAttendanceRecordsSchema,
  updateAttendanceRecordSchema
} from "../../src/modules/attendance/validator/attendance.validator";

describe("attendance.validator", () => {
  it("accepts numeric identifiers and normalizes them to strings", () => {
    const result = createAttendanceSessionSchema.safeParse({
      classId: 1,
      subjectId: "2",
      academicYearId: 1,
      semesterId: "2",
      sessionDate: "2026-02-16",
      periodNo: 1,
      teacherId: 1
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.classId).toBe("1");
      expect(result.data.subjectId).toBe("2");
      expect(result.data.teacherId).toBe("1");
    }
  });

  it("rejects invalid date range filters", () => {
    const result = listAttendanceSessionsQuerySchema.safeParse({
      dateFrom: "2026-02-20",
      dateTo: "2026-02-19"
    });

    expect(result.success).toBe(false);
  });

  it("accepts bulk attendance payloads and normalizes student ids", () => {
    const result = saveAttendanceRecordsSchema.safeParse({
      records: [
        {
          studentId: 1,
          status: "present"
        },
        {
          studentId: "2",
          status: "late",
          notes: "Traffic"
        }
      ]
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.records[0].studentId).toBe("1");
      expect(result.data.records[1].studentId).toBe("2");
    }
  });

  it("rejects empty attendance record updates", () => {
    const result = updateAttendanceRecordSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
