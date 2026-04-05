import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { PaginatedQueryResult } from "../../../common/types/pagination.types";
import {
  buildLimitOffsetClause,
  buildOrderByClause,
  buildPaginationWindow
} from "../../../common/utils/pagination.util";
import { databaseTables, databaseViews } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  AcademicYearReferenceRow,
  AttendanceRecordRow,
  AttendanceRecordUpdateInput,
  AttendanceRecordUpsertRow,
  AttendanceRecordWriteInput,
  AttendanceSessionFilters,
  AttendanceSessionSortField,
  AttendanceSessionRow,
  AttendanceSessionScope,
  AttendanceSessionStudentRow,
  AttendanceSessionWriteInput,
  ClassReferenceRow,
  SemesterReferenceRow,
  SubjectReferenceRow,
  SupervisorProfileRow,
  TeacherProfileRow
} from "../types/attendance.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const buildAssignments = (updates: Record<string, unknown>, startIndex = 2) => {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  return {
    assignments: entries.map(([column], index) => `${column} = $${index + startIndex}`),
    values: entries.map(([, value]) => value)
  };
};

const attendanceCountsLateralSelect = `
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE att.status = 'present')::int AS present_count,
      COUNT(*) FILTER (WHERE att.status = 'absent')::int AS absent_count,
      COUNT(*) FILTER (WHERE att.status = 'late')::int AS late_count,
      COUNT(*) FILTER (WHERE att.status = 'excused')::int AS excused_count,
      COUNT(*)::int AS recorded_count
    FROM ${databaseTables.attendance} att
    WHERE att.attendance_session_id = ats.id
  ) ac ON true
`;

const attendanceRosterCountsLateralSelect = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS expected_count
    FROM ${databaseTables.studentAcademicEnrollments} sae
    JOIN ${databaseTables.students} st ON st.id = sae.student_id
    WHERE sae.class_id = ats.class_id
      AND sae.academic_year_id = ats.academic_year_id
      AND st.status = 'active'
  ) rc ON true
`;

const attendanceSessionReadSelect = `
  SELECT
    ats.id,
    ats.class_id AS "classId",
    c.class_name AS "className",
    c.section,
    gl.id AS "gradeLevelId",
    gl.name AS "gradeLevelName",
    ats.subject_id AS "subjectId",
    subj.name AS "subjectName",
    subj.code AS "subjectCode",
    ats.teacher_id AS "teacherId",
    t.user_id AS "teacherUserId",
    tu.full_name AS "teacherFullName",
    tu.email AS "teacherEmail",
    tu.phone AS "teacherPhone",
    ats.academic_year_id AS "academicYearId",
    ay.name AS "academicYearName",
    ats.semester_id AS "semesterId",
    sem.name AS "semesterName",
    ats.session_date AS "sessionDate",
    ats.period_no AS "periodNo",
    ats.title,
    ats.notes,
    ats.created_at AS "createdAt",
    COALESCE(ac.present_count, 0)::int AS "presentCount",
    COALESCE(ac.absent_count, 0)::int AS "absentCount",
    COALESCE(ac.late_count, 0)::int AS "lateCount",
    COALESCE(ac.excused_count, 0)::int AS "excusedCount",
    COALESCE(ac.recorded_count, 0)::int AS "recordedCount",
    COALESCE(rc.expected_count, 0)::int AS "expectedCount"
  FROM ${databaseTables.attendanceSessions} ats
  JOIN ${databaseTables.classes} c ON c.id = ats.class_id
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
  JOIN ${databaseTables.subjects} subj ON subj.id = ats.subject_id
  JOIN ${databaseTables.teachers} t ON t.id = ats.teacher_id
  JOIN ${databaseTables.users} tu ON tu.id = t.user_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = ats.academic_year_id
  JOIN ${databaseTables.semesters} sem ON sem.id = ats.semester_id
  ${attendanceCountsLateralSelect}
  ${attendanceRosterCountsLateralSelect}
`;

const teacherProfileSelect = `
  SELECT
    t.id AS "teacherId",
    u.id AS "teacherUserId",
    u.full_name AS "teacherFullName",
    u.email AS "teacherEmail",
    u.phone AS "teacherPhone"
  FROM ${databaseTables.teachers} t
  JOIN ${databaseTables.users} u ON u.id = t.user_id
`;

const supervisorProfileSelect = `
  SELECT
    s.id AS "supervisorId",
    u.id AS "supervisorUserId",
    u.full_name AS "supervisorFullName",
    u.email AS "supervisorEmail",
    u.phone AS "supervisorPhone"
  FROM ${databaseTables.supervisors} s
  JOIN ${databaseTables.users} u ON u.id = s.user_id
