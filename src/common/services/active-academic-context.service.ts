import { ConflictError } from "../errors/conflict-error";
import { ValidationError } from "../errors/validation-error";
import type { Queryable } from "../interfaces/queryable.interface";
import { databaseViews } from "../../config/database";
import { db } from "../../database/db";
import { requestMemoService } from "./request-memo.service";

export interface ActiveAcademicContext {
  academicYearId: string;
  academicYearName: string;
  academicYearStartDate: Date;
  academicYearEndDate: Date;
  academicYearCreatedAt: Date;
  academicYearUpdatedAt: Date;
  semesterId: string;
  semesterName: string;
  semesterStartDate: Date;
  semesterEndDate: Date;
  semesterCreatedAt: Date;
  semesterUpdatedAt: Date;
}

type ActiveAcademicYearInput = {
  academicYearId?: string;
};

type ActiveAcademicContextInput = {
  academicYearId?: string;
  semesterId?: string;
};

interface ActiveAcademicContextServiceOptions {
  sharedCacheTtlMs?: number;
  now?: () => number;
}

interface SharedActiveAcademicContextCacheEntry {
  generation: number;
  expiresAt: number;
  data: ActiveAcademicContext;
}

const buildContextNotConfiguredError = (): ConflictError =>
  new ConflictError("Academic context not configured", [
    {
      field: "academicContext",
      code: "ACADEMIC_CONTEXT_NOT_CONFIGURED",
      message:
        "An active academic year and active semester must be configured before using this endpoint"
    }
  ]);

const buildActiveYearMismatchError = (
  providedAcademicYearId: string,
  activeAcademicYearId: string
): ValidationError =>
  new ValidationError("Operational requests can only use the active academic year", [
    {
      field: "academicYearId",
      code: "ACTIVE_ACADEMIC_YEAR_ONLY",
      message: `Provided academicYearId ${providedAcademicYearId} does not match the active academic year ${activeAcademicYearId}`
    }
  ]);

const buildActiveSemesterMismatchError = (
  providedSemesterId: string,
  activeSemesterId: string
): ValidationError =>
  new ValidationError("Operational requests can only use the active semester", [
    {
      field: "semesterId",
      code: "ACTIVE_SEMESTER_ONLY",
      message: `Provided semesterId ${providedSemesterId} does not match the active semester ${activeSemesterId}`
    }
  ]);

const cloneDate = (value: Date | string): Date =>
  value instanceof Date ? new Date(value.getTime()) : new Date(value);

const cloneActiveAcademicContext = (
  context: ActiveAcademicContext
): ActiveAcademicContext => ({
  academicYearId: context.academicYearId,
  academicYearName: context.academicYearName,
  academicYearStartDate: cloneDate(context.academicYearStartDate),
  academicYearEndDate: cloneDate(context.academicYearEndDate),
  academicYearCreatedAt: cloneDate(context.academicYearCreatedAt),
  academicYearUpdatedAt: cloneDate(context.academicYearUpdatedAt),
  semesterId: context.semesterId,
  semesterName: context.semesterName,
  semesterStartDate: cloneDate(context.semesterStartDate),
  semesterEndDate: cloneDate(context.semesterEndDate),
  semesterCreatedAt: cloneDate(context.semesterCreatedAt),
  semesterUpdatedAt: cloneDate(context.semesterUpdatedAt)
});

export class ActiveAcademicContextService {
  private static sharedCacheGeneration = 0;

  private readonly sharedCacheTtlMs: number;
  private readonly now: () => number;
  private sharedCache: SharedActiveAcademicContextCacheEntry | null = null;

  constructor(options: ActiveAcademicContextServiceOptions = {}) {
    this.sharedCacheTtlMs = options.sharedCacheTtlMs ?? 5_000;
    this.now = options.now ?? (() => Date.now());
  }

  async getActiveContext(
    queryable: Queryable = db
  ): Promise<ActiveAcademicContext | null> {
    return requestMemoService.memoize(
      `active-academic-context:${requestMemoService.getQueryableMemoKey(queryable)}`,
      async () => {
        const cachedContext = this.getSharedCache(queryable);

        if (cachedContext) {
          return cachedContext;
        }

        const result = await queryable.query<ActiveAcademicContext>(
          `
            SELECT
              academic_year_id AS "academicYearId",
              academic_year_name AS "academicYearName",
              academic_year_start_date AS "academicYearStartDate",
              academic_year_end_date AS "academicYearEndDate",
              academic_year_created_at AS "academicYearCreatedAt",
              academic_year_updated_at AS "academicYearUpdatedAt",
              semester_id AS "semesterId",
              semester_name AS "semesterName",
              semester_start_date AS "semesterStartDate",
              semester_end_date AS "semesterEndDate",
              semester_created_at AS "semesterCreatedAt",
              semester_updated_at AS "semesterUpdatedAt"
            FROM ${databaseViews.activeAcademicContext}
            LIMIT 1
          `
        );

        const activeContext = result.rows[0] ? cloneActiveAcademicContext(result.rows[0]) : null;

        if (queryable === db && activeContext) {
          this.sharedCache = {
            generation: ActiveAcademicContextService.sharedCacheGeneration,
            expiresAt: this.now() + this.sharedCacheTtlMs,
            data: cloneActiveAcademicContext(activeContext)
          };
        }

        return activeContext;
      }
    );
  }

  invalidateSharedCache(): void {
    ActiveAcademicContextService.sharedCacheGeneration += 1;
    this.sharedCache = null;
  }

  async requireActiveContext(
    queryable: Queryable = db
  ): Promise<ActiveAcademicContext> {
    const activeContext = await this.getActiveContext(queryable);

    if (!activeContext) {
      throw buildContextNotConfiguredError();
    }

    return activeContext;
  }

  async resolveActiveAcademicYear(
    input: ActiveAcademicYearInput,
    queryable: Queryable = db
  ): Promise<Pick<ActiveAcademicContext, "academicYearId" | "academicYearName">> {
    const activeContext = await this.requireActiveContext(queryable);

    if (input.academicYearId && input.academicYearId !== activeContext.academicYearId) {
      throw buildActiveYearMismatchError(
        input.academicYearId,
        activeContext.academicYearId
      );
    }

    return {
      academicYearId: activeContext.academicYearId,
      academicYearName: activeContext.academicYearName
    };
  }

  async resolveOperationalContext(
    input: ActiveAcademicContextInput,
    queryable: Queryable = db
  ): Promise<Pick<ActiveAcademicContext, "academicYearId" | "academicYearName" | "semesterId" | "semesterName">> {
    const activeContext = await this.requireActiveContext(queryable);

    if (input.academicYearId && input.academicYearId !== activeContext.academicYearId) {
      throw buildActiveYearMismatchError(
        input.academicYearId,
        activeContext.academicYearId
      );
    }

    if (input.semesterId && input.semesterId !== activeContext.semesterId) {
      throw buildActiveSemesterMismatchError(input.semesterId, activeContext.semesterId);
    }

    return {
      academicYearId: activeContext.academicYearId,
      academicYearName: activeContext.academicYearName,
      semesterId: activeContext.semesterId,
      semesterName: activeContext.semesterName
    };
  }

  private getSharedCache(queryable: Queryable): ActiveAcademicContext | null {
    if (queryable !== db || !this.sharedCache) {
      return null;
    }

    if (
      this.sharedCache.generation !== ActiveAcademicContextService.sharedCacheGeneration ||
      this.sharedCache.expiresAt <= this.now()
    ) {
      this.sharedCache = null;
      return null;
    }

    return cloneActiveAcademicContext(this.sharedCache.data);
  }
}
