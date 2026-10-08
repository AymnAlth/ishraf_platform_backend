import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../../src/common/interfaces/queryable.interface";
import { ActiveAcademicContextService } from "../../../src/common/services/active-academic-context.service";
import { requestMemoService } from "../../../src/common/services/request-memo.service";
import { db } from "../../../src/database/db";

const createQueryable = (
  rows: unknown[]
): Queryable & { query: ReturnType<typeof vi.fn> } => ({
  query: vi.fn().mockResolvedValue({ rows })
});

describe("ActiveAcademicContextService", () => {
  const service = new ActiveAcademicContextService();
  const activeContextRow = {
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
  };

  it("memoizes active context lookups within the same request scope", async () => {
    const queryable = createQueryable([activeContextRow]);

    await requestMemoService.run(async () => {
      await service.getActiveContext(queryable);
      await service.getActiveContext(queryable);
    });

    expect(queryable.query).toHaveBeenCalledTimes(1);
  });

  it("reuses the active context across requests for the shared database queryable", async () => {
    const querySpy = vi
      .spyOn(db, "query")
      .mockImplementation(async () => ({ rows: [activeContextRow] }) as never);

    const cachedService = new ActiveAcademicContextService({
      sharedCacheTtlMs: 5_000,
      now: () => 1_000
    });

    try {
      await cachedService.getActiveContext();
      await cachedService.getActiveContext();

      expect(querySpy).toHaveBeenCalledTimes(1);
    } finally {
      querySpy.mockRestore();
    }
  });

  it("expires the shared cache after the configured ttl", async () => {
    let now = 1_000;
    const querySpy = vi
      .spyOn(db, "query")
      .mockImplementation(async () => ({ rows: [activeContextRow] }) as never);

    const cachedService = new ActiveAcademicContextService({
      sharedCacheTtlMs: 100,
      now: () => now
    });

    try {
      await cachedService.getActiveContext();
      now += 200;
      await cachedService.getActiveContext();

      expect(querySpy).toHaveBeenCalledTimes(2);
    } finally {
      querySpy.mockRestore();
    }
  });

  it("does not reuse the shared cache for non-default queryables", async () => {
    const queryable = createQueryable([activeContextRow]);

    const cachedService = new ActiveAcademicContextService({
      sharedCacheTtlMs: 5_000,
      now: () => 1_000
    });

    await cachedService.getActiveContext(queryable);
    await cachedService.getActiveContext(queryable);

    expect(queryable.query).toHaveBeenCalledTimes(2);
  });

  it("invalidates cached contexts held by other service instances", async () => {
    const querySpy = vi
      .spyOn(db, "query")
      .mockImplementation(async () => ({ rows: [activeContextRow] }) as never);
    const firstService = new ActiveAcademicContextService({
      sharedCacheTtlMs: 5_000,
      now: () => 1_000
    });
    const secondService = new ActiveAcademicContextService({
      sharedCacheTtlMs: 5_000,
      now: () => 1_000
    });

    try {
      await firstService.getActiveContext();
      secondService.invalidateSharedCache();
      await firstService.getActiveContext();

      expect(querySpy).toHaveBeenCalledTimes(2);
    } finally {
      querySpy.mockRestore();
    }
  });
});
