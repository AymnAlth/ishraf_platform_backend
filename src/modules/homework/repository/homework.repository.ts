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
  ClassReferenceRow,
  HomeworkListQuery,
  HomeworkRow,
  HomeworkScope,
  HomeworkSubmissionRosterRow,
  HomeworkSubmissionWriteInput,
  HomeworkWriteInput,
  SemesterReferenceRow,
  StudentHomeworkRow,
  StudentHomeworkScope,
  StudentReferenceRow,
  SubjectReferenceRow,
  TeacherReferenceRow
} from "../types/homework.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const submissionSummarySelect = `
  SELECT
    hs.homework_id,
    COUNT(*) FILTER (WHERE hs.status = 'submitted')::int AS "submittedCount",
    COUNT(*) FILTER (WHERE hs.status = 'not_submitted')::int AS "notSubmittedCount",
    COUNT(*) FILTER (WHERE hs.status = 'late')::int AS "lateCount",
    COUNT(*)::int AS "recordedCount"
  FROM ${databaseTables.homeworkSubmissions} hs
  GROUP BY hs.homework_id
`;

const rosterCountsSelect = `
  SELECT
    class_id,
    COUNT(*) FILTER (WHERE student_status = 'active')::int AS "expectedCount"
  FROM ${databaseViews.classStudents}
  GROUP BY class_id
`;

const homeworkReadSelect = `
  SELECT
    hd.homework_id AS id,
    hd.title,
    hd.description,
    hd.assigned_date AS "assignedDate",
    hd.due_date AS "dueDate",
    hd.class_id AS "classId",
    hd.class_name AS "className",
    hd.section,
    c.grade_level_id AS "gradeLevelId",
    gl.name AS "gradeLevelName",
    hd.subject_id AS "subjectId",
    hd.subject_name AS "subjectName",
    hd.teacher_id AS "teacherId",
    t.user_id AS "teacherUserId",
    hd.teacher_name AS "teacherFullName",
    tu.email AS "teacherEmail",
    tu.phone AS "teacherPhone",
    hd.academic_year_id AS "academicYearId",
    hd.academic_year_name AS "academicYearName",
    hd.semester_id AS "semesterId",
    hd.semester_name AS "semesterName",
    h.created_at AS "createdAt",
    h.updated_at AS "updatedAt",
    COALESCE(ss."submittedCount", 0)::int AS "submittedCount",
    COALESCE(ss."notSubmittedCount", 0)::int AS "notSubmittedCount",
    COALESCE(ss."lateCount", 0)::int AS "lateCount",
    COALESCE(ss."recordedCount", 0)::int AS "recordedCount",
    COALESCE(rc."expectedCount", 0)::int AS "expectedCount"
  FROM ${databaseViews.homeworkDetails} hd
  JOIN ${databaseTables.homework} h ON h.id = hd.homework_id
  JOIN ${databaseTables.classes} c ON c.id = hd.class_id
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
  JOIN ${databaseTables.teachers} t ON t.id = hd.teacher_id
  JOIN ${databaseTables.users} tu ON tu.id = t.user_id
  LEFT JOIN (${submissionSummarySelect}) ss ON ss.homework_id = hd.homework_id
  LEFT JOIN (${rosterCountsSelect}) rc ON rc.class_id = hd.class_id
`;

const studentHomeworkSelect = `
  SELECT
    h.id AS "homeworkId",
    h.title,
    h.description,
    h.assigned_date AS "assignedDate",
    h.due_date AS "dueDate",
    c.id AS "classId",
    c.class_name AS "className",
    c.section,
    subj.id AS "subjectId",
    subj.name AS "subjectName",
    t.id AS "teacherId",
    tu.full_name AS "teacherName",
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    sem.id AS "semesterId",
    sem.name AS "semesterName",
    hs.id AS "submissionId",
    hs.status,
    hs.submitted_at AS "submittedAt",
    hs.notes
  FROM ${databaseTables.homework} h
  JOIN ${databaseTables.classes} c ON c.id = h.class_id
  JOIN ${databaseTables.subjects} subj ON subj.id = h.subject_id
  JOIN ${databaseTables.teachers} t ON t.id = h.teacher_id
  JOIN ${databaseTables.users} tu ON tu.id = t.user_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = h.academic_year_id
  JOIN ${databaseTables.semesters} sem ON sem.id = h.semester_id
  LEFT JOIN ${databaseTables.homeworkSubmissions} hs
    ON hs.homework_id = h.id
   AND hs.student_id = $1