`;

export class AttendanceRepository {
  private readonly sessionSortColumns: Record<
    AttendanceSessionSortField,
    string | readonly string[]
  > = {
    sessionDate: ["ats.session_date", "ats.period_no"],
    periodNo: ["ats.period_no", "ats.session_date"],
    createdAt: "ats.created_at"
  };

  async findTeacherProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<TeacherProfileRow | null> {
    const result = await queryable.query<TeacherProfileRow>(
      `
        ${teacherProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findTeacherById(
    teacherId: string,
    queryable: Queryable = db
  ): Promise<TeacherProfileRow | null> {
    const result = await queryable.query<TeacherProfileRow>(
      `
        ${teacherProfileSelect}
        WHERE t.id = $1
        LIMIT 1
      `,
      [teacherId]
    );

    return mapSingleRow(result.rows);
  }

  async findSupervisorProfileByUserId(
    userId: string,
    queryable: Queryable = db
  ): Promise<SupervisorProfileRow | null> {
    const result = await queryable.query<SupervisorProfileRow>(
      `
        ${supervisorProfileSelect}
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    return mapSingleRow(result.rows);
  }

  async findClassById(
    classId: string,
    queryable: Queryable = db
  ): Promise<ClassReferenceRow | null> {
    const result = await queryable.query<ClassReferenceRow>(
      `
        SELECT
          c.id,
          c.class_name AS "className",
          c.section,
          gl.id AS "gradeLevelId",
          gl.name AS "gradeLevelName",
          ay.id AS "academicYearId",
          ay.name AS "academicYearName"
        FROM ${databaseTables.classes} c
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
        JOIN ${databaseTables.academicYears} ay ON ay.id = c.academic_year_id
        WHERE c.id = $1
        LIMIT 1
      `,
      [classId]
    );

    return mapSingleRow(result.rows);
  }

  async findSubjectById(
    subjectId: string,
    queryable: Queryable = db
  ): Promise<SubjectReferenceRow | null> {
    const result = await queryable.query<SubjectReferenceRow>(
      `
        SELECT
          s.id,
          s.name,
          s.code,
          gl.id AS "gradeLevelId",
          gl.name AS "gradeLevelName"
        FROM ${databaseTables.subjects} s
        JOIN ${databaseTables.gradeLevels} gl ON gl.id = s.grade_level_id
        WHERE s.id = $1
        LIMIT 1
      `,
      [subjectId]
    );

    return mapSingleRow(result.rows);
  }

  async findAcademicYearById(
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<AcademicYearReferenceRow | null> {
    const result = await queryable.query<AcademicYearReferenceRow>(
      `
        SELECT
          id,
          name
        FROM ${databaseTables.academicYears}
        WHERE id = $1
        LIMIT 1
      `,
      [academicYearId]
    );

    return mapSingleRow(result.rows);
  }

  async findSemesterById(
    semesterId: string,
    queryable: Queryable = db
  ): Promise<SemesterReferenceRow | null> {
    const result = await queryable.query<SemesterReferenceRow>(
      `
        SELECT
          id,
          name,
          academic_year_id AS "academicYearId"
        FROM ${databaseTables.semesters}
        WHERE id = $1
        LIMIT 1
      `,
      [semesterId]
    );

    return mapSingleRow(result.rows);
  }

  async hasTeacherAssignment(
    teacherId: string,
    classId: string,
    subjectId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.teacherClasses}
          WHERE teacher_id = $1
            AND class_id = $2
            AND subject_id = $3
            AND academic_year_id = $4
        ) AS exists
      `,
      [teacherId, classId, subjectId, academicYearId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async hasActiveSubjectOffering(
    subjectId: string,
    semesterId: string,
    queryable: Queryable = db
  ): Promise<boolean> {
    const result = await queryable.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${databaseTables.subjectOfferings}
          WHERE subject_id = $1
            AND semester_id = $2
            AND is_active = true
        ) AS exists
      `,
      [subjectId, semesterId]
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

  async createAttendanceSession(
    input: AttendanceSessionWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.attendanceSessions} (
          class_id,
          subject_id,
          teacher_id,
          academic_year_id,
          semester_id,
          session_date,
          period_no,
          title,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9)
        RETURNING id
      `,
      [
        input.classId,
        input.subjectId,
        input.teacherId,
        input.academicYearId,
        input.semesterId,
        input.sessionDate,
        input.periodNo,
        input.title ?? null,
        input.notes ?? null
      ]
    );

    return result.rows[0].id;
  }

  async listAttendanceSessions(
    filters: AttendanceSessionFilters,
    scope: AttendanceSessionScope = {},
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<AttendanceSessionRow>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (scope.teacherId) {
      addCondition("ats.teacher_id = ?", scope.teacherId);
    }

    if (scope.supervisorId) {
      addCondition(
        `EXISTS (
          SELECT 1
          FROM ${databaseTables.supervisorClasses} sc
          WHERE sc.supervisor_id = ?
            AND sc.class_id = ats.class_id
            AND sc.academic_year_id = ats.academic_year_id
        )`,
        scope.supervisorId
      );
    }

    if (filters.classId) {
      addCondition("ats.class_id = ?", filters.classId);
    }

    if (filters.subjectId) {
      addCondition("ats.subject_id = ?", filters.subjectId);
    }

    if (filters.teacherId) {
      addCondition("ats.teacher_id = ?", filters.teacherId);
    }

    if (filters.academicYearId) {
      addCondition("ats.academic_year_id = ?", filters.academicYearId);
    }

    if (filters.semesterId) {
      addCondition("ats.semester_id = ?", filters.semesterId);
    }

    if (filters.sessionDate) {
      addCondition("ats.session_date = ?::date", filters.sessionDate);
    }

    if (filters.dateFrom) {
      addCondition("ats.session_date >= ?::date", filters.dateFrom);
    }

    if (filters.dateTo) {
      addCondition("ats.session_date <= ?::date", filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await queryable.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM ${databaseTables.attendanceSessions} ats
        ${whereClause}
      `,
      values
    );
    const { limit, offset } = buildPaginationWindow(filters.page, filters.limit);
    const result = await queryable.query<AttendanceSessionRow>(
      `
        ${attendanceSessionReadSelect}
        ${whereClause}
        ORDER BY ${buildOrderByClause(
          this.sessionSortColumns,
          filters.sortBy,
          filters.sortOrder,
          ["ats.id"]
        )}
        ${buildLimitOffsetClause(values.length + 1)}
      `,
      [...values, limit, offset]
    );

    return {
      rows: result.rows,
      totalItems: Number(countResult.rows[0]?.count ?? 0)
    };
  }

  async findAttendanceSessionById(
    sessionId: string,
    queryable: Queryable = db
  ): Promise<AttendanceSessionRow | null> {
    const result = await queryable.query<AttendanceSessionRow>(
      `
        ${attendanceSessionReadSelect}
        WHERE ats.id = $1
        LIMIT 1
      `,
      [sessionId]
    );

    return mapSingleRow(result.rows);
  }

  async listAttendanceSessionStudents(
    sessionId: string,
    queryable: Queryable = db
  ): Promise<AttendanceSessionStudentRow[]> {
    const result = await queryable.query<AttendanceSessionStudentRow>(
      `
        SELECT
          st.id AS "studentId",
          st.academic_no AS "academicNo",
          st.full_name AS "fullName",
          st.status AS "studentStatus",
          att.id AS "attendanceId",
          att.status AS "attendanceStatus",
          att.notes,
          att.recorded_at AS "recordedAt"
        FROM ${databaseTables.attendanceSessions} ats
        JOIN ${databaseTables.studentAcademicEnrollments} sae
          ON sae.class_id = ats.class_id
         AND sae.academic_year_id = ats.academic_year_id
        JOIN ${databaseTables.students} st
          ON st.id = sae.student_id
        LEFT JOIN ${databaseTables.attendance} att
          ON att.attendance_session_id = ats.id
         AND att.student_id = st.id
        WHERE ats.id = $1
          AND st.status = 'active'
        ORDER BY st.academic_no ASC, st.id ASC
      `,
      [sessionId]
    );

    return result.rows;
  }

  async upsertAttendanceRecords(
    sessionId: string,
    records: AttendanceRecordWriteInput[],
    queryable: Queryable = db
  ): Promise<AttendanceRecordUpsertRow[]> {
    if (records.length === 0) {
      return [];
    }

    const serializedRecords = JSON.stringify(
      records.map((record) => ({
        student_id: record.studentId,
        status: record.status,
        notes: record.notes ?? null
      }))
    );

    const result = await queryable.query<AttendanceRecordUpsertRow>(
      `
        INSERT INTO ${databaseTables.attendance} (
          attendance_session_id,
          student_id,
          status,
          notes
        )
        SELECT
          $1::bigint,
          input.student_id,
          input.status,
          input.notes
        FROM jsonb_to_recordset($2::jsonb) AS input(
          student_id bigint,
          status text,
          notes text
        )
        ON CONFLICT (attendance_session_id, student_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          recorded_at = NOW()
        RETURNING
          id AS "attendanceId",
          student_id AS "studentId",
          status,
          notes,
          recorded_at AS "recordedAt"
      `,
      [sessionId, serializedRecords]
    );

    return result.rows;
  }

  async findAttendanceRecordById(
    attendanceId: string,
    queryable: Queryable = db
  ): Promise<AttendanceRecordRow | null> {
    const result = await queryable.query<AttendanceRecordRow>(
      `
        SELECT
          attendance_id AS "attendanceId",
          attendance_session_id AS "attendanceSessionId",
          student_id AS "studentId",
          academic_no AS "academicNo",
          student_name AS "fullName",
          status,
          notes,
          recorded_at AS "recordedAt",
          class_id AS "classId",
          teacher_id AS "teacherId",
          academic_year_id AS "academicYearId",
          session_date AS "sessionDate",
          subject_id AS "subjectId",
          subject_name AS "subjectName"
        FROM ${databaseViews.attendanceDetails}
        WHERE attendance_id = $1
        LIMIT 1
      `,
      [attendanceId]
    );

    return mapSingleRow(result.rows);
  }

  async updateAttendanceRecord(
    attendanceId: string,
    input: AttendanceRecordUpdateInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      status: input.status,
      notes: input.notes
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.attendance}
        SET ${assignments.join(", ")}, recorded_at = NOW()
        WHERE id = $1
      `,
      [attendanceId, ...values]
    );
  }
}
