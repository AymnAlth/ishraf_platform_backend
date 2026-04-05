import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/common/interfaces/queryable.interface";
import { BehaviorRepository } from "../../src/modules/behavior/repository/behavior.repository";

const createQueryable = (): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({ rows: [] })
});

describe("BehaviorRepository", () => {
  it("builds behavior detail reads from base tables without behavior detail views", async () => {
    const repository = new BehaviorRepository();
    const queryable = createQueryable();

    await repository.findBehaviorRecordById("55", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("FROM public.behavior_records br");
    expect(sql).toContain("JOIN public.behavior_categories bc");
    expect(sql).not.toContain("vw_behavior_details");
  });

  it("builds student behavior references from base tables without student profile views", async () => {
    const repository = new BehaviorRepository();
    const queryable = createQueryable();

    await repository.findStudentBehaviorReferenceById("11", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("FROM public.students st");
    expect(sql).toContain("JOIN public.classes c");
    expect(sql).not.toContain("vw_student_profiles");
  });

  it("builds student behavior summaries from base tables without summary views", async () => {
    const repository = new BehaviorRepository();
    const queryable = createQueryable();

    await repository.findStudentBehaviorSummary("11", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("FROM (");
    expect(sql).toContain("behavior_records");
    expect(sql).not.toContain("vw_student_behavior_summary");
  });
});
