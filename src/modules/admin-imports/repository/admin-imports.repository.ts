import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { PaginatedQueryResult } from "../../../common/types/pagination.types";
import {
  buildLimitOffsetClause,
  buildPaginationWindow
} from "../../../common/utils/pagination.util";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  SchoolOnboardingImportRunRow,
  SchoolOnboardingReferenceAcademicYearRow,
  SchoolOnboardingReferenceBusRow,
  SchoolOnboardingReferenceClassRow,
  SchoolOnboardingReferenceGradeLevelRow,
  SchoolOnboardingReferenceRouteAssignmentRow,
  SchoolOnboardingReferenceRouteRow,
  SchoolOnboardingReferenceRouteStopRow,
  SchoolOnboardingReferenceSemesterRow,
  SchoolOnboardingReferenceSnapshot,
  SchoolOnboardingReferenceStudentEnrollmentRow,
  SchoolOnboardingReferenceStudentHomeLocationRow,
  SchoolOnboardingReferenceStudentParentLinkRow,
  SchoolOnboardingReferenceStudentRow,
  SchoolOnboardingReferenceStudentTransportAssignmentRow,
  SchoolOnboardingReferenceSubjectOfferingRow,
  SchoolOnboardingReferenceSubjectRow,
  SchoolOnboardingReferenceSupervisorAssignmentRow,
  SchoolOnboardingReferenceTeacherAssignmentRow,
  SchoolOnboardingReferenceUserRow
} from "../types/admin-imports.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const importRunSelect = `
  SELECT
    ir.id,
    ir.mode,
    ir.status,
    ir.template_version AS "templateVersion",
    ir.file_name AS "fileName",
    ir.file_hash AS "fileHash",
    ir.file_size AS "fileSize",
    ir.submitted_by_user_id AS "submittedByUserId",
    u.full_name AS "submittedByFullName",
    ir.payload_json AS "payloadJson",
    ir.result_json AS "resultJson",
    ir.summary_json AS "summaryJson",
    ir.issues_json AS "issuesJson",
    ir.entity_counts_json AS "entityCountsJson",
    ir.resolved_reference_counts_json AS "resolvedReferenceCountsJson",
    ir.dry_run_source_id AS "dryRunSourceId",
    ir.applied_at AS "appliedAt",
    ir.created_at AS "createdAt",
    ir.updated_at AS "updatedAt"
  FROM ${databaseTables.schoolOnboardingImportRuns} ir
  JOIN ${databaseTables.users} u ON u.id = ir.submitted_by_user_id
