import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/common/interfaces/queryable.interface";
import { AssessmentsRepository } from "../../src/modules/assessments/repository/assessments.repository";

const createQueryable = (): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({ rows: [] })
});

describe("AssessmentsRepository", () => {
  it("writes student assessments in a single bulk query", async () => {
    const repository = new AssessmentsRepository();
    const queryable = createQueryable();
    queryable.query.mockResolvedValue({
      rows: [
        {
          studentAssessmentId: "301",
          studentId: "1",
          score: 18,
          remarks: null,
          gradedAt: new Date("2026-04-05T11:00:00.000Z")
        }
      ]
    });

    const result = await repository.upsertStudentAssessments(
      "77",
      [
        { studentId: "1", score: 18, remarks: null },
        { studentId: "2", score: 19.5, remarks: "Excellent" }
      ],
      queryable
    );

    expect(queryable.query).toHaveBeenCalledTimes(1);
    expect(queryable.query).toHaveBeenCalledWith(
      expect.stringContaining("jsonb_to_recordset"),
      ["77", expect.any(String)]
    );
    expect(result).toHaveLength(1);
  });

  it("builds assessment detail reads with lateral aggregates instead of global summary joins", async () => {
    const repository = new AssessmentsRepository();
    const queryable = createQueryable();

    await repository.findAssessmentById("77", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LEFT JOIN LATERAL");
    expect(sql).toContain("student_academic_enrollments");
    expect(sql).not.toContain("vw_class_students");
  });
});
