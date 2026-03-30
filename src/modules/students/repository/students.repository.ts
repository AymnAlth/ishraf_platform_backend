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
  CreateStudentAcademicEnrollmentInput,
  CreateStudentParentLinkInput,
  CreateStudentPromotionInput,
  CreateStudentRowInput,
  ParentReferenceRow,
  StudentAcademicEnrollmentListQuery,
  StudentAcademicEnrollmentRow,
  StudentListQuery,
  StudentListSortField,
  StudentParentLinkRow,
  StudentPromotionRow,
  StudentReadRow,
  UpdateStudentAcademicEnrollmentInput,
  UpdateStudentRowInput
} from "../types/students.types";

const mapSingleRow = <T extends QueryResultRow>(rows: T[]): T | null => rows[0] ?? null;

const buildAssignments = (updates: Record<string, unknown>, startIndex = 2) => {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  return {
    assignments: entries.map(([column], index) => `${column} = $${index + startIndex}`),
    values: entries.map(([, value]) => value)
  };
};

const studentReadSelect = `
  SELECT
    st.id,
    sp.academic_no AS "academicNo",
    st.full_name AS "fullName",
    st.date_of_birth AS "dateOfBirth",
    st.gender,
    st.status,
    st.enrollment_date AS "enrollmentDate",
    st.created_at AS "createdAt",
    st.updated_at AS "updatedAt",
    sp.class_id AS "classId",
    sp.class_name AS "className",
    sp.section,
    sp.grade_level_id AS "gradeLevelId",
    sp.grade_level_name AS "gradeLevelName",
    sp.academic_year_id AS "academicYearId",
    sp.academic_year_name AS "academicYearName",
    pp.parent_id AS "primaryParentId",
    pp.parent_name AS "primaryParentName",
    pp.parent_email AS "primaryParentEmail",
    pp.parent_phone AS "primaryParentPhone",
    pp.relation_type AS "primaryParentRelationType"
  FROM ${databaseTables.students} st
  JOIN ${databaseViews.studentProfiles} sp ON sp.student_id = st.id
  LEFT JOIN ${databaseViews.studentPrimaryParent} pp ON pp.student_id = st.id
`;

const classReferenceSelect = `
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
`;

const parentReferenceSelect = `
  SELECT
    p.id AS "parentId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    p.address
  FROM ${databaseTables.parents} p
  JOIN ${databaseTables.users} u ON u.id = p.user_id
`;

const studentParentLinkSelect = `
  SELECT
    sp.id AS "linkId",
    sp.student_id AS "studentId",
    p.id AS "parentId",
    u.id AS "userId",
    u.full_name AS "fullName",
    u.email,
    u.phone,
    sp.relation_type AS "relationType",
    sp.is_primary AS "isPrimary",
    p.address,
    sp.created_at AS "createdAt"
  FROM ${databaseTables.studentParents} sp
  JOIN ${databaseTables.parents} p ON p.id = sp.parent_id
  JOIN ${databaseTables.users} u ON u.id = p.user_id
`;

const studentPromotionSelect = `
  SELECT
    pr.id,
    pr.academic_year_id AS "academicYearId",
    ay.name AS "academicYearName",
    pr.from_class_id AS "fromClassId",
    from_class.class_name AS "fromClassName",
    from_class.section AS "fromClassSection",
    from_grade.id AS "fromClassGradeLevelId",
    from_grade.name AS "fromClassGradeLevelName",
    from_year.id AS "fromClassAcademicYearId",
    from_year.name AS "fromClassAcademicYearName",
    pr.to_class_id AS "toClassId",
    to_class.class_name AS "toClassName",
    to_class.section AS "toClassSection",
    to_grade.id AS "toClassGradeLevelId",
    to_grade.name AS "toClassGradeLevelName",
    to_year.id AS "toClassAcademicYearId",
    to_year.name AS "toClassAcademicYearName",
    pr.promoted_at AS "promotedAt",
    pr.notes
  FROM ${databaseTables.studentPromotions} pr
  JOIN ${databaseTables.academicYears} ay ON ay.id = pr.academic_year_id
  JOIN ${databaseTables.classes} from_class ON from_class.id = pr.from_class_id
  JOIN ${databaseTables.gradeLevels} from_grade ON from_grade.id = from_class.grade_level_id
  JOIN ${databaseTables.academicYears} from_year ON from_year.id = from_class.academic_year_id
  JOIN ${databaseTables.classes} to_class ON to_class.id = pr.to_class_id
  JOIN ${databaseTables.gradeLevels} to_grade ON to_grade.id = to_class.grade_level_id
  JOIN ${databaseTables.academicYears} to_year ON to_year.id = to_class.academic_year_id
`;

