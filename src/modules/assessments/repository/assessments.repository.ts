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
  AssessmentListQuery,
  AssessmentRow,
  AssessmentScope,
  AssessmentScoreRosterRow,
  AssessmentTypeRow,
  AssessmentTypeWriteInput,
  AssessmentWriteInput,
  ClassReferenceRow,
  SemesterReferenceRow,
  StudentAssessmentRow,
  StudentAssessmentUpdateInput,
  StudentAssessmentWriteInput,
  SubjectReferenceRow,
  TeacherProfileRow
} from "../types/assessments.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const buildAssignments = (updates: Record<string, unknown>, startIndex = 2) => {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  return {
    assignments: entries.map(([column], index) => `${column} = $${index + startIndex}`),
    values: entries.map(([, value]) => value)
  };
};

const assessmentAggregateSelect = `
  SELECT
    sa.assessment_id,
    COUNT(sa.id)::int AS graded_count,
    ROUND(AVG(sa.score), 2) AS average_score,
    ROUND(AVG((sa.score / NULLIF(a.max_score, 0)) * 100), 2) AS average_percentage
  FROM ${databaseTables.studentAssessments} sa
  JOIN ${databaseTables.assessments} a ON a.id = sa.assessment_id
  GROUP BY sa.assessment_id
`;

const assessmentRosterCountsSelect = `
  SELECT
    class_id,
    COUNT(*) FILTER (WHERE student_status = 'active')::int AS expected_count
  FROM ${databaseViews.classStudents}
  GROUP BY class_id
`;

