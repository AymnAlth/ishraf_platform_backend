import type { QueryResultRow } from "pg";

import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { PaginatedQueryResult } from "../../../common/types/pagination.types";
import {
  buildLimitOffsetClause,
  buildOrderByClause,
  buildPaginationWindow
} from "../../../common/utils/pagination.util";
import { databaseTables } from "../../../config/database";
import { db } from "../../../database/db";
import type {
  AcademicYearReferenceRow,
  BehaviorCategoryRow,
  BehaviorRecordListQuery,
  BehaviorCategoryWriteInput,
  BehaviorRecordRow,
  BehaviorRecordScope,
  BehaviorRecordUpdateInput,
  BehaviorRecordWriteInput,
  BehaviorStudentSummaryRow,
  SemesterReferenceRow,
  StudentBehaviorReferenceRow,
  SupervisorProfileRow,
  TeacherProfileRow
} from "../types/behavior.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const buildAssignments = (updates: Record<string, unknown>, startIndex = 2) => {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  return {
    assignments: entries.map(([column], index) => `${column} = $${index + startIndex}`),
    values: entries.map(([, value]) => value)
  };
};

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

const studentReferenceSelect = `
  SELECT
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "fullName",
    c.id AS "classId",
    c.class_name AS "className",
    c.section,
    ay.id AS "academicYearId",
    ay.name AS "academicYearName"
  FROM ${databaseTables.students} st
  JOIN ${databaseTables.classes} c ON c.id = st.class_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = c.academic_year_id
`;

const behaviorRecordReadSelect = `
  SELECT
    br.id AS id,
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "studentFullName",
    bc.id AS "behaviorCategoryId",
    bc.code AS "behaviorCode",
    bc.name AS "behaviorName",
    bc.behavior_type AS "behaviorType",
    br.severity,
    br.description,
    br.behavior_date AS "behaviorDate",
    br.teacher_id AS "teacherId",
    tu.full_name AS "teacherFullName",
    br.supervisor_id AS "supervisorId",
    su.full_name AS "supervisorFullName",
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    sem.id AS "semesterId",
    sem.name AS "semesterName",
    br.created_at AS "createdAt"
  FROM ${databaseTables.behaviorRecords} br
  JOIN ${databaseTables.students} st ON st.id = br.student_id
  JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
  LEFT JOIN ${databaseTables.teachers} t ON t.id = br.teacher_id
  LEFT JOIN ${databaseTables.users} tu ON tu.id = t.user_id
  LEFT JOIN ${databaseTables.supervisors} sp ON sp.id = br.supervisor_id
  LEFT JOIN ${databaseTables.users} su ON su.id = sp.user_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = br.academic_year_id
  JOIN ${databaseTables.semesters} sem ON sem.id = br.semester_id
`;

const behaviorSortColumns = {
  behaviorDate: ["br.behavior_date", "br.created_at"],
  createdAt: "br.created_at",
  severity: ["br.severity", "br.behavior_date"]
} as const;

export class BehaviorRepository {
  async createBehaviorCategory(
    input: BehaviorCategoryWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.behaviorCategories} (
          code,
          name,
          behavior_type,
          default_severity,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [input.code, input.name, input.behaviorType, input.defaultSeverity, input.isActive]
    );

