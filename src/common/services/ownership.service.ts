import { ForbiddenError } from "../errors/forbidden-error";
import type { Queryable } from "../interfaces/queryable.interface";
import { databaseTables } from "../../config/database";
import { db } from "../../database/db";

const buildForbiddenError = (message: string): ForbiddenError => new ForbiddenError(message);

export class OwnershipService {
  async hasTeacherAssignment(
    teacherId: string,
    classId: string,
    academicYearId: string,
    subjectId?: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const values: unknown[] = [teacherId, classId, academicYearId];
    const subjectClause =
      subjectId !== undefined
        ? (() => {
            values.push(subjectId);
            return `AND subject_id = $${values.length}`;
          })()
        : "";

    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.teacherClasses}
          WHERE teacher_id = $1
            AND class_id = $2
            AND academic_year_id = $3
            ${subjectClause}
        ) AS exists
      `,
      values
    );

    return Boolean(result.rows[0]?.exists);
  }

  async hasSupervisorAssignment(
    supervisorId: string,
    classId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.supervisorClasses}
          WHERE supervisor_id = $1
            AND class_id = $2
            AND academic_year_id = $3
        ) AS exists
      `,
      [supervisorId, classId, academicYearId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async hasParentStudentOwnership(
    parentId: string,
    studentId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.studentParents}
          WHERE parent_id = $1
            AND student_id = $2
        ) AS exists
      `,
      [parentId, studentId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async hasDriverBusOwnership(
    driverId: string,
    busId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.buses}
          WHERE id = $1
            AND driver_id = $2
        ) AS exists
      `,
      [busId, driverId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async hasDriverTripOwnership(
    driverId: string,
    tripId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.trips} tr
          JOIN ${databaseTables.buses} b ON b.id = tr.bus_id
          WHERE tr.id = $1
            AND b.driver_id = $2
        ) AS exists
      `,
      [tripId, driverId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async assertTeacherAssignedToClassYear(
    teacherId: string,
    classId: string,
    academicYearId: string,
    subjectId?: string,
    queryable: Queryable = db
  ): Promise<void> {
    const hasAssignment = await this.hasTeacherAssignment(
      teacherId,
      classId,
      academicYearId,
      subjectId,
      queryable
    );

    if (!hasAssignment) {
      throw buildForbiddenError(
        "You do not have permission to access this teacher-assigned resource"
      );
    }
  }

  async assertSupervisorAssignedToClassYear(
    supervisorId: string,
    classId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<void> {
    const hasAssignment = await this.hasSupervisorAssignment(
      supervisorId,
      classId,
      academicYearId,
      queryable
    );

    if (!hasAssignment) {
      throw buildForbiddenError(
        "You do not have permission to access this supervisor-assigned resource"
      );
    }
  }

  async assertParentOwnsStudent(
    parentId: string,
    studentId: string,
    queryable: Queryable = db
  ): Promise<void> {
    const hasOwnership = await this.hasParentStudentOwnership(parentId, studentId, queryable);

    if (!hasOwnership) {
      throw buildForbiddenError("You do not have permission to access this student");
    }
  }

  async assertDriverOwnsBus(
    driverId: string,
    busId: string,
    queryable: Queryable = db
  ): Promise<void> {
    const hasOwnership = await this.hasDriverBusOwnership(driverId, busId, queryable);

    if (!hasOwnership) {
      throw buildForbiddenError("You do not have permission to access this bus");
    }
  }

  async assertDriverOwnsTrip(
    driverId: string,
    tripId: string,
    queryable: Queryable = db
  ): Promise<void> {
    const hasOwnership = await this.hasDriverTripOwnership(driverId, tripId, queryable);

    if (!hasOwnership) {
      throw buildForbiddenError("You do not have permission to access this trip");
    }
  }
}
