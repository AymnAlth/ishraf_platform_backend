import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/common/interfaces/queryable.interface";
import { ReportingRepository } from "../../src/modules/reporting/repository/reporting.repository";

const createQueryable = (): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({ rows: [] })
});

describe("ReportingRepository", () => {
  it("builds recent teacher assessment queries with targeted lateral aggregates", async () => {
    const repository = new ReportingRepository();
    const queryable = createQueryable();

    await repository.listRecentTeacherAssessments("11", "21", "31", 5, queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LEFT JOIN LATERAL");
    expect(sql).toContain("student_academic_enrollments");
    expect(sql).not.toContain("vw_assessment_details");
    expect(sql).not.toContain("vw_class_students");
  });

  it("builds student attendance summaries from targeted base-table aggregates", async () => {
    const repository = new ReportingRepository();
    const queryable = createQueryable();

    await repository.findStudentAttendanceSummary("11", "21", "31", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LEFT JOIN LATERAL");
    expect(sql).toContain("attendance_sessions");
    expect(sql).not.toContain("vw_student_attendance_summary");
  });

  it("builds student assessment summaries from base tables without summary views", async () => {
    const repository = new ReportingRepository();
    const queryable = createQueryable();

    await repository.listStudentAssessmentSummaries("11", "21", "31", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("student_assessments");
    expect(sql).toContain("subjects");
    expect(sql).not.toContain("vw_student_assessment_summary");
  });

  it("builds student behavior summaries from base tables without summary views", async () => {
    const repository = new ReportingRepository();
    const queryable = createQueryable();

    await repository.findStudentBehaviorSummary("11", "21", "31", queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("behavior_records");
    expect(sql).toContain("behavior_categories");
    expect(sql).not.toContain("vw_student_behavior_summary");
  });

  it("builds recent teacher behavior queries from base tables without behavior detail views", async () => {
    const repository = new ReportingRepository();
    const queryable = createQueryable();

    await repository.listRecentTeacherBehaviorRecords("11", "21", "31", 5, queryable);

    expect(queryable.query).toHaveBeenCalledTimes(1);
    const [sql] = queryable.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("FROM public.behavior_records br");
    expect(sql).toContain("JOIN public.behavior_categories bc");
    expect(sql).not.toContain("vw_behavior_details");
  });
});