    return result.rows[0].id;
  }

  async findBehaviorCategoryById(
    categoryId: string,
    queryable: Queryable = db
  ): Promise<BehaviorCategoryRow | null> {
    const result = await queryable.query<BehaviorCategoryRow>(
      `
        SELECT
          id,
          code,
          name,
          behavior_type AS "behaviorType",
          default_severity AS "defaultSeverity",
          is_active AS "isActive"
        FROM ${databaseTables.behaviorCategories}
        WHERE id = $1
        LIMIT 1
      `,
      [categoryId]
    );

    return mapSingleRow(result.rows);
  }

  async listActiveBehaviorCategories(
    queryable: Queryable = db
  ): Promise<BehaviorCategoryRow[]> {
    const result = await queryable.query<BehaviorCategoryRow>(
      `
        SELECT
          id,
          code,
          name,
          behavior_type AS "behaviorType",
          default_severity AS "defaultSeverity",
          is_active AS "isActive"
        FROM ${databaseTables.behaviorCategories}
        WHERE is_active = true
        ORDER BY name ASC, id ASC
      `
    );

    return result.rows;
  }

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

  async findSupervisorById(
    supervisorId: string,
    queryable: Queryable = db
  ): Promise<SupervisorProfileRow | null> {
    const result = await queryable.query<SupervisorProfileRow>(
      `
        ${supervisorProfileSelect}
        WHERE s.id = $1
        LIMIT 1
      `,
      [supervisorId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentBehaviorReferenceById(
    studentId: string,
    queryable: Queryable = db
  ): Promise<StudentBehaviorReferenceRow | null> {
    const result = await queryable.query<StudentBehaviorReferenceRow>(
      `
        ${studentReferenceSelect}
        WHERE st.id = $1
        LIMIT 1
      `,
      [studentId]
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

  async hasTeacherBehaviorAssignment(
    teacherId: string,
    classId: string,
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
            AND academic_year_id = $3
        ) AS exists
      `,
      [teacherId, classId, academicYearId]
    );

    return Boolean(result.rows[0]?.exists);
  }

  async hasSupervisorBehaviorAssignment(
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

  async createBehaviorRecord(
    input: BehaviorRecordWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.behaviorRecords} (
          student_id,
          behavior_category_id,
          teacher_id,
          supervisor_id,
          academic_year_id,
          semester_id,
          description,
          severity,
          behavior_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date)
        RETURNING id
      `,
      [
        input.studentId,
        input.behaviorCategoryId,
        input.teacherId ?? null,
        input.supervisorId ?? null,
        input.academicYearId,
        input.semesterId,
        input.description ?? null,
        input.severity,
        input.behaviorDate
      ]
    );

    return result.rows[0].id;
  }

  async listBehaviorRecords(
    filters: BehaviorRecordListQuery,
    scope: BehaviorRecordScope = {},
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<BehaviorRecordRow>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (scope.teacherId) {
      addCondition("br.teacher_id = ?", scope.teacherId);
    }

    if (scope.supervisorId) {
      addCondition("br.supervisor_id = ?", scope.supervisorId);
    }

    if (filters.studentId) {
      addCondition("br.student_id = ?", filters.studentId);
    }

    if (filters.behaviorCategoryId) {
      addCondition("br.behavior_category_id = ?", filters.behaviorCategoryId);
    }

    if (filters.behaviorType) {
      addCondition("bc.behavior_type = ?", filters.behaviorType);
    }

    if (filters.academicYearId) {
      addCondition("br.academic_year_id = ?", filters.academicYearId);
    }

    if (filters.semesterId) {
      addCondition("br.semester_id = ?", filters.semesterId);
    }

    if (filters.teacherId) {
      addCondition("br.teacher_id = ?", filters.teacherId);
    }

    if (filters.supervisorId) {
      addCondition("br.supervisor_id = ?", filters.supervisorId);
    }

    if (filters.behaviorDate) {
      addCondition("br.behavior_date = ?::date", filters.behaviorDate);
    }

    if (filters.dateFrom) {
      addCondition("br.behavior_date >= ?::date", filters.dateFrom);
    }

    if (filters.dateTo) {
      addCondition("br.behavior_date <= ?::date", filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseTables.behaviorRecords} br
        JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const orderByClause = buildOrderByClause(
      behaviorSortColumns,
      filters.sortBy,
      filters.sortOrder,
      ["br.id"]
    );
    const result = await queryable.query<BehaviorRecordRow>(
      `
        ${behaviorRecordReadSelect}
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

  async findBehaviorRecordById(
    behaviorRecordId: string,
    queryable: Queryable = db
  ): Promise<BehaviorRecordRow | null> {
    const result = await queryable.query<BehaviorRecordRow>(
      `
        ${behaviorRecordReadSelect}
        WHERE br.id = $1
        LIMIT 1
      `,
      [behaviorRecordId]
    );

    return mapSingleRow(result.rows);
  }

  async updateBehaviorRecord(
    behaviorRecordId: string,
    input: BehaviorRecordUpdateInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      behavior_category_id: input.behaviorCategoryId,
      academic_year_id: input.academicYearId,
      semester_id: input.semesterId,
      description: input.description,
      severity: input.severity,
      behavior_date: input.behaviorDate
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.behaviorRecords}
        SET ${assignments.join(", ")}
        WHERE id = $1
      `,
      [behaviorRecordId, ...values]
    );
  }

  async findStudentBehaviorSummary(
    studentId: string,
    queryable: Queryable = db
  ): Promise<BehaviorStudentSummaryRow | null> {
    const result = await queryable.query<BehaviorStudentSummaryRow>(
      `
        SELECT
          COALESCE(SUM(total_behavior_records), 0)::int AS "totalBehaviorRecords",
          COALESCE(SUM(positive_count), 0)::int AS "positiveCount",
          COALESCE(SUM(negative_count), 0)::int AS "negativeCount",
          COALESCE(SUM(negative_severity_total), 0)::int AS "negativeSeverityTotal"
        FROM (
          SELECT
            COUNT(br.id)::int AS total_behavior_records,
            COUNT(*) FILTER (WHERE bc.behavior_type = 'positive')::int AS positive_count,
            COUNT(*) FILTER (WHERE bc.behavior_type = 'negative')::int AS negative_count,
            COALESCE(
              SUM(br.severity) FILTER (WHERE bc.behavior_type = 'negative'),
              0
            )::int AS negative_severity_total
          FROM ${databaseTables.behaviorRecords} br
          JOIN ${databaseTables.behaviorCategories} bc ON bc.id = br.behavior_category_id
          WHERE br.student_id = $1
        ) summary
      `,
      [studentId]
    );

    return mapSingleRow(result.rows);
  }
}