const studentAcademicEnrollmentSelect = `
  SELECT
    sae.id,
    st.id AS "studentId",
    st.academic_no AS "academicNo",
    st.full_name AS "studentFullName",
    ay.id AS "academicYearId",
    ay.name AS "academicYearName",
    c.id AS "classId",
    c.class_name AS "className",
    c.section AS "classSection",
    c.is_active AS "classIsActive",
    gl.id AS "gradeLevelId",
    gl.name AS "gradeLevelName",
    gl.level_order AS "gradeLevelOrder",
    sae.created_at AS "createdAt",
    sae.updated_at AS "updatedAt"
  FROM ${databaseTables.studentAcademicEnrollments} sae
  JOIN ${databaseTables.students} st ON st.id = sae.student_id
  JOIN ${databaseTables.academicYears} ay ON ay.id = sae.academic_year_id
  JOIN ${databaseTables.classes} c ON c.id = sae.class_id
  JOIN ${databaseTables.gradeLevels} gl ON gl.id = c.grade_level_id
`;

export class StudentsRepository {
  private readonly listSortColumns: Record<StudentListSortField, string | readonly string[]> = {
    createdAt: "st.created_at",
    academicNo: "sp.academic_no",
    fullName: "st.full_name",
    enrollmentDate: "st.enrollment_date"
  };

  async listStudents(
    filters: StudentListQuery,
    queryable: Queryable = db
  ): Promise<PaginatedQueryResult<StudentReadRow>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (filters.classId) {
      addCondition("sp.class_id = ?", filters.classId);
    }

    if (filters.academicYearId) {
      addCondition("sp.academic_year_id = ?", filters.academicYearId);
    }

    if (filters.status) {
      addCondition("st.status = ?", filters.status);
    }

    if (filters.gender) {
      addCondition("st.gender = ?", filters.gender);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await queryable.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM ${databaseTables.students} st
        JOIN ${databaseViews.studentProfiles} sp ON sp.student_id = st.id
        ${whereClause}
      `,
      values
    );
    const { limit, offset } = buildPaginationWindow(filters.page, filters.limit);
    const result = await queryable.query<StudentReadRow>(
      `
        ${studentReadSelect}
        ${whereClause}
        ORDER BY ${buildOrderByClause(
          this.listSortColumns,
          filters.sortBy,
          filters.sortOrder,
          ["st.id"]
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

  async findStudentById(
    studentId: string,
    queryable: Queryable = db
  ): Promise<StudentReadRow | null> {
    const result = await queryable.query<StudentReadRow>(
      `
        ${studentReadSelect}
        WHERE st.id = $1
        LIMIT 1
      `,
      [studentId]
    );

    return mapSingleRow(result.rows);
  }

  async createStudent(
    input: CreateStudentRowInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.students} (
          academic_no,
          full_name,
          date_of_birth,
          gender,
          class_id,
          status,
          enrollment_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE))
        RETURNING id
      `,
      [
        input.academicNo,
        input.fullName,
        input.dateOfBirth,
        input.gender,
        input.classId,
        input.status,
        input.enrollmentDate ?? null
      ]
    );

    return result.rows[0].id;
  }

  async updateStudent(
    studentId: string,
    input: UpdateStudentRowInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      academic_no: input.academicNo,
      full_name: input.fullName,
      date_of_birth: input.dateOfBirth,
      gender: input.gender,
      status: input.status
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.students}
        SET ${assignments.join(", ")}
        WHERE id = $1
      `,
      [studentId, ...values]
    );
  }

