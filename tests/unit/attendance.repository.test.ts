import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/common/interfaces/queryable.interface";
import { AttendanceRepository } from "../../src/modules/attendance/repository/attendance.repository";

const createQueryable = (): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({ rows: [] })
});

describe("AttendanceRepository", () => {
  it("writes attendance records in a single bulk query", async () => {
    const repository = new AttendanceRepository();
    const queryable = createQueryable();
    queryable.query.mockResolvedValue({
      rows: [
        {
          attendanceId: "101",
          studentId: "1",
          status: "present",
          notes: null,
          recordedAt: new Date("2026-04-05T10:00:00.000Z")
        }
      ]
    });

    const result = await repository.upsertAttendanceRecords(
      "55",
      [
        { studentId: "1", status: "present", notes: null },
        { studentId: "2", status: "absent", notes: "Late bus" }
      ],
      queryable
    );

    expect(queryable.query).toHaveBeenCalledTimes(1);
    expect(queryable.query).toHaveBeenCalledWith(
      expect.stringContaining("jsonb_to_recordset"),
      ["55", expect.any(String)]
    );
    expect(result).toHaveLength(1);
  });

  it("builds attendance detail reads with lateral aggregates instead of global roster views", async () => {
    const repository = new AttendanceRepository();
    const queryable = createQueryable();

    await repository.findAttendanceSessionById("55", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LEFT JOIN LATERAL");
    expect(sql).toContain("student_academic_enrollments");
    expect(sql).not.toContain("vw_class_students");
  });
});
