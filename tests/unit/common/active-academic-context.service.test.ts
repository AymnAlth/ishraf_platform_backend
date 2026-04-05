import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../../src/common/interfaces/queryable.interface";
import { ActiveAcademicContextService } from "../../../src/common/services/active-academic-context.service";
import { requestMemoService } from "../../../src/common/services/request-memo.service";

const createQueryable = (
  rows: unknown[]
): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({ rows })
});

describe("ActiveAcademicContextService", () => {
  const service = new ActiveAcademicContextService();

  it("memoizes active context lookups within the same request scope", async () => {
    const queryable = createQueryable([
      {
        academicYearId: "1",
        academicYearName: "2025-2026",
        academicYearStartDate: new Date("2025-09-01T00:00:00.000Z"),
        academicYearEndDate: new Date("2026-06-30T00:00:00.000Z"),
        academicYearCreatedAt: new Date("2025-09-01T00:00:00.000Z"),
        academicYearUpdatedAt: new Date("2025-09-01T00:00:00.000Z"),
        semesterId: "2",
        semesterName: "Semester 2",
        semesterStartDate: new Date("2026-02-01T00:00:00.000Z"),
        semesterEndDate: new Date("2026-06-30T00:00:00.000Z"),
        semesterCreatedAt: new Date("2026-02-01T00:00:00.000Z"),
        semesterUpdatedAt: new Date("2026-02-01T00:00:00.000Z")
      }
    ]);

    await requestMemoService.run(async () => {
      await service.getActiveContext(queryable);
      await service.getActiveContext(queryable);
    });

    expect(queryable.query).toHaveBeenCalledTimes(1);
  });
});