  async updateStudentClassId(
    studentId: string,
    classId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.students}
        SET class_id = $2
        WHERE id = $1
      `,
      [studentId, classId]
    );
  }

  async findClassById(
    classId: string,
    queryable: Queryable = db
  ): Promise<ClassReferenceRow | null> {
    const result = await queryable.query<ClassReferenceRow>(
      `
        ${classReferenceSelect}
        WHERE c.id = $1
        LIMIT 1
      `,
      [classId]
    );

    const row = mapSingleRow(result.rows);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      className: row.className,
      section: row.section,
      gradeLevelId: row.gradeLevelId,
      gradeLevelName: row.gradeLevelName,
      academicYearId: row.academicYearId,
      academicYearName: row.academicYearName
    };
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

  async findParentById(
    parentId: string,
    queryable: Queryable = db
  ): Promise<ParentReferenceRow | null> {
    const result = await queryable.query<ParentReferenceRow>(
      `
        ${parentReferenceSelect}
        WHERE p.user_id::text = $1
           OR p.id::text = $1
        ORDER BY CASE WHEN p.user_id::text = $1 THEN 0 ELSE 1 END, p.id ASC
        LIMIT 1
      `,
      [parentId]
    );

    return mapSingleRow(result.rows);
  }

  async listStudentParentLinks(
    studentId: string,
    queryable: Queryable = db
  ): Promise<StudentParentLinkRow[]> {
    const result = await queryable.query<StudentParentLinkRow>(
      `
        ${studentParentLinkSelect}
        WHERE sp.student_id = $1
        ORDER BY sp.is_primary DESC, sp.created_at ASC, sp.id ASC
      `,
      [studentId]
    );

    return result.rows;
  }

  async findStudentParentLink(
    studentId: string,
    parentId: string,
    queryable: Queryable = db
  ): Promise<StudentParentLinkRow | null> {
    const result = await queryable.query<StudentParentLinkRow>(
      `
        ${studentParentLinkSelect}
        WHERE sp.student_id = $1 AND sp.parent_id = $2
        LIMIT 1
      `,
      [studentId, parentId]
    );

    return mapSingleRow(result.rows);
  }

  async createStudentParentLink(
    input: CreateStudentParentLinkInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.studentParents} (
          student_id,
          parent_id,
          relation_type,
          is_primary
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [input.studentId, input.parentId, input.relationType, input.isPrimary]
    );

    return result.rows[0].id;
  }

  async clearPrimaryParent(
    studentId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.studentParents}
        SET is_primary = false
        WHERE student_id = $1
          AND is_primary = true
      `,
      [studentId]
    );
  }

  async setStudentParentPrimary(
    studentId: string,
    parentId: string,
    queryable: Queryable = db
  ): Promise<void> {
    await queryable.query(
      `
        UPDATE ${databaseTables.studentParents}
        SET is_primary = true
        WHERE student_id = $1
          AND parent_id = $2
      `,
      [studentId, parentId]
    );
  }

  async createStudentPromotion(
    input: CreateStudentPromotionInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.studentPromotions} (
          student_id,
          from_class_id,
          to_class_id,
          academic_year_id,
          notes
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [input.studentId, input.fromClassId, input.toClassId, input.academicYearId, input.notes]
    );

    return result.rows[0].id;
  }

  async findStudentPromotionById(
    promotionId: string,
    queryable: Queryable = db
  ): Promise<StudentPromotionRow | null> {
    const result = await queryable.query<StudentPromotionRow>(
      `
        ${studentPromotionSelect}
        WHERE pr.id = $1
        LIMIT 1
      `,
      [promotionId]
    );

    return mapSingleRow(result.rows);
  }

  async listStudentAcademicEnrollments(
    filters: StudentAcademicEnrollmentListQuery,
    queryable: Queryable = db
  ): Promise<StudentAcademicEnrollmentRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const addCondition = (template: string, value: unknown): void => {
      values.push(value);
      conditions.push(template.replace("?", `$${values.length}`));
    };

    if (filters.studentId) {
      addCondition("sae.student_id = ?", filters.studentId);
    }

    if (filters.academicYearId) {
      addCondition("sae.academic_year_id = ?", filters.academicYearId);
    }

    if (filters.classId) {
      addCondition("sae.class_id = ?", filters.classId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await queryable.query<StudentAcademicEnrollmentRow>(
      `
        ${studentAcademicEnrollmentSelect}
        ${whereClause}
        ORDER BY sae.academic_year_id DESC, gl.level_order ASC, st.full_name ASC, sae.id ASC
      `,
      values
    );

    return result.rows;
  }

  async findStudentAcademicEnrollmentById(
    enrollmentId: string,
    queryable: Queryable = db
  ): Promise<StudentAcademicEnrollmentRow | null> {
    const result = await queryable.query<StudentAcademicEnrollmentRow>(
      `
        ${studentAcademicEnrollmentSelect}
        WHERE sae.id = $1
        LIMIT 1
      `,
      [enrollmentId]
    );

    return mapSingleRow(result.rows);
  }

  async findStudentAcademicEnrollmentByStudentAndAcademicYear(
    studentId: string,
    academicYearId: string,
    queryable: Queryable = db
  ): Promise<StudentAcademicEnrollmentRow | null> {
    const result = await queryable.query<StudentAcademicEnrollmentRow>(
      `
        ${studentAcademicEnrollmentSelect}
        WHERE sae.student_id = $1
          AND sae.academic_year_id = $2
        LIMIT 1
      `,
      [studentId, academicYearId]
    );

    return mapSingleRow(result.rows);
  }

  async createStudentAcademicEnrollment(
    input: CreateStudentAcademicEnrollmentInput,
    queryable: Queryable = db
  ): Promise<string> {
    const result = await queryable.query<{ id: string }>(
      `
        INSERT INTO ${databaseTables.studentAcademicEnrollments} (
          student_id,
          academic_year_id,
          class_id
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (student_id, academic_year_id)
        DO UPDATE SET
          class_id = EXCLUDED.class_id,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `,
      [input.studentId, input.academicYearId, input.classId]
    );

    return result.rows[0].id;
  }

  async updateStudentAcademicEnrollment(
    enrollmentId: string,
    input: UpdateStudentAcademicEnrollmentInput,
    queryable: Queryable = db
  ): Promise<void> {
    const { assignments, values } = buildAssignments({
      class_id: input.classId
    });

    if (assignments.length === 0) {
      return;
    }

    await queryable.query(
      `
        UPDATE ${databaseTables.studentAcademicEnrollments}
        SET ${assignments.join(", ")}
        WHERE id = $1
      `,
      [enrollmentId, ...values]
    );
  }
}



