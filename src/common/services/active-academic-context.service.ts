import { ConflictError } from "../errors/conflict-error";
import { ValidationError } from "../errors/validation-error";
import type { Queryable } from "../interfaces/queryable.interface";
import { databaseViews } from "../../config/database";
import { db } from "../../database/db";

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

export class ActiveAcademicContextService {
  async getActiveContext(
    queryable: Queryable = db
  ): Promise<ActiveAcademicContext | null> {
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

    return result.rows[0] ?? null;
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
}
