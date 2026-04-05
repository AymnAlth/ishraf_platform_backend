import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/common/interfaces/queryable.interface";
import { HomeworkRepository } from "../../src/modules/homework/repository/homework.repository";

const createQueryable = (): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({ rows: [] })
});

describe("HomeworkRepository", () => {
  it("writes homework submissions in a single bulk query", async () => {
    const repository = new HomeworkRepository();
    const queryable = createQueryable();

    await repository.upsertHomeworkSubmissions(
      "88",
      [
        { studentId: "1", status: "submitted", notes: null, submittedAt: null },
        { studentId: "2", status: "late", notes: "Network issue", submittedAt: null }
      ],
      queryable
    );

    expect(queryable.query).toHaveBeenCalledTimes(1);
    expect(queryable.query).toHaveBeenCalledWith(
      expect.stringContaining("jsonb_to_recordset"),
      ["88", expect.any(String)]
    );
  });

  it("builds homework detail reads from base tables with lateral aggregates", async () => {
    const repository = new HomeworkRepository();
    const queryable = createQueryable();

    await repository.findHomeworkById("88", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LEFT JOIN LATERAL");
    expect(sql).toContain("JOIN");
    expect(sql).toContain("subjects");
    expect(sql).not.toContain("vw_homework_details");
    expect(sql).not.toContain("vw_class_students");
  });
});