`;

const homeworkSortColumns = {
  dueDate: ["h.due_date", "h.created_at"],
  assignedDate: ["h.assigned_date", "h.created_at"],
  createdAt: "h.created_at",
  title: "h.title"
} as const;

export class HomeworkRepository {
  async findTeacherById(
    teacherId: string,
    queryable: Queryable = db
  ): Promise<TeacherReferenceRow | null> {
    const result = await queryable.query<TeacherReferenceRow>(
      `
        SELECT
          t.id AS "teacherId",
          u.id AS "teacherUserId",
          u.full_name AS "teacherFullName",
          u.email AS "teacherEmail",
          u.phone AS "teacherPhone"
        FROM ${databaseTables.teachers} t
        JOIN ${databaseTables.users} u ON u.id = t.user_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [teacherId]
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

  async createHomework(
    input: HomeworkWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.homework} (
          teacher_id,
          class_id,
          subject_id,
          academic_year_id,
          semester_id,
          title,
          description,
          assigned_date,
          due_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::date)
        RETURNING id
      `,
      [
        input.teacherId,
        input.classId,
        input.subjectId,
        input.academicYearId,
        input.semesterId,
        input.title,
        input.description ?? null,
        input.assignedDate,
        input.dueDate
      ]
    );

    return result.rows[0].id;
  }

  async listHomework(
    filters: HomeworkListQuery,
    scope: HomeworkScope = {},
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<HomeworkRow>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (scope.teacherId) {
      addCondition("h.teacher_id = ?", scope.teacherId);
    }

    if (filters.classId) addCondition("h.class_id = ?", filters.classId);
    if (filters.subjectId) addCondition("h.subject_id = ?", filters.subjectId);
    if (filters.teacherId) addCondition("h.teacher_id = ?", filters.teacherId);
    if (filters.academicYearId) addCondition("h.academic_year_id = ?", filters.academicYearId);
    if (filters.semesterId) addCondition("h.semester_id = ?", filters.semesterId);
    if (filters.assignedDate) addCondition("h.assigned_date = ?::date", filters.assignedDate);
    if (filters.dueDate) addCondition("h.due_date = ?::date", filters.dueDate);
    if (filters.dateFrom) addCondition("h.due_date >= ?::date", filters.dateFrom);
    if (filters.dateTo) addCondition("h.due_date <= ?::date", filters.dateTo);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseTables.homework} h
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const orderByClause = buildOrderByClause(
      homeworkSortColumns,
      filters.sortBy,
      filters.sortOrder,
      ["h.id"]
    );
    const result = await queryable.query<HomeworkRow>(
      `
        ${homeworkReadSelect}
        ${whereClause}
        ORDER BY ${orderByClause}
        ${buildLimitOffsetClause(values.length + 1)}
      `,
      [...values, filters.limit, pagination.offset]
    );

    return {
      rows: result.rows,
      totalItems
    };
  }

  async findHomeworkById(
    homeworkId: string,
    queryable: Queryable = db
  ): Promise<HomeworkRow | null> {
    const result = await queryable.query<HomeworkRow>(
      `
        ${homeworkReadSelect}
        WHERE h.id = $1
        LIMIT 1
      `,
      [homeworkId]
    );

    return mapSingleRow(result.rows);
  }

  async listHomeworkRoster(
    homeworkId: string,
    queryable: Queryable = db
  ): Promise<HomeworkSubmissionRosterRow[]> {
    const result = await queryable.query<HomeworkSubmissionRosterRow>(
      `
        SELECT
          cs.student_id AS "studentId",
          cs.academic_no AS "academicNo",
          cs.student_name AS "fullName",
          cs.student_status AS "studentStatus",
          hs.id AS "submissionId",
          hs.status,
          hs.submitted_at AS "submittedAt",
          hs.notes
        FROM ${databaseTables.homework} h
        JOIN ${databaseViews.classStudents} cs ON cs.class_id = h.class_id
        LEFT JOIN ${databaseTables.homeworkSubmissions} hs
          ON hs.homework_id = h.id
         AND hs.student_id = cs.student_id
        WHERE h.id = $1
          AND cs.student_status = 'active'
        ORDER BY cs.academic_no ASC, cs.student_id ASC
      `,
      [homeworkId]
    );

    return result.rows;
  }

  async upsertHomeworkSubmissions(
    homeworkId: string,
    records: HomeworkSubmissionWriteInput[],
    queryable: Queryable = db
  ): Promise<void> {
    for (const record of records) {
      await queryable.query(
        `
          INSERT INTO ${databaseTables.homeworkSubmissions} (
            homework_id,
            student_id,
            status,
            submitted_at,
            notes
          )
          VALUES (
            $1,
            $2,
            $3::varchar(30),
            CASE
              WHEN $5::timestamptz IS NOT NULL THEN $5::timestamptz
              WHEN $3::varchar(30) IN ('submitted', 'late') THEN NOW()
              ELSE NULL
            END,
            $4::text
          )
          ON CONFLICT (homework_id, student_id)
          DO UPDATE SET
            status = EXCLUDED.status,
            submitted_at = CASE
              WHEN $5::timestamptz IS NOT NULL THEN $5::timestamptz
              WHEN EXCLUDED.status IN ('submitted', 'late') THEN NOW()
              ELSE NULL
            END,
            notes = EXCLUDED.notes
        `,
        [
          homeworkId,
          record.studentId,
          record.status,
          record.notes ?? null,
          record.submittedAt ?? null
        ]
      );
    }
  }

  async findStudentById(
    studentId: string,
    queryable: Queryable = db
  ): Promise<StudentReferenceRow | null> {
    const result = await queryable.query<StudentReferenceRow>(
      `
        SELECT
          sp.student_id AS "studentId",
          sp.academic_no AS "academicNo",
          sp.student_name AS "fullName",
          sp.class_id AS "classId",
          sp.class_name AS "className",
          sp.section,
          sp.academic_year_id AS "academicYearId",
          sp.academic_year_name AS "academicYearName"
        FROM ${databaseViews.studentProfiles} sp
        WHERE sp.student_id = $1
        LIMIT 1
      `,
      [studentId]
    );

    return mapSingleRow(result.rows);
  }

  async listStudentHomework(
    student: StudentReferenceRow,
    scope: StudentHomeworkScope = {},
    queryable: Queryable = db
  ): Promise<StudentHomeworkRow[]> {
    const values: unknown[] = [student.studentId, student.classId, student.academicYearId];
    const semesterClause =
      scope.semesterId !== undefined
        ? (() => {
            values.push(scope.semesterId);
            return `AND h.semester_id = $${values.length}`;
          })()
        : "";
    const teacherClause =
      scope.teacherId !== undefined
        ? (() => {
            values.push(scope.teacherId);
            return `AND h.teacher_id = $${values.length}`;
          })()
        : "";

    const result = await queryable.query<StudentHomeworkRow>(
      `
        ${studentHomeworkSelect}
        WHERE h.class_id = $2
          AND h.academic_year_id = $3
          ${semesterClause}
          ${teacherClause}
        ORDER BY h.due_date DESC, h.id DESC
      `,
      values
    );

    return result.rows;
  }
}