const assessmentReadSelect = `
  SELECT
    a.id,
    at.id AS "assessmentTypeId",
    at.code AS "assessmentTypeCode",
    at.name AS "assessmentTypeName",
    c.id AS "classId",
    c.class_name AS "className",
    c.section,
    gl.id AS "gradeLevelId",
    gl.name AS "gradeLevelName",
    subj.id AS "subjectId",
    subj.name AS "subjectName",
    subj.code AS "subjectCode",
    t.id AS "teacherId",
    tu.id AS "teacherUserId",
    tu.full_name AS "teacherFullName",
    tu.email AS "teacherEmail",
    tu.phone AS "teacherPhone",
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    sem.id AS "semesterId",
    sem.name AS "semesterName",
    a.title,
    a.description,
    a.max_score AS "maxScore",
    a.weight,
    a.assessment_date AS "assessmentDate",
    a.is_published AS "isPublished",
    a.created_at AS "createdAt",
    a.updated_at AS "updatedAt",
    COALESCE(agg.graded_count, 0)::int AS "gradedCount",
    COALESCE(roster.expected_count, 0)::int AS "expectedCount",
    agg.average_score AS "averageScore",
    agg.average_percentage AS "averagePercentage"
  FROM ${databaseTables.assessments} a
  JOIN ${databaseTables.assessmentTypes} at ON at.id = a.assessment_type_id
  JOIN ${databaseTables.classes} c ON c.id = a.class_id
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
  JOIN ${databaseTables.subjects} subj ON subj.id = a.subject_id
  JOIN ${databaseTables.teachers} t ON t.id = a.teacher_id
  JOIN ${databaseTables.users} tu ON tu.id = t.user_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = a.academic_year_id
  JOIN ${databaseTables.semesters} sem ON sem.id = a.semester_id
  LEFT JOIN (${assessmentAggregateSelect}) agg
    ON agg.assessment_id = a.id
  LEFT JOIN (${assessmentRosterCountsSelect}) roster
    ON roster.class_id = a.class_id
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

const assessmentSortColumns = {
  assessmentDate: ["a.assessment_date", "a.created_at"],
  createdAt: "a.created_at",
  title: "a.title"
} as const;

export class AssessmentsRepository {
  async createAssessmentType(
    input: AssessmentTypeWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.assessmentTypes} (
          code,
          name,
          description,
          is_active
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [input.code, input.name, input.description ?? null, input.isActive]
    );

    return result.rows[0].id;
  }

  async listActiveAssessmentTypes(queryable: Queryable = db): Promise<AssessmentTypeRow[]> {
    const result = await queryable.query<AssessmentTypeRow>(
      `
        SELECT
          id,
          code,
          name,
          description,
          is_active AS "isActive"
        FROM ${databaseTables.assessmentTypes}
        WHERE is_active = true
        ORDER BY name ASC, id ASC
      `
    );

    return result.rows;
  }

  async findAssessmentTypeById(
    assessmentTypeId: string,
    queryable: Queryable = db
  ): Promise<AssessmentTypeRow | null> {
    const result = await queryable.query<AssessmentTypeRow>(
      `
        SELECT
          id,
          code,
          name,
          description,
          is_active AS "isActive"
        FROM ${databaseTables.assessmentTypes}
        WHERE id = $1
        LIMIT 1
      `,
      [assessmentTypeId]
    );

    return mapSingleRow(result.rows);
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

  async createAssessment(
    input: AssessmentWriteInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.assessments} (
          assessment_type_id,
          class_id,
          subject_id,
          teacher_id,
          academic_year_id,
          semester_id,
          title,
          description,
          max_score,
          weight,
          assessment_date,
          is_published
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12)
        RETURNING id
      `,
      [
        input.assessmentTypeId,
        input.classId,
        input.subjectId,
        input.teacherId,
        input.academicYearId,
        input.semesterId,
        input.title,
        input.description ?? null,
        input.maxScore,
        input.weight,
        input.assessmentDate,
        input.isPublished
      ]
    );

    return result.rows[0].id;
  }

  async listAssessments(
    filters: AssessmentListQuery,
    scope: AssessmentScope = {},
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<AssessmentRow>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (scope.teacherId) {
      addCondition("a.teacher_id = ?", scope.teacherId);
    }

    if (filters.assessmentTypeId) {
      addCondition("a.assessment_type_id = ?", filters.assessmentTypeId);
    }

    if (filters.classId) {
      addCondition("a.class_id = ?", filters.classId);
    }

    if (filters.subjectId) {
      addCondition("a.subject_id = ?", filters.subjectId);
    }

    if (filters.teacherId) {
      addCondition("a.teacher_id = ?", filters.teacherId);
    }

    if (filters.academicYearId) {
      addCondition("a.academic_year_id = ?", filters.academicYearId);
    }

    if (filters.semesterId) {
      addCondition("a.semester_id = ?", filters.semesterId);
    }

    if (filters.assessmentDate) {
      addCondition("a.assessment_date = ?::date", filters.assessmentDate);
    }

    if (filters.dateFrom) {
      addCondition("a.assessment_date >= ?::date", filters.dateFrom);
    }

    if (filters.dateTo) {
      addCondition("a.assessment_date <= ?::date", filters.dateTo);
    }

    if (filters.isPublished !== undefined) {
      addCondition("a.is_published = ?", filters.isPublished);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await queryable.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${databaseTables.assessments} a
        ${whereClause}
      `,
      values
    );
    const totalItems = Number(countResult.rows[0]?.total ?? 0);
    const pagination = buildPaginationWindow(filters.page, filters.limit);
    const orderByClause = buildOrderByClause(
      assessmentSortColumns,
      filters.sortBy,
      filters.sortOrder,
      ["a.id"]
    );
    const result = await queryable.query<AssessmentRow>(
      `
        ${assessmentReadSelect}
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

  async findAssessmentById(
    assessmentId: string,
    queryable: Queryable = db
  ): Promise<AssessmentRow | null> {
    const result = await queryable.query<AssessmentRow>(
      `
        ${assessmentReadSelect}
        WHERE a.id = $1
        LIMIT 1
      `,
      [assessmentId]
    );

    return mapSingleRow(result.rows);
  }

  async listAssessmentScores(
    assessmentId: string,
    queryable: Queryable = db
  ): Promise<AssessmentScoreRosterRow[]> {
    const result = await queryable.query<AssessmentScoreRosterRow>(
      `
        SELECT
          cs.student_id AS "studentId",
          cs.academic_no AS "academicNo",
          cs.student_name AS "fullName",
          cs.student_status AS "studentStatus",
          sad.student_assessment_id AS "studentAssessmentId",
          sad.score,
          sad.remarks,
          sad.graded_at AS "gradedAt",
          sad.score_percentage AS "percentage"
        FROM ${databaseTables.assessments} a
        JOIN ${databaseViews.classStudents} cs
          ON cs.class_id = a.class_id
        LEFT JOIN ${databaseViews.studentAssessmentDetails} sad
          ON sad.assessment_id = a.id
         AND sad.student_id = cs.student_id
        WHERE a.id = $1
          AND cs.student_status = 'active'
        ORDER BY cs.academic_no ASC, cs.student_id ASC
      `,
      [assessmentId]
    );

    return result.rows;
  }

  async upsertStudentAssessments(
    assessmentId: string,
    records: StudentAssessmentWriteInput[],
    queryable: Queryable = db
  ): Promise<void> {
    for (const record of records) {
      await queryable.query(
        `
          INSERT INTO ${databaseTables.studentAssessments} (
            assessment_id,
            student_id,
            score,
            remarks,
            graded_at
          )
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (assessment_id, student_id)
          DO UPDATE SET
            score = EXCLUDED.score,
            remarks = EXCLUDED.remarks,
            graded_at = NOW()
        `,
        [assessmentId, record.studentId, record.score, record.remarks ?? null]
      );
    }
  }

  async findStudentAssessmentById(
    studentAssessmentId: string,
    queryable: Queryable = db
  ): Promise<StudentAssessmentRow | null> {
    const result = await queryable.query<StudentAssessmentRow>(
      `
        SELECT
          sad.student_assessment_id AS "studentAssessmentId",
          sad.assessment_id AS "assessmentId",
          sad.student_id AS "studentId",
          sad.academic_no AS "academicNo",
          sad.student_name AS "fullName",
          sad.score,
          sad.remarks,
          sad.graded_at AS "gradedAt",
          sad.score_percentage AS "percentage",
          sad.class_id AS "classId",
          a.teacher_id AS "teacherId",
          sad.academic_year_id AS "academicYearId",
          a.max_score AS "maxScore"
        FROM ${databaseViews.studentAssessmentDetails} sad
        JOIN ${databaseTables.assessments} a ON a.id = sad.assessment_id
        WHERE sad.student_assessment_id = $1
        LIMIT 1
      `,
      [studentAssessmentId]
    );

    return mapSingleRow(result.rows);
  }

  async updateStudentAssessment(
    studentAssessmentId: string,
    input: StudentAssessmentUpdateInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      score: input.score,
      remarks: input.remarks
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.studentAssessments}
        SET ${assignments.join(", ")}, graded_at = NOW()
        WHERE id = $1
      `,
      [studentAssessmentId, ...values]
    );
  }
}