`;

export interface CreateSchoolOnboardingImportRunInput {
  mode: SchoolOnboardingImportRunRow["mode"];
  status: SchoolOnboardingImportRunRow["status"];
  templateVersion: string;
  fileName: string;
  fileHash: string;
  fileSize: number | null;
  submittedByUserId: string;
  payloadJson: unknown;
  resultJson: unknown;
  summaryJson: unknown;
  issuesJson: unknown;
  entityCountsJson: unknown;
  resolvedReferenceCountsJson: unknown;
  dryRunSourceId?: string | null;
  appliedAt?: Date | null;
}

export class AdminImportsRepository {
  async createImportRun(
    input: CreateSchoolOnboardingImportRunInput,
    queryable: Queryable = db
  ): Promise<SchoolOnboardingImportRunRow> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.schoolOnboardingImportRuns} (
          mode,
          status,
          template_version,
          file_name,
          file_hash,
          file_size,
          submitted_by_user_id,
          payload_json,
          result_json,
          summary_json,
          issues_json,
          entity_counts_json,
          resolved_reference_counts_json,
          dry_run_source_id,
          applied_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15)
        RETURNING id::text AS id
      `,
      [
        input.mode,
        input.status,
        input.templateVersion,
        input.fileName,
        input.fileHash,
        input.fileSize,
        input.submittedByUserId,
        JSON.stringify(input.payloadJson),
        JSON.stringify(input.resultJson),
        JSON.stringify(input.summaryJson),
        JSON.stringify(input.issuesJson),
        JSON.stringify(input.entityCountsJson),
        JSON.stringify(input.resolvedReferenceCountsJson),
        input.dryRunSourceId ?? null,
        input.appliedAt ?? null
      ]
    );

    const importRunId = result.rows[0]?.id;

    if (!importRunId) {
      throw new Error("Failed to persist school onboarding import run");
    }

    const importRun = await this.findImportRunById(importRunId, queryable);

    if (!importRun) {
      throw new Error("Failed to reload school onboarding import run");
    }

    return importRun;
  }

  async findImportRunById(
    importId: string,
    queryable: Queryable = db
  ): Promise<SchoolOnboardingImportRunRow | null> {
    const result = await queryable.query<SchoolOnboardingImportRunRow>(
      `
        ${importRunSelect}
        WHERE ir.id = $1
        LIMIT 1
      `,
      [importId]
    );

    return mapSingleRow(result.rows);
  }

  async findAppliedImportRunByDryRunSourceId(
    dryRunSourceId: string,
    queryable: Queryable = db
  ): Promise<SchoolOnboardingImportRunRow | null> {
    const result = await queryable.query<SchoolOnboardingImportRunRow>(
      `
        ${importRunSelect}
        WHERE ir.mode = 'apply'
          AND ir.dry_run_source_id = $1
        LIMIT 1
      `,
      [dryRunSourceId]
    );

    return mapSingleRow(result.rows);
  }

  async listImportRuns(
    pagination: { page: number; limit: number },
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<SchoolOnboardingImportRunRow>> {
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseTables.schoolOnboardingImportRuns}
      `
    );
    const { limit, offset } = buildPaginationWindow(pagination.page, pagination.limit);
    const result = await queryable.query<SchoolOnboardingImportRunRow>(
      `
        ${importRunSelect}
        ORDER BY ir.created_at DESC, ir.id DESC
        ${buildLimitOffsetClause(1)}
      `,
      [limit, offset]
    );

    return {
      rows: result.rows,
      totalItems: Number(countResult.rows[0]?.total ?? 0)
    };
  }

  async loadReferenceSnapshot(
    queryable: Queryable = db
  ): Promise<SchoolOnboardingReferenceSnapshot> {
    const [
      academicYears,
      semesters,
      gradeLevels,
      classes,
      subjects,
      users,
      students,
      studentParentLinks,
      studentEnrollments,
      subjectOfferings,
      teacherAssignments,
      supervisorAssignments,
      buses,
      routes,
      routeStops,
      routeAssignments,
      studentTransportAssignments,
      studentHomeLocations
    ] = await Promise.all([
      this.listAcademicYears(queryable),
      this.listSemesters(queryable),
      this.listGradeLevels(queryable),
      this.listClasses(queryable),
      this.listSubjects(queryable),
      this.listRoleUsers(queryable),
      this.listStudents(queryable),
      this.listStudentParentLinks(queryable),
      this.listStudentEnrollments(queryable),
      this.listSubjectOfferings(queryable),
      this.listTeacherAssignments(queryable),
      this.listSupervisorAssignments(queryable),
      this.listBuses(queryable),
      this.listRoutes(queryable),
      this.listRouteStops(queryable),
      this.listRouteAssignments(queryable),
      this.listStudentTransportAssignments(queryable),
      this.listStudentHomeLocations(queryable)
    ]);

    return {
      academicYears,
      semesters,
      gradeLevels,
      classes,
      subjects,
      users,
      students,
      studentParentLinks,
      studentEnrollments,
      subjectOfferings,
      teacherAssignments,
      supervisorAssignments,
      buses,
      routes,
      routeStops,
      routeAssignments,
      studentTransportAssignments,
      studentHomeLocations
    };
  }

  private async listAcademicYears(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceAcademicYearRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceAcademicYearRow>(
      `
        SELECT id::text AS id, name
        FROM ${databaseTables.academicYears}
        ORDER BY start_date DESC, id DESC
      `
    );

    return result.rows;
  }

  private async listSemesters(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceSemesterRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceSemesterRow>(
      `
        SELECT
          s.id::text AS id,
          s.academic_year_id::text AS "academicYearId",
          ay.name AS "academicYearName",
          s.name
        FROM ${databaseTables.semesters} s
        JOIN ${databaseTables.academicYears} ay ON ay.id = s.academic_year_id
        ORDER BY ay.start_date DESC, s.start_date ASC, s.id ASC
      `
    );

    return result.rows;
  }

  private async listGradeLevels(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceGradeLevelRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceGradeLevelRow>(
      `
        SELECT
          id::text AS id,
          name,
          level_order AS "levelOrder"
        FROM ${databaseTables.gradeLevels}
        ORDER BY level_order ASC, id ASC
      `
    );

    return result.rows;
  }

  private async listClasses(queryable: Queryable): Promise<SchoolOnboardingReferenceClassRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceClassRow>(
      `
        SELECT
          c.id::text AS id,
          c.academic_year_id::text AS "academicYearId",
          ay.name AS "academicYearName",
          c.grade_level_id::text AS "gradeLevelId",
          gl.name AS "gradeLevelName",
          c.class_name AS "className",
          c.section
        FROM ${databaseTables.classes} c
        JOIN ${databaseTables.academicYears} ay ON ay.id = c.academic_year_id
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
        ORDER BY ay.start_date DESC, gl.level_order ASC, c.class_name ASC, c.section ASC
      `
    );

    return result.rows;
  }

  private async listSubjects(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceSubjectRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceSubjectRow>(
      `
        SELECT
          s.id::text AS id,
          s.grade_level_id::text AS "gradeLevelId",
          gl.name AS "gradeLevelName",
          s.code,
          s.name
        FROM ${databaseTables.subjects} s
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = s.grade_level_id
        ORDER BY gl.level_order ASC, s.name ASC, s.id ASC
      `
    );

    return result.rows;
  }

  private async listRoleUsers(queryable: Queryable): Promise<SchoolOnboardingReferenceUserRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceUserRow>(
      `
        SELECT
          p.id::text AS "profileId",
          u.id::text AS "userId",
          'parent'::text AS role,
          u.full_name AS "fullName",
          u.email,
          u.phone,
          NULL::text AS "licenseNumber"
        FROM ${databaseTables.parents} p
        JOIN ${databaseTables.users} u ON u.id = p.user_id
        UNION ALL
        SELECT
          t.id::text AS "profileId",
          u.id::text AS "userId",
          'teacher'::text AS role,
          u.full_name AS "fullName",
          u.email,
          u.phone,
          NULL::text AS "licenseNumber"
        FROM ${databaseTables.teachers} t
        JOIN ${databaseTables.users} u ON u.id = t.user_id
        UNION ALL
        SELECT
          s.id::text AS "profileId",
          u.id::text AS "userId",
          'supervisor'::text AS role,
          u.full_name AS "fullName",
          u.email,
          u.phone,
          NULL::text AS "licenseNumber"
        FROM ${databaseTables.supervisors} s
        JOIN ${databaseTables.users} u ON u.id = s.user_id
        UNION ALL
        SELECT
          d.id::text AS "profileId",
          u.id::text AS "userId",
          'driver'::text AS role,
          u.full_name AS "fullName",
          u.email,
          u.phone,
          d.license_number AS "licenseNumber"
        FROM ${databaseTables.drivers} d
        JOIN ${databaseTables.users} u ON u.id = d.user_id
      `
    );

    return result.rows;
  }

  private async listStudents(queryable: Queryable): Promise<SchoolOnboardingReferenceStudentRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceStudentRow>(
      `
        SELECT
          id::text AS id,
          academic_no AS "academicNo",
          full_name AS "fullName",
          class_id::text AS "classId"
        FROM ${databaseTables.students}
        ORDER BY academic_no ASC, id ASC
      `
    );

    return result.rows;
  }

  private async listStudentParentLinks(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceStudentParentLinkRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceStudentParentLinkRow>(
      `
        SELECT
          sp.student_id::text AS "studentId",
          st.academic_no AS "academicNo",
          sp.parent_id::text AS "parentId",
          p.user_id::text AS "parentUserId",
          sp.is_primary AS "isPrimary"
        FROM ${databaseTables.studentParents} sp
        JOIN ${databaseTables.students} st ON st.id = sp.student_id
        JOIN ${databaseTables.parents} p ON p.id = sp.parent_id
        ORDER BY sp.id ASC
      `
    );

    return result.rows;
  }

  private async listStudentEnrollments(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceStudentEnrollmentRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceStudentEnrollmentRow>(
      `
        SELECT
          sae.id::text AS id,
          sae.student_id::text AS "studentId",
          st.academic_no AS "academicNo",
          sae.academic_year_id::text AS "academicYearId",
          ay.name AS "academicYearName",
          sae.class_id::text AS "classId"
        FROM ${databaseTables.studentAcademicEnrollments} sae
        JOIN ${databaseTables.students} st ON st.id = sae.student_id
        JOIN ${databaseTables.academicYears} ay ON ay.id = sae.academic_year_id
        ORDER BY ay.start_date DESC, st.academic_no ASC, sae.id ASC
      `
    );

    return result.rows;
  }

  private async listSubjectOfferings(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceSubjectOfferingRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceSubjectOfferingRow>(
      `
        SELECT
          id::text AS id,
          subject_id::text AS "subjectId",
          semester_id::text AS "semesterId"
        FROM ${databaseTables.subjectOfferings}
        ORDER BY id ASC
      `
    );

    return result.rows;
  }

  private async listTeacherAssignments(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceTeacherAssignmentRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceTeacherAssignmentRow>(
      `
        SELECT
          id::text AS id,
          teacher_id::text AS "teacherId",
          class_id::text AS "classId",
          subject_id::text AS "subjectId",
          academic_year_id::text AS "academicYearId"
        FROM ${databaseTables.teacherClasses}
        ORDER BY id ASC
      `
    );

    return result.rows;
  }

  private async listSupervisorAssignments(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceSupervisorAssignmentRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceSupervisorAssignmentRow>(
      `
        SELECT
          id::text AS id,
          supervisor_id::text AS "supervisorId",
          class_id::text AS "classId",
          academic_year_id::text AS "academicYearId"
        FROM ${databaseTables.supervisorClasses}
        ORDER BY id ASC
      `
    );

    return result.rows;
  }

  private async listBuses(queryable: Queryable): Promise<SchoolOnboardingReferenceBusRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceBusRow>(
      `
        SELECT
          id::text AS id,
          plate_number AS "plateNumber"
        FROM ${databaseTables.buses}
        ORDER BY plate_number ASC, id ASC
      `
    );

    return result.rows;
  }

  private async listRoutes(queryable: Queryable): Promise<SchoolOnboardingReferenceRouteRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceRouteRow>(
      `
        SELECT
          id::text AS id,
          route_name AS "routeName"
        FROM ${databaseTables.routes}
        ORDER BY route_name ASC, id ASC
      `
    );

    return result.rows;
  }

  private async listRouteStops(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceRouteStopRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceRouteStopRow>(
      `
        SELECT
          bs.id::text AS "stopId",
          bs.route_id::text AS "routeId",
          r.route_name AS "routeName",
          bs.stop_order AS "stopOrder"
        FROM ${databaseTables.busStops} bs
        JOIN ${databaseTables.routes} r ON r.id = bs.route_id
        ORDER BY r.route_name ASC, bs.stop_order ASC, bs.id ASC
      `
    );

    return result.rows;
  }

  private async listRouteAssignments(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceRouteAssignmentRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceRouteAssignmentRow>(
      `
        SELECT
          id::text AS "routeAssignmentId",
          bus_id::text AS "busId",
          route_id::text AS "routeId",
          start_date AS "startDate",
          end_date AS "endDate",
          is_active AS "isActive"
        FROM ${databaseTables.transportRouteAssignments}
        ORDER BY id ASC
      `
    );

    return result.rows;
  }

  private async listStudentTransportAssignments(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceStudentTransportAssignmentRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceStudentTransportAssignmentRow>(
      `
        SELECT
          sba.id::text AS "assignmentId",
          sba.student_id::text AS "studentId",
          st.academic_no AS "academicNo",
          sba.route_id::text AS "routeId",
          sba.stop_id::text AS "stopId",
          sba.start_date AS "startDate",
          sba.end_date AS "endDate",
          sba.is_active AS "isActive"
        FROM ${databaseTables.studentBusAssignments} sba
        JOIN ${databaseTables.students} st ON st.id = sba.student_id
        ORDER BY sba.id ASC
      `
    );

    return result.rows;
  }

  private async listStudentHomeLocations(
    queryable: Queryable
  ): Promise<SchoolOnboardingReferenceStudentHomeLocationRow[]> {
    const result = await queryable.query<SchoolOnboardingReferenceStudentHomeLocationRow>(
      `
        SELECT
          shl.student_id::text AS "studentId",
          st.academic_no AS "academicNo"
        FROM ${databaseTables.studentTransportHomeLocations} shl
        JOIN ${databaseTables.students} st ON st.id = shl.student_id
        ORDER BY shl.student_id ASC
      `
    );

    return result.rows;
  }
}
